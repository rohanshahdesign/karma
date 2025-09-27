// Monthly balance reset utilities
// Handles monthly allowance resets for all profiles in workspaces

import { supabase } from './supabase';

export interface ResetResult {
  workspaceId: string;
  workspaceName: string;
  profilesReset: number;
  totalAllowanceAdded: number;
  errors: string[];
}

export interface ResetNotification {
  profileId: string;
  email: string;
  fullName: string | null;
  workspaceName: string;
  currencyName: string;
  newAllowance: number;
  previousBalance: number;
  newBalance: number;
}

// ============================================================================
// MONTHLY RESET FUNCTIONS
// ============================================================================

/**
 * Reset monthly allowances for a specific workspace
 */
export async function resetWorkspaceAllowances(workspaceId: string): Promise<ResetResult> {
  const result: ResetResult = {
    workspaceId,
    workspaceName: '',
    profilesReset: 0,
    totalAllowanceAdded: 0,
    errors: [],
  };

  try {
    // Get workspace details
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) {
      result.errors.push('Workspace not found');
      return result;
    }

    result.workspaceName = workspace.name;

    // Get all active profiles in the workspace
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('active', true);

    if (profilesError) {
      result.errors.push('Failed to fetch profiles: ' + profilesError.message);
      return result;
    }

    if (!profiles || profiles.length === 0) {
      result.errors.push('No active profiles found in workspace');
      return result;
    }

    // Reset allowances for each profile
    for (const profile of profiles) {
      try {
        const allowanceToAdd = getAllowanceForRole(profile.role, workspace.monthly_allowance);
        
        // Update giving balance
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            giving_balance: profile.giving_balance + allowanceToAdd,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id);

        if (updateError) {
          result.errors.push(`Failed to update profile ${profile.email}: ${updateError.message}`);
          continue;
        }

        result.profilesReset += 1;
        result.totalAllowanceAdded += allowanceToAdd;

        // Log the reset
        await logBalanceReset(profile.id, allowanceToAdd, 'monthly_reset');
        
      } catch (error) {
        result.errors.push(`Error processing profile ${profile.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  } catch (error) {
    result.errors.push(`General error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Reset monthly allowances for all workspaces
 */
export async function resetAllWorkspacesAllowances(): Promise<ResetResult[]> {
  const results: ResetResult[] = [];

  try {
    // Get all workspaces
    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select('id');

    if (error) {
      throw error;
    }

    if (!workspaces || workspaces.length === 0) {
      return results;
    }

    // Reset each workspace
    for (const workspace of workspaces) {
      const result = await resetWorkspaceAllowances(workspace.id);
      results.push(result);
    }

    return results;
  } catch (error) {
    // Return error result if we can't even get workspaces
    results.push({
      workspaceId: 'unknown',
      workspaceName: 'All Workspaces',
      profilesReset: 0,
      totalAllowanceAdded: 0,
      errors: [`Failed to reset workspaces: ${error instanceof Error ? error.message : 'Unknown error'}`],
    });
    return results;
  }
}

/**
 * Get notifications for users who received balance resets
 */
export async function getResetNotifications(workspaceId: string): Promise<ResetNotification[]> {
  const notifications: ResetNotification[] = [];

  try {
    // Get recent balance reset logs (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: resets, error } = await supabase
      .from('balance_reset_log')
      .select(`
        profile_id,
        amount_added,
        profiles (
          email,
          full_name,
          giving_balance,
          workspace:workspaces (
            name,
            currency_name
          )
        )
      `)
      .eq('profiles.workspace_id', workspaceId)
      .eq('reset_type', 'monthly_reset')
      .gte('created_at', yesterday.toISOString());

    if (error) {
      console.error('Failed to get reset notifications:', error);
      return notifications;
    }

    if (!resets) return notifications;

    for (const reset of resets) {
      if (reset.profiles) {
        const profilesArray = reset.profiles as Array<{ email: string; full_name: string | null; giving_balance: number; workspace: Array<{ name: string; currency_name: string }> }>;
        const profile = profilesArray[0];
        if (!profile) continue;
        const workspaceArray = profile.workspace;
        const workspace = workspaceArray[0];
        if (!workspace) continue;
        
        notifications.push({
          profileId: reset.profile_id,
          email: profile.email,
          fullName: profile.full_name,
          workspaceName: workspace.name,
          currencyName: workspace.currency_name,
          newAllowance: reset.amount_added,
          previousBalance: profile.giving_balance - reset.amount_added,
          newBalance: profile.giving_balance,
        });
      }
    }

    return notifications;
  } catch (error) {
    console.error('Error getting reset notifications:', error);
    return notifications;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get monthly allowance based on user role
 */
function getAllowanceForRole(role: string, baseAllowance: number): number {
  switch (role) {
    case 'super_admin':
      return Math.floor(baseAllowance * 1.5); // 50% more for super admins
    case 'admin':
      return Math.floor(baseAllowance * 1.2); // 20% more for admins
    case 'employee':
    default:
      return baseAllowance;
  }
}

/**
 * Log a balance reset for audit purposes
 */
async function logBalanceReset(
  profileId: string, 
  amountAdded: number, 
  resetType: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('balance_reset_log')
      .insert({
        profile_id: profileId,
        amount_added: amountAdded,
        reset_type: resetType,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to log balance reset:', error);
    }
  } catch (error) {
    console.error('Error logging balance reset:', error);
  }
}

/**
 * Check if monthly reset has already been performed this month
 */
export async function hasResetThisMonth(): Promise<boolean> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const { data, error } = await supabase
      .from('balance_reset_log')
      .select('id')
      .eq('reset_type', 'monthly_reset')
      .gte('created_at', startOfMonth.toISOString())
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error checking monthly reset status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in hasResetThisMonth:', error);
    return false;
  }
}

/**
 * Schedule the next monthly reset (this would typically be called by a cron job)
 */
export async function scheduleMonthlyReset(): Promise<void> {
  try {
    // This is where you would integrate with your cron job system
    // For now, we'll just perform the reset if it's a new month
    
    const results = await resetAllWorkspacesAllowances();
    
    // Log the overall results
    console.log('Monthly reset completed:', {
      timestamp: new Date().toISOString(),
      workspacesProcessed: results.length,
      totalProfilesReset: results.reduce((sum, r) => sum + r.profilesReset, 0),
      totalAllowanceAdded: results.reduce((sum, r) => sum + r.totalAllowanceAdded, 0),
      errorsCount: results.reduce((sum, r) => sum + r.errors.length, 0),
    });

    // Send notifications (this would integrate with your email system)
    await sendResetNotifications(results);
    
  } catch (error) {
    console.error('Error in monthly reset scheduler:', error);
  }
}

/**
 * Send reset notifications to users (placeholder for email integration)
 */
async function sendResetNotifications(results: ResetResult[]): Promise<void> {
  try {
    for (const result of results) {
      if (result.profilesReset > 0) {
        // Get notification data
        const notifications = await getResetNotifications(result.workspaceId);
        
        // Here you would integrate with your email service
        console.log(`Would send ${notifications.length} notifications for workspace ${result.workspaceName}`);
        
        // Example: await sendEmailNotifications(notifications);
      }
    }
  } catch (error) {
    console.error('Error sending reset notifications:', error);
  }
}

// ============================================================================
// MANUAL RESET FUNCTIONS (for admin use)
// ============================================================================

/**
 * Manually trigger a reset for a specific workspace (admin function)
 */
export async function manualWorkspaceReset(
  workspaceId: string,
  adminProfileId: string
): Promise<ResetResult> {
  try {
    // Verify admin has permission
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role, workspace_id')
      .eq('id', adminProfileId)
      .single();

    if (!adminProfile || 
        (adminProfile.workspace_id !== workspaceId && adminProfile.role !== 'super_admin') ||
        !['admin', 'super_admin'].includes(adminProfile.role)) {
      return {
        workspaceId,
        workspaceName: '',
        profilesReset: 0,
        totalAllowanceAdded: 0,
        errors: ['Insufficient permissions to perform manual reset'],
      };
    }

    // Perform the reset
    const result = await resetWorkspaceAllowances(workspaceId);
    
    // Log the manual reset
    await supabase.from('balance_reset_log').insert({
      profile_id: adminProfileId,
      amount_added: 0, // This is the admin action, not a balance change
      reset_type: 'manual_reset',
      notes: `Manual reset triggered for workspace ${workspaceId}`,
    });

    return result;
  } catch (error) {
    return {
      workspaceId,
      workspaceName: '',
      profilesReset: 0,
      totalAllowanceAdded: 0,
      errors: [`Manual reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * Get reset history for a workspace
 */
export async function getResetHistory(
  workspaceId: string,
  limit: number = 50
): Promise<Array<{
  id: string;
  resetType: string;
  createdAt: string;
  amountAdded: number;
  profileEmail?: string;
  notes?: string;
}>> {
  try {
    const { data, error } = await supabase
      .from('balance_reset_log')
      .select(`
        id,
        reset_type,
        created_at,
        amount_added,
        notes,
        profiles (
          email,
          workspace_id
        )
      `)
      .eq('profiles.workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      resetType: item.reset_type,
      createdAt: item.created_at,
      amountAdded: item.amount_added,
      profileEmail: (Array.isArray(item.profiles) ? (item.profiles as Array<{ email: string }>)[0]?.email : (item.profiles as { email: string } | null)?.email),
      notes: item.notes,
    }));
  } catch (error) {
    console.error('Error getting reset history:', error);
    return [];
  }
}