'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../../../../lib/supabase';

export default function CreateWorkspacePage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState('');
  const [currencyName, setCurrencyName] = useState('Karma');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw userError ?? new Error('No user');

      // Use RPC to create workspace and profile atomically
      const { error: rpcErr } = await supabase.rpc(
        'create_workspace_with_owner',
        {
          p_name: orgName,
          p_slug: crypto.randomUUID().slice(0, 8),
          p_currency_name: currencyName,
          p_monthly_allowance: 100,
          p_owner_email: user.email,
        }
      );
      if (rpcErr) throw rpcErr;

      router.push('/onboarding/invite');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
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
        <h1 className="text-xl font-semibold mb-2">Create your workspace</h1>
        <p className="text-sm text-gray-600 mb-6">
          You can change settings later.
        </p>
        <label className="block text-sm font-medium mb-1">
          Organization name
        </label>
        <input
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          required
          className="w-full mb-4 rounded-md border px-3 py-2"
        />
        <label className="block text-sm font-medium mb-1">Currency name</label>
        <input
          value={currencyName}
          onChange={(e) => setCurrencyName(e.target.value)}
          className="w-full mb-6 rounded-md border px-3 py-2"
        />
        {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}
        <button
          disabled={loading}
          className="inline-flex items-center rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-white shadow hover:shadow-md disabled:opacity-60"
        >
          {loading ? 'Creating...' : 'Create workspace'}
        </button>
      </form>
    </div>
  );
}
