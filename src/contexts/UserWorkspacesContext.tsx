'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from './UserContext';

export interface UserWorkspace {
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  logo_url: string | null;
  user_role: string;
}

interface UserWorkspacesContextType {
  workspaces: UserWorkspace[];
  isLoading: boolean;
  error: Error | null;
  refreshWorkspaces: () => Promise<void>;
}

const UserWorkspacesContext = createContext<UserWorkspacesContextType | undefined>(undefined);

export function UserWorkspacesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useUser();
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadWorkspaces = useCallback(async () => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Call RPC to get all user workspaces
      const { data, error: fetchError } = await supabase.rpc('get_user_workspaces');

      if (fetchError) throw fetchError;

      setWorkspaces((data || []) as UserWorkspace[]);
    } catch (err) {
      console.error('Error loading workspaces:', err);
      setError(err instanceof Error ? err : new Error('Failed to load workspaces'));
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load workspaces when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadWorkspaces();
    }
  }, [isAuthenticated, loadWorkspaces]);

  const refreshWorkspaces = async () => {
    await loadWorkspaces();
  };

  return (
    <UserWorkspacesContext.Provider
      value={{
        workspaces,
        isLoading,
        error,
        refreshWorkspaces,
      }}
    >
      {children}
    </UserWorkspacesContext.Provider>
  );
}

export function useUserWorkspaces() {
  const context = useContext(UserWorkspacesContext);
  if (context === undefined) {
    throw new Error('useUserWorkspaces must be used within a UserWorkspacesProvider');
  }
  return context;
}
