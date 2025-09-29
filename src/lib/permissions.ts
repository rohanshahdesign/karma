// Permission checking utilities for role-based access control

import { supabase } from './supabase';
import { UserRole, Profile, Workspace } from './supabase-types';

// Get current user's profile
export async function getCurrentProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  // Return null if no profile exists (don't throw error)
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error);
    return null;
  }

  return profile;
}

// Get current user's workspace info
export async function getCurrentWorkspace(): Promise<Workspace | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', profile.workspace_id)
    .single();

  return workspace;
}

// Permission checking functions
export function hasRole(
  profile: Profile | null,
  requiredRoles: UserRole[]
): boolean {
  if (!profile) return false;
  return requiredRoles.includes(profile.role as UserRole);
}

export function isAdmin(profile: Profile | null): boolean {
  return hasRole(profile, ['admin', 'super_admin']);
}

export function isSuperAdmin(profile: Profile | null): boolean {
  return hasRole(profile, ['super_admin']);
}

export function isEmployee(profile: Profile | null): boolean {
  return hasRole(profile, ['employee']);
}

// Check if user can manage workspace settings
export function canManageWorkspace(profile: Profile | null): boolean {
  return isAdmin(profile);
}

// Check if user can manage members
export function canManageMembers(profile: Profile | null): boolean {
  return isAdmin(profile);
}

// Check if user can manage rewards
export function canManageRewards(profile: Profile | null): boolean {
  return isAdmin(profile);
}

// Check if user can approve redemptions
export function canApproveRedemptions(profile: Profile | null): boolean {
  return isAdmin(profile);
}

// Check if user can send karma
export function canSendKarma(profile: Profile | null): boolean {
  return profile?.active === true;
}

// Get role display name
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'employee':
      return 'Employee';
    default:
      return 'Unknown';
  }
}

// Get role hierarchy level (higher number = more permissions)
export function getRoleLevel(role: UserRole): number {
  switch (role) {
    case 'super_admin':
      return 3;
    case 'admin':
      return 2;
    case 'employee':
      return 1;
    default:
      return 0;
  }
}

// Check if user can promote/demote another user
export function canModifyUserRole(
  currentUser: Profile | null,
  targetUser: Profile | null
): boolean {
  if (!currentUser || !targetUser) return false;

  // Can't modify your own role
  if (currentUser.id === targetUser.id) return false;

  // Must be in same workspace
  if (currentUser.workspace_id !== targetUser.workspace_id) return false;

  // Only super admins can promote to admin or demote admins
  if (targetUser.role === 'admin' || targetUser.role === 'super_admin') {
    return isSuperAdmin(currentUser);
  }

  // Admins and super admins can promote employees to admin
  if (targetUser.role === 'employee') {
    return isAdmin(currentUser);
  }

  return false;
}

// Get reward points summary for a profile
export async function getProfileRewardPoints(userId: string): Promise<{
  total_earned: number;
  total_redeemed: number;
  current_balance: number;
}> {
  try {
    const { data, error } = await supabase.rpc('get_user_reward_summary', {
      user_id: userId
    });
    
    if (error) throw error;
    
    return {
      total_earned: data?.[0]?.total_earned || 0,
      total_redeemed: data?.[0]?.total_redeemed || 0,
      current_balance: data?.[0]?.current_balance || 0
    };
  } catch (error) {
    console.error('Error fetching reward points:', error);
    return {
      total_earned: 0,
      total_redeemed: 0,
      current_balance: 0
    };
  }
}
