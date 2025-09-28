// API route for joining workspace via invitation
// POST /api/invitations/join - Join workspace using invite code

import {
  withJoinAuth,
  withErrorHandling,
  createSuccessResponse,
} from '../../../../lib/api-utils';
import {
  getInvitationByCode,
  debugInvitationLookup,
  updateInvitation,
  createProfile,
} from '../../../../lib/database-server';
import {
  deletePendingUser,
} from '../../../../lib/database';
import { JoinWorkspaceInput } from '../../../../lib/types';

// POST /api/invitations/join - Join workspace using invite code
export const POST = withErrorHandling(
  withJoinAuth(async (req) => {
    const { profile: currentProfile, email } = req.user;
    const body = (await req.json()) as JoinWorkspaceInput;

    console.log('Join API called:', { 
      userId: req.user.id, 
      email: req.user.email, 
      hasProfile: !!currentProfile,
      inviteCode: body.invite_code 
    });

    // Check if user already has a profile
    if (currentProfile) {
      console.log('User already has profile, redirecting');
      return createSuccessResponse(
        null,
        'User already belongs to a workspace',
        409
      );
    }

    // Validate invite code (human-readable 6-char code)
    if (!body.invite_code || body.invite_code.length !== 6) {
      return createSuccessResponse(null, 'Invalid invite code format', 400);
    }

    try {
      // Debug the invitation lookup first
      await debugInvitationLookup(body.invite_code.toUpperCase());
      
      // Get invitation by code (human-readable)
      const invitation = await getInvitationByCode(
        body.invite_code.toUpperCase()
      );

      console.log('Found invitation:', {
        id: invitation.id,
        code: invitation.code,
        active: invitation.active,
        workspaceId: invitation.workspace_id,
        usesCount: invitation.uses_count,
        maxUses: invitation.max_uses
      });

      // Check if invitation is still active
      if (!invitation.active) {
        console.log('Invitation not active');
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
        console.log('Invitation expired');
        return createSuccessResponse(null, 'Invitation has expired', 400);
      }

      // Check if invitation has reached max uses
      if (invitation.max_uses && invitation.uses_count >= invitation.max_uses) {
        console.log('Invitation max uses reached');
        return createSuccessResponse(
          null,
          'Invitation has reached maximum uses',
          400
        );
      }

      console.log('Creating profile for user:', req.user.id);
      
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

      console.log('Profile created successfully:', newProfile.id);

      // Increment invitation usage count
      try {
        await updateInvitation(invitation.id, {
          uses_count: invitation.uses_count + 1
        });
        console.log('Invitation uses count incremented');
      } catch (err) {
        console.error('Failed to increment invitation uses:', err);
        // Don't fail the join if we can't update the count
      }

      // Remove pending user entry if exists
      try {
        await deletePendingUser(req.user.id);
        console.log('Pending user entry removed');
      } catch {
        console.log('No pending user entry to remove');
        // Ignore if pending user doesn't exist
      }

      console.log('Join successful, returning profile');
      return createSuccessResponse(
        { profile: newProfile },
        'Successfully joined workspace',
        201
      );
    } catch (error) {
      console.error('Join API error:', error);
      throw error;
    }
  })
);
