// API route for promoting members to admin
// POST /api/workspaces/[id]/members/[memberId]/promote - Promote member to admin

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
  promoteUserToAdmin,
} from '../../../../../../../lib/database';

// POST /api/workspaces/[id]/members/[memberId]/promote - Promote member to admin
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

      // Check if member is currently an employee
      if (member.role !== 'employee') {
        return createSuccessResponse(null, 'Member is not an employee', 400);
      }

      const success = await promoteUserToAdmin(memberId);

      if (success) {
        return createSuccessResponse(
          { memberId, newRole: 'admin' },
          'Member promoted to admin successfully'
        );
      } else {
        return createSuccessResponse(null, 'Failed to promote member', 500);
      }
    } catch (error) {
      throw error;
    }
  })
);
