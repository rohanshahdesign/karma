'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentProfile } from '@/lib/permissions';
import { Profile } from '@/lib/supabase-types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Users,
  RefreshCw,
} from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  profile: Profile;
  total_sent: number;
  total_received: number;
  net_karma: number;
  transaction_count: number;
}

type Period = 'week' | 'month' | 'all_time';

export default function LeaderboardPage() {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<Period>('month');

  const loadLeaderboard = useCallback(async (period: Period = activePeriod) => {
    if (!currentProfile) return;

    try {
      setRefreshing(true);
      setError(null);

      // Calculate date range based on period
      const now = new Date();
      let startDate: string | null = null;
      
      if (period === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString();
      } else if (period === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString();
      }

      // Build the query for transactions within the period
      let transactionQuery = supabase
        .from('transactions')
        .select(`
          sender_profile_id,
          receiver_profile_id,
          amount,
          created_at
        `)
        .eq('workspace_id', currentProfile.workspace_id);

      if (startDate) {
        transactionQuery = transactionQuery.gte('created_at', startDate);
      }

      const { data: transactions, error: transactionError } = await transactionQuery;

      if (transactionError) throw transactionError;

      // Get all workspace profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('workspace_id', currentProfile.workspace_id)
        .eq('active', true);

      if (profileError) throw profileError;

      // Calculate stats for each profile
      const profileStats = new Map();
      
      profiles?.forEach(profile => {
        profileStats.set(profile.id, {
          profile,
          total_sent: 0,
          total_received: 0,
          transaction_count: 0,
        });
      });

      transactions?.forEach(transaction => {
        // Update sender stats
        const senderStats = profileStats.get(transaction.sender_profile_id);
        if (senderStats) {
          senderStats.total_sent += transaction.amount;
          senderStats.transaction_count += 1;
        }

        // Update receiver stats
        const receiverStats = profileStats.get(transaction.receiver_profile_id);
        if (receiverStats) {
          receiverStats.total_received += transaction.amount;
          if (!senderStats) { // Only count if we didn't already count as sender
            receiverStats.transaction_count += 1;
          }
        }
      });

      // Convert to array and calculate rankings
      const leaderboardData: LeaderboardEntry[] = Array.from(profileStats.values())
        .map(stats => ({
          ...stats,
          net_karma: stats.total_received - stats.total_sent,
        }))
        .sort((a, b) => {
          // Sort by total received (descending), then by net karma (descending)
          if (b.total_received !== a.total_received) {
            return b.total_received - a.total_received;
          }
          return b.net_karma - a.net_karma;
        })
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      setLeaderboard(leaderboardData);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setRefreshing(false);
    }
  }, [currentProfile, activePeriod]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const profile = await getCurrentProfile();
        if (!profile) {
          setError('Profile not found');
          return;
        }
        setCurrentProfile(profile);
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (currentProfile) {
      loadLeaderboard();
    }
  }, [currentProfile, loadLeaderboard]);

  const handlePeriodChange = (period: Period) => {
    setActivePeriod(period);
    loadLeaderboard(period);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-orange-500" />;
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-600">{rank}</span>
          </div>
        );
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      const words = name.trim().split(' ');
      if (words.length === 1) {
        // Single word: take first 2 characters
        return words[0].substring(0, 2).toUpperCase();
      } else {
        // Multiple words: take first letter of first and last word
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
      }
    }
    return email.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Leaderboard
          </h1>
          <p className="text-gray-600">
            See who&apos;s spreading the most karma in your workspace
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => loadLeaderboard()}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Period Selector */}
      <Tabs value={activePeriod} onValueChange={(value) => handlePeriodChange(value as Period)}>
        <TabsList>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="all_time">All Time</TabsTrigger>
        </TabsList>

        <TabsContent value={activePeriod} className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leaderboard.length}</div>
                <p className="text-xs text-muted-foreground">Active participants</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Karma Sent</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {leaderboard.reduce((sum, entry) => sum + entry.total_sent, 0)}
                </div>
                <p className="text-xs text-muted-foreground">In this period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most Active</CardTitle>
                <Trophy className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {leaderboard[0]?.transaction_count || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {leaderboard[0]?.profile.full_name || leaderboard[0]?.profile.email || 'No activity yet'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Rankings</CardTitle>
              <CardDescription>
                Based on total karma received {activePeriod === 'all_time' ? 'overall' : `in the last ${activePeriod}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {leaderboard.length > 0 ? (
                <div className="space-y-0">
                  {leaderboard.map((entry) => {
                    const isCurrentUser = entry.profile.id === currentProfile?.id;
                    
                    return (
                      <div
                        key={entry.profile.id}
                        className={`flex items-center space-x-3 p-4 border-b border-gray-100 last:border-b-0 ${
                          isCurrentUser ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-center w-8 flex-shrink-0">
                          {getRankIcon(entry.rank)}
                        </div>
                        
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback className="text-sm font-semibold">
                            {getInitials(entry.profile.full_name, entry.profile.email)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium leading-none truncate">
                              {entry.profile.full_name || entry.profile.email}
                            </p>
                            {isCurrentUser && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground capitalize mt-1">
                            {entry.profile.role.replace('_', ' ')} • {entry.transaction_count} transactions
                          </p>
                        </div>
                        
                        <div className="text-right space-y-1 flex-shrink-0">
                          <p className="text-sm font-medium text-green-600">
                            +{entry.total_received}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.total_sent} sent
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No activity yet
                  </h3>
                  <p className="text-gray-600">
                    Be the first to send some karma and start the leaderboard!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}