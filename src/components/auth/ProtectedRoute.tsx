'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentProfile, hasRole } from '../../lib/permissions';
import { UserRole } from '../../lib/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  fallbackPath?: string;
  loadingComponent?: React.ReactNode;
}

export default function ProtectedRoute({
  children,
  requiredRoles = ['employee', 'admin', 'super_admin'],
  fallbackPath = '/onboarding',
  loadingComponent = (
    <div className="min-h-screen flex items-center justify-center">
      Loading...
    </div>
  ),
}: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const profile = await getCurrentProfile();

        if (!profile) {
          // No profile means user needs to complete onboarding
          router.replace(fallbackPath);
          return;
        }

        if (!hasRole(profile, requiredRoles)) {
          // User doesn't have required role
          router.replace('/home'); // Redirect to home or show unauthorized message
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [requiredRoles, fallbackPath, router]);

  if (isLoading) {
    return <>{loadingComponent}</>;
  }

  if (!isAuthorized) {
    return null; // Will redirect, so don't render anything
  }

  return <>{children}</>;
}

// Convenience components for common role checks
export function AdminOnly({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
      {children}
    </ProtectedRoute>
  );
}

export function SuperAdminOnly({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['super_admin']}>{children}</ProtectedRoute>
  );
}

export function EmployeeOrAbove({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['employee', 'admin', 'super_admin']}>
      {children}
    </ProtectedRoute>
  );
}
