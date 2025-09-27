// API route for joining workspace via invitation
// POST /api/invitations/join - Join workspace using invite code

import { NextRequest } from 'next/server';
import {
  withAuth,
  withErrorHandling,
  createSuccessResponse,
  createNotFoundResponse,
} from '../../../../lib/api-utils';
import {
  getInvitationByCode,
  getProfileByAuthUserIdSafe,
  createProfile,
  deletePendingUser,
} from '../../../../lib/database';
import { JoinWorkspaceInput } from '../../../../lib/types';

// POST /api/invitations/join - Join workspace using invite code
export const POST = withErrorHandling(
  withAuth(async (req) => {
    const { profile: currentProfile, email } = req.user;
    const body = (await req.json()) as JoinWorkspaceInput;

    // Check if user already has a profile
    if (currentProfile) {
      return createSuccessResponse(
        null,
        'User already belongs to a workspace',
        409
      );
    }

    // Validate invite code
    if (!body.invite_code || body.invite_code.length !== 6) {
      return createSuccessResponse(null, 'Invalid invite code format', 400);
    }

    try {
      // Get invitation by code
      const invitation = await getInvitationByCode(
        body.invite_code.toUpperCase()
      );

      // Check if invitation is still active
      if (!invitation.active) {
        return createSuccessResponse(
          null,
          'Invitation is no longer active',
          400
        );
      }

      // Check if invitation has expired
      if (
        invitation.expires_at &&
        new Date(invitation.expires_at) < new Date()
      ) {
        return createSuccessResponse(null, 'Invitation has expired', 400);
      }

      // Check if invitation has reached max uses
      if (invitation.max_uses && invitation.uses_count >= invitation.max_uses) {
        return createSuccessResponse(
          null,
          'Invitation has reached maximum uses',
          400
        );
      }

      // Create profile for the user
      const newProfile = await createProfile({
        auth_user_id: req.user.id,
        workspace_id: invitation.workspace_id,
        email: email,
        role: 'employee',
        giving_balance: 100, // Default monthly allowance
        redeemable_balance: 0,
        active: true,
      });

      // Remove pending user entry if exists
      try {
        await deletePendingUser(req.user.id);
      } catch (error) {
        // Ignore if pending user doesn't exist
      }

      return createSuccessResponse(
        { profile: newProfile },
        'Successfully joined workspace',
        201
      );
    } catch (error) {
      throw error;
    }
  })
);
