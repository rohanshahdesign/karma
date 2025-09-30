// Slack Disconnect API Route
// Allows users to disconnect their Slack integration

import { NextRequest, NextResponse } from 'next/server';
import { deleteSlackIdentity } from '../../../../../lib/slack';
import { getProfileByAuthUserId } from '../../../../../lib/database';
import { getAuthenticatedUserForJoin } from '../../../../../lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserForJoin(request);

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

    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      typeof (error as { status?: number }).status === 'number'
    ) {
      const status = (error as { status: number }).status;
      const message = (error as { message?: string }).message || 'Failed to disconnect Slack integration';
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json(
      { error: 'Failed to disconnect Slack integration' },
      { status: 500 }
    );
  }
}