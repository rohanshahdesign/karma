'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../../../lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handle = async () => {
      if (typeof window === 'undefined') return;
      // Persist session from hash (if present)
      await supabase.auth.getSession();
      // Clean URL hash
      history.replaceState(null, '', window.location.pathname);

      // Decide destination
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (profile) {
        router.replace('/home');
      } else {
        // Extract Google profile data from user metadata
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
        const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
        
        await supabase
          .from('pending_users')
          .upsert({ 
            auth_user_id: user.id, 
            email: user.email || '',
            // Store Google profile data for later use during onboarding
            full_name: fullName,
            avatar_url: avatarUrl
          });
        router.replace('/onboarding');
      }
    };
    void handle();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-sm text-gray-600">Signing you in…</div>
    </div>
  );
}
