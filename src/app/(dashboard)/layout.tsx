import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { UserProvider } from '@/contexts/UserContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <ProtectedRoute>
        <WorkspaceProvider>
          <CurrencyProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </CurrencyProvider>
        </WorkspaceProvider>
      </ProtectedRoute>
    </UserProvider>
  );
}
