'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from './UserContext';
import type { WorkspaceStats } from '@/lib/supabase-types';
import { getWorkspaceStatsClient } from '@/lib/database-client';

export interface WorkspaceSettings {
  daily_limit_percentage: number;
  monthly_allowance: number;
  min_transaction_amount: number;
  max_transaction_amount: number;
  currency_name: string;
  departments?: string[];
}

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

export interface UserWorkspace {
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  logo_url: string | null;
  user_role: string;
}

export interface WorkspaceMember {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  department: string | null;
  active: boolean;
}

export interface AppData {
  userWorkspaces: UserWorkspace[];
  currentWorkspace: UserWorkspace | null;
  workspaceSettings: WorkspaceSettings | null;
  workspaceStats: WorkspaceStats | null;
  balanceInfo: BalanceInfo | null;
  dailyLimitInfo: DailyLimitInfo | null;
  workspaceMembers: WorkspaceMember[];
  currencyName: string;
  isLoading: boolean;
  error: Error | null;
  refreshAppData: () => Promise<void>;
}

const AppDataContext = createContext<AppData | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { profile: currentProfile, isAuthenticated } = useUser();
  
  const [userWorkspaces, setUserWorkspaces] = useState<UserWorkspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<UserWorkspace | null>(null);
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings | null>(null);
  const [workspaceStats, setWorkspaceStats] = useState<WorkspaceStats | null>(null);
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [dailyLimitInfo, setDailyLimitInfo] = useState<DailyLimitInfo | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadAppData = useCallback(async () => {
    if (!currentProfile?.id || !currentProfile?.workspace_id) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch all critical data in parallel
      const [
        workspacesResult,
        settingsResult,
        balanceResult,
        dailyLimitResult,
        statsResult,
        membersResult,
      ] = await Promise.all([
        // 1. Get user workspaces
        supabase.rpc('get_user_workspaces').then((result) => {
          if (result.error) throw result.error;
          return result.data || [];
        }),
        // 2. Get workspace settings
        supabase
          .from('workspace_settings')
          .select('daily_limit_percentage, monthly_allowance, min_transaction_amount, max_transaction_amount, currency_name')
          .eq('workspace_id', currentProfile.workspace_id)
          .single()
          .then((result) => {
            if (result.error) {
              return {
                daily_limit_percentage: 30,
                monthly_allowance: 0,
                min_transaction_amount: 1,
                max_transaction_amount: 50,
                currency_name: 'Karma',
              };
            }
            return result.data;
          }),
        // 3. Get balance info
        supabase
          .from('profiles')
          .select('giving_balance, redeemable_balance')
          .eq('id', currentProfile.id)
          .single()
          .then((result) => {
            if (result.error) return null;
            return {
              giving_balance: result.data.giving_balance,
              redeemable_balance: result.data.redeemable_balance,
              total_balance: result.data.giving_balance + result.data.redeemable_balance,
            };
          }),
        // 4. Get daily limit info
        (async () => {
          try {
            const { data: dailyData } = await supabase
              .from('daily_transaction_limits')
              .select('total_amount_sent')
              .eq('profile_id', currentProfile.id)
              .eq('transaction_date', new Date().toISOString().split('T')[0])
              .maybeSingle();

            const amount_sent_today = dailyData?.total_amount_sent || 0;

            // Get settings to calculate limit
            const { data: settingsData } = await supabase
              .from('workspace_settings')
              .select('daily_limit_percentage, monthly_allowance')
              .eq('workspace_id', currentProfile.workspace_id)
              .single();

            const settings = settingsData || { daily_limit_percentage: 30, monthly_allowance: 0 };
            const daily_limit = Math.floor(
              (settings.monthly_allowance * settings.daily_limit_percentage) / 100
            );
            const remaining_limit = Math.max(0, daily_limit - amount_sent_today);
            const percentage_used = daily_limit > 0 ? (amount_sent_today / daily_limit) * 100 : 0;

            return {
              daily_limit,
              amount_sent_today,
              remaining_limit,
              percentage_used,
            };
          } catch (err) {
            console.error('Error loading daily limit:', err);
            return {
              daily_limit: 0,
              amount_sent_today: 0,
              remaining_limit: 0,
              percentage_used: 0,
            };
          }
        })(),
        // 5. Get workspace stats
        getWorkspaceStatsClient(currentProfile.workspace_id).catch((err) => {
          console.error('Error loading workspace stats:', err);
          return null;
        }),
        // 6. Get workspace members
        supabase
          .from('profiles')
          .select('id, full_name, email, role, department, active')
          .eq('workspace_id', currentProfile.workspace_id)
          .eq('active', true)
          .then((result) => {
            if (result.error) {
              console.error('Error loading workspace members:', result.error);
              return [];
            }
            return result.data || [];
          }),
      ]);

      // Update states
      const workspaces = workspacesResult as UserWorkspace[];
      setUserWorkspaces(workspaces);

      // Set current workspace
      const current = workspaces.find((w) => w.workspace_id === currentProfile.workspace_id);
      if (current) {
        setCurrentWorkspace(current);
      }

      // Set workspace settings
      setWorkspaceSettings(settingsResult as WorkspaceSettings);

      // Set balance info
      if (balanceResult) {
        setBalanceInfo(balanceResult);
      }

      // Set daily limit info
      setDailyLimitInfo(dailyLimitResult as DailyLimitInfo);

      // Set workspace stats
      if (statsResult) {
        setWorkspaceStats(statsResult);
      }

      // Set workspace members
      setWorkspaceMembers(membersResult as WorkspaceMember[]);
    } catch (err) {
      console.error('Error loading app data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load app data'));
    } finally {
      setIsLoading(false);
    }
  }, [currentProfile?.id, currentProfile?.workspace_id]);

  // Load data when profile changes
  useEffect(() => {
    if (isAuthenticated && currentProfile?.id) {
      loadAppData();
    }
  }, [isAuthenticated, currentProfile?.id, currentProfile?.workspace_id, loadAppData]);

  const refreshAppData = async () => {
    await loadAppData();
  };

  const currencyName = workspaceSettings?.currency_name || 'Karma';

  return (
    <AppDataContext.Provider
      value={{
        userWorkspaces,
        currentWorkspace,
        workspaceSettings,
        workspaceStats,
        balanceInfo,
        dailyLimitInfo,
        workspaceMembers,
        currencyName,
        isLoading,
        error,
        refreshAppData,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
