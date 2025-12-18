'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from './UserContext';

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
  currencyName: string;
  isLoading: boolean;
  error: Error | null;
  refreshWorkspaceSettings: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
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
          monthly_allowance: 0, // Will be fetched from workspace table if needed
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

  useEffect(() => {
    if (profile?.workspace_id) {
      loadWorkspaceSettings();
    }
  }, [profile?.workspace_id, loadWorkspaceSettings]);

  const refreshWorkspaceSettings = async () => {
    await loadWorkspaceSettings();
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceSettings,
        currencyName: workspaceSettings?.currency_name || 'Karma',
        isLoading,
        error,
        refreshWorkspaceSettings,
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
