'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfilePictureUpload } from '@/components/ui/profile-picture-upload';
import { UsernameInput } from '@/components/ui/username-input';
import supabase from '../../../../lib/supabase';
import { toast } from 'sonner';
import { Briefcase, Link2, FileText, Users } from 'lucide-react';

interface ProfileFormData {
  username: string;
  jobTitle: string;
  bio: string;
  portfolioUrl: string;
  profileImageUrl: string | null;
  profileImagePath: string | null;
}

function JoinWorkspaceForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token'); // UUID from old links
  const codeParam = params.get('code'); // Human-readable code from new links
  const [code, setCode] = useState(codeParam || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [profileData, setProfileData] = useState<ProfileFormData>({
    username: '',
    jobTitle: '',
    bio: '',
    portfolioUrl: '',
    profileImageUrl: null,
    profileImagePath: null,
  });

  const validateInviteCode = useCallback(async (invCode: string) => {
    console.log('Validating invite code:', invCode);
    
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

    // Validate invitation code exists
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('code', invCode.toUpperCase())
      .eq('active', true)
      .single();

    if (inviteError || !invitation) {
      throw new Error('Invalid or expired invitation code');
    }

    // Set current user and show profile form
    setCurrentUser(user);
    
    // Pre-fill username from email
    const suggestedUsername = user.email?.split('@')[0] || '';
    setProfileData(prev => ({
      ...prev,
      username: suggestedUsername,
    }));
    
    setShowProfileForm(true);
  }, [router]);

  const completeJoinWithProfile = useCallback(async () => {
    if (!currentUser) return;
    
    console.log('Completing join with profile data:', profileData);
    
    // Get the user's session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session found');
    }
    
    const response = await fetch('/api/invitations/join-enhanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        invite_code: code.toUpperCase(),
        profile: {
          username: profileData.username.trim(),
          job_title: profileData.jobTitle.trim() || null,
          bio: profileData.bio.trim() || null,
          portfolio_url: profileData.portfolioUrl.trim() || null,
          profile_picture_url: profileData.profileImageUrl,
          profile_picture_path: profileData.profileImagePath,
        }
      })
    });
    
    const result = await response.json();
    console.log('Enhanced join API response:', result);
    
    if (!result.success) {
      throw new Error(result.error || result.message || 'Failed to join workspace');
    }
    
    toast.success('Welcome to your workspace! 🎉');
    console.log('Successfully joined workspace, redirecting to home');
    router.push('/home');
  }, [currentUser, profileData, code, router]);

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
        await validateInviteCode(invitation.code);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Invalid invite');
      } finally {
        setLoading(false);
      }
    };
    void joinByToken();
  }, [token, validateInviteCode]);

  const onSubmitInviteCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await validateInviteCode(code.toUpperCase());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not join');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!profileData.username.trim()) {
      setError('Username is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await completeJoinWithProfile();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not complete profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileDataChange = (field: keyof ProfileFormData, value: string | null) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (showProfileForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Complete Your Profile
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Tell us a bit about yourself to complete joining the workspace.
              </p>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={onSubmitProfile} className="space-y-6">
                {/* Profile Picture Upload */}
                <div className="flex justify-center">
                    <ProfilePictureUpload
                      currentImageUrl={profileData.profileImageUrl || undefined}
                      onImageChange={(url, path) => {
                        handleProfileDataChange('profileImageUrl', url);
                        handleProfileDataChange('profileImagePath', path);
                      }}
                      disabled={loading}
                    />
                </div>

                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Username */}
                    <UsernameInput
                      value={profileData.username}
                      onChange={(value) => handleProfileDataChange('username', value)}
                      label="Username"
                      placeholder="johndoe"
                      required
                      disabled={loading}
                    />

                    {/* Job Title */}
                    <div>
                      <Label htmlFor="jobTitle" className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Job Title
                      </Label>
                      <Input
                        id="jobTitle"
                        value={profileData.jobTitle}
                        onChange={(e) => handleProfileDataChange('jobTitle', e.target.value)}
                        placeholder="e.g. Senior Developer, Marketing Manager"
                        disabled={loading}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <Label htmlFor="bio" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      value={profileData.bio}
                      onChange={(e) => handleProfileDataChange('bio', e.target.value)}
                      placeholder="Tell your teammates a bit about yourself..."
                      disabled={loading}
                      className="mt-1"
                      rows={3}
                      maxLength={160}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {profileData.bio.length}/160 characters
                    </p>
                  </div>

                  {/* Portfolio URL */}
                  <div>
                    <Label htmlFor="portfolioUrl" className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      Portfolio/LinkedIn URL
                    </Label>
                    <Input
                      id="portfolioUrl"
                      type="url"
                      value={profileData.portfolioUrl}
                      onChange={(e) => handleProfileDataChange('portfolioUrl', e.target.value)}
                      placeholder="https://linkedin.com/in/johndoe or https://johndoe.dev"
                      disabled={loading}
                      className="mt-1"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowProfileForm(false)}
                    disabled={loading}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !profileData.username.trim()}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  >
                    {loading ? 'Joining...' : 'Complete & Join'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Join a workspace
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Enter the 6-digit code from your invite.
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={onSubmitInviteCode} className="space-y-4">
            <div>
              <Label htmlFor="inviteCode" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Invitation Code
              </Label>
              <Input
                id="inviteCode"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="mt-1 text-center tracking-widest font-mono uppercase text-lg"
                disabled={loading}
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <Button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              {loading ? 'Validating...' : 'Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
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
