'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '../../../../lib/supabase';

function JoinWorkspaceForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token'); // UUID from old links
  const codeParam = params.get('code'); // Human-readable code from new links
  const [code, setCode] = useState(codeParam || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const join = useCallback(async (invCode: string) => {
    console.log('Attempting to join with code:', invCode);
    
    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    console.log('User authenticated:', { userId: user.id, email: user.email });

    // Check if user already has a profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();
      
    if (existingProfile) {
      console.log('User already has profile, redirecting to home');
      router.push('/home');
      return;
    }

    // Call the server-side join API instead of direct database queries
    console.log('Calling join API with code:', invCode.toUpperCase());
    
    const response = await fetch('/api/invitations/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invite_code: invCode.toUpperCase()
      })
    });
    
    const result = await response.json();
    console.log('Join API response:', result);
    
    if (!result.success) {
      throw new Error(result.error || result.message || 'Failed to join workspace');
    }
    
    console.log('Successfully joined workspace, redirecting to home');
    router.push('/home');
  }, [router]);

  useEffect(() => {
    if (!token) return;
    const joinByToken = async () => {
      setLoading(true);
      setError(null);
      try {
        // Call API to lookup token and get the code
        const response = await fetch(`/api/debug/invitations`);
        const debugResult = await response.json();
        
        // Find the invitation with matching token
        const invitation = debugResult.allInvitations?.find(
          (inv: { token: string; active: boolean; code: string }) => 
            inv.token === token && inv.active
        );
        
        if (!invitation) {
          throw new Error('Invalid or expired invite link');
        }
        
        // Use the code from the token lookup
        await join(invitation.code);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Invalid invite');
      } finally {
        setLoading(false);
      }
    };
    void joinByToken();
  }, [token, join]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await join(code.toUpperCase());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not join');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-2xl border bg-white p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold mb-2">Join a workspace</h1>
        <p className="text-sm text-gray-600 mb-6">
          Enter the 6digit code from your invite.
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
          className="w-full mb-4 rounded-md border px-3 py-2 tracking-widest font-mono uppercase text-center"
        />
        {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}
        <button
          disabled={loading}
          className="inline-flex items-center rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-white shadow hover:shadow-md disabled:opacity-60"
        >
          {loading ? 'Joining...' : 'Join workspace'}
        </button>
      </form>
    </div>
  );
}

export default function JoinWorkspacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-lg rounded-2xl border bg-white p-8 shadow-sm text-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    }>
      <JoinWorkspaceForm />
    </Suspense>
  );
}
