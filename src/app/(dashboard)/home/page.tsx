'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  TransactionWithProfiles,
  Profile,
  WorkspaceStats,
} from '@/lib/supabase-types';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useUser } from '@/contexts/UserContext';
import { useAppData } from '@/contexts/AppDataProvider';
import { formatCurrencyAmount } from '@/lib/currency';
import { isAdmin } from '@/lib/permissions-client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { UserAvatar, getUserDisplayName } from '@/components/ui/user-avatar';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  SentIcon,
  ArrowUpRight01Icon,
  ArrowDownLeft01Icon,
  Message01Icon,
  Calendar03Icon,
  Analytics02Icon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons';
import { EmployeeBalance } from '@/components/dashboard/EmployeeBalance';
import { ActionButtons } from '@/components/dashboard/ActionButtons';
import { KPICard } from '@/components/dashboard/KPICard';
import { ActivityChart } from '@/components/dashboard/ActivityChart';
import {
  TopContributors,
  type DateFilter,
} from '@/components/dashboard/TopContributors';

interface ChartDataPoint {
  date: string;
  sent: number;
  received: number;
  redeemed?: number;
  dateValue?: Date;
}

interface Contributor {
  profile: Profile;
  total_received: number;
  rank: number;
}

export default function DashboardHomePage() {
  const router = useRouter();
  const { currencyName } = useCurrency();
  const { profile: currentProfile, isLoading: isProfileLoading } = useUser();
  const { balanceInfo, dailyLimitInfo, workspaceStats: contextWorkspaceStats } = useAppData();
  const [recentTransactions, setRecentTransactions] = useState<
    TransactionWithProfiles[]
  >([]);
  const [workspaceStats, setWorkspaceStats] = useState<WorkspaceStats | null>(
    null
  );
  const [userStats, setUserStats] = useState<{
    total_sent: number;
    total_received: number;
  } | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [topContributors, setTopContributors] = useState<Contributor[]>([]);
  const [topContributorsDateFilter, setTopContributorsDateFilter] =
    useState<DateFilter>('30days');
  const [isLoadingTopContributors, setIsLoadingTopContributors] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUserAdmin = isAdmin(currentProfile);

  // Load essential data (recent transactions and user stats)
  const loadEssentialData = useCallback(async () => {
    if (!currentProfile) return;

    try {
      setError(null);

      // Set workspace stats from context if available
      if (contextWorkspaceStats) {
        setWorkspaceStats(contextWorkspaceStats);
      }

      // Load recent transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select(
          `
          *,
          sender_profile:profiles!sender_profile_id(
            id, email, full_name, avatar_url
          ),
          receiver_profile:profiles!receiver_profile_id(
            id, email, full_name, avatar_url
          )
        `
        )
        .or(
          `sender_profile_id.eq.${currentProfile.id},receiver_profile_id.eq.${currentProfile.id}`
        )
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentTransactions(transactions || []);

      // Calculate user's own stats
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: userTransactions } = await supabase
        .from('transactions')
        .select('amount, sender_profile_id, receiver_profile_id, created_at')
        .or(
          `sender_profile_id.eq.${currentProfile.id},receiver_profile_id.eq.${currentProfile.id}`
        )
        .gte('created_at', monthStart.toISOString());

      if (userTransactions) {
        const sent = userTransactions.filter(
          (tx) => tx.sender_profile_id === currentProfile.id
        );
        const received = userTransactions.filter(
          (tx) => tx.receiver_profile_id === currentProfile.id
        );

        setUserStats({
          total_sent: sent.reduce((sum, tx) => sum + tx.amount, 0),
          total_received: received.reduce((sum, tx) => sum + tx.amount, 0),
        });
      }
    } catch (err) {
      console.error('Failed to load essential dashboard data:', err);
      setError('Failed to load dashboard data');
    }
  }, [currentProfile, contextWorkspaceStats]);

  // Load admin-specific data in background
  const loadAdminData = useCallback(async () => {
    if (!isUserAdmin || !currentProfile?.workspace_id) return;

    try {
      // Workspace stats fallback if not in context
      if (!contextWorkspaceStats) {
        try {
          const [profilesResult, transactionsResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('id', { count: 'exact' })
              .eq('workspace_id', currentProfile.workspace_id)
              .eq('active', true),
            supabase
              .from('transactions')
              .select(
                'amount, created_at, sender_profile_id, receiver_profile_id'
              )
              .eq('workspace_id', currentProfile.workspace_id),
          ]);

          const totalMembers = profilesResult.count || 0;
          const allTransactions = transactionsResult.data || [];
          const totalTransactions = allTransactions.length;

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);

          const activeToday = new Set<string>();
          const activeThisWeek = new Set<string>();
          const activeThisMonth = new Set<string>();

          allTransactions.forEach((tx) => {
            const txDate = new Date(tx.created_at);
            if (txDate >= today) {
              activeToday.add(tx.sender_profile_id);
              activeToday.add(tx.receiver_profile_id);
            }
            if (txDate >= weekAgo) {
              activeThisWeek.add(tx.sender_profile_id);
              activeThisWeek.add(tx.receiver_profile_id);
            }
            if (txDate >= monthAgo) {
              activeThisMonth.add(tx.sender_profile_id);
              activeThisMonth.add(tx.receiver_profile_id);
            }
          });

          setWorkspaceStats({
            total_members: totalMembers,
            total_transactions: totalTransactions,
            total_karma_sent: 0,
            total_karma_received: 0,
            active_members_today: activeToday.size,
            active_members_this_week: activeThisWeek.size,
            active_members_this_month: activeThisMonth.size,
          });
        } catch (fallbackErr) {
          console.error(
            'Failed to calculate workspace stats fallback:',
            fallbackErr
          );
        }
      }

      // Load chart data
      try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const { data: allTransactions } = await supabase
          .from('transactions')
          .select(
            'amount, created_at, sender_profile_id, receiver_profile_id'
          )
          .eq('workspace_id', currentProfile.workspace_id)
          .gte('created_at', oneYearAgo.toISOString())
          .order('created_at', { ascending: true });

        if (allTransactions) {
          const transactionsByDate: Map<
            string,
            { sent: number; received: number; dateValue: Date }
          > = new Map();

          allTransactions.forEach((tx) => {
            const txDate = new Date(tx.created_at);
            const dateKey = txDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });

            const dateAtMidnight = new Date(
              txDate.getFullYear(),
              txDate.getMonth(),
              txDate.getDate()
            );

            if (!transactionsByDate.has(dateKey)) {
              transactionsByDate.set(dateKey, {
                sent: 0,
                received: 0,
                dateValue: dateAtMidnight,
              });
            }

            const dayData = transactionsByDate.get(dateKey)!;

            if (tx.sender_profile_id === currentProfile.id) {
              dayData.sent += tx.amount;
            }
            if (tx.receiver_profile_id === currentProfile.id) {
              dayData.received += tx.amount;
            }
          });

          const chartPoints: ChartDataPoint[] = Array.from(
            transactionsByDate.entries()
          )
            .map(([date, data]) => ({
              date,
              sent: data.sent,
              received: data.received,
              dateValue: data.dateValue,
            }))
            .sort((a, b) => {
              if (!a.dateValue || !b.dateValue) return 0;
              return a.dateValue.getTime() - b.dateValue.getTime();
            });

          setChartData(chartPoints);
        }
      } catch (err) {
        console.error('Failed to load chart data:', err);
      }

      // Load top contributors
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .eq('workspace_id', currentProfile.workspace_id)
          .eq('active', true);

        if (profiles && profiles.length > 0) {
          let dateFilter: { gte?: string } | undefined;
          if (topContributorsDateFilter === '7days') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            dateFilter = { gte: sevenDaysAgo.toISOString() };
          } else if (topContributorsDateFilter === '30days') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            dateFilter = { gte: thirtyDaysAgo.toISOString() };
          }

          let query = supabase
            .from('transactions')
            .select('receiver_profile_id, amount')
            .eq('workspace_id', currentProfile.workspace_id)
            .in(
              'receiver_profile_id',
              profiles.map((p) => p.id)
            );

          if (dateFilter?.gte) {
            query = query.gte('created_at', dateFilter.gte);
          }

          const { data: receivedTransactions } = await query;

          const contributorMap = new Map<string, number>();
          receivedTransactions?.forEach((tx) => {
            const current = contributorMap.get(tx.receiver_profile_id) || 0;
            contributorMap.set(tx.receiver_profile_id, current + tx.amount);
          });

          const contributors: Contributor[] = Array.from(
            contributorMap.entries()
          )
            .map(([profileId, total]) => {
              const profile = profiles.find((p) => p.id === profileId);
              if (!profile) return null;
              return {
                profile: profile as Profile,
                total_received: total,
                rank: 0,
              };
            })
            .filter((c): c is Contributor => c !== null)
            .sort((a, b) => b.total_received - a.total_received)
            .slice(0, 5)
            .map((c, index) => ({ ...c, rank: index + 1 }));

          setTopContributors(contributors);
        }
      } catch (err) {
        console.error('Failed to load top contributors:', err);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  }, [currentProfile, isUserAdmin, topContributorsDateFilter, contextWorkspaceStats]);

  // Handle top contributors filter change
  useEffect(() => {
    if (isUserAdmin && currentProfile?.workspace_id) {
      setIsLoadingTopContributors(true);
      
      // Reload top contributors when filter changes
      const loadTopContributors = async () => {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .eq('workspace_id', currentProfile.workspace_id)
            .eq('active', true);

          if (profiles && profiles.length > 0) {
            let dateFilter: { gte?: string } | undefined;
            if (topContributorsDateFilter === '7days') {
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              dateFilter = { gte: sevenDaysAgo.toISOString() };
            } else if (topContributorsDateFilter === '30days') {
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              dateFilter = { gte: thirtyDaysAgo.toISOString() };
            }

            let query = supabase
              .from('transactions')
              .select('receiver_profile_id, amount')
              .eq('workspace_id', currentProfile.workspace_id)
              .in(
                'receiver_profile_id',
                profiles.map((p) => p.id)
              );

            if (dateFilter?.gte) {
              query = query.gte('created_at', dateFilter.gte);
            }

            const { data: receivedTransactions } = await query;

            const contributorMap = new Map<string, number>();
            receivedTransactions?.forEach((tx) => {
              const current = contributorMap.get(tx.receiver_profile_id) || 0;
              contributorMap.set(tx.receiver_profile_id, current + tx.amount);
            });

            const contributors: Contributor[] = Array.from(
              contributorMap.entries()
            )
              .map(([profileId, total]) => {
                const profile = profiles.find((p) => p.id === profileId);
                if (!profile) return null;
                return {
                  profile: profile as Profile,
                  total_received: total,
                  rank: 0,
                };
              })
              .filter((c): c is Contributor => c !== null)
              .sort((a, b) => b.total_received - a.total_received)
              .slice(0, 5)
              .map((c, index) => ({ ...c, rank: index + 1 }));

            setTopContributors(contributors);
          }
        } catch (err) {
          console.error('Failed to load top contributors:', err);
        } finally {
          setIsLoadingTopContributors(false);
        }
      };

      loadTopContributors();
    }
  }, [topContributorsDateFilter, currentProfile, isUserAdmin]);

  // Load essential data on mount
  useEffect(() => {
    if (currentProfile) {
      loadEssentialData();
      
      // Load admin data in background (lazy loading)
      if (isUserAdmin) {
        // Use requestIdleCallback for lower priority loading
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          const id = (window as Window & typeof globalThis).requestIdleCallback(() => {
            loadAdminData();
          }, { timeout: 5000 });
          return () => (window as Window & typeof globalThis).cancelIdleCallback(id);
        } else {
          // Fallback: load after a short delay
          const timeoutId = setTimeout(() => {
            loadAdminData();
          }, 2000);
          return () => clearTimeout(timeoutId);
        }
      }
    } else if (!isProfileLoading && !currentProfile) {
      // No profile found - redirect to login which will handle workspace check
      router.replace('/login');
    }
  }, [currentProfile, isProfileLoading, isUserAdmin, loadEssentialData, loadAdminData, router]);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isProfileLoading || !balanceInfo) {
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
          <h2 className="text-xl font-medium text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-4 font-normal">
            {error || 'Unable to load your profile'}
          </p>
          <Button onClick={loadEssentialData} className="font-medium">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Employee Dashboard
  if (!isUserAdmin) {
    return (
      <div className="p-4 md:p-6 space-y-8 pb-20 md:pb-6">
        {/* Welcome Message */}
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900">
            Welcome back, {currentProfile.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-gray-600 font-normal">
            Here&apos;s your {currencyName} overview
          </p>
        </div>

        {/* Balance Display */}
        {balanceInfo && (
          <EmployeeBalance
            redeemableBalance={balanceInfo.redeemable_balance}
            givingBalance={balanceInfo.giving_balance}
            currencyName={currencyName}
          />
        )}

        {/* Action Buttons */}
        <ActionButtons currencyName={currencyName} />

        {/* Recent Activity */}
        <Card className="border-[#ebebeb]">
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              Recent Activity
            </CardTitle>
            <CardDescription className="font-normal">
              Your latest {currencyName} transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => {
                  const isSent =
                    transaction.sender_profile_id === currentProfile.id;
                  const otherProfile = isSent
                    ? transaction.receiver_profile
                    : transaction.sender_profile;

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-start space-x-4"
                    >
                      <div className="relative">
                        {otherProfile ? (
                          <UserAvatar user={otherProfile} size="md" />
                        ) : (
                          <UserAvatar
                            user={{
                              email: 'Unknown',
                              full_name: null,
                              avatar_url: null,
                            }}
                            size="md"
                          />
                        )}
                        <div
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                            isSent ? 'bg-blue-500' : 'bg-green-500'
                          }`}
                        >
                          {isSent ? (
                            <HugeiconsIcon
                              icon={ArrowUpRight01Icon}
                              size={10}
                              color="currentColor"
                            />
                          ) : (
                            <HugeiconsIcon
                              icon={ArrowDownLeft01Icon}
                              size={10}
                              color="currentColor"
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {isSent ? 'You sent' : 'You received'}{' '}
                          {formatCurrencyAmount(
                            transaction.amount,
                            currencyName
                          )}{' '}
                          {isSent ? 'to' : 'from'}{' '}
                          {otherProfile
                            ? getUserDisplayName(otherProfile)
                            : 'Someone'}
                        </p>
                        {transaction.message && (
                          <p className="text-sm text-muted-foreground font-normal">
                            &quot;{transaction.message}&quot;
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground font-normal">
                          {formatTimeAgo(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <HugeiconsIcon
                  icon={Message01Icon}
                  size={48}
                  className="text-gray-400 mx-auto mb-4"
                />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No transactions yet
                </h3>
                <p className="text-gray-600 mb-4 font-normal">
                  Start by sending some {currencyName} to your teammates!
                </p>
                <Button asChild className="font-medium">
                  <Link href="/send">
                    <HugeiconsIcon icon={SentIcon} size={16} className="mr-2" />
                    Send Your First{' '}
                    {currencyName.charAt(0).toUpperCase() +
                      currencyName.slice(1)}
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      {/* Welcome Header */}
      <div className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-semibold text-gray-900">
          Welcome back, {currentProfile.full_name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-gray-600 font-normal">
          Here&apos;s your {currencyName} dashboard overview
        </p>
      </div>

      {/* KPI Cards */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title={`${currencyName} Sent`}
            subtitle="This month"
            value={userStats.total_sent}
            icon={SentIcon}
            iconColor="text-blue-600"
            valueColor="text-blue-600"
          />
          <KPICard
            title={`${currencyName} Received`}
            subtitle="This month"
            value={userStats.total_received}
            icon={Analytics02Icon}
            iconColor="text-green-600"
            valueColor="text-green-600"
          />
          {workspaceStats && (
            <>
              <KPICard
                title="Active Members"
                subtitle="All time"
                value={workspaceStats.total_members}
                icon={UserMultipleIcon}
                iconColor="text-purple-600"
                valueColor="text-purple-600"
              />
              <KPICard
                title="Daily Usage"
                value={`${dailyLimitInfo?.percentage_used?.toFixed(0) || 0}%`}
                progress={dailyLimitInfo?.percentage_used || 0}
                icon={Calendar03Icon}
                iconColor="text-orange-600"
                valueColor="text-orange-600"
              />
            </>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
        {/* Chart Area - Stretches to match right sidebar height */}
        <div className="lg:col-span-2">
          <ActivityChart data={chartData} currencyName={currencyName} />
        </div>

        {/* Right Sidebar - Natural content height, determines chart height */}
        <div className="space-y-6">
          <TopContributors
            contributors={topContributors}
            currencyName={currencyName}
            dateFilter={topContributorsDateFilter}
            onDateFilterChange={setTopContributorsDateFilter}
            isLoading={isLoadingTopContributors}
          />

          {/* Engagement Metrics */}
          {workspaceStats && (
            <Card className="border-[#ebebeb]">
              <CardHeader className="p-4">
                <CardTitle className="text-lg font-medium">
                  Engagement Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="pl-3 pr-4 pb-4 pt-0 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-normal text-gray-600">
                      Total Transactions
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {workspaceStats.total_transactions}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-normal text-gray-600">
                      Active Today
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {workspaceStats.active_members_today}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-normal text-gray-600">
                      Active This Week
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {workspaceStats.active_members_this_week}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="border-[#ebebeb]">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
          <CardDescription className="font-normal">
            Latest {currencyName} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => {
                const isSent =
                  transaction.sender_profile_id === currentProfile.id;
                const otherProfile = isSent
                  ? transaction.receiver_profile
                  : transaction.sender_profile;

                return (
                  <div
                    key={transaction.id}
                    className="flex items-start space-x-4"
                  >
                    <div className="relative">
                      {otherProfile ? (
                        <UserAvatar user={otherProfile} size="md" />
                      ) : (
                        <UserAvatar
                          user={{
                            email: 'Unknown',
                            full_name: null,
                            avatar_url: null,
                          }}
                          size="md"
                        />
                      )}
                      <div
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                          isSent ? 'bg-blue-500' : 'bg-green-500'
                        }`}
                      >
                        {isSent ? (
                          <HugeiconsIcon
                            icon={ArrowUpRight01Icon}
                            size={10}
                            color="currentColor"
                          />
                        ) : (
                          <HugeiconsIcon
                            icon={ArrowDownLeft01Icon}
                            size={10}
                            color="currentColor"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {isSent ? 'You sent' : 'You received'}{' '}
                        {formatCurrencyAmount(transaction.amount, currencyName)}{' '}
                        {isSent ? 'to' : 'from'}{' '}
                        {otherProfile
                          ? getUserDisplayName(otherProfile)
                          : 'Someone'}
                      </p>
                      {transaction.message && (
                        <p className="text-sm text-muted-foreground font-normal">
                          &quot;{transaction.message}&quot;
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground font-normal">
                        {formatTimeAgo(transaction.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <HugeiconsIcon
                icon={Message01Icon}
                size={48}
                className="text-gray-400 mx-auto mb-4"
              />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No transactions yet
              </h3>
              <p className="text-gray-600 mb-4 font-normal">
                Start by sending some {currencyName} to your teammates!
              </p>
              <Button asChild className="font-medium">
                <Link href="/send">
                  <HugeiconsIcon icon={SentIcon} size={16} className="mr-2" />
                  Send Your First{' '}
                  {currencyName.charAt(0).toUpperCase() + currencyName.slice(1)}
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
