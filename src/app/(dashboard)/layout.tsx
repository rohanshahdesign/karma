import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { UserProvider } from '@/contexts/UserContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <ProtectedRoute>
        <CurrencyProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </CurrencyProvider>
      </ProtectedRoute>
    </UserProvider>
  );
}
