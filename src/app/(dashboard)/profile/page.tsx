'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentProfileClient } from '@/lib/database-client';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function ProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const redirectToOwnProfile = async () => {
      try {
        const profile = await getCurrentProfileClient();
        if (profile) {
          // Use email local part as username since profiles don't have username field yet
          const username = profile.email.split('@')[0];
          router.replace(`/profile/${username}`);
        } else {
          router.replace('/home');
        }
      } catch (error) {
        console.error('Failed to get current profile:', error);
        router.replace('/home');
      }
    };

    redirectToOwnProfile();
  }, [router]);

  return (
    <ProtectedRoute>
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    </ProtectedRoute>
  );
}