// API route for workspace member management
// GET /api/workspaces/[id]/members - List workspace members
// POST /api/workspaces/[id]/members - Invite new member

import {
  withAuth,
  withPermissions,
  withErrorHandling,
  createSuccessResponse,
  createNotFoundResponse,
  createForbiddenResponse,
  parsePaginationParams,
} from '../../../../../lib/api-utils';
import {
  getWorkspace,
  getProfilesByWorkspace,
  isAdminOfWorkspace,
} from '../../../../../lib/database';
import { createInvitation } from '../../../../../lib/database-server';
import { CreateInvitationInput } from '../../../../../lib/types';

// GET /api/workspaces/[id]/members - List workspace members
export const GET = withErrorHandling(
  withAuth(async (req) => {
    const { profile } = req.user;
    const workspaceId = req.url.split('/')[4]; // Extract from /api/workspaces/[id]/members
    const pagination = parsePaginationParams(req);

    if (!workspaceId) {
      return createNotFoundResponse('Workspace');
    }

    try {
      const workspace = await getWorkspace(workspaceId);

      // Check if user has access to this workspace
      if (workspace.id !== profile.workspace_id) {
        return createForbiddenResponse('Access denied to this workspace');
      }

      const members = await getProfilesByWorkspace(workspaceId, {
        page: pagination.page,
        limit: pagination.limit,
        sort: [{ field: 'created_at', order: 'desc' }],
      });

      return createSuccessResponse(members);
    } catch (error) {
      throw error;
    }
  })
);

// POST /api/workspaces/[id]/members - Invite new member
export const POST = withErrorHandling(
  withPermissions(['admin'])(async (req) => {
    const { profile } = req.user;
    const workspaceId = req.url.split('/')[4]; // Extract from /api/workspaces/[id]/members
    const body = (await req.json()) as CreateInvitationInput;

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

      // Generate invite code
      const inviteCode = generateInviteCode();

      const invitation = await createInvitation({
        workspace_id: workspaceId,
        created_by_profile_id: profile.id,
        code: inviteCode,
        expires_at: body.expires_at,
        max_uses: body.max_uses || 1,
      });

      return createSuccessResponse(
        { invitation },
        'Invitation created successfully',
        201
      );
    } catch (error) {
      throw error;
    }
  })
);

// Helper function to generate invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}
