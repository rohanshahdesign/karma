'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import supabase from '../lib/supabase';

export default function AuthHashHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handle = async () => {
      if (typeof window === 'undefined') return;
      const hasHash = window.location.hash.includes('access_token=');
      if (!hasHash) return;
      // Parse and persist session from URL hash
      await supabase.auth.getSession();
      // Drop the hash from URL
      history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      );
      // Normalize to /login so our login effect routes correctly
      if (pathname !== '/login') {
        router.replace('/login');
      }
    };
    void handle();
  }, [pathname, router]);

  return null;
}
