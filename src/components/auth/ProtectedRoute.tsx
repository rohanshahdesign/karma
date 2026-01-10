'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasRole } from '../../lib/permissions-client';
import { UserRole } from '../../lib/types';
import { useUser } from '@/contexts/UserContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  fallbackPath?: string;
  loadingComponent?: React.ReactNode;
}

export default function ProtectedRoute({
  children,
  requiredRoles = ['employee', 'admin', 'super_admin'],
  fallbackPath = '/login',
  loadingComponent = (
    <div className="min-h-screen flex items-center justify-center">
      Loading...
    </div>
  ),
}: ProtectedRouteProps) {
  const { profile, isLoading, isAuthenticated } = useUser();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Wait for initial load
    if (isLoading) return;

    // Not authenticated or no profile - redirect to login
    if (!isAuthenticated || !profile) {
      router.replace('/login');
      return;
    }

    // Check roles
    if (!hasRole(profile, requiredRoles)) {
      router.replace('/home');
      return;
    }

    setIsAuthorized(true);
  }, [isLoading, isAuthenticated, profile, requiredRoles, fallbackPath, router]);

  if (isLoading) {
    return <>{loadingComponent}</>;
  }

  if (!isAuthorized) {
    return null; 
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
