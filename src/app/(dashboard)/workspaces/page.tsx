'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  Users,
  Plus,
  Copy,
  ExternalLink,
  RefreshCw,
  Gift,
  ShoppingCart,
  Star,
  X,
  Eye,
  Edit,
  Trash2,
  Filter,
} from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Profile, Workspace } from '@/lib/supabase-types';
import { WorkspaceMember } from '@/lib/types';
import { toast } from 'sonner';
import { getCurrentProfile } from '@/lib/permissions';
import { 
  getWorkspaceRewards,
  getWorkspaceRewardCategories,
  getWorkspaceRedemptions,
  createReward,
  updateReward,
  deleteReward,
  redeemReward,
  updateRedemptionStatus,
  type RewardWithTags
} from '@/lib/database/rewards-client';
import type { Database } from '@/lib/database.types';

type RewardRedemption = Database['public']['Tables']['reward_redemptions']['Row'];

interface WorkspaceWithMembers extends Workspace {
  members: WorkspaceMember[];
  role: 'super_admin' | 'admin' | 'employee';
  invite_code?: string;
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [newWorkspaceData, setNewWorkspaceData] = useState<{ name?: string }>({});
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsData, setSettingsData] = useState<{
    min_transaction_amount?: number;
    max_transaction_amount?: number;
    daily_limit_percentage?: number;
    currency_name?: string;
  }>({});
  const [selectedRewardTags, setSelectedRewardTags] = useState<string[]>([]);
  const [rewards, setRewards] = useState<RewardWithTags[]>([]);
  const [rewardCategories, setRewardCategories] = useState<string[]>([]);
  const [redemptions, setRedemptions] = useState<(RewardRedemption & {
    profile: { full_name: string | null; email: string; username: string | null };
    reward: { title: string; price: number };
  })[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [showCreateRewardDialog, setShowCreateRewardDialog] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardWithTags | null>(null);
  const [newRewardData, setNewRewardData] = useState<{
    title?: string;
    description?: string;
    price?: number;
    category?: string;
  }>({});

  const generateInviteCode = () => {
    // Generate a proper 6-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const loadProfileAndWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user profile
      const profileData = await getCurrentProfile();
      if (!profileData) {
        throw new Error('User profile not found');
      }
      setCurrentProfile(profileData);

      // Get workspace data with members
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', profileData.workspace_id)
        .single();

      if (workspaceError) throw workspaceError;

      // Get workspace settings
      const { data: workspaceSettings } = await supabase
        .from('workspace_settings')
        .select('*')
        .eq('workspace_id', profileData.workspace_id)
        .single();

      // Get workspace members
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('workspace_id', profileData.workspace_id);

      if (membersError) throw membersError;

      // Get active invitation codes (human-readable codes)
      const { data: invitations } = await supabase
        .from('invitations')
        .select('code')
        .eq('workspace_id', profileData.workspace_id)
        .eq('active', true)
        .limit(1)
        .single();

      // If no invitation exists, create one
      let inviteCode = invitations?.code;
      if (!inviteCode && profileData.role === 'super_admin') {
        const readableCode = generateInviteCode();
        // token is auto-generated UUID by database
        
        const { error: createInviteError } = await supabase
          .from('invitations')
          .insert({
            workspace_id: profileData.workspace_id,
            code: readableCode,          // Human-readable 6-char code
            created_by_profile_id: profileData.id,
            uses_count: 0,
            active: true
            // token will be auto-generated as UUID by database
          });
        
        if (!createInviteError) {
          inviteCode = readableCode;
        }
      }

      // Construct workspace with members
      const workspaceWithMembers: WorkspaceWithMembers = {
        ...workspaceData,
        // Add settings from workspace_settings table or defaults
        min_transaction_amount: workspaceSettings?.min_transaction_amount || 1,
        max_transaction_amount: workspaceSettings?.max_transaction_amount || 50,
        daily_limit_percentage: workspaceSettings?.daily_limit_percentage || 30,
        members: (members || []).map(member => ({
          ...member,
          total_sent: 0, // These would need to be calculated from transactions
          total_received: 0,
          transaction_count: 0,
          auth_user: { id: member.auth_user_id, email: member.email, created_at: member.created_at } as { id: string; email: string; created_at: string }
        })),
        role: profileData.role as 'super_admin' | 'admin' | 'employee',
        invite_code: inviteCode
      };

      setWorkspaces([workspaceWithMembers]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRewardsData = useCallback(async (workspaceId: string) => {
    try {
      setLoadingRewards(true);
      
      const [rewardsData, categoriesData, redemptionsData] = await Promise.all([
        getWorkspaceRewards(workspaceId),
        getWorkspaceRewardCategories(workspaceId),
        canManageWorkspace(currentProfile?.role || '') ? getWorkspaceRedemptions(workspaceId) : Promise.resolve([])
      ]);
      
      // If no rewards exist and user is admin, create default rewards using SQL function
      if (rewardsData.length === 0 && canManageWorkspace(currentProfile?.role || '')) {
        try {
          console.log('No rewards found, creating default rewards using SQL function...');
          // Use the SQL function to create default rewards
          const { error } = await supabase.rpc('create_default_rewards_v2', {
            p_workspace_id: workspaceId
          });
          
          if (error) {
            throw error;
          }
          
          // Reload rewards after creating defaults
          const updatedRewards = await getWorkspaceRewards(workspaceId);
          const updatedCategories = await getWorkspaceRewardCategories(workspaceId);
          setRewards(updatedRewards);
          setRewardCategories(updatedCategories);
          toast.success('Default rewards have been set up for your workspace!');
        } catch (defaultRewardsError) {
          console.error('Error setting up default rewards:', defaultRewardsError);
          toast.error('Failed to set up default rewards');
          setRewards(rewardsData);
          setRewardCategories(categoriesData);
        }
      } else {
        setRewards(rewardsData);
        setRewardCategories(categoriesData);
      }
      
      setRedemptions(redemptionsData);
    } catch (err) {
      console.error('Error loading rewards data:', err);
      toast.error('Failed to load rewards data');
    } finally {
      setLoadingRewards(false);
    }
  }, [currentProfile?.role]);

  useEffect(() => {
    loadProfileAndWorkspaces();
  }, [loadProfileAndWorkspaces]);

  // Load rewards when workspace is ready
  useEffect(() => {
    if (currentProfile?.workspace_id) {
      loadRewardsData(currentProfile.workspace_id);
    }
  }, [currentProfile?.workspace_id, loadRewardsData]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentProfile) return;

    try {
      if (!currentProfile.email || !newWorkspaceData.name) {
        throw new Error('Missing required data');
      }
      
      const { error } = await supabase.rpc('create_workspace_with_owner', {
        p_name: newWorkspaceData.name,
        p_slug: newWorkspaceData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        p_currency_name: 'karma', // Default fallback - workspace can change this later
        p_monthly_allowance: 100,
        p_owner_email: currentProfile.email,
      });

      if (error) {
        throw error;
      }

      setShowCreateDialog(false);
      setNewWorkspaceData({});

      await loadProfileAndWorkspaces();
      toast.success(`Successfully created the "${newWorkspaceData.name}" workspace.`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(`Error creating workspace: ${errorMessage}`);
    }
  };

  const handleEditSettings = (workspace: WorkspaceWithMembers) => {
    setSettingsData({
      min_transaction_amount: workspace.min_transaction_amount,
      max_transaction_amount: workspace.max_transaction_amount,
      daily_limit_percentage: workspace.daily_limit_percentage,
      currency_name: workspace.currency_name,
    });
    setEditingSettings(true);
  };

  const handleSaveSettings = async (workspaceId: string) => {
    try {
      // Update workspace settings
      const { error: settingsError } = await supabase
        .from('workspace_settings')
        .upsert({
          workspace_id: workspaceId,
          min_transaction_amount: settingsData.min_transaction_amount,
          max_transaction_amount: settingsData.max_transaction_amount,
          daily_limit_percentage: settingsData.daily_limit_percentage,
          currency_name: settingsData.currency_name,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'workspace_id',
          ignoreDuplicates: false
        });

      if (settingsError) throw settingsError;

      // Update workspace currency name if changed
      if (settingsData.currency_name) {
        const { error: workspaceError } = await supabase
          .from('workspaces')
          .update({ currency_name: settingsData.currency_name })
          .eq('id', workspaceId);

        if (workspaceError) throw workspaceError;
      }

      setEditingSettings(false);
      toast.success('Settings updated successfully!');
      await loadProfileAndWorkspaces();
    } catch (err) {
      console.error('Failed to update settings:', err);
      toast.error('Failed to update settings.');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'employee':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const copyInviteCode = (inviteCode: string) => {
    navigator.clipboard.writeText(inviteCode);
    toast.success('Invite code copied to clipboard!');
  };

  const copyInviteLink = (inviteCode: string) => {
    const inviteLink = `${window.location.origin}/onboarding/join?code=${inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied to clipboard!');
  };

  const handleRegenerateInviteCode = async (workspaceId: string) => {
    try {
      const newReadableCode = generateInviteCode();
      console.log('Generating new code:', newReadableCode);
      
      // First, disable all existing invitations
      await supabase
        .from('invitations')
        .update({ active: false })
        .eq('workspace_id', workspaceId)
        .eq('active', true);
      
      // Create a new invitation
      if (!currentProfile?.id) {
        throw new Error('User profile not found');
      }
      
      const { data: insertData, error: insertError } = await supabase
        .from('invitations')
        .insert({
          workspace_id: workspaceId,
          code: newReadableCode,
          created_by_profile_id: currentProfile.id,
          uses_count: 0,
          active: true
        })
        .select();
        
      console.log('Insert result:', { insertData, insertError });
        
      if (insertError) {
        console.error('Error creating invite:', insertError);
        throw insertError;
      }
      
      // Update the UI state directly without full reload
      setWorkspaces(prev => 
        prev.map(workspace => 
          workspace.id === workspaceId 
            ? { ...workspace, invite_code: newReadableCode }
            : workspace
        )
      );
      
      console.log('Updated UI with new code:', newReadableCode);
      toast.success(`New invite code: ${newReadableCode}`);
    } catch (err) {
      console.error('Failed to regenerate invite code:', err);
      toast.error(`Could not regenerate invite code: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const canManageWorkspace = (role: string) =>
    role === 'admin' || role === 'super_admin';

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRewardData.title || !newRewardData.price || !currentProfile?.workspace_id) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      await createReward({
        workspace_id: currentProfile.workspace_id,
        title: newRewardData.title,
        description: newRewardData.description || null,
        price: newRewardData.price,
        category: newRewardData.category || 'General',
        created_by_profile_id: currentProfile.id,
      });
      
      setShowCreateRewardDialog(false);
      setNewRewardData({});
      toast.success('Reward created successfully!');
      
      // Reload rewards data
      if (currentProfile.workspace_id) {
        await loadRewardsData(currentProfile.workspace_id);
      }
    } catch (err) {
      console.error('Error creating reward:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create reward');
    }
  };

  const handleEditReward = (reward: RewardWithTags) => {
    setEditingReward(reward);
    setNewRewardData({
      title: reward.title,
      description: reward.description || '',
      price: reward.price,
      category: reward.category,
    });
    setShowCreateRewardDialog(true);
  };

  const handleUpdateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRewardData.title || !newRewardData.price || !editingReward) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      await updateReward(editingReward.id, {
        title: newRewardData.title,
        description: newRewardData.description || null,
        price: newRewardData.price,
        category: newRewardData.category || 'General',
      });
      
      setShowCreateRewardDialog(false);
      setEditingReward(null);
      setNewRewardData({});
      toast.success('Reward updated successfully!');
      
      // Reload rewards data
      if (currentProfile?.workspace_id) {
        await loadRewardsData(currentProfile.workspace_id);
      }
    } catch (err) {
      console.error('Error updating reward:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update reward');
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    try {
      await deleteReward(rewardId);
      toast.success('Reward deleted successfully!');
      
      // Reload rewards data
      if (currentProfile?.workspace_id) {
        await loadRewardsData(currentProfile.workspace_id);
      }
    } catch (err) {
      console.error('Error deleting reward:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete reward');
    }
  };

  const handleRedeemReward = async (rewardId: string) => {
    if (!currentProfile?.id || !currentProfile?.workspace_id) {
      toast.error('User profile not found');
      return;
    }
    
    try {
      await redeemReward(currentProfile.workspace_id, currentProfile.id, rewardId);
      toast.success('Reward redeemed successfully! Pending admin approval.');
      
      // Reload profile and rewards data
      await Promise.all([
        loadProfileAndWorkspaces(),
        loadRewardsData(currentProfile.workspace_id)
      ]);
    } catch (err) {
      console.error('Error redeeming reward:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to redeem reward');
    }
  };

  const handleToggleTag = (tag: string) => {
    setSelectedRewardTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleRefreshRewards = async (workspaceId: string) => {
    try {
      setLoadingRewards(true);
      
      // Use the SQL function to refresh rewards
      const { data, error } = await supabase.rpc('refresh_workspace_rewards', {
        p_workspace_id: workspaceId
      });
      
      if (error) {
        throw error;
      }
      
      // Reload rewards data
      await loadRewardsData(workspaceId);
      toast.success(`Rewards refreshed successfully! ${data}`);
    } catch (err) {
      console.error('Error refreshing rewards:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to refresh rewards');
    } finally {
      setLoadingRewards(false);
    }
  };

  const filteredRewards = rewards.filter(reward => {
    if (selectedRewardTags.length === 0) return true;
    return reward.tags?.some(tag => selectedRewardTags.includes(tag));
  });

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Workspaces</h1>
            <p className="text-gray-600 mt-2">
              Manage your workspaces and settings
            </p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Create Workspace
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Workspace</DialogTitle>
                <DialogDescription>
                  Set up a new workspace for your team to collaborate and
                  recognize each other&apos;s contributions.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateWorkspace} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="name">Workspace Name</Label>
                    <Input
                      id="name"
                      value={newWorkspaceData.name ?? ''}
                      onChange={(e) =>
                        setNewWorkspaceData({
                          ...newWorkspaceData,
                          name: e.target.value,
                        })
                      }
                      placeholder="My Company Workspace"
                      required
                    />
                  </div>
                </div>

                {error && <div className="text-red-600 text-sm">{error}</div>}

                <DialogFooter>
                  <Button
                    type="button"
                    className="bg-[#F5F5F5] border-none shadow-none text-gray-700 hover:bg-[#E5E5E5]"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">Create Workspace</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {workspaces.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">
                  No workspaces yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Create your first workspace to get started with recognition currency.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Workspace
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {workspaces.map((workspace) => (
              <Card key={workspace.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {workspace.name}
                        <Badge className={getRoleBadgeColor(workspace.role)}>
                          {workspace.role.replace('_', ' ')}
                        </Badge>
                      </CardTitle>
                    </div>
                    <div className="flex gap-2">
                      {canManageWorkspace(workspace.role) && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditSettings(workspace)}
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Users className="mr-2 h-4 w-4" />
                        Members ({workspace.members?.length || 0})
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <Tabs defaultValue="overview" className="w-full mt-4">
                    <TabsList>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                      <TabsTrigger value="members">Members</TabsTrigger>
                      <TabsTrigger value="rewards">Rewards</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                           <div className="text-2xl font-bold text-blue-600">
                             {workspace.currency_name}
                           </div>
                          <div className="text-sm text-gray-600">Currency</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {workspace.min_transaction_amount}-
                            {workspace.max_transaction_amount}
                          </div>
                          <div className="text-sm text-gray-600">
                            Transaction Range
                          </div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {workspace.daily_limit_percentage}%
                          </div>
                          <div className="text-sm text-gray-600">
                            Daily Limit
                          </div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {workspace.members?.length || 0}
                          </div>
                          <div className="text-sm text-gray-600">Members</div>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3">Invite Members</h4>
                        <div className="space-y-4">
                          {/* Current Invite Code */}
                          <div>
                            <Label className="text-sm text-gray-600 mb-2 block">Current Invite Code</Label>
                            <div className="p-3 bg-gray-50 rounded-lg border">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-lg font-bold tracking-wider">
                                  {workspace.invite_code || 'No invite code'}
                                </span>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      workspace.invite_code && copyInviteCode(workspace.invite_code)
                                    }
                                  >
                                    <Copy className="mr-1 h-3 w-3" />
                                    Copy
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (workspace.invite_code) {
                                        copyInviteLink(workspace.invite_code);
                                      }
                                    }}
                                  >
                                    <ExternalLink className="mr-1 h-3 w-3" />
                                    Link
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Management Actions */}
                          {canManageWorkspace(workspace.role) && (
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  handleRegenerateInviteCode(workspace.id)
                                }
                                className="w-full sm:w-auto"
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Generate New Code
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  // TODO: Show all active invitations dialog
                                  toast.info('Invite management coming soon!');
                                }}
                                className="w-full sm:w-auto"
                              >
                                <Settings className="mr-2 h-4 w-4" />
                                Manage Invites
                              </Button>
                            </div>
                          )}
                          
                          <p className="text-sm text-gray-500">
                            Share the invite code or link with team members to invite them to your workspace.
                          </p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-6">
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h5 className="font-medium text-blue-900 mb-2">Currency Settings</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-blue-800">Currency Name:</span>
                              <span className="text-sm text-blue-700 font-mono bg-white px-2 py-1 rounded">
                                {workspace.currency_name}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-blue-800">Currency Symbol:</span>
                              <span className="text-sm text-blue-700 font-mono bg-white px-2 py-1 rounded">
                                {workspace.currency_name}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h5 className="font-medium text-green-900 mb-2">Transaction Limits</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-green-800">Minimum Amount:</span>
                              <span className="text-sm text-green-700 font-mono bg-white px-2 py-1 rounded">
                                {workspace.min_transaction_amount} {workspace.currency_name}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-green-800">Maximum Amount:</span>
                              <span className="text-sm text-green-700 font-mono bg-white px-2 py-1 rounded">
                                {workspace.max_transaction_amount} {workspace.currency_name}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <h5 className="font-medium text-purple-900 mb-2">Daily Usage Limits</h5>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-purple-800">Daily Limit Percentage:</span>
                            <span className="text-sm text-purple-700 font-mono bg-white px-2 py-1 rounded">
                              {workspace.daily_limit_percentage}% of daily balance
                            </span>
                          </div>
                        </div>
                      </div>

                      {canManageWorkspace(workspace.role) && (
                        <div className="pt-4 border-t">
                          <Button onClick={() => handleEditSettings(workspace)} className="w-full sm:w-auto">
                            <Settings className="mr-2 h-4 w-4" />
                            Edit Settings
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="members" className="space-y-4">
                      <div className="space-y-2">
                        {workspace.members?.map((member) => (
                          <div
                            key={member.id}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <div className="font-medium">
                                {member.full_name || member.email}
                              </div>
                              <div className="text-sm text-gray-500">
                                Joined{' '}
                                {new Date(
                                  member.created_at
                                ).toLocaleDateString()}
                              </div>
                            </div>
                            <Badge className={getRoleBadgeColor(member.role)}>
                              {member.role.replace('_', ' ')}
                            </Badge>
                          </div>
                        )) || (
                          <div className="text-center text-gray-500 py-8">
                            No members found
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="rewards" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-lg flex items-center gap-2">
                            <Gift className="h-5 w-5 text-green-600" />
                            Rewards Catalog
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {canManageWorkspace(workspace.role) 
                              ? `Manage rewards that team members can redeem with their ${workspace.currency_name}`
                              : `Redeem rewards with your ${workspace.currency_name} balance`
                            }
                          </p>
                        </div>
                        {canManageWorkspace(workspace.role) && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                if (confirm('This will reset all rewards to the latest defaults for this workspace. Continue?')) {
                                  handleRefreshRewards(workspace.id);
                                }
                              }}
                              variant="outline"
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              title="Reset all rewards to the latest default set (Learning & Time Off focus)"
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Reset to Defaults
                            </Button>
                            <Button
                              onClick={() => setShowCreateRewardDialog(true)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Reward
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Tag Filters */}
                      {rewardCategories.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Filter by category:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant={selectedRewardTags.length === 0 ? "default" : "outline"}
                              onClick={() => setSelectedRewardTags([])}
                              className="h-8 text-xs"
                            >
                              All ({rewards.length})
                            </Button>
                            {rewardCategories.map(category => {
                              const isSelected = selectedRewardTags.includes(category);
                              const count = rewards.filter(r => r.category === category).length;
                              return (
                                <Button
                                  key={category}
                                  size="sm"
                                  variant={isSelected ? "default" : "outline"}
                                  onClick={() => handleToggleTag(category)}
                                  className="h-8 text-xs"
                                >
                                  {category} ({count})
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Rewards Grid */}
                      {loadingRewards ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                          <p className="text-gray-500 text-sm mt-2">Loading rewards...</p>
                        </div>
                      ) : filteredRewards.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRewards.map((reward) => {
                          const canAfford = currentProfile ? currentProfile.redeemable_balance >= reward.price : false;
                          const categoryColors: Record<string, string> = {
                            'Learning': 'bg-orange-100 text-orange-800',
                            'Time Off': 'bg-green-100 text-green-800',
                            'Growth': 'bg-blue-100 text-blue-800',
                            'Wellness': 'bg-emerald-100 text-emerald-800',
                            'Recognition': 'bg-yellow-100 text-yellow-800',
                            'Office Perks': 'bg-pink-100 text-pink-800'
                          };
                          
                          return (
                            <Card key={reward.id} className="group hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                  {/* Category Icon and Badge */}
                                  <div className="flex items-center gap-2 mb-3">
                                    <Gift className="h-5 w-5 text-green-600" />
                                    {reward.category && (
                                      <Badge 
                                        className={`text-xs ${categoryColors[reward.category] || 'bg-gray-100 text-gray-800'}`}
                                      >
                                        {reward.category}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {/* Title and Description */}
                                  <h5 className="font-semibold text-gray-900 mb-2">{reward.title}</h5>
                                  <p className="text-sm text-gray-600 mb-4">{reward.description || 'No description provided'}</p>
                                  
                                  {/* Price and Actions */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Star className="h-4 w-4 text-yellow-500" />
                                      <span className="font-bold text-lg">
                                        {reward.price} {workspace.currency_name}
                                      </span>
                                    </div>
                                    
                                    {canManageWorkspace(workspace.role) ? (
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleEditReward(reward)}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            if (confirm(`Are you sure you want to delete "${reward.title}"?`)) {
                                              handleDeleteReward(reward.id);
                                            }
                                          }}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        size="sm"
                                        disabled={!canAfford}
                                        onClick={() => {
                                          if (canAfford) {
                                            if (confirm(`Are you sure you want to redeem "${reward.title}" for ${reward.price} ${workspace.currency_name}?`)) {
                                              handleRedeemReward(reward.id);
                                            }
                                          }
                                        }}
                                        className={canAfford ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                                      >
                                        {canAfford ? (
                                          <>
                                            <ShoppingCart className="mr-1 h-3 w-3" />
                                            Redeem
                                          </>
                                        ) : (
                                          <>
                                            <X className="mr-1 h-3 w-3" />
                                            Need {reward.price - (currentProfile?.redeemable_balance || 0)} more
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                          <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {selectedRewardTags.length > 0 ? 'No rewards in selected categories' : 'No rewards available'}
                          </h3>
                          <p className="text-gray-500 text-sm mb-4">
                            {selectedRewardTags.length > 0 
                              ? 'Try selecting different categories or clear all filters'
                              : canManageWorkspace(workspace.role) 
                                ? 'Create your first reward to get started'
                                : 'Check back later for new rewards'
                            }
                          </p>
                          {selectedRewardTags.length > 0 ? (
                            <Button
                              variant="outline"
                              onClick={() => setSelectedRewardTags([])}
                            >
                              Clear Filters
                            </Button>
                          ) : canManageWorkspace(workspace.role) ? (
                            <Button
                              onClick={() => setShowCreateRewardDialog(true)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Create First Reward
                            </Button>
                          ) : null}
                        </div>
                      )}

                      {/* Admin Section - Redemption Requests */}
                      {canManageWorkspace(workspace.role) && (
                        <div className="border-t pt-6 mt-6">
                          <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <Eye className="h-5 w-5 text-blue-600" />
                            Redemption Requests
                          </h4>
                          
                          {/* Real redemption requests */}
                          <div className="space-y-3">
                            {redemptions.length > 0 ? (
                              redemptions.map((redemption) => (
                                <div key={redemption.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h5 className="font-medium text-gray-900">{redemption.reward.title}</h5>
                                        <Badge className={{
                                          'pending': 'bg-yellow-100 text-yellow-800',
                                          'approved': 'bg-green-100 text-green-800',
                                          'rejected': 'bg-red-100 text-red-800',
                                          'fulfilled': 'bg-blue-100 text-blue-800',
                                          'cancelled': 'bg-gray-100 text-gray-800'
                                        }[redemption.status] || 'bg-gray-100 text-gray-800'}>
                                          {redemption.status}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-gray-600 mb-1">
                                        Requested by: <span className="font-medium">
                                          {redemption.profile.full_name || redemption.profile.username || redemption.profile.email}
                                        </span>
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        Cost: {redemption.reward.price} {workspace.currency_name} • 
                                        {new Date(redemption.created_at).toLocaleDateString()}
                                      </p>
                                      {redemption.admin_note && (
                                        <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                                          <span className="font-medium">Admin Note:</span> {redemption.admin_note}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                      {redemption.status === 'pending' && (
                                        <>
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              updateRedemptionStatus(redemption.id, 'approved')
                                                .then(() => {
                                                  toast.success('Redemption approved!');
                                                  if (currentProfile?.workspace_id) {
                                                    loadRewardsData(currentProfile.workspace_id);
                                                  }
                                                })
                                                .catch((err) => {
                                                  console.error('Error approving redemption:', err);
                                                  toast.error('Failed to approve redemption');
                                                });
                                            }}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                          >
                                            Approve
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              const reason = prompt('Reason for rejection (optional):');
                                              updateRedemptionStatus(redemption.id, 'rejected', reason || undefined)
                                                .then(() => {
                                                  toast.success('Redemption rejected');
                                                  if (currentProfile?.workspace_id) {
                                                    loadRewardsData(currentProfile.workspace_id);
                                                  }
                                                })
                                                .catch((err) => {
                                                  console.error('Error rejecting redemption:', err);
                                                  toast.error('Failed to reject redemption');
                                                });
                                            }}
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            Reject
                                          </Button>
                                        </>
                                      )}
                                      {redemption.status === 'approved' && (
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            updateRedemptionStatus(redemption.id, 'fulfilled')
                                              .then(() => {
                                                toast.success('Redemption marked as fulfilled!');
                                                if (currentProfile?.workspace_id) {
                                                  loadRewardsData(currentProfile.workspace_id);
                                                }
                                              })
                                              .catch((err) => {
                                                console.error('Error fulfilling redemption:', err);
                                                toast.error('Failed to mark as fulfilled');
                                              });
                                          }}
                                          className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                          Mark Fulfilled
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8 bg-gray-50 rounded-lg">
                                <Eye className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">No redemption requests yet</p>
                                <p className="text-gray-400 text-xs mt-1">
                                  Redemption requests will appear here when team members redeem rewards
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Reward Dialog */}
        <Dialog open={showCreateRewardDialog} onOpenChange={setShowCreateRewardDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingReward ? 'Edit Reward' : 'Create New Reward'}</DialogTitle>
              <DialogDescription>
                {editingReward ? 'Update the reward details.' : 'Add a new reward that team members can redeem with their currency.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={editingReward ? handleUpdateReward : handleCreateReward} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="reward-title">Reward Title *</Label>
                  <Input
                    id="reward-title"
                    value={newRewardData.title || ''}
                    onChange={(e) => setNewRewardData({
                      ...newRewardData,
                      title: e.target.value
                    })}
                    placeholder="$25 Gift Card"
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="reward-description">Description</Label>
                  <Input
                    id="reward-description"
                    value={newRewardData.description || ''}
                    onChange={(e) => setNewRewardData({
                      ...newRewardData,
                      description: e.target.value
                    })}
                    placeholder="A great way to treat yourself"
                  />
                </div>

                <div>
                  <Label htmlFor="reward-price">Price (in {workspaces[0]?.currency_name || 'karma'}) *</Label>
                  <Input
                    id="reward-price"
                    type="number"
                    value={newRewardData.price || ''}
                    onChange={(e) => setNewRewardData({
                      ...newRewardData,
                      price: parseInt(e.target.value) || undefined
                    })}
                    placeholder="250"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="reward-category">Category</Label>
                  <Input
                    id="reward-category"
                    value={newRewardData.category || ''}
                    onChange={(e) => setNewRewardData({
                      ...newRewardData,
                      category: e.target.value
                    })}
                    placeholder="Gift Cards"
                    list="categories"
                  />
                  <datalist id="categories">
                    <option value="Learning" />
                    <option value="Time Off" />
                    <option value="Growth" />
                    <option value="Wellness" />
                    <option value="Recognition" />
                    <option value="Office Perks" />
                  </datalist>
                </div>

              </div>

              <DialogFooter>
                <Button
                  type="button"
                  className="bg-[#F5F5F5] border-none shadow-none text-gray-700 hover:bg-[#E5E5E5]"
                  onClick={() => {
                    setShowCreateRewardDialog(false);
                    setEditingReward(null);
                    setNewRewardData({});
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  {editingReward ? 'Update Reward' : 'Create Reward'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Settings Edit Dialog */}
        <Dialog open={editingSettings} onOpenChange={setEditingSettings}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Workspace Settings</DialogTitle>
              <DialogDescription>
                Update your workspace configuration and transaction limits.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dialog-currency-name">Currency Name</Label>
                  <Input
                    id="dialog-currency-name"
                    value={settingsData.currency_name || ''}
                    onChange={(e) => setSettingsData({
                      ...settingsData,
                      currency_name: e.target.value
                    })}
                    placeholder="Karma"
                  />
                </div>
                <div>
                  <Label htmlFor="dialog-min-amount">Min Transaction Amount</Label>
                  <Input
                    id="dialog-min-amount"
                    type="number"
                    value={settingsData.min_transaction_amount || ''}
                    onChange={(e) => setSettingsData({
                      ...settingsData,
                      min_transaction_amount: parseInt(e.target.value) || 1
                    })}
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="dialog-max-amount">Max Transaction Amount</Label>
                  <Input
                    id="dialog-max-amount"
                    type="number"
                    value={settingsData.max_transaction_amount || ''}
                    onChange={(e) => setSettingsData({
                      ...settingsData,
                      max_transaction_amount: parseInt(e.target.value) || 50
                    })}
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="dialog-daily-limit">Daily Limit Percentage</Label>
                  <Input
                    id="dialog-daily-limit"
                    type="number"
                    value={settingsData.daily_limit_percentage || ''}
                    onChange={(e) => setSettingsData({
                      ...settingsData,
                      daily_limit_percentage: parseInt(e.target.value) || 30
                    })}
                    min="1"
                    max="100"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                className="bg-[#F5F5F5] border-none shadow-none text-gray-700 hover:bg-[#E5E5E5]"
                onClick={() => setEditingSettings(false)}
              >
                Cancel
              </Button>
              <Button 
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  if (workspaces.length > 0) {
                    handleSaveSettings(workspaces[0].id);
                  }
                }}
              >
                Save Settings
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </ProtectedRoute>
  );
}