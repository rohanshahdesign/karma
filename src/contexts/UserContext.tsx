'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Profile } from '@/lib/supabase-types';
import { getCurrentProfile } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';

interface UserContextType {
  profile: Profile | null;
  isLoading: boolean;
  error: Error | null;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check auth session first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setProfile(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);
      const userProfile = await getCurrentProfile();
      setProfile(userProfile);
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError(err instanceof Error ? err : new Error('Failed to load profile'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setIsAuthenticated(true);
        loadProfile();
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setIsAuthenticated(false);
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile, router]);

  const refreshProfile = async () => {
    await loadProfile();
  };

  return (
    <UserContext.Provider
      value={{
        profile,
        isLoading,
        error,
        refreshProfile,
        isAuthenticated,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
