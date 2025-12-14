'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getProfileBalance, getDailyLimitInfo, type BalanceInfo, type DailyLimitInfo } from '@/lib/balance';
import { TransactionWithProfiles } from '@/lib/supabase-types';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useUser } from '@/contexts/UserContext';
import { formatCurrencyAmount, CURRENCY_PATTERNS } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { UserAvatar, getUserDisplayName } from '@/components/ui/user-avatar';
import {
  Send,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  MessageSquare,
  Calendar,
  Coins,
  History,
} from 'lucide-react';

export default function DashboardHomePage() {
  const router = useRouter();
  const { currencyName } = useCurrency();
  const { profile: currentProfile, isLoading: isProfileLoading } = useUser();
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [dailyLimitInfo, setDailyLimitInfo] = useState<DailyLimitInfo | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!currentProfile) return;

    try {
      setLoading(true);
      setError(null);

      // Load balance information
      const [balance, dailyLimit] = await Promise.all([
        getProfileBalance(currentProfile.id),
        getDailyLimitInfo(currentProfile.id),
      ]);

      setBalanceInfo(balance);
      setDailyLimitInfo(dailyLimit);

      // Load recent transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          *,
          sender_profile:profiles!sender_profile_id(
            id, email, full_name, avatar_url
          ),
          receiver_profile:profiles!receiver_profile_id(
            id, email, full_name, avatar_url
          )
        `)
        .or(`sender_profile_id.eq.${currentProfile.id},receiver_profile_id.eq.${currentProfile.id}`)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentTransactions(transactions || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [currentProfile]);

  useEffect(() => {
    if (currentProfile) {
      loadDashboardData();
    } else if (!isProfileLoading && !currentProfile) {
        // Handle case where user is logged in but has no profile (e.g. new user)
        // Check if we need to create a pending user entry or redirect
        const checkUser = async () => {
             const { data: { user } } = await supabase.auth.getUser();
             if (user) {
                 // Create pending user entry if needed
                 await supabase
                  .from('pending_users')
                  .upsert({ auth_user_id: user.id, email: user.email });
                 router.replace('/onboarding');
             }
        };
        checkUser();
    }
  }, [currentProfile, isProfileLoading, loadDashboardData, router]);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };


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
          <Button onClick={loadDashboardData}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Welcome back, {currentProfile.full_name?.split(' ')[0] || "there"}!
        </h1>
        <p className="text-gray-600">
          Here`&apos;`s your {currencyName} activity summary
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Giving Balance</CardTitle>
            <Coins className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {balanceInfo?.giving_balance || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Available to give
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Earned Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {balanceInfo?.redeemable_balance || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total earned {currencyName}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Usage</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {dailyLimitInfo?.percentage_used?.toFixed(0) || 0}%
            </div>
            <Progress 
              value={dailyLimitInfo?.percentage_used || 0} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              {dailyLimitInfo?.remaining_limit || 0} / {dailyLimitInfo?.daily_limit || 0} remaining today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common actions you can take right now
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button asChild className="flex-1 md:flex-none bg-white border border-[#ebebeb] shadow-none text-gray-900 hover:bg-gray-50">
            <Link href="/send">
              <Send className="mr-2 h-4 w-4" />
              {CURRENCY_PATTERNS.SEND_KARMA(currencyName)}
            </Link>
          </Button>
          <Button asChild className="flex-1 md:flex-none bg-white border border-[#ebebeb] shadow-none text-gray-900 hover:bg-gray-50">
            <Link href="/transactions">
              <History className="mr-2 h-4 w-4" />
              View History
            </Link>
          </Button>
          <Button asChild className="hidden md:inline-flex bg-white border border-[#ebebeb] shadow-none text-gray-900 hover:bg-gray-50">
            <Link href="/workspaces">
              <Users className="mr-2 h-4 w-4" />
              Workspace
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest {currencyName} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => {
                const isSent = transaction.sender_profile_id === currentProfile.id;
                const otherProfile = isSent ? transaction.receiver_profile : transaction.sender_profile;
                
                return (
                  <div key={transaction.id} className="flex items-start space-x-4">
                    <div className="relative">
                      {otherProfile ? (
                        <UserAvatar user={otherProfile} size="md" />
                      ) : (
                        <UserAvatar 
                          user={{ email: 'Unknown', full_name: null, avatar_url: null }} 
                          size="md" 
                        />
                      )}
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                        isSent ? 'bg-blue-500' : 'bg-green-500'
                      }`}>
                        {isSent ? (
                          <ArrowUpRight className="h-2.5 w-2.5 text-white" />
                        ) : (
                          <ArrowDownLeft className="h-2.5 w-2.5 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {isSent ? 'You sent' : 'You received'} {formatCurrencyAmount(transaction.amount, currencyName)} {isSent ? 'to' : 'from'} {otherProfile ? getUserDisplayName(otherProfile) : 'Someone'}
                      </p>
                      {transaction.message && (
                        <p className="text-sm text-muted-foreground">
                          &quot;{transaction.message}&quot;
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(transaction.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No transactions yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start by sending some {currencyName} to your teammates!
              </p>
              <Button asChild>
                <Link href="/send">
                  <Send className="mr-2 h-4 w-4" />
                  Send Your First {currencyName.charAt(0).toUpperCase() + currencyName.slice(1)}
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
