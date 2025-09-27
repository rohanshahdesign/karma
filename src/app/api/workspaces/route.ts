// API route for workspace operations
// GET /api/workspaces - List workspaces for current user
// POST /api/workspaces - Create new workspace

import { NextRequest } from 'next/server';
import {
  withAuth,
  withErrorHandling,
  createSuccessResponse,
  createNotFoundResponse,
} from '../../../lib/api-utils';
import {
  getCurrentWorkspace,
  createWorkspaceWithOwner,
} from '../../../lib/database';
import { CreateWorkspaceInput } from '../../../lib/types';

// GET /api/workspaces - Get current user's workspace
export const GET = withErrorHandling(
  withAuth(async (req) => {
    const { profile } = req.user;

    try {
      const workspace = await getCurrentWorkspace();
      if (!workspace) {
        return createNotFoundResponse('Workspace');
      }

      return createSuccessResponse({
        workspace,
        profile,
      });
    } catch (error) {
      throw error;
    }
  })
);

// POST /api/workspaces - Create new workspace
export const POST = withErrorHandling(
  withAuth(async (req) => {
    const { profile } = req.user;
    const body = (await req.json()) as CreateWorkspaceInput;

    // Validate required fields
    if (!body.name || !body.currency_name || !body.monthly_allowance) {
      return createSuccessResponse(
        null,
        'Missing required fields: name, currency_name, monthly_allowance',
        400
      );
    }

    // Check if user already has a workspace
    if (profile) {
      return createSuccessResponse(
        null,
        'User already belongs to a workspace',
        409
      );
    }

    try {
      const workspaceId = await createWorkspaceWithOwner({
        p_name: body.name,
        p_slug: body.slug || generateSlug(body.name),
        p_currency_name: body.currency_name,
        p_monthly_allowance: body.monthly_allowance,
        p_owner_email: req.user.email,
        p_min_transaction_amount: body.min_transaction_amount || 5,
        p_max_transaction_amount: body.max_transaction_amount || 20,
        p_daily_limit_percentage: body.daily_limit_percentage || 30,
        p_reward_approval_threshold: body.reward_approval_threshold || 1000,
      });

      // Get the created workspace
      const workspace = await getCurrentWorkspace();
      const updatedProfile = await getCurrentProfile();

      return createSuccessResponse(
        {
          workspace,
          profile: updatedProfile,
        },
        'Workspace created successfully',
        201
      );
    } catch (error) {
      throw error;
    }
  })
);

// Helper function to generate workspace slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

// Helper function to get current profile (imported from permissions)
async function getCurrentProfile() {
  const { getCurrentProfile } = await import('../../../lib/permissions');
  return getCurrentProfile();
}
