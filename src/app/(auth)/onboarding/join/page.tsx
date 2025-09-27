'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '../../../../lib/supabase';

export default function JoinWorkspacePage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    const joinByToken = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: inv, error: invErr } = await supabase
          .from('invitations')
          .select('*')
          .eq('token', token)
          .eq('active', true)
          .maybeSingle();
        if (invErr || !inv) throw invErr ?? new Error('Invalid invite');
        await join(inv.code);
      } catch (e: any) {
        setError(e?.message ?? 'Invalid invite');
      } finally {
        setLoading(false);
      }
    };
    void joinByToken();
  }, [token]);

  const join = async (invCode: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    const { data: inv, error: invErr } = await supabase
      .from('invitations')
      .select('*')
      .eq('code', invCode)
      .eq('active', true)
      .maybeSingle();
    if (invErr || !inv) throw invErr ?? new Error('Invalid code');

    // Upsert profile into the workspace as employee
    const { error: profErr } = await supabase.from('profiles').insert({
      auth_user_id: user.id,
      workspace_id: inv.workspace_id,
      email: user.email,
      role: 'employee',
      giving_balance: 100,
      redeemable_balance: 0,
    });
    if (profErr) throw profErr;

    // Remove pending entry if exists
    await supabase.from('pending_users').delete().eq('auth_user_id', user.id);

    router.push('/home');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await join(code.toUpperCase());
    } catch (e: any) {
      setError(e?.message ?? 'Could not join');
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
          onChange={(e) => setCode(e.target.value)}
          placeholder="ABC123"
          className="w-full mb-4 rounded-md border px-3 py-2 tracking-widest font-mono"
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
