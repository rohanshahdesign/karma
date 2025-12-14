'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  getProfileBalance, 
  getDailyLimitInfo, 
  validateTransaction,
  executeTransaction,
  type BalanceInfo, 
  type DailyLimitInfo,
  type TransactionValidation
} from '@/lib/balance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Send,
  User,
  Coins,
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrencyAmount, CURRENCY_PATTERNS } from '@/lib/currency';
import { useUser } from '@/contexts/UserContext';

interface WorkspaceMember {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  department: string | null;
  active: boolean;
}

const PREDEFINED_REASONS = [
  'Great teamwork',
  'Code review', 
  'Helping a colleague',
  'Going above and beyond',
  'Creative solution',
  'Leadership',
  'Mentoring',
  'Problem solving',
  'Customer service',
  'Documentation',
  'Testing',
  'Bug fix',
  'Innovation',
  'Meeting goals',
  'Positive attitude',
];

export default function SendKarmaPage() {
  const { currencyName } = useCurrency();
  const { profile: currentProfile, isLoading: isProfileLoading } = useUser();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [dailyLimitInfo, setDailyLimitInfo] = useState<DailyLimitInfo | null>(null);
  const [validation, setValidation] = useState<TransactionValidation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    if (!currentProfile) return;

    try {
      setLoading(true);
      setError(null);

      // Load balance and limit info
      const [balance, dailyLimit] = await Promise.all([
        getProfileBalance(currentProfile.id),
        getDailyLimitInfo(currentProfile.id),
      ]);
      setBalanceInfo(balance);
      setDailyLimitInfo(dailyLimit);

      // Load workspace members
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, department, active')
        .eq('workspace_id', currentProfile.workspace_id)
        .eq('active', true)
        .neq('id', currentProfile.id)
        .order('full_name');

      if (membersError) throw membersError;
      
      // Filter members based on current user's role
      let filteredMembers = membersData || [];
      if (currentProfile.role === 'employee') {
        // Employees can only send to members from different departments
        filteredMembers = filteredMembers.filter(
          member => member.department !== currentProfile.department
        );
      }
      // Admins and super_admins have no restrictions
      
      setMembers(filteredMembers);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [currentProfile]);

  const validateCurrentTransaction = useCallback(async () => {
    if (!currentProfile || !selectedMember || !amount) {
      setValidation(null);
      return;
    }

    const numericAmount = parseInt(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setValidation({
        valid: false,
        errors: ['Please enter a valid positive amount'],
        warnings: [],
      });
      return;
    }

    try {
      const result = await validateTransaction(
        currentProfile.id,
        selectedMember,
        numericAmount
      );
      setValidation(result);
    } catch {
      setValidation({
        valid: false,
        errors: ['Validation failed'],
        warnings: [],
      });
    }
  }, [currentProfile, selectedMember, amount]);

  const handleSendKarma = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentProfile || !selectedMember || !amount || !validation?.valid) {
      return;
    }

    if (!selectedReason && !customReason.trim()) {
      toast.error('Please select or provide a reason');
      return;
    }

    setSending(true);
    try {
      const numericAmount = parseInt(amount);
      const reason = selectedReason === 'other' ? customReason.trim() : selectedReason;
      
      await executeTransaction(
        currentProfile.id,
        selectedMember,
        numericAmount,
        reason
      );

      toast.success(
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>Successfully sent {formatCurrencyAmount(numericAmount, currencyName)}!</span>
        </div>
      );
      
      // Reset form
      setSelectedMember('');
      setAmount('');
      setSelectedReason('');
      setCustomReason('');
      setValidation(null);

      // Refresh balance
      if (currentProfile) {
        const [balance, dailyLimit] = await Promise.all([
          getProfileBalance(currentProfile.id),
          getDailyLimitInfo(currentProfile.id),
        ]);
        setBalanceInfo(balance);
        setDailyLimitInfo(dailyLimit);
      }
      
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to send ${currencyName}`);
    } finally {
      setSending(false);
    }
  };

  const getSelectedMemberInfo = () => {
    return members.find(m => m.id === selectedMember);
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    if (currentProfile) {
      loadInitialData();
    }
  }, [currentProfile, loadInitialData]);

  useEffect(() => {
    if (currentProfile && selectedMember && amount) {
      validateCurrentTransaction();
    } else {
      setValidation(null);
    }
  }, [currentProfile, selectedMember, amount, validateCurrentTransaction]);

  if (isProfileLoading || (loading && !balanceInfo)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !currentProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error || 'Unable to load your profile'}</p>
          <Button onClick={loadInitialData}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {CURRENCY_PATTERNS.SEND_KARMA(currencyName)}
        </h1>
        <p className="text-gray-600">
          Recognize your teammates for their great work
        </p>
      </div>

      {/* Balance Overview */}
      {balanceInfo && dailyLimitInfo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available to Give</CardTitle>
              <Coins className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {balanceInfo.giving_balance}
              </div>
              <p className="text-xs text-muted-foreground">{currencyName} points</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Usage</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {dailyLimitInfo.percentage_used?.toFixed(0) || 0}%
              </div>
              <Progress value={dailyLimitInfo.percentage_used || 0} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {dailyLimitInfo.remaining_limit} / {dailyLimitInfo.daily_limit} remaining today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Size</CardTitle>
              <User className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {members.length}
              </div>
              <p className="text-xs text-muted-foreground">Active members</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Send Form */}
      <Card>
        <CardHeader>
          <CardTitle>{CURRENCY_PATTERNS.SEND_KARMA(currencyName)}</CardTitle>
          <CardDescription>
            Choose a teammate, amount, and reason to recognize their contribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendKarma} className="space-y-6">
            {/* Member Selection */}
            <div>
              <Label htmlFor="member">Select Teammate *</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a teammate" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {getInitials(member.full_name, member.email)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{member.full_name || member.email}</div>
                          <div className="text-sm text-gray-500 capitalize">
                            {member.role.replace('_', ' ')}
                            {member.department && ` • ${member.department}`}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentProfile.role === 'employee' && (
                <div className="flex items-start gap-2 mt-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    You can send {currencyName} to teammates in other departments. 
                    {currentProfile.department && ` You're in ${currentProfile.department}.`}
                  </p>
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Enter ${currencyName} amount`}
                min="1"
                className="mt-1"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Available: {formatCurrencyAmount(balanceInfo?.giving_balance || 0, currencyName)}
              </p>
            </div>

            {/* Reason Selection */}
            <div>
              <Label htmlFor="reason">Reason *</Label>
              <Select value={selectedReason} onValueChange={setSelectedReason}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={`Why are you sending ${currencyName}?`} />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                  <Separator className="my-2" />
                  <SelectItem value="other">Other (specify below)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Reason */}
            {selectedReason === 'other' && (
              <div>
                <Label htmlFor="custom-reason">Specify Reason *</Label>
                <Input
                  id="custom-reason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter your custom reason"
                  className="mt-1"
                  required
                />
              </div>
            )}

            {/* Validation Messages */}
            {validation && (
              <div className="space-y-2">
                {validation.errors.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {validation.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                {validation.warnings.length > 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {validation.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={sending || !validation?.valid || (!selectedReason && !customReason.trim())}
              className="w-full md:w-auto"
              size="lg"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {CURRENCY_PATTERNS.SEND_KARMA(currencyName)}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Selected Member Preview */}
      {getSelectedMemberInfo() && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sending To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-medium">
                  {getInitials(getSelectedMemberInfo()?.full_name || null, getSelectedMemberInfo()?.email || '')}
                </span>
              </div>
              <div className="flex-1">
                <div className="font-medium text-lg">
                  {getSelectedMemberInfo()?.full_name || getSelectedMemberInfo()?.email}
                </div>
                <div className="text-gray-500 capitalize text-sm">
                  {getSelectedMemberInfo()?.role.replace('_', ' ')}
                  {getSelectedMemberInfo()?.department && ` • ${getSelectedMemberInfo()?.department}`}
                </div>
              </div>
              {amount && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    +{amount}
                  </div>
                  <div className="text-sm text-gray-500">{currencyName}</div>
                </div>
              )}
            </div>
            {(selectedReason && selectedReason !== 'other') && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700">Reason:</div>
                <div className="text-gray-600">{selectedReason}</div>
              </div>
            )}
            {(selectedReason === 'other' && customReason.trim()) && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700">Custom reason:</div>
                <div className="text-gray-600">{customReason}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
