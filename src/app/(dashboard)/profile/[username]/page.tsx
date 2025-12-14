'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserAvatar, getUserDisplayName } from '@/components/ui/user-avatar';
import { 
  User, 
  Calendar, 
  Briefcase, 
  Award, 
  TrendingUp, 
  TrendingDown,
  Activity,
  ArrowLeft,
  Mail,
  Edit
} from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Profile, TransactionWithProfiles } from '@/lib/supabase-types';
import { getTransactionsByProfileClient } from '@/lib/database-client';
import { supabase } from '@/lib/supabase';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrencyAmount } from '@/lib/currency';
import { toast } from 'sonner';
import { getWorkspaceBadges, checkAndAwardBadges, type BadgeWithProgress } from '@/lib/database/badges-client';
import CompactBadge from '@/components/badges/CompactBadge';
import BadgesList from '@/components/badges/BadgesList';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import SlackConnection from '@/components/auth/SlackConnection';
import { useUser } from '@/contexts/UserContext';

interface ProfileStats {
  total_sent: number;
  total_received: number;
  transaction_count: number;
  badges_earned: number;
  workspace_rank: number | null;
  days_since_joined: number;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { currencyName } = useCurrency();
  const username = params.username as string;
  const { profile: contextProfile, isLoading: isContextLoading } = useUser();

  const [viewedProfile, setViewedProfile] = useState<Profile | null>(null);
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [userBadges, setUserBadges] = useState<BadgeWithProgress[]>([]);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfileData = useCallback(async () => {
    // If context is loading, wait
    if (isContextLoading) return;
    
    // If no context profile (and not loading), auth issue
    if (!contextProfile) {
        // ProtectedRoute should handle this, but safe fallback
        return; 
    }

    try {
      setLoading(true);
      setError(null);

      // Check if we're viewing our own profile to avoid a fetch
      let profileToView: Profile | null = null;
      
      const isViewingSelf = 
        contextProfile.username === username || 
        contextProfile.email.split('@')[0] === username ||
        contextProfile.id === username; // Handle ID lookup if needed

      if (isViewingSelf) {
        console.log('Viewing own profile from context');
        profileToView = contextProfile;
      } else {
        console.log('Fetching other profile:', username);
        // Fetch other user's profile
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setError('Authentication required');
            return;
        }

        const response = await fetch(`/api/profile/${username}`, {
            headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            },
        });

        const result = await response.json();
        if (!result.success) {
            console.error('API error:', result.error);
            setError(result.error || 'Failed to load profile');
            return;
        }
        profileToView = result.data.profile;
      }

      if (!profileToView) {
          setError('Profile not found');
          return;
      }

      setViewedProfile(profileToView);

      // Fetch related data (badges, transactions)
      const [badges, transactionsResult] = await Promise.all([
        contextProfile.workspace_id
          ? getWorkspaceBadges(contextProfile.workspace_id, profileToView.id)
          : Promise.resolve<BadgeWithProgress[]>([]),
        getTransactionsByProfileClient(profileToView.id, {
          limit: 10,
          sort: [{ field: 'created_at', order: 'desc' }],
        }),
      ]);

      const transactions = transactionsResult.data || [];

      setUserBadges(badges);
      setRecentTransactions(transactions);

      const sent = transactions.filter(
        (t) => t.sender_profile_id === profileToView!.id
      );
      const received = transactions.filter(
        (t) => t.receiver_profile_id === profileToView!.id
      );
      const badgesEarned = badges.filter((b) => b.earned).length;
      const daysSinceJoined = Math.floor(
        (Date.now() - new Date(profileToView.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      setProfileStats({
        total_sent: sent.reduce((sum, t) => sum + t.amount, 0),
        total_received: received.reduce((sum, t) => sum + t.amount, 0),
        transaction_count: transactions.length,
        badges_earned: badgesEarned,
        workspace_rank: null,
        days_since_joined: Math.max(daysSinceJoined, 0),
      });
    } catch (err) {
      console.error('Failed to load profile data:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [username, contextProfile, isContextLoading]);

  const handleProfileUpdated = useCallback((updatedProfile: Profile) => {
    setViewedProfile(updatedProfile);
    // Reload profile data to ensure everything is fresh
    loadProfileData();
  }, [loadProfileData]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const isOwnProfile = contextProfile?.id === viewedProfile?.id;

  if (loading || isContextLoading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !viewedProfile) {
    return (
      <ProtectedRoute>
        <div className="p-4 md:p-6 space-y-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Button 
                variant="outline" 
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
            
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <User className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {error || 'Profile not found'}
                </h3>
                <p className="text-gray-600">
                  This user might not exist or is not in your workspace.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>

          {/* Profile Header */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Avatar and Basic Info */}
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={viewedProfile.avatar_url || undefined} alt={viewedProfile.full_name || viewedProfile.email} />
                    <AvatarFallback className="text-2xl">
                      {getUserDisplayName(viewedProfile).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="text-center md:text-left">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {getUserDisplayName(viewedProfile)}
                    </h1>
                    <p className="text-lg text-gray-600">@{username}</p>
                    {viewedProfile.department && (
                      <p className="text-gray-600 flex items-center gap-1 mt-1">
                        <Briefcase className="h-4 w-4" />
                        {viewedProfile.department}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-gray-500 text-sm mt-2">
                      <Calendar className="h-4 w-4" />
                      Joined {profileStats?.days_since_joined || 0} days ago
                    </div>
                  </div>
                </div>

                {/* Bio and Links */}
                <div className="flex-1 md:ml-6">
                  
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-100 text-blue-800">
                        {viewedProfile.role.replace('_', ' ').toUpperCase()}
                      </Badge>
                      
                      {isOwnProfile && (
                        <Badge variant="secondary">You</Badge>
                      )}

                    </div>
                    
                    {/* Achievements Preview */}
                    {userBadges.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <Award className="h-4 w-4" />
                            Achievements
                          </h4>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowAllBadges(true)}
                            className="text-xs h-6 px-2 hover:bg-gray-100"
                          >
                            See all
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {userBadges.filter(b => b.earned).slice(0, 4).map(badge => (
                            <CompactBadge 
                              key={badge.id} 
                              badge={badge} 
                              size="sm" 
                              className="relative"
                            />
                          ))}
                          {userBadges.filter(b => b.earned).length > 4 && (
                            <div className="w-12 h-12 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">
                              +{userBadges.filter(b => b.earned).length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Edit Profile Button */}
                    {isOwnProfile && (
                      <div className="mt-3">
                        <Button
                          onClick={() => setShowEditProfile(true)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 text-sm"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Profile
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          {profileStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrencyAmount(profileStats.total_received, currencyName)}
                  </div>
                  <div className="text-xs text-gray-500">Received</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingDown className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrencyAmount(profileStats.total_sent, currencyName)}
                  </div>
                  <div className="text-xs text-gray-500">Sent</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {profileStats.transaction_count}
                  </div>
                  <div className="text-xs text-gray-500">Transactions</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Award className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {profileStats.badges_earned}
                  </div>
                  <div className="text-xs text-gray-500">Badges</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs Content */}
          <Tabs defaultValue="activity" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="badges">Badges</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentTransactions.length > 0 ? (
                    <div className="space-y-4">
                      {recentTransactions.map((transaction) => {
                        const isSent = transaction.sender_profile_id === viewedProfile.id;
                        const otherProfile = isSent ? transaction.receiver_profile : transaction.sender_profile;
                        
                        return (
                          <div key={transaction.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-lg">
                            <UserAvatar user={otherProfile} size="md" />
                            
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="font-medium">
                                  {isSent ? 'Sent' : 'Received'} {formatCurrencyAmount(transaction.amount, currencyName)}
                                </span>
                                {' '}
                                {isSent ? 'to' : 'from'} <span className="font-medium">{getUserDisplayName(otherProfile)}</span>
                              </p>
                              {transaction.message && (
                                <p className="text-xs text-gray-600 mt-1">&ldquo;{transaction.message}&rdquo;</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">{formatDate(transaction.created_at)}</p>
                            </div>
                            
                            <div className={`font-bold ${isSent ? 'text-red-600' : 'text-green-600'}`}>
                              {isSent ? '-' : '+'}
                              {formatCurrencyAmount(transaction.amount, currencyName)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No recent activity</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="badges">
              {userBadges.length > 0 ? (
                <BadgesList 
                  badges={userBadges}
                  showProgress={true}
                  title={`${getUserDisplayName(viewedProfile)}'s Achievements`}
                  emptyMessage={`${getUserDisplayName(viewedProfile)} hasn't earned any badges yet`}
                />
              ) : (
                <Card>
                  <CardContent className="text-center py-16">
                    <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Achievements Yet</h3>
                    <p className="text-gray-600 mb-4">
                      {isOwnProfile 
                        ? `Start sending ${currencyName.toLowerCase()} and being active to earn your first badge!`
                        : `${getUserDisplayName(viewedProfile)} hasn't earned any badges yet.`
                      }
                    </p>
                    {isOwnProfile && (
                      <Button
                        onClick={async () => {
                          try {
                            const awardedBadges = await checkAndAwardBadges(contextProfile!.id);
                            if (awardedBadges.length > 0) {
                              toast.success(`🎉 You earned ${awardedBadges.length} new badge${awardedBadges.length > 1 ? 's' : ''}!`);
                              await loadProfileData();
                            } else {
                              toast.info('No new badges earned. Keep being awesome!');
                            }
                          } catch (err) {
                            console.error('Error checking badges:', err);
                            toast.error('Failed to check badges');
                          }
                        }}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        <Award className="mr-2 h-4 w-4" />
                        Check for New Badges
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="about">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    About {getUserDisplayName(viewedProfile)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{viewedProfile.email}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Workspace Info</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{viewedProfile.role.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Joined {new Date(viewedProfile.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Slack Integration - Only show for own profile */}
                  {isOwnProfile && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Integrations</h4>
                      <SlackConnection 
                        profileId={viewedProfile.id}
                        onConnectionChange={(connected) => {
                          console.log('Slack connection changed:', connected);
                          // Optionally reload profile data or show a toast
                        }}
                      />
                    </div>
                  )}

                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* All Badges Modal */}
      <Dialog open={showAllBadges} onOpenChange={setShowAllBadges}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              {getUserDisplayName(viewedProfile)}&apos;s Achievements
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <BadgesList 
              badges={userBadges}
              showProgress={true}
              title=""
              emptyMessage={`${getUserDisplayName(viewedProfile)} hasn't earned any badges yet`}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Edit Profile Dialog */}
      {contextProfile && isOwnProfile && (
        <EditProfileDialog
          open={showEditProfile}
          onOpenChange={setShowEditProfile}
          profile={viewedProfile}
          onProfileUpdated={handleProfileUpdated}
        />
      )}
    </ProtectedRoute>
  );
}
