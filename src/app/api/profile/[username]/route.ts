// API route for getting profile by username
// GET /api/profile/[username] - Get profile by username

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { withJoinAuth, withErrorHandling, createSuccessResponse, type RouteHandler } from '@/lib/api-utils';

const handler = withErrorHandling(
  withJoinAuth(async (req, context) => {
    try {
      const params = await context.params;
      const rawUsername = params?.username;
      const username = Array.isArray(rawUsername) ? rawUsername[0] : rawUsername;
      
      if (!username) {
        return NextResponse.json(
          { error: 'Username is required' },
          { status: 400 }
        );
      }

      console.log('Looking for username:', username);
      console.log('Authenticated user:', req.user.id, req.user.email);
      
      // Use server-side Supabase client with service role key
      console.log('Calling RPC with username:', username);
      const rpcParams: Record<string, unknown> = {
        p_username: username,
        p_requestor_id: req.user.id,
      };

      if (req.user.profile?.workspace_id) {
        rpcParams.p_workspace_id = req.user.profile.workspace_id;
      }

      const { data: profileData, error: profileError } = await supabaseServer.rpc(
        'get_profile_by_username',
        rpcParams
      );

      console.log('RPC result:', { data: profileData, error: profileError });

      if (profileError) {
        console.error('RPC error details:', profileError);
        return NextResponse.json(
          { error: `Database error: ${profileError.message}` },
          { status: 500 }
        );
      }

      if (!profileData || profileData.length === 0) {
        console.log('No profile found for username:', username);
        return NextResponse.json(
          { error: 'User not found or not in your workspace' },
          { status: 404 }
        );
      }

      const profile = profileData[0];
      
      return createSuccessResponse({ profile });
    } catch (error) {
      console.error('Failed to load profile:', error);
      return NextResponse.json(
        { error: 'Failed to load profile' },
        { status: 500 }
      );
    }
  })
);

export const GET: RouteHandler = handler;