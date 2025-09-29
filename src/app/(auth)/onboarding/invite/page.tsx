'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import supabase from '../../../../lib/supabase';

type Invitation = {
  id: string;
  code: string;
  token: string;
  expires_at: string | null;
  active: boolean;
};

export default function InviteTeammatesPage() {
  const router = useRouter();
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setError(null);
      setLoading(true);
      try {
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
            active: true,
          })
          .select('*')
          .single();
        if (invErr) {
          setError(invErr.message);
          return;
        }
        setInvite(inv as Invitation);
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, []);

  const inviteUrl = invite
    ? `${window.location.origin}/onboarding/join?token=${invite.token}`
    : '';

  const copyCode = () => {
    if (invite?.code) {
      navigator.clipboard.writeText(invite.code);
      toast.success('Invite code copied to clipboard!');
    }
  };

  const copyLink = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      toast.success('Invite link copied to clipboard!');
    }
  };

  const skipToHome = () => {
    router.push('/home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-4xl bg-white border-[#ebebeb] shadow-[0px_1px_8px_rgba(0,0,0,0.1)]">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Invite your teammates
          </CardTitle>
          <p className="text-gray-600">
            Share a code or link. You can manage invites later in Settings.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* Invite Code Card */}
            <Card className="bg-white border-[#ebebeb] shadow-[0px_1px_8px_rgba(0,0,0,0.1)]">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Invite code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-[#ebebeb] text-center">
                  <div className="text-3xl font-mono font-bold tracking-widest text-gray-900">
                    {invite?.code ?? '— — — — — —'}
                  </div>
                </div>
                <Button
                  onClick={copyCode}
                  disabled={!invite?.code}
                  variant="outline"
                  className="w-full border-[#ebebeb] shadow-[0px_1px_8px_rgba(0,0,0,0.1)] hover:shadow-[0px_2px_12px_rgba(0,0,0,0.15)] transition-shadow"
                >
                  Copy code
                </Button>
              </CardContent>
            </Card>

            {/* Invite Link Card */}
            <Card className="bg-white border-[#ebebeb] shadow-[0px_1px_8px_rgba(0,0,0,0.1)]">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Invite link
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-[#ebebeb] min-h-[4rem] flex items-center">
                  <div className="text-sm break-all text-gray-700 font-mono">
                    {invite ? inviteUrl : 'Generating...'}
                  </div>
                </div>
                <Button
                  onClick={copyLink}
                  disabled={!inviteUrl}
                  variant="outline"
                  className="w-full border-[#ebebeb] shadow-[0px_1px_8px_rgba(0,0,0,0.1)] hover:shadow-[0px_2px_12px_rgba(0,0,0,0.15)] transition-shadow"
                >
                  Copy link
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Action Button */}
          <div className="flex justify-center pt-6 border-t border-[#ebebeb]">
            <Button
              onClick={skipToHome}
              variant="outline"
              className="px-8 border-[#ebebeb] shadow-[0px_1px_8px_rgba(0,0,0,0.1)] hover:shadow-[0px_2px_12px_rgba(0,0,0,0.15)] transition-shadow"
            >
              Skip for now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
