'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Workspace {
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  logo_url: string | null;
  user_role: string;
}

interface WorkspaceSwitcherProps {
  currentWorkspaceId?: string;
  onWorkspaceChange?: () => void;
}

export function WorkspaceSwitcher({
  currentWorkspaceId,
  onWorkspaceChange,
}: WorkspaceSwitcherProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Load user's workspaces
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        setLoading(true);
        
        // Call RPC to get all user workspaces
        const { data, error } = await supabase.rpc('get_user_workspaces');
        
        if (error) throw error;
        
        const workspaceList = (data || []) as Workspace[];
        setWorkspaces(workspaceList);

        // Set current workspace (prioritize passed currentWorkspaceId or use super_admin workspace)
        if (currentWorkspaceId) {
          const found = workspaceList.find(w => w.workspace_id === currentWorkspaceId);
          if (found) setCurrentWorkspace(found);
        } else {
          // Default to first super_admin workspace, or first workspace
          const superAdminWorkspace = workspaceList.find(w => w.user_role === 'super_admin');
          setCurrentWorkspace(superAdminWorkspace || workspaceList[0] || null);
        }
      } catch (err) {
        console.error('Error loading workspaces:', err);
        toast.error('Failed to load workspaces');
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, [currentWorkspaceId]);

  const handleWorkspaceSwitch = async (workspaceId: string) => {
    try {
      // Call RPC to switch workspace
      const { error } = await supabase.rpc('switch_workspace', {
        p_workspace_id: workspaceId,
      });

      if (error) throw error;

      // Update local state
      const selected = workspaces.find(w => w.workspace_id === workspaceId);
      if (selected) {
        setCurrentWorkspace(selected);
        setIsOpen(false);
        
        // Trigger refresh
        if (onWorkspaceChange) {
          onWorkspaceChange();
        }
        
        // Refresh the page to load new workspace data
        window.location.reload();
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

  if (loading || !currentWorkspace) {
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
          className="w-full flex items-center gap-2 px-3 py-2 h-9 rounded-md hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-gray-300"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarImage
                src={currentWorkspace.logo_url || undefined}
                alt={currentWorkspace.workspace_name}
              />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs font-semibold">
                {getInitials(currentWorkspace.workspace_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-sm font-semibold truncate">
                {currentWorkspace.workspace_name}
              </span>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 opacity-50 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        {/* <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
          Workspaces ({workspaces.length})
        </DropdownMenuLabel> */}
        {/* <DropdownMenuSeparator /> */}

        {/* List all workspaces */}
        <div className="max-h-64 overflow-y-auto">
          {workspaces.map(workspace => (
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
