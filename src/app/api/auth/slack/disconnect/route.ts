// Slack Disconnect API Route
// Allows users to disconnect their Slack integration

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../../lib/supabase-server';
import { deleteSlackIdentity } from '../../../../../lib/slack';
import { getProfileByAuthUserId } from '../../../../../lib/database';

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's profile
    const profile = await getProfileByAuthUserId(user.id);
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const { team_id } = await request.json();
    if (!team_id) {
      return NextResponse.json(
        { error: 'team_id is required' },
        { status: 400 }
      );
    }

    // Delete the Slack identity
    await deleteSlackIdentity(profile.id, team_id);

    console.log('Slack identity disconnected:', {
      profile_id: profile.id,
      slack_team_id: team_id,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Slack integration disconnected successfully' 
    });

  } catch (error) {
    console.error('Error disconnecting Slack:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Slack integration' },
      { status: 500 }
    );
  }
}