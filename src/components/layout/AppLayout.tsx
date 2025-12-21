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
  LogOut,
  User,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { getWorkspaceClient } from '@/lib/database-client';
import { Workspace } from '@/lib/supabase-types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar, getUserDisplayName } from '@/components/ui/user-avatar';
import { WorkspaceSwitcher } from '@/components/dashboard/WorkspaceSwitcher';

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
    href: '/profile',
    label: 'Profile',
    icon: User,
  },
  {
    href: '/workspaces',
    label: 'Workspace',
    icon: Settings,
  },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Get profile and auth status from context
  const { profile: currentProfile, isAuthenticated, isLoading } = useUser();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Load workspace data when profile is available
  useEffect(() => {
    if (currentProfile?.workspace_id) {
      getWorkspaceClient(currentProfile.workspace_id)
        .then(setWorkspace)
        .catch((error) => console.error('Failed to load workspace:', error));
    }
  }, [currentProfile?.workspace_id]);

  const isActive = (href: string) => {
    return pathname === href || (href !== '/home' && pathname.startsWith(href));
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Force redirect even if signOut fails
      router.replace('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 transition-all duration-300 overflow-visible ${
          sidebarCollapsed ? 'md:w-16' : 'md:w-64'
        }`}
      >
        <div className="flex-1 flex flex-col min-h-0 bg-white/80 backdrop-blur-sm border-r border-[#ebebeb] relative">
          {/* Workspace Switcher - Fixed at top, not scrollable */}
          <div className="flex items-center flex-shrink-0 px-2 pt-4 mb-6 relative pr-6">
            {!sidebarCollapsed && (
              <WorkspaceSwitcher
                currentWorkspaceId={currentProfile?.workspace_id}
              />
            )}
            {/* Collapse Toggle - positioned absolutely on right border */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute right-0 top-6 p-1.5 rounded-full bg-white border border-[#ebebeb] hover:bg-gray-50 transition-colors text-gray-600 hover:text-gray-900 shadow-sm z-10 translate-x-1/2"
              aria-label={
                sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
              }
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Scrollable Navigation Area */}
          <div className="flex-1 flex flex-col overflow-y-auto px-2 pb-4">
            {/* Navigation */}
            <nav className="flex-1 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center ${
                      sidebarCollapsed ? 'justify-center' : ''
                    } px-2 py-2.5 text-sm rounded-lg transition-colors ${
                      active
                        ? 'bg-red-50 text-red-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-50/80 hover:text-gray-900 font-normal'
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon
                      className={`h-5 w-5 flex-shrink-0 ${
                        sidebarCollapsed ? '' : 'mr-3'
                      } ${
                        active
                          ? 'text-red-600'
                          : 'text-gray-500 group-hover:text-gray-700'
                      }`}
                    />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium leading-4 text-white bg-red-500 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
          {currentProfile && (
            <div className="flex-shrink-0 flex border-t border-[#ebebeb]">
              {sidebarCollapsed ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full p-3 hover:bg-gray-50/80 transition-colors">
                    <div className="flex items-center justify-center">
                      <UserAvatar
                        user={currentProfile}
                        size="sm"
                        clickable={false}
                      />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={12}
                    className="w-56 border-[#ebebeb]"
                  >
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium text-gray-900">
                        {getUserDisplayName(currentProfile)}
                      </p>
                      <p className="text-xs font-normal text-gray-600 capitalize">
                        {currentProfile.role.replace('_', ' ')}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      asChild
                      className="flex items-center cursor-pointer hover:bg-gray-50"
                    >
                      <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        Profile Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="flex items-center cursor-pointer text-red-600 focus:text-red-600 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full p-3 hover:bg-gray-50/80 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <UserAvatar
                          user={currentProfile}
                          size="md"
                          clickable={false}
                        />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 text-left">
                            {getUserDisplayName(currentProfile)}
                          </p>
                          <p className="text-xs font-normal text-gray-600 capitalize text-left">
                            {currentProfile.role.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
                    sideOffset={12}
                    className="w-56 border-[#ebebeb] mx-4"
                  >
                    <DropdownMenuItem
                      asChild
                      className="flex items-center cursor-pointer hover:bg-gray-50"
                    >
                      <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        Profile Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="flex items-center cursor-pointer text-red-600 focus:text-red-600 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white/95 backdrop-blur-sm">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                <div className="flex-shrink-0 flex items-center px-3">
                  <WorkspaceSwitcher
                    currentWorkspaceId={currentProfile?.workspace_id}
                  />
                </div>
                <nav className="mt-5 flex-1 px-2 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center px-2 py-2.5 text-base rounded-lg transition-colors ${
                          active
                            ? 'bg-red-50 text-red-600 font-medium hover:bg-red-50/80'
                            : 'text-gray-700 hover:bg-gray-50/80 hover:text-gray-900 font-normal'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon
                          className={`mr-4 h-5 w-5 flex-shrink-0 ${
                            active ? 'text-red-600' : 'text-gray-500'
                          }`}
                        />
                        {item.label}
                        {item.badge && (
                          <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium leading-4 text-white bg-red-500 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
              {currentProfile && (
                <div className="flex-shrink-0 border-t border-[#ebebeb] p-4">
                  <Link
                    href="/profile"
                    className="flex items-center mb-3 p-2 rounded-lg hover:bg-gray-50/80 transition-colors cursor-pointer"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <UserAvatar
                      user={currentProfile}
                      size="md"
                      clickable={false}
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {getUserDisplayName(currentProfile)}
                      </p>
                      <p className="text-xs font-normal text-gray-600 capitalize">
                        {currentProfile.role.replace('_', ' ')}
                      </p>
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div
        className={`flex flex-col flex-1 transition-all duration-300 ${
          sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'
        }`}
      >
        {/* Mobile header */}
        <div className="md:hidden bg-white/80 backdrop-blur-sm border-b border-[#ebebeb] px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-50/80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
              <span className="text-white font-light text-xs">
                {workspace?.name?.charAt(0) || 'K'}
              </span>
            </div>
            <span className="ml-2 text-lg font-medium text-gray-900">
              {workspace?.name || 'Workspace'}
            </span>
          </div>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        {/* Page content */}
        <main className="flex-1 pb-16 md:pb-0">{children}</main>

        {/* Mobile bottom navigation */}
        {!sidebarOpen && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-[#ebebeb] z-50">
            <div className="flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex-1 flex flex-col items-center py-2 px-1 transition-colors ${
                      active ? 'text-accent' : 'text-gray-600'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs mt-1 font-normal">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
