'use client';

import { useEffect, useState } from 'react';
import supabase from '../../../../lib/supabase';

type Invitation = {
  id: string;
  code: string;
  token: string;
  expires_at: string | null;
  active: boolean;
};

export default function InviteTeammatesPage() {
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      // find creator's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();
      if (!profile) return;
      // create an invitation owned by this workspace if none exists yet for this session
      const code = Array.from(
        { length: 6 },
        () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
      ).join('');
      const { data: inv, error: invErr } = await supabase
        .from('invitations')
        .insert({
          workspace_id: profile.workspace_id,
          created_by_profile_id: profile.id,
          code,
          expires_at: null,
        })
        .select('*')
        .single();
      if (invErr) {
        setError(invErr.message);
        return;
      }
      setInvite(inv as Invitation);
    };
    void init();
  }, []);

  const inviteUrl = invite
    ? `${window.location.origin}/onboarding/join?token=${invite.token}`
    : '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-2xl rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold mb-2">Invite your teammates</h1>
        <p className="text-sm text-gray-600 mb-6">
          Share a code or link. You can manage invites later in Settings.
        </p>
        {error ? <p className="text-sm text-red-600 mb-4">{error}</p> : null}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border p-5">
            <h2 className="font-medium mb-2">Invite code</h2>
            <div className="text-2xl font-mono tracking-widest">
              {invite?.code ?? '— — — — — —'}
            </div>
            <button
              className="mt-3 rounded-md border px-3 py-1 text-sm"
              onClick={() =>
                invite?.code && navigator.clipboard.writeText(invite.code)
              }
            >
              Copy code
            </button>
          </div>
          <div className="rounded-lg border p-5">
            <h2 className="font-medium mb-2">Invite link</h2>
            <div className="text-sm break-all text-gray-700">
              {invite ? inviteUrl : 'Generating...'}
            </div>
            <button
              className="mt-3 rounded-md border px-3 py-1 text-sm"
              onClick={() => invite && navigator.clipboard.writeText(inviteUrl)}
            >
              Copy link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
