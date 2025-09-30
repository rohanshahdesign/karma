// API route for verifying workspace invitation codes before joining
// POST /api/invitations/verify

import { withErrorHandling, withJoinAuth, createSuccessResponse } from '../../../../lib/api-utils';

interface VerifyInvitationInput {
  invite_code?: string;
}

export const POST = withErrorHandling(
  withJoinAuth(async (req) => {
    try {
      const body = (await req.json()) as VerifyInvitationInput;
      const rawCode = body.invite_code?.trim().toUpperCase();

      if (!rawCode || rawCode.length !== 6) {
        return createSuccessResponse(
          { valid: false },
          'Invalid invite code format',
          400
        );
      }

      const { data: invitation, error } = await req.supabase
        .from('invitations')
        .select(
          `
            id,
            code,
            active,
            expires_at,
            max_uses,
            uses_count
          `
        )
        .eq('code', rawCode)
        .single();

      if (error || !invitation) {
        return createSuccessResponse(
          { valid: false },
          'Invalid or expired invitation code',
          400
        );
      }

      if (!invitation.active) {
        return createSuccessResponse(
          { valid: false },
          'Invitation is no longer active',
          400
        );
      }

      if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        return createSuccessResponse(
          { valid: false },
          'Invitation has expired',
          400
        );
      }

      if (
        invitation.max_uses !== null &&
        typeof invitation.max_uses === 'number' &&
        invitation.uses_count >= invitation.max_uses
      ) {
        return createSuccessResponse(
          { valid: false },
          'Invitation has reached its maximum uses',
          400
        );
      }

      return createSuccessResponse(
        {
          valid: true,
          invitation: {
            code: invitation.code,
            expires_at: invitation.expires_at,
            max_uses: invitation.max_uses,
            uses_count: invitation.uses_count,
          },
        },
        'Invitation is valid'
      );
    } catch (error) {
      console.error('Invitation verify error:', error);
      throw error;
    }
  })
);
