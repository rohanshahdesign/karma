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

      // Check if user has any workspaces using get_user_workspaces RPC
      const { data: workspaces, error: workspacesError } = await supabase.rpc('get_user_workspaces');
      
      if (workspacesError) {
        console.error('Error fetching workspaces:', workspacesError);
        // On error, redirect to login page which will handle the check
        router.replace('/login');
        return;
      }

      if (workspaces && workspaces.length > 0) {
        // User has 1 or more workspaces - redirect to /home
        const firstWorkspace = workspaces[0];
        
        // Set the first workspace as current if no preference exists
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('current_workspace_id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        
        if (!preferences?.current_workspace_id) {
          await supabase
            .from('user_preferences')
            .upsert({
              auth_user_id: user.id,
              current_workspace_id: firstWorkspace.workspace_id
            });
        }
        
        router.replace('/home');
      } else {
        // No workspaces found - redirect to login, which will then redirect to onboarding
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
        // Redirect to login, which will check and redirect to onboarding
        router.replace('/login');
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
