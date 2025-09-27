'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Send,
  History,
  Settings,
  TrendingUp,
  Menu,
  X,
} from 'lucide-react';
import { getCurrentProfile } from '@/lib/permissions';
import { Profile } from '@/lib/supabase-types';

interface AppLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const navItems: NavItem[] = [
  {
    href: '/home',
    label: 'Home',
    icon: Home,
  },
  {
    href: '/transactions',
    label: 'History',
    icon: History,
  },
  {
    href: '/send',
    label: 'Send',
    icon: Send,
  },
  {
    href: '/leaderboard',
    label: 'Leaderboard',
    icon: TrendingUp,
  },
  {
    href: '/workspaces',
    label: 'Workspace',
    icon: Settings,
  },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getCurrentProfile();
        setCurrentProfile(profile);
      } catch (error) {
        console.error('Failed to load profile:', error);
        router.push('/login');
      }
    };
    loadProfile();
  }, [router]);

  const isActive = (href: string) => {
    return pathname === href || (href !== '/home' && pathname.startsWith(href));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">K</span>
                </div>
                <span className="ml-3 text-xl font-semibold text-gray-900">
                  Karma
                </span>
              </div>
            </div>
            <nav className="mt-8 flex-1 px-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon
                      className={`mr-3 h-5 w-5 flex-shrink-0 ${
                        active ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    {item.label}
                    {item.badge && (
                      <span className="ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-medium leading-4 text-white bg-red-500 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
          {currentProfile && (
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {currentProfile.full_name?.charAt(0) || currentProfile.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">
                    {currentProfile.full_name || 'User'}
                  </p>
                  <p className="text-xs font-medium text-gray-500 capitalize">
                    {currentProfile.role.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                <div className="flex-shrink-0 flex items-center px-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">K</span>
                    </div>
                    <span className="ml-3 text-xl font-semibold text-gray-900">
                      Karma
                    </span>
                  </div>
                </div>
                <nav className="mt-5 px-2 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                          active
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon
                          className={`mr-4 h-5 w-5 flex-shrink-0 ${
                            active ? 'text-blue-500' : 'text-gray-400'
                          }`}
                        />
                        {item.label}
                        {item.badge && (
                          <span className="ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-medium leading-4 text-white bg-red-500 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Mobile header */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">K</span>
            </div>
            <span className="ml-2 text-lg font-semibold text-gray-900">
              Karma
            </span>
          </div>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        {/* Page content */}
        <main className="flex-1 pb-16 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-1 flex flex-col items-center py-2 px-1 ${
                    active ? 'text-blue-600' : 'text-gray-600'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs mt-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}