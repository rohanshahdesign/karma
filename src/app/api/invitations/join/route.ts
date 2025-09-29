// API route for joining workspace via invitation
// POST /api/invitations/join - Join workspace using invite code

import {
  withJoinAuth,
  withErrorHandling,
  createSuccessResponse,
} from '../../../../lib/api-utils';
// Unused imports removed - now using RPC function approach
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
      // Get Google profile data from user metadata or pending_users
      const fullName = req.user.raw_user_metadata?.full_name || req.user.raw_user_metadata?.name;
      const avatarUrl = req.user.raw_user_metadata?.avatar_url || req.user.raw_user_metadata?.picture;
      
      console.log('Using Google profile data:', { fullName, avatarUrl });
      
      // Use RPC function to join workspace with Google profile data
      const { data: workspaceId, error: rpcError } = await req.supabase.rpc(
        'join_workspace_with_code',
        {
          p_invitation_code: body.invite_code.toUpperCase(),
          p_user_email: email,
          p_full_name: fullName || null,
          p_avatar_url: avatarUrl || null,
        }
      );
      
      if (rpcError) {
        console.error('RPC error:', rpcError);
        throw rpcError;
      }
      
      console.log('Successfully joined workspace:', workspaceId);
      
      // Get the created profile
      const { data: newProfile, error: profileError } = await req.supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', req.user.id)
        .single();
        
      if (profileError) {
        console.error('Error fetching created profile:', profileError);
        throw profileError;
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
