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
} from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Profile, Workspace } from '@/lib/supabase-types';
import { WorkspaceMember } from '@/lib/types';
import { toast } from 'sonner';
import { getCurrentProfile } from '@/lib/permissions';

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

  useEffect(() => {
    loadProfileAndWorkspaces();
  }, [loadProfileAndWorkspaces]);

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
        p_currency_name: 'karma',
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
      
      // First, try to update existing invitation
      const { data: updateData, error: updateError } = await supabase
        .from('invitations')
        .update({ 
          code: newReadableCode    // Update human-readable code
        })
        .eq('workspace_id', workspaceId)
        .eq('active', true)
        .select();
        
      console.log('Update result:', { updateData, updateError });
        
      if (updateError) {
        // If update fails, create a new invitation
        console.log('No existing invitation found, creating new one');
        
        if (!currentProfile?.id) {
          throw new Error('User profile not found');
        }
        
        const { data: insertData, error: insertError } = await supabase
          .from('invitations')
          .insert({
            workspace_id: workspaceId,
            code: newReadableCode,          // Human-readable code
            created_by_profile_id: currentProfile.id,
            uses_count: 0,
            active: true
          })
          .select();
          
        console.log('Insert result:', { insertData, insertError });
          
        if (insertError) {
          console.error('Error creating invite:', {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code,
            full: insertError
          });
          throw insertError;
        }
      }
      
      console.log('About to refresh UI with new code:', newReadableCode);
      toast.success(`Invite code regenerated: ${newReadableCode}`);
      await loadProfileAndWorkspaces();
    } catch (err) {
      console.error('Failed to regenerate invite code:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      toast.error(`Could not regenerate invite code: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const canManageWorkspace = (role: string) =>
    role === 'admin' || role === 'super_admin';

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
              <Button>
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
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create Workspace</Button>
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
                  Create your first workspace to get started with Karma
                  recognition.
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
                  </Tabs>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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
                variant="outline" 
                onClick={() => setEditingSettings(false)}
              >
                Cancel
              </Button>
              <Button 
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