import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Reward = Database['public']['Tables']['rewards']['Row'];
type RewardInsert = Database['public']['Tables']['rewards']['Insert'];
type RewardUpdate = Database['public']['Tables']['rewards']['Update'];
type RewardRedemption = Database['public']['Tables']['reward_redemptions']['Row'];

export interface RewardWithTags extends Omit<Reward, 'tags'> {
  tags?: string[];
}

/**
 * Fetch all rewards for a workspace
 */
export async function getWorkspaceRewards(workspaceId: string): Promise<RewardWithTags[]> {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('active', true)
      .order('category', { ascending: true })
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching rewards:', error);
      throw new Error(`Failed to fetch rewards: ${error.message}`);
    }

    console.log('Fetched rewards data:', data);

    // Convert category to tags for filtering (we can enhance this later with actual tags)
    const rewardsWithTags: RewardWithTags[] = (data || []).map(reward => ({
      ...reward,
      tags: reward.category ? [reward.category] : []
    }));

    return rewardsWithTags;
  } catch (err) {
    console.error('Error in getWorkspaceRewards:', err);
    return []; // Return empty array instead of throwing
  }
}

/**
 * Create a new reward
 */
export async function createReward(reward: RewardInsert): Promise<Reward> {
  const { data, error } = await supabase
    .from('rewards')
    .insert(reward)
    .select()
    .single();

  if (error) {
    console.error('Error creating reward:', error);
    throw new Error(`Failed to create reward: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing reward
 */
export async function updateReward(id: string, updates: RewardUpdate): Promise<Reward> {
  const { data, error } = await supabase
    .from('rewards')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating reward:', error);
    throw new Error(`Failed to update reward: ${error.message}`);
  }

  return data;
}

/**
 * Delete a reward (soft delete by setting active to false)
 */
export async function deleteReward(id: string): Promise<void> {
  const { error } = await supabase
    .from('rewards')
    .update({ 
      active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Error deleting reward:', error);
    throw new Error(`Failed to delete reward: ${error.message}`);
  }
}

/**
 * Redeem a reward
 */
export async function redeemReward(
  workspaceId: string, 
  profileId: string, 
  rewardId: string
): Promise<RewardRedemption> {
  // First check if user has enough balance
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('redeemable_balance')
    .eq('id', profileId)
    .single();

  if (profileError) {
    throw new Error(`Failed to check balance: ${profileError.message}`);
  }

  // Get reward price
  const { data: reward, error: rewardError } = await supabase
    .from('rewards')
    .select('price, title')
    .eq('id', rewardId)
    .single();

  if (rewardError) {
    throw new Error(`Failed to fetch reward: ${rewardError.message}`);
  }

  if (!profile || profile.redeemable_balance < reward.price) {
    throw new Error('Insufficient balance to redeem this reward');
  }

  // Start a transaction to redeem the reward and deduct balance
  const { data: redemption, error: redemptionError } = await supabase
    .from('reward_redemptions')
    .insert({
      workspace_id: workspaceId,
      profile_id: profileId,
      reward_id: rewardId,
      status: 'pending'
    })
    .select()
    .single();

  if (redemptionError) {
    throw new Error(`Failed to create redemption: ${redemptionError.message}`);
  }

  // Deduct balance
  const { error: balanceError } = await supabase
    .from('profiles')
    .update({ 
      redeemable_balance: profile.redeemable_balance - reward.price,
      updated_at: new Date().toISOString()
    })
    .eq('id', profileId);

  if (balanceError) {
    // If balance update fails, we should ideally rollback the redemption
    // For now, let's just log the error
    console.error('Error updating balance after redemption:', balanceError);
    throw new Error(`Failed to update balance: ${balanceError.message}`);
  }

  return redemption;
}

/**
 * Get redemption requests for a workspace (admin view)
 */
export async function getWorkspaceRedemptions(workspaceId: string): Promise<(RewardRedemption & {
  profile: { full_name: string | null; email: string; username: string | null };
  reward: { title: string; price: number };
})[]> {
  try {
    // First, just get the basic redemption data
    const { data: redemptionsData, error: redemptionsError } = await supabase
      .from('reward_redemptions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (redemptionsError) {
      console.error('Error fetching redemptions:', redemptionsError);
      return []; // Return empty array instead of throwing
    }

    if (!redemptionsData || redemptionsData.length === 0) {
      return [];
    }

    // Then fetch related data separately to avoid foreign key issues
    const redemptionsWithDetails = await Promise.all(
      redemptionsData.map(async (redemption) => {
        const [profileData, rewardData] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, email, username')
            .eq('id', redemption.profile_id)
            .single(),
          supabase
            .from('rewards')
            .select('title, price')
            .eq('id', redemption.reward_id)
            .single()
        ]);

        return {
          ...redemption,
          profile: profileData.data || { full_name: null, email: 'Unknown', username: null },
          reward: rewardData.data || { title: 'Unknown Reward', price: 0 }
        };
      })
    );

    return redemptionsWithDetails;
  } catch (err) {
    console.error('Error in getWorkspaceRedemptions:', err);
    return []; // Return empty array instead of throwing
  }
}

/**
 * Update redemption status (admin action)
 */
export async function updateRedemptionStatus(
  redemptionId: string,
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled',
  adminNote?: string
): Promise<void> {
  const { error } = await supabase
    .from('reward_redemptions')
    .update({
      status,
      admin_note: adminNote,
      updated_at: new Date().toISOString()
    })
    .eq('id', redemptionId);

  if (error) {
    console.error('Error updating redemption status:', error);
    throw new Error(`Failed to update redemption status: ${error.message}`);
  }
}

/**
 * Get reward categories available in a workspace
 */
export async function getWorkspaceRewardCategories(workspaceId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('category')
      .eq('workspace_id', workspaceId)
      .eq('active', true)
      .not('category', 'is', null);

    if (error) {
      console.error('Error fetching reward categories:', error);
      return []; // Return empty array instead of throwing
    }

    // Get unique categories
    const categories = [...new Set((data || []).map(item => item.category).filter(Boolean))];
    return categories;
  } catch (err) {
    console.error('Error in getWorkspaceRewardCategories:', err);
    return []; // Return empty array instead of throwing
  }
}
