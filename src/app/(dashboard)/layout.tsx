import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { UserProvider } from '@/contexts/UserContext';
import { AppDataProvider } from '@/contexts/AppDataProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <ProtectedRoute>
        <AppDataProvider>
          <CurrencyProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </CurrencyProvider>
        </AppDataProvider>
      </ProtectedRoute>
    </UserProvider>
  );
}
