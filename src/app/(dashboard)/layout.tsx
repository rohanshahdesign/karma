import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { CurrencyProvider } from '@/contexts/CurrencyContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <CurrencyProvider>
        <AppLayout>
          {children}
        </AppLayout>
      </CurrencyProvider>
    </ProtectedRoute>
  );
}
