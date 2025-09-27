// Balance utilities for the dual balance system
// Handles giving and redeemable balance logic, validation, and updates

import { supabase } from './supabase';

export interface BalanceInfo {
  giving_balance: number;
  redeemable_balance: number;
  total_balance: number;
}

export interface DailyLimitInfo {
  daily_limit: number;
  amount_sent_today: number;
  remaining_limit: number;
  percentage_used: number;
}

// ============================================================================
// BALANCE QUERIES
// ============================================================================

/**
 * Get current balance information for a profile
 */
export async function getProfileBalance(profileId: string): Promise<BalanceInfo> {
  const { data, error } = await supabase
    .from('profiles')
    .select('giving_balance, redeemable_balance')
    .eq('id', profileId)
    .single();

  if (error) throw error;

  return {
    giving_balance: data.giving_balance,
    redeemable_balance: data.redeemable_balance,
    total_balance: data.giving_balance + data.redeemable_balance,
  };
}

/**
 * Get daily limit information for a profile
 */
export async function getDailyLimitInfo(profileId: string): Promise<DailyLimitInfo> {
  // Get profile with workspace settings
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      giving_balance,
      workspace_id,
      workspace:workspaces (
        monthly_allowance
      )
    `)
    .eq('id', profileId)
    .single();

  if (profileError) throw profileError;

  // Get workspace settings
  const { data: workspaceSettings, error: settingsError } = await supabase
    .from('workspace_settings')
    .select('daily_limit_percentage, monthly_allowance')
    .eq('workspace_id', profile.workspace_id)
    .single();

  if (settingsError) {
    // Fallback to workspace settings if workspace_settings doesn't exist
    const workspace = (Array.isArray(profile.workspace) ? profile.workspace[0] : profile.workspace) as { monthly_allowance: number };
    const daily_limit = Math.floor((workspace.monthly_allowance * 30) / 100); // Default 30% daily limit
    
    // Get today's sent amount
    const { data: dailyData, error: dailyError } = await supabase
      .from('daily_transaction_limits')
      .select('total_amount_sent')
      .eq('profile_id', profileId)
      .eq('transaction_date', new Date().toISOString().split('T')[0])
      .maybeSingle();

    if (dailyError) throw dailyError;

    const amount_sent_today = dailyData?.total_amount_sent || 0;
    const remaining_limit = Math.max(0, daily_limit - amount_sent_today);
    const percentage_used = daily_limit > 0 ? (amount_sent_today / daily_limit) * 100 : 0;

    return {
      daily_limit,
      amount_sent_today,
      remaining_limit,
      percentage_used,
    };
  }

  const daily_limit = Math.floor((workspaceSettings.monthly_allowance * workspaceSettings.daily_limit_percentage) / 100);

  // Get today's sent amount
  const { data: dailyData, error: dailyError } = await supabase
    .from('daily_transaction_limits')
    .select('total_amount_sent')
    .eq('profile_id', profileId)
    .eq('transaction_date', new Date().toISOString().split('T')[0])
    .maybeSingle();

  if (dailyError) throw dailyError;

  const amount_sent_today = dailyData?.total_amount_sent || 0;
  const remaining_limit = Math.max(0, daily_limit - amount_sent_today);
  const percentage_used = daily_limit > 0 ? (amount_sent_today / daily_limit) * 100 : 0;

  return {
    daily_limit,
    amount_sent_today,
    remaining_limit,
    percentage_used,
  };
}

/**
 * Check if a profile has sufficient giving balance for a transaction
 */
export async function hassufficientGivingBalance(
  profileId: string, 
  amount: number
): Promise<boolean> {
  const balance = await getProfileBalance(profileId);
  return balance.giving_balance >= amount;
}

/**
 * Check if a transaction would exceed daily limits
 */
export async function wouldExceedDailyLimit(
  profileId: string,
  amount: number
): Promise<boolean> {
  const limitInfo = await getDailyLimitInfo(profileId);
  return amount > limitInfo.remaining_limit;
}

// ============================================================================
// BALANCE VALIDATION
// ============================================================================

export interface TransactionValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a transaction before execution
 */
export async function validateTransaction(
  senderProfileId: string,
  receiverProfileId: string,
  amount: number
): Promise<TransactionValidation> {
  const validation: TransactionValidation = {
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    // Check if sender and receiver are different
    if (senderProfileId === receiverProfileId) {
      validation.valid = false;
      validation.errors.push('Cannot send karma to yourself');
      return validation;
    }

    // Get sender profile with workspace settings
    const { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select(`
        *,
        workspace:workspaces (*)
      `)
      .eq('id', senderProfileId)
      .single();

    if (senderError) {
      validation.valid = false;
      validation.errors.push('Sender profile not found');
      return validation;
    }

    // Get receiver profile
    const { data: receiverProfile, error: receiverError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', receiverProfileId)
      .single();

    if (receiverError) {
      validation.valid = false;
      validation.errors.push('Receiver profile not found');
      return validation;
    }

    // Check if both profiles are in the same workspace
    if (senderProfile.workspace_id !== receiverProfile.workspace_id) {
      validation.valid = false;
      validation.errors.push('Cannot send karma to users in different workspaces');
      return validation;
    }

    // Get workspace settings
    const { data: workspaceSettings, error: settingsError } = await supabase
      .from('workspace_settings')
      .select('min_transaction_amount, max_transaction_amount, currency_name')
      .eq('workspace_id', senderProfile.workspace_id)
      .single();

    let workspace: { min_transaction_amount: number; max_transaction_amount: number; currency_name: string };
    
    if (settingsError) {
      // Fallback to default settings if workspace_settings doesn't exist
      const workspaceData = (Array.isArray(senderProfile.workspace) ? senderProfile.workspace[0] : senderProfile.workspace) as { currency_name: string };
      workspace = {
        min_transaction_amount: 1,
        max_transaction_amount: 50,
        currency_name: workspaceData.currency_name || 'Karma'
      };
    } else {
      workspace = workspaceSettings;
    }

    // Check amount limits
    if (amount < workspace.min_transaction_amount) {
      validation.valid = false;
      validation.errors.push(`Amount too low. Minimum: ${workspace.min_transaction_amount} ${workspace.currency_name}`);
    }

    if (amount > workspace.max_transaction_amount) {
      validation.valid = false;
      validation.errors.push(`Amount too high. Maximum: ${workspace.max_transaction_amount} ${workspace.currency_name}`);
    }

    // Check giving balance
    if (senderProfile.giving_balance < amount) {
      validation.valid = false;
      validation.errors.push(`Insufficient giving balance. You have ${senderProfile.giving_balance} ${workspace.currency_name}`);
    }

    // Check daily limit
    const limitInfo = await getDailyLimitInfo(senderProfileId);
    if (amount > limitInfo.remaining_limit) {
      validation.valid = false;
      validation.errors.push(`Daily limit exceeded. Remaining today: ${limitInfo.remaining_limit} ${workspace.currency_name}`);
    }

    // Warnings for high percentage usage
    const newPercentage = limitInfo.daily_limit > 0 ? ((limitInfo.amount_sent_today + amount) / limitInfo.daily_limit) * 100 : 0;
    if (newPercentage >= 80 && newPercentage < 100) {
      validation.warnings.push(`This transaction will use ${Math.round(newPercentage)}% of your daily limit`);
    }

    // Check if receiver is active
    if (!receiverProfile.active) {
      validation.warnings.push('The receiver is currently inactive');
    }

  } catch {
    validation.valid = false;
    validation.errors.push('Validation failed due to system error');
  }

  return validation;
}

// ============================================================================
// BALANCE UPDATES
// ============================================================================

/**
 * Execute a karma transaction (use the RPC function for consistency)
 */
export async function executeTransaction(
  senderProfileId: string,
  receiverProfileId: string,
  amount: number,
  message?: string
): Promise<string> {
  // Validate first
  const validation = await validateTransaction(senderProfileId, receiverProfileId, amount);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  // Use the existing RPC function which handles all the balance updates and limits
  const { data: transactionId, error } = await supabase.rpc('validate_and_create_transaction', {
    p_receiver_profile_id: receiverProfileId,
    p_amount: amount,
    p_message: message,
  });

  if (error) throw error;
  return transactionId;
}

/**
 * Reset monthly allowances for all profiles in a workspace
 */
export async function resetMonthlyAllowances(workspaceId: string): Promise<void> {
  const { error } = await supabase.rpc('reset_monthly_allowances', {
    p_workspace_id: workspaceId,
  });

  if (error) throw error;
}

/**
 * Get balance history for a profile
 */
export async function getBalanceHistory(
  profileId: string,
  days: number = 30
): Promise<Array<{
  date: string;
  giving_balance: number;
  redeemable_balance: number;
  transactions_sent: number;
  transactions_received: number;
}>> {
  const { data, error } = await supabase.rpc('get_balance_history', {
    p_profile_id: profileId,
    p_days: days,
  });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format balance amount with currency
 */
export function formatBalance(amount: number, currencyName: string): string {
  return `${amount} ${currencyName}`;
}

/**
 * Calculate percentage of balance used
 */
export function calculateBalancePercentage(used: number, total: number): number {
  return total > 0 ? Math.round((used / total) * 100) : 0;
}

/**
 * Get balance status color for UI
 */
export function getBalanceStatusColor(percentage: number): string {
  if (percentage >= 90) return 'red';
  if (percentage >= 70) return 'orange';
  if (percentage >= 50) return 'yellow';
  return 'green';
}