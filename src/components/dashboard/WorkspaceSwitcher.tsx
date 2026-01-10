'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAppData, type UserWorkspace } from '@/contexts/AppDataProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface WorkspaceSwitcherProps {
  currentWorkspaceId?: string;
  onWorkspaceChange?: () => void;
  collapsed?: boolean;
}

export function WorkspaceSwitcher({
  currentWorkspaceId,
  onWorkspaceChange,
  collapsed = false,
}: WorkspaceSwitcherProps) {
  const { userWorkspaces, isLoading: contextLoading } = useAppData();
  const [currentWorkspace, setCurrentWorkspace] = useState<UserWorkspace | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Update current workspace when contextual workspaces change
  useEffect(() => {
    if (userWorkspaces.length > 0) {
      // Set current workspace (prioritize passed currentWorkspaceId or use super_admin workspace)
      if (currentWorkspaceId) {
        const found = userWorkspaces.find((w: UserWorkspace) => w.workspace_id === currentWorkspaceId);
        if (found) setCurrentWorkspace(found);
      } else {
        // Default to first super_admin workspace, or first workspace
        const superAdminWorkspace = userWorkspaces.find((w: UserWorkspace) => w.user_role === 'super_admin');
        setCurrentWorkspace(superAdminWorkspace || userWorkspaces[0] || null);
      }
    }
  }, [userWorkspaces, currentWorkspaceId]);

  const handleWorkspaceSwitch = async (workspaceId: string) => {
    try {
      // Call RPC to switch workspace
      const { error } = await supabase.rpc('switch_workspace', {
        p_workspace_id: workspaceId,
      });

      if (error) throw error;

      // Update local state
      const selected = userWorkspaces.find((w: UserWorkspace) => w.workspace_id === workspaceId);
      if (selected) {
        setCurrentWorkspace(selected);
        setIsOpen(false);
        
        // Trigger refresh via callback
        if (onWorkspaceChange) {
          onWorkspaceChange();
        }
        
        // Reload the current page without full refresh - allows Next.js to handle routing
        router.refresh();
      }
    } catch (err) {
      console.error('Error switching workspace:', err);
      toast.error('Failed to switch workspace');
    }
  };

  const handleCreateWorkspace = () => {
    setIsOpen(false);
    router.push('/workspaces');
  };

  if (contextLoading || !currentWorkspace) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="w-fit"
      >
        Loading...
      </Button>
    );
  }

  // Get initials from workspace name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-2 h-9 rounded-md hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-gray-300 ${collapsed ? 'justify-center px-2' : 'w-full px-3 py-2'}`}
        >
          <div className={`flex items-center gap-2 ${collapsed ? '' : 'flex-1 min-w-0'}`}>
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarImage
                src={currentWorkspace.logo_url || undefined}
                alt={currentWorkspace.workspace_name}
              />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs font-semibold">
                {getInitials(currentWorkspace.workspace_name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-sm font-semibold truncate">
                  {currentWorkspace.workspace_name}
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <ChevronDown className={`h-4 w-4 opacity-50 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        {/* <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
          Workspaces ({workspaces.length})
        </DropdownMenuLabel> */}
        {/* <DropdownMenuSeparator /> */}

        {/* List all workspaces */}
        <div className="max-h-64 overflow-y-auto">
          {userWorkspaces.map((workspace: UserWorkspace) => (
            <DropdownMenuItem
              key={workspace.workspace_id}
              onClick={() => handleWorkspaceSwitch(workspace.workspace_id)}
              className={`cursor-pointer gap-2 !hover:bg-gray-100 !focus:bg-gray-100 ${
                workspace.workspace_id === currentWorkspace.workspace_id
                  ? 'bg-blue-50'
                  : ''
              }`}
            >
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage
                  src={workspace.logo_url || undefined}
                  alt={workspace.workspace_name}
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs font-semibold">
                  {getInitials(workspace.workspace_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-medium truncate">
                  {workspace.workspace_name}
                </div>
                <div className="text-xs text-gray-500">
                  {workspace.user_role.replace('_', ' ')}
                </div>
              </div>
              {workspace.workspace_id === currentWorkspace.workspace_id && (
                <div className="text-blue-600 font-bold">✓</div>
              )}
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator />

        {/* Create new workspace option */}
        <DropdownMenuItem
          onClick={handleCreateWorkspace}
          className="cursor-pointer gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">Create Workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
