'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { useWorkspace } from './WorkspaceContext';
import { getProfileBalance, getDailyLimitInfo, BalanceInfo, DailyLimitInfo } from '@/lib/balance';

interface BalanceContextType {
  balanceInfo: BalanceInfo | null;
  dailyLimitInfo: DailyLimitInfo | null;
  isLoading: boolean;
  error: Error | null;
  refreshBalance: () => Promise<void>;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const { profile: currentProfile } = useUser();
  const { workspaceSettings } = useWorkspace();
  
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [dailyLimitInfo, setDailyLimitInfo] = useState<DailyLimitInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadBalance = useCallback(async () => {
    if (!currentProfile?.id) {
      setBalanceInfo(null);
      setDailyLimitInfo(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Load both balance and daily limit info in parallel
      const [balance, dailyLimit] = await Promise.all([
        getProfileBalance(currentProfile.id),
        getDailyLimitInfo(currentProfile.id),
      ]);

      setBalanceInfo(balance);
      setDailyLimitInfo(dailyLimit);
    } catch (err) {
      console.error('Error loading balance:', err);
      setError(err instanceof Error ? err : new Error('Failed to load balance'));
    } finally {
      setIsLoading(false);
    }
  }, [currentProfile?.id]);

  // Load balance when profile changes
  useEffect(() => {
    if (currentProfile?.id) {
      loadBalance();
    }
  }, [currentProfile?.id, loadBalance]);

  const refreshBalance = async () => {
    await loadBalance();
  };

  return (
    <BalanceContext.Provider
      value={{
        balanceInfo,
        dailyLimitInfo,
        isLoading,
        error,
        refreshBalance,
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalance must be used within a BalanceProvider');
  }
  return context;
}
