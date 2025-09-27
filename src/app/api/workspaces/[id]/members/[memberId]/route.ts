// API route for individual member management
// GET /api/workspaces/[id]/members/[memberId] - Get member details
// PUT /api/workspaces/[id]/members/[memberId] - Update member
// DELETE /api/workspaces/[id]/members/[memberId] - Remove member

import {
  withAuth,
  withPermissions,
  withErrorHandling,
  createSuccessResponse,
  createNotFoundResponse,
  createForbiddenResponse,
} from '../../../../../../lib/api-utils';
import {
  getWorkspace,
  getProfile,
  updateProfile,
  deleteProfile,
  isAdminOfWorkspace,
} from '../../../../../../lib/database';
import { UpdateProfileInput } from '../../../../../../lib/types';

// GET /api/workspaces/[id]/members/[memberId] - Get member details
export const GET = withErrorHandling(
  withAuth(async (req) => {
    const { profile } = req.user;
    const workspaceId = req.url.split('/')[4];
    const memberId = req.url.split('/')[6];

    if (!workspaceId || !memberId) {
      return createNotFoundResponse('Member');
    }

    try {
      const workspace = await getWorkspace(workspaceId);

      // Check if user has access to this workspace
      if (workspace.id !== profile.workspace_id) {
        return createForbiddenResponse('Access denied to this workspace');
      }

      const member = await getProfile(memberId);

      // Check if member belongs to the same workspace
      if (member.workspace_id !== workspaceId) {
        return createNotFoundResponse('Member');
      }

      return createSuccessResponse({ member });
    } catch (error) {
      throw error;
    }
  })
);

// PUT /api/workspaces/[id]/members/[memberId] - Update member
export const PUT = withErrorHandling(
  withPermissions(['admin'])(async (req) => {
    const { profile } = req.user;
    const workspaceId = req.url.split('/')[4];
    const memberId = req.url.split('/')[6];
    const body = (await req.json()) as UpdateProfileInput;

    if (!workspaceId || !memberId) {
      return createNotFoundResponse('Member');
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

      const member = await getProfile(memberId);

      // Check if member belongs to the same workspace
      if (member.workspace_id !== workspaceId) {
        return createNotFoundResponse('Member');
      }

      const updatedMember = await updateProfile(memberId, body);

      return createSuccessResponse(
        { member: updatedMember },
        'Member updated successfully'
      );
    } catch (error) {
      throw error;
    }
  })
);

// DELETE /api/workspaces/[id]/members/[memberId] - Remove member
export const DELETE = withErrorHandling(
  withPermissions(['admin'])(async (req) => {
    const { profile } = req.user;
    const workspaceId = req.url.split('/')[4];
    const memberId = req.url.split('/')[6];

    if (!workspaceId || !memberId) {
      return createNotFoundResponse('Member');
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

      const member = await getProfile(memberId);

      // Check if member belongs to the same workspace
      if (member.workspace_id !== workspaceId) {
        return createNotFoundResponse('Member');
      }

      // Prevent self-deletion
      if (member.id === profile.id) {
        return createForbiddenResponse('Cannot remove yourself');
      }

      // Prevent removing super admins
      if (member.role === 'super_admin') {
        return createForbiddenResponse('Cannot remove super admin');
      }

      await deleteProfile(memberId);

      return createSuccessResponse(null, 'Member removed successfully');
    } catch (error) {
      throw error;
    }
  })
);
