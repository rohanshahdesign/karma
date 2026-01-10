'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';

interface AvatarCacheContextType {
  getAvatarUrl: (profileId: string, hasCustomAvatar: boolean) => Promise<string | null>;
  isLoading: boolean;
}

const AvatarCacheContext = createContext<AvatarCacheContextType | undefined>(undefined);

export function AvatarCacheProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Load cache from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('avatar-cache');
      if (stored) {
        const parsed = JSON.parse(stored) as Array<[string, string]>;
        const cached = new Map(parsed);
        setCache(cached);
      }
    } catch (err) {
      console.warn('Failed to load avatar cache from sessionStorage:', err);
    }
  }, []);

  const saveToSessionStorage = useCallback((newCache: Map<string, string>) => {
    try {
      sessionStorage.setItem('avatar-cache', JSON.stringify(Array.from(newCache)));
    } catch (err) {
      console.warn('Failed to save avatar cache to sessionStorage:', err);
    }
  }, []);

  const getAvatarUrl = useCallback(
    async (profileId: string, hasCustomAvatar: boolean): Promise<string | null> => {
      if (!profileId) return null;

      // Check if already in cache
      if (cache.has(profileId)) {
        return cache.get(profileId) || null;
      }

      // If custom avatar, the URL should already be in the profile data
      // This function handles fetching Google avatar URLs via the API
      if (hasCustomAvatar) {
        return null; // Will be handled by profile data
      }

      try {
        setIsLoading(true);

        // Fetch avatar URL with ?format=json to get JSON response instead of redirect
        const response = await fetch(`/api/avatar/user/${profileId}?format=json`);

        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        const avatarUrl = data.avatarUrl || null;

        if (avatarUrl) {
          // Store in cache (memory)
          const newCache = new Map(cache);
          newCache.set(profileId, avatarUrl);
          setCache(newCache);

          // Save to sessionStorage
          saveToSessionStorage(newCache);
        }

        return avatarUrl;
      } catch (err) {
        console.error(`Failed to fetch avatar URL for profile ${profileId}:`, err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [cache, saveToSessionStorage]
  );

  return (
    <AvatarCacheContext.Provider value={{ getAvatarUrl, isLoading }}>
      {children}
    </AvatarCacheContext.Provider>
  );
}

export function useAvatarCache() {
  const context = useContext(AvatarCacheContext);
  if (context === undefined) {
    throw new Error('useAvatarCache must be used within an AvatarCacheProvider');
  }
  return context;
}
