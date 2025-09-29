'use client';

import supabase from '../../../lib/supabase';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  // If already signed in, route based on onboarding status
  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (profile) {
        router.replace('/home');
        return;
      }
      // ensure pending record exists then go to onboarding
      await supabase
        .from('pending_users')
        .upsert({ auth_user_id: user.id, email: user.email });
      router.replace('/onboarding');
    };
    void check();
  }, [router]);
  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'email profile',
        redirectTo:
          process.env.NEXT_PUBLIC_REDIRECT_TO ??
          (typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined),
      },
    });
  };
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Karma</h1>
        <p className="text-lg text-gray-600 mb-8">
          This is the authentication page
        </p>
        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            Sign In with Google
          </button>
          <p className="text-sm text-gray-500">
            More auth options coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}
