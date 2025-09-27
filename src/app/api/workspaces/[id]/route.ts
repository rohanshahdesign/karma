// API route for individual workspace operations
// GET /api/workspaces/[id] - Get workspace details
// PUT /api/workspaces/[id] - Update workspace
// DELETE /api/workspaces/[id] - Delete workspace

import { NextRequest } from 'next/server';
import {
  withAuth,
  withPermissions,
  withErrorHandling,
  createSuccessResponse,
  createNotFoundResponse,
  createForbiddenResponse,
} from '../../../../lib/api-utils';
import {
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  isAdminOfWorkspace,
} from '../../../../lib/database';
import { UpdateWorkspaceInput } from '../../../../lib/types';

// GET /api/workspaces/[id] - Get workspace details
export const GET = withErrorHandling(
  withAuth(async (req) => {
    const { profile } = req.user;
    const workspaceId = req.url.split('/').pop();

    if (!workspaceId) {
      return createNotFoundResponse('Workspace');
    }

    try {
      const workspace = await getWorkspace(workspaceId);

      // Check if user has access to this workspace
      if (workspace.id !== profile.workspace_id) {
        return createForbiddenResponse('Access denied to this workspace');
      }

      return createSuccessResponse({ workspace });
    } catch (error) {
      throw error;
    }
  })
);

// PUT /api/workspaces/[id] - Update workspace
export const PUT = withErrorHandling(
  withPermissions(['admin'])(async (req) => {
    const { profile } = req.user;
    const workspaceId = req.url.split('/').pop();
    const body = (await req.json()) as UpdateWorkspaceInput;

    if (!workspaceId) {
      return createNotFoundResponse('Workspace');
    }

    try {
      const workspace = await getWorkspace(workspaceId);

      // Check if user has access to this workspace
      if (workspace.id !== profile.workspace_id) {
        return createForbiddenResponse('Access denied to this workspace');
      }

      // Check if user is admin of this workspace
      const isAdmin = await isAdminOfWorkspace(workspaceId);
      if (!isAdmin) {
        return createForbiddenResponse('Admin access required');
      }

      const updatedWorkspace = await updateWorkspace(workspaceId, body);

      return createSuccessResponse(
        { workspace: updatedWorkspace },
        'Workspace updated successfully'
      );
    } catch (error) {
      throw error;
    }
  })
);

// DELETE /api/workspaces/[id] - Delete workspace
export const DELETE = withErrorHandling(
  withPermissions(['super_admin'])(async (req) => {
    const { profile } = req.user;
    const workspaceId = req.url.split('/').pop();

    if (!workspaceId) {
      return createNotFoundResponse('Workspace');
    }

    try {
      const workspace = await getWorkspace(workspaceId);

      // Check if user has access to this workspace
      if (workspace.id !== profile.workspace_id) {
        return createForbiddenResponse('Access denied to this workspace');
      }

      // Check if user is super admin of this workspace
      if (profile.role !== 'super_admin') {
        return createForbiddenResponse('Super admin access required');
      }

      await deleteWorkspace(workspaceId);

      return createSuccessResponse(null, 'Workspace deleted successfully');
    } catch (error) {
      throw error;
    }
  })
);
