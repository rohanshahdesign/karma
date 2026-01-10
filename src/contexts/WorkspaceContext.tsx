'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from './UserContext';
import { getWorkspaceStatsClient } from '@/lib/database-client';
import type { WorkspaceStats } from '@/lib/supabase-types';

export interface WorkspaceSettings {
  daily_limit_percentage: number;
  monthly_allowance: number;
  min_transaction_amount: number;
  max_transaction_amount: number;
  currency_name: string;
  departments?: string[];
}

interface WorkspaceContextType {
  workspaceSettings: WorkspaceSettings | null;
  workspaceStats: WorkspaceStats | null;
  currencyName: string;
  isLoading: boolean;
  statsLoading: boolean;
  error: Error | null;
  statsError: Error | null;
  refreshWorkspaceSettings: () => Promise<void>;
  refreshWorkspaceStats: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings | null>(null);
  const [workspaceStats, setWorkspaceStats] = useState<WorkspaceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [statsError, setStatsError] = useState<Error | null>(null);
  const { profile } = useUser();

  const loadWorkspaceSettings = useCallback(async () => {
    if (!profile?.workspace_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('workspace_settings')
        .select('daily_limit_percentage, monthly_allowance, min_transaction_amount, max_transaction_amount, currency_name')
        .eq('workspace_id', profile.workspace_id)
        .single();

      if (fetchError) {
        // Fallback to default settings
        setWorkspaceSettings({
          daily_limit_percentage: 30,
          monthly_allowance: 0,
          min_transaction_amount: 1,
          max_transaction_amount: 50,
          currency_name: 'Karma',
        });
      } else if (data) {
        setWorkspaceSettings(data as WorkspaceSettings);
      }
    } catch (err) {
      console.error('Error loading workspace settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to load workspace settings'));
    } finally {
      setIsLoading(false);
    }
  }, [profile?.workspace_id]);

  const loadWorkspaceStats = useCallback(async () => {
    if (!profile?.workspace_id) {
      setStatsLoading(false);
      return;
    }

    try {
      setStatsLoading(true);
      setStatsError(null);

      const stats = await getWorkspaceStatsClient(profile.workspace_id);
      setWorkspaceStats(stats);
    } catch (err) {
      console.error('Error loading workspace stats:', err);
      setStatsError(err instanceof Error ? err : new Error('Failed to load workspace stats'));
      // Don't set workspaceStats to null on error - keep previous data
    } finally {
      setStatsLoading(false);
    }
  }, [profile?.workspace_id]);

  useEffect(() => {
    if (profile?.workspace_id) {
      loadWorkspaceSettings();
      loadWorkspaceStats();
    }
  }, [profile?.workspace_id, loadWorkspaceSettings, loadWorkspaceStats]);

  const refreshWorkspaceSettings = async () => {
    await loadWorkspaceSettings();
  };

  const refreshWorkspaceStats = async () => {
    await loadWorkspaceStats();
  };

  const refreshAll = async () => {
    await Promise.all([loadWorkspaceSettings(), loadWorkspaceStats()]);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceSettings,
        workspaceStats,
        currencyName: workspaceSettings?.currency_name || 'Karma',
        isLoading,
        statsLoading,
        error,
        statsError,
        refreshWorkspaceSettings,
        refreshWorkspaceStats,
        refreshAll,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
