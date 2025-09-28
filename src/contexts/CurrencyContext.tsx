'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentProfile } from '../lib/permissions';
import { getWorkspace } from '../lib/database';

interface CurrencyContextType {
  currencyName: string;
  isLoading: boolean;
  refreshCurrency: () => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyName, setCurrencyName] = useState('karma'); // Default fallback
  const [isLoading, setIsLoading] = useState(true);

  const loadCurrencyName = async () => {
    try {
      setIsLoading(true);
      const profile = await getCurrentProfile();
      if (profile) {
        const workspace = await getWorkspace(profile.workspace_id);
        if (workspace?.currency_name) {
          setCurrencyName(workspace.currency_name);
        }
      }
    } catch (error) {
      console.error('Error loading currency name:', error);
      // Keep default "karma" on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCurrencyName();
  }, []);

  const refreshCurrency = () => {
    loadCurrencyName();
  };

  return (
    <CurrencyContext.Provider
      value={{
        currencyName,
        isLoading,
        refreshCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

// Utility function for singular/plural forms
export function formatCurrencyName(amount: number, currencyName: string): string {
  // Simple pluralization - you can make this more sophisticated if needed
  if (amount === 1) {
    return currencyName;
  }
  
  // Basic pluralization rules
  if (currencyName.endsWith('s')) {
    return currencyName; // Already plural (e.g., "coins" stays "coins")
  } else if (currencyName.endsWith('y')) {
    return currencyName.slice(0, -1) + 'ies'; // "berry" -> "berries"
  } else {
    return currencyName + 's'; // "ball" -> "balls", "karma" -> "karmas"
  }
}