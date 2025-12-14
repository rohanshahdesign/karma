'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function ProfileRedirectPage() {
  const router = useRouter();
  const { profile, isLoading } = useUser();

  useEffect(() => {
    if (isLoading) return;

    if (profile) {
      // Use the actual username field from the profile
      if (profile.username) {
        router.replace(`/profile/${profile.username}`);
      } else {
        // Fallback to email local part if no username is set
        const emailUsername = profile.email.split('@')[0];
        router.replace(`/profile/${emailUsername}`);
      }
    } else {
      // If no profile and not loading, something is wrong (should be handled by ProtectedRoute/Auth)
      // but safe fallback
      // router.replace('/home'); 
    }
  }, [router, profile, isLoading]);

  return (
    <ProtectedRoute>
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    </ProtectedRoute>
  );
}
