// API route for balance reset operations
// POST /api/balance/reset - Manually trigger balance reset (admin only)
// GET /api/balance/reset - Get reset history for workspace

import {
  withAuth,
  withErrorHandling,
  createSuccessResponse,
  createForbiddenResponse,
  createBadRequestResponse,
} from '../../../../lib/api-utils';
import {
  resetAllWorkspacesAllowances,
  manualWorkspaceReset,
  getResetHistory,
  hasResetThisMonth,
  scheduleMonthlyReset,
} from '../../../../lib/monthly-reset';

// GET /api/balance/reset - Get reset history for workspace
export const GET = withErrorHandling(
  withAuth(async (req) => {
    const { profile } = req.user;
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    try {
      const history = await getResetHistory(profile.workspace_id, limit);
      const hasReset = await hasResetThisMonth();

      return createSuccessResponse({
        history,
        hasResetThisMonth: hasReset,
      });
    } catch (error) {
      throw error;
    }
  })
);

// POST /api/balance/reset - Manually trigger balance reset
export const POST = withErrorHandling(
  withAuth(async (req) => {
    const { profile } = req.user;
    const body = await req.json();
    const { type = 'workspace', workspaceId } = body;

    // Check admin permissions
    if (!['admin', 'super_admin'].includes(profile.role)) {
      return createForbiddenResponse('Admin access required');
    }

    try {
      let results;

      switch (type) {
        case 'workspace':
          // Reset specific workspace (current or specified)
          const targetWorkspaceId = workspaceId || profile.workspace_id;
          
          // Super admins can reset any workspace, regular admins only their own
          if (profile.role !== 'super_admin' && targetWorkspaceId !== profile.workspace_id) {
            return createForbiddenResponse('Can only reset your own workspace');
          }

          results = await manualWorkspaceReset(targetWorkspaceId, profile.id);
          break;

        case 'all':
          // Reset all workspaces (super admin only)
          if (profile.role !== 'super_admin') {
            return createForbiddenResponse('Super admin access required for global reset');
          }

          results = await resetAllWorkspacesAllowances();
          break;

        case 'cron':
          // Scheduled monthly reset (system only)
          if (profile.role !== 'super_admin') {
            return createForbiddenResponse('Super admin access required for cron reset');
          }

          await scheduleMonthlyReset();
          return createSuccessResponse(
            { message: 'Monthly reset scheduled and executed' },
            'Reset completed successfully'
          );

        default:
          return createBadRequestResponse('Invalid reset type');
      }

      return createSuccessResponse(
        { results },
        `Reset completed: ${Array.isArray(results) 
          ? results.reduce((sum, r) => sum + r.profilesReset, 0)
          : results.profilesReset
        } profiles updated`
      );

    } catch (error) {
      throw error;
    }
  })
);