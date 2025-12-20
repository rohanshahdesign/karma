// API route for enhanced workspace joining with profile creation
// POST /api/invitations/join-enhanced - Join workspace with complete profile

import {
  withJoinAuth,
  withErrorHandling,
  createSuccessResponse,
} from '../../../../lib/api-utils';

interface EnhancedJoinWorkspaceInput {
  invite_code: string;
  profile: {
    username?: string;
    job_title?: string;
    department?: string;
    bio?: string;
    portfolio_url?: string;
    profile_picture_url?: string;
    profile_picture_path?: string;
  };
}

// POST /api/invitations/join-enhanced - Join workspace with enhanced profile
export const POST = withErrorHandling(
  withJoinAuth(async (req) => {
    const { email } = req.user;
    const body = (await req.json()) as EnhancedJoinWorkspaceInput;

    console.log('Enhanced join API called:', { 
      userId: req.user.id, 
      email: req.user.email, 
      inviteCode: body.invite_code,
      hasProfileData: !!body.profile 
    });

    // Validate invite code (human-readable 6-char code)
    if (!body.invite_code || body.invite_code.length !== 6) {
      return createSuccessResponse(null, 'Invalid invite code format', 400);
    }

    // Validate username if provided
    if (body.profile.username) {
      const username = body.profile.username.trim();
      if (!/^[a-zA-Z0-9_-]{2,30}$/.test(username)) {
        return createSuccessResponse(
          null, 
          'Username must be 2-30 characters long and contain only letters, numbers, hyphens, and underscores', 
          400
        );
      }
    }

    // Validate portfolio URL if provided
    if (body.profile.portfolio_url) {
      try {
        new URL(body.profile.portfolio_url);
      } catch {
        return createSuccessResponse(null, 'Invalid portfolio URL format', 400);
      }
    }

    try {
      // Get Google profile data from user metadata (fallback for name/avatar)
      const googleFullName = req.user.raw_user_metadata?.full_name || req.user.raw_user_metadata?.name;
      const googleAvatarUrl = req.user.raw_user_metadata?.avatar_url || req.user.raw_user_metadata?.picture;
      
      console.log('Using Google profile data as fallback:', { googleFullName, googleAvatarUrl });
      
      // Use enhanced RPC function with profile data
      const { data: workspaceId, error: rpcError } = await req.supabase.rpc(
        'join_workspace_with_code_enhanced',
        {
          p_invitation_code: body.invite_code.toUpperCase(),
          p_auth_user_id: req.user.id,
          p_user_email: email,
          p_full_name: googleFullName || null,
          p_avatar_url: body.profile.profile_picture_url || googleAvatarUrl || null,
          p_username: body.profile.username?.trim() || null,
          p_job_title: body.profile.job_title?.trim() || null,
          p_bio: body.profile.bio?.trim() || null,
          p_portfolio_url: body.profile.portfolio_url?.trim() || null,
          p_department: body.profile.department || null,
        }
      );
      
      if (rpcError) {
        console.error('Enhanced RPC error:', rpcError);
        throw rpcError;
      }
      
      console.log('Successfully joined workspace with enhanced profile:', workspaceId);
      
      // Update profile picture path in database if uploaded
      if (body.profile.profile_picture_path) {
        const { error: updateError } = await req.supabase
          .from('profiles')
          .update({ 
            profile_picture_path: body.profile.profile_picture_path,
            avatar_url: body.profile.profile_picture_url 
          })
          .eq('auth_user_id', req.user.id)
          .eq('workspace_id', workspaceId);
          
        if (updateError) {
          console.warn('Failed to update profile picture path:', updateError);
          // Don't fail the whole request for this
        }
      }
      
      // Get the created profile - IMPORTANT: filter by both auth_user_id AND workspace_id
      // This is essential for multi-workspace support to avoid returning all profiles across workspaces
      const { data: newProfile, error: profileError } = await req.supabase
        .from('profiles')
        .select(`
          *,
          workspace:workspaces (*)
        `)
        .eq('auth_user_id', req.user.id)
        .eq('workspace_id', workspaceId)
        .single();
        
      if (profileError) {
        console.error('Error fetching created profile:', profileError);
        throw profileError;
      }

      console.log('Enhanced join successful, returning profile with workspace info');
      return createSuccessResponse(
        { profile: newProfile, workspaceId },
        'Successfully joined workspace with enhanced profile',
        201
      );
    } catch (error) {
      console.error('Enhanced join API error:', error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('Username already taken')) {
          return createSuccessResponse(null, 'Username is already taken in this workspace', 409);
        }
        if (error.message.includes('Invalid or expired invitation')) {
          return createSuccessResponse(null, 'Invalid or expired invitation code', 400);
        }
      }
      
      throw error;
    }
  })
);
