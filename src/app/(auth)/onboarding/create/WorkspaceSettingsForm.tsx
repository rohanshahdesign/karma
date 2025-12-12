'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { UsernameInput } from '@/components/ui/username-input';
import { DepartmentManager } from '@/components/ui/department-manager';

const DEFAULT_DEPARTMENTS = ['Frontend', 'Backend', 'UAT', 'QA', 'Design', 'Marketing', 'HR'];

interface WorkspaceSettings {
  name: string;
  currency_name: string;
  monthly_allowance: number;
  min_transaction_amount: number;
  max_transaction_amount: number;
  daily_limit_percentage: number;
  reward_approval_threshold: number;
}

interface UserProfile {
  username: string;
  job_title: string;
  bio: string;
  portfolio_url: string;
}

export default function WorkspaceSettingsForm() {
  const router = useRouter();
  const [settings, setSettings] = useState<WorkspaceSettings>({
    name: '',
    currency_name: 'Karma',
    monthly_allowance: 100,
    min_transaction_amount: 5,
    max_transaction_amount: 20,
    daily_limit_percentage: 30,
    reward_approval_threshold: 1000,
  });
  const [profile, setProfile] = useState<UserProfile>({
    username: '',
    job_title: '',
    bio: '',
    portfolio_url: ''
  });
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSetting = <K extends keyof WorkspaceSettings>(
    key: K,
    value: WorkspaceSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateProfile = <K extends keyof UserProfile>(
    key: K,
    value: UserProfile[K]
  ) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  // Initialize form with user data
  useEffect(() => {
    const initializeForm = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) throw userError ?? new Error('No user');
        
        // Pre-populate username from email
        const suggestedUsername = user.email?.split('@')[0] || '';
        setProfile(prev => ({
          ...prev,
          username: suggestedUsername
        }));
      } catch (err) {
        console.error('Failed to initialize form:', err);
        setError('Failed to load user information');
      }
    };
    
    initializeForm();
  }, []);

  // Helper function to generate workspace slug
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw userError ?? new Error('No user');

      // Get Google profile data from pending_users or user metadata
      const { data: pendingUser } = await supabase
        .from('pending_users')
        .select('full_name, avatar_url')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      // Extract profile data - try pending_users first, then user metadata
      const fullName = pendingUser?.full_name || 
                      user.user_metadata?.full_name || 
                      user.user_metadata?.name || null;
      const avatarUrl = pendingUser?.avatar_url || 
                       user.user_metadata?.avatar_url || 
                       user.user_metadata?.picture || null;

      // Use RPC to create workspace and profile atomically
      const { error: rpcError } = await supabase.rpc(
        'create_workspace_with_owner',
        {
          p_name: settings.name,
          p_slug: generateSlug(settings.name),
          p_currency_name: settings.currency_name,
          p_monthly_allowance: settings.monthly_allowance,
          p_owner_email: user.email || '',
          p_min_transaction_amount: settings.min_transaction_amount,
          p_max_transaction_amount: settings.max_transaction_amount,
          p_daily_limit_percentage: settings.daily_limit_percentage,
          p_reward_approval_threshold: settings.reward_approval_threshold,
          p_full_name: fullName,
          p_avatar_url: avatarUrl,
          p_username: profile.username.trim(),
          p_job_title: profile.job_title.trim() || null,
          p_bio: profile.bio.trim() || null,
          p_portfolio_url: profile.portfolio_url.trim() || null,
          p_departments: departments
        }
      );
      
      if (rpcError) throw rpcError;

      router.push('/onboarding/invite');
    } catch (err: unknown) {
      console.error('Workspace creation error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Create Your Workspace</CardTitle>
          <p className="text-gray-600">
            Configure your team&apos;s recognition platform settings
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Basic Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div>
                <Label htmlFor="name">Workspace Name *</Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) => updateSetting('name', e.target.value)}
                  placeholder="e.g. Acme Corp Team"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="currency_name">Currency Name</Label>
                <Input
                  id="currency_name"
                  value={settings.currency_name}
                  onChange={(e) => updateSetting('currency_name', e.target.value)}
                  placeholder="e.g. Karma, Points, Kudos"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  What should your recognition currency be called?
                </p>
              </div>
            </div>

            <Separator />

            {/* Department Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Department Configuration</h3>
              <p className="text-sm text-gray-600">
                Configure departments for your workspace. Team members will select one when joining.
              </p>
              <DepartmentManager
                departments={departments}
                onChange={setDepartments}
                disabled={loading}
              />
            </div>

            <Separator />

            {/* Profile Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Your Profile</h3>
              
              <UsernameInput
                value={profile.username}
                onChange={(value) => updateProfile('username', value)}
                label="Username"
                placeholder="e.g. john_doe"
                required
              />

              <div>
                <Label htmlFor="job_title">Job Title</Label>
                <Input
                  id="job_title"
                  value={profile.job_title}
                  onChange={(e) => updateProfile('job_title', e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => updateProfile('bio', e.target.value)}
                  placeholder="Tell your team about yourself..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="portfolio_url">Portfolio/LinkedIn URL</Label>
                <Input
                  id="portfolio_url"
                  type="url"
                  value={profile.portfolio_url}
                  onChange={(e) => updateProfile('portfolio_url', e.target.value)}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            {/* Balance Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Balance & Allowances</h3>
              
              <div>
                <Label htmlFor="monthly_allowance">Monthly Allowance</Label>
                <Input
                  id="monthly_allowance"
                  type="number"
                  min="50"
                  max="500"
                  value={settings.monthly_allowance}
                  onChange={(e) => updateSetting('monthly_allowance', parseInt(e.target.value) || 100)}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  How much {settings.currency_name} each team member gets monthly
                </p>
              </div>

              <div>
                <Label htmlFor="daily_limit_percentage">Daily Spending Limit (%)</Label>
                <Input
                  id="daily_limit_percentage"
                  type="number"
                  min="10"
                  max="100"
                  value={settings.daily_limit_percentage}
                  onChange={(e) => updateSetting('daily_limit_percentage', parseInt(e.target.value) || 30)}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Maximum percentage of monthly allowance that can be spent per day
                </p>
              </div>
            </div>

            <Separator />

            {/* Transaction Limits */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Transaction Limits</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_transaction_amount">Minimum Amount</Label>
                  <Input
                    id="min_transaction_amount"
                    type="number"
                    min="1"
                    max="50"
                    value={settings.min_transaction_amount}
                    onChange={(e) => updateSetting('min_transaction_amount', parseInt(e.target.value) || 5)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="max_transaction_amount">Maximum Amount</Label>
                  <Input
                    id="max_transaction_amount"
                    type="number"
                    min="5"
                    max="100"
                    value={settings.max_transaction_amount}
                    onChange={(e) => updateSetting('max_transaction_amount', parseInt(e.target.value) || 20)}
                    className="mt-1"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Set the minimum and maximum {settings.currency_name} amounts for single transactions
              </p>
            </div>

            <Separator />

            {/* Rewards Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Rewards Settings</h3>
              
              <div>
                <Label htmlFor="reward_approval_threshold">Auto-Approval Threshold</Label>
                <Input
                  id="reward_approval_threshold"
                  type="number"
                  min="100"
                  max="5000"
                  value={settings.reward_approval_threshold}
                  onChange={(e) => updateSetting('reward_approval_threshold', parseInt(e.target.value) || 1000)}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Reward redemptions above this amount require admin approval
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading || !settings.name.trim() || !profile.username.trim()}
                className="min-w-[120px]"
              >
                {loading ? 'Creating...' : 'Create Workspace'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
