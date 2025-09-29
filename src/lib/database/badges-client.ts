import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Badge = Database['public']['Tables']['badges']['Row'];
type UserBadge = Database['public']['Tables']['user_badges']['Row'];
type BadgeProgress = Database['public']['Tables']['badge_progress']['Row'];

export interface BadgeWithProgress extends Badge {
  progress?: BadgeProgress;
  earned?: boolean;
  earned_at?: string;
}

export interface UserBadgeWithDetails extends UserBadge {
  badge: Badge;
}

/**
 * Get all badges for a workspace with user progress
 */
export async function getWorkspaceBadges(workspaceId: string, profileId?: string): Promise<BadgeWithProgress[]> {
  try {
    const { data: badges, error } = await supabase
      .from('badges')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching badges:', error);
      throw new Error(`Failed to fetch badges: ${error.message}`);
    }

    if (!profileId) {
      return badges.map(badge => ({ ...badge, earned: false }));
    }

    // Get user's badge progress and earned badges
    const [progressData, userBadgesData] = await Promise.all([
      supabase
        .from('badge_progress')
        .select('*')
        .eq('profile_id', profileId),
      supabase
        .from('user_badges')
        .select('badge_id, achieved_at')
        .eq('profile_id', profileId)
    ]);

    const progressMap = new Map((progressData.data || []).map(p => [p.badge_id, p]));
    const earnedMap = new Map((userBadgesData.data || []).map(ub => [ub.badge_id, ub.achieved_at]));

    return badges.map(badge => ({
      ...badge,
      progress: progressMap.get(badge.id),
      earned: earnedMap.has(badge.id),
      earned_at: earnedMap.get(badge.id)
    }));
  } catch (err) {
    console.error('Error in getWorkspaceBadges:', err);
    return [];
  }
}

/**
 * Get badges earned by a specific user
 */
export async function getUserBadges(profileId: string): Promise<UserBadgeWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges (*)
      `)
      .eq('profile_id', profileId)
      .order('achieved_at', { ascending: false });

    if (error) {
      console.error('Error fetching user badges:', error);
      throw new Error(`Failed to fetch user badges: ${error.message}`);
    }

    return data || [];
  } catch (err) {
    console.error('Error in getUserBadges:', err);
    return [];
  }
}

/**
 * Get recent badge achievements across workspace (for activity feed)
 */
export async function getRecentBadgeAchievements(workspaceId: string, limit: number = 10): Promise<(UserBadgeWithDetails & {
  profile: { full_name: string | null; username: string | null; email: string };
})[]> {
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges (*),
        profile:profiles (
          full_name,
          username,
          email
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('achieved_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent badge achievements:', error);
      throw new Error(`Failed to fetch recent badge achievements: ${error.message}`);
    }

    return data || [];
  } catch (err) {
    console.error('Error in getRecentBadgeAchievements:', err);
    return [];
  }
}

/**
 * Check and award badges for a user (triggers the SQL function)
 */
export async function checkAndAwardBadges(profileId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('check_and_award_badges', {
      p_profile_id: profileId
    });

    if (error) {
      console.error('Error checking badges:', error);
      throw new Error(`Failed to check badges: ${error.message}`);
    }

    return data || [];
  } catch (err) {
    console.error('Error in checkAndAwardBadges:', err);
    return [];
  }
}

/**
 * Get badge statistics for a workspace
 */
export async function getBadgeStats(workspaceId: string): Promise<{
  total_badges: number;
  total_awarded: number;
  most_earned_badge: { badge_name: string; count: number } | null;
  recent_achievements: number;
}> {
  try {
    const [badgesData, userBadgesData, recentData] = await Promise.all([
      // Total badges in workspace
      supabase
        .from('badges')
        .select('id', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .eq('active', true),
      
      // All user badges in workspace
      supabase
        .from('user_badges')
        .select('badge_id, badge:badges(name)')
        .eq('workspace_id', workspaceId),
      
      // Recent achievements (last 7 days)
      supabase
        .from('user_badges')
        .select('id', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .gte('achieved_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    ]);

    // Calculate most earned badge
    const badgeCounts = new Map<string, number>();
    (userBadgesData.data || []).forEach(ub => {
      const badgeName = (ub.badge as unknown as { name: string })?.name;
      if (badgeName) {
        badgeCounts.set(badgeName, (badgeCounts.get(badgeName) || 0) + 1);
      }
    });

    let most_earned_badge = null;
    let maxCount = 0;
    for (const [name, count] of badgeCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        most_earned_badge = { badge_name: name, count };
      }
    }

    return {
      total_badges: badgesData.count || 0,
      total_awarded: userBadgesData.data?.length || 0,
      most_earned_badge,
      recent_achievements: recentData.count || 0
    };
  } catch (err: unknown) {
    console.error('Error in getBadgeStats:', err);
    return {
      total_badges: 0,
      total_awarded: 0,
      most_earned_badge: null,
      recent_achievements: 0
    };
  }
}

/**
 * Get badge categories for filtering
 */
export function getBadgeCategories(badges: BadgeWithProgress[]): string[] {
  const categories = new Set<string>();
  
  badges.forEach(badge => {
    try {
      const criteria = badge.criteria as Record<string, unknown>;
      const type = criteria?.type;
      if (type) {
        switch (type) {
          case 'transaction_milestone':
            categories.add('Activity');
            break;
          case 'karma_milestone':
            categories.add('Generosity');
            break;
          case 'social_milestone':
            categories.add('Social');
            break;
          case 'time_milestone':
            categories.add('Tenure');
            break;
          case 'streak_milestone':
            categories.add('Consistency');
            break;
          case 'special_achievement':
            categories.add('Special');
            break;
          default:
            categories.add('Achievement');
        }
      }
    } catch {
      // Ignore parsing errors, just add to generic category
      categories.add('Achievement');
    }
  });
  
  return Array.from(categories).sort();
}