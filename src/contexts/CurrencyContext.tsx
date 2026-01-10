'use client';

import React, { createContext, useContext } from 'react';
import { useAppData } from './AppDataProvider';

interface CurrencyContextType {
  currencyName: string;
  isLoading: boolean;
  refreshCurrency: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { currencyName, isLoading, refreshAppData } = useAppData();

  return (
    <CurrencyContext.Provider
      value={{
        currencyName,
        isLoading,
        refreshCurrency: refreshAppData,
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
