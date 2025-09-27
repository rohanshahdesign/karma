// API route for demoting admins to employees
// POST /api/workspaces/[id]/members/[memberId]/demote - Demote admin to employee

import {
  withPermissions,
  withErrorHandling,
  createSuccessResponse,
  createNotFoundResponse,
  createForbiddenResponse,
} from '../../../../../../../lib/api-utils';
import {
  getWorkspace,
  getProfile,
  demoteAdminToEmployee,
} from '../../../../../../../lib/database';

// POST /api/workspaces/[id]/members/[memberId]/demote - Demote admin to employee
export const POST = withErrorHandling(
  withPermissions(['super_admin'])(async (req) => {
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

      // Check if user is super admin of this workspace
      if (profile.role !== 'super_admin') {
        return createForbiddenResponse('Super admin access required');
      }

      const member = await getProfile(memberId);

      // Check if member belongs to the same workspace
      if (member.workspace_id !== workspaceId) {
        return createNotFoundResponse('Member');
      }

      // Check if member is currently an admin
      if (member.role !== 'admin') {
        return createSuccessResponse(null, 'Member is not an admin', 400);
      }

      const success = await demoteAdminToEmployee(memberId);

      if (success) {
        return createSuccessResponse(
          { memberId, newRole: 'employee' },
          'Admin demoted to employee successfully'
        );
      } else {
        return createSuccessResponse(null, 'Failed to demote admin', 500);
      }
    } catch (error) {
      throw error;
    }
  })
);
