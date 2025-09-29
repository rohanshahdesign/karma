// Slack OAuth Initiation Route
// Handles redirecting users to Slack OAuth authorization

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSlackConfig } from '../../../../lib/env-validation';

export async function GET(request: NextRequest) {
  try {
    // Check if Slack integration is ready
    const slackConfig = getSlackConfig();
    
    if (!slackConfig.isReady) {
      console.error('Slack integration not available:', slackConfig.developmentNote);
      return NextResponse.json(
        { 
          error: 'Slack OAuth not available', 
          note: slackConfig.developmentNote || 'Slack OAuth not configured'
        },
        { status: 503 }
      );
    }

    const { clientId, redirectUri } = slackConfig;

    // Ensure clientId and redirectUri are defined (they should be since slackConfig.isReady is true)
    if (!clientId || !redirectUri) {
      console.error('Missing clientId or redirectUri despite isReady being true');
      return NextResponse.json(
        { error: 'Slack OAuth configuration error' },
        { status: 500 }
      );
    }

    // Get redirect URL from query params
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get('redirect_to') || '/home';

    // Create a unique state value for CSRF protection
    const oauthState = crypto.randomUUID();
    
    // Store the state and redirect URL in cookies for verification later
    const cookieStore = await cookies();
    cookieStore.set('slack_oauth_state', oauthState, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });
    
    if (redirectTo) {
      cookieStore.set('slack_oauth_redirect_to', redirectTo, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
      });
    }

    // Slack OAuth scopes needed for the integration
    const scopes = [
      'users:read',           // Read user information
      'users:read.email',     // Read user email
      'chat:write',           // Send messages (for notifications)
      'commands',             // Handle slash commands
      'team:read',            // Read team information
    ].join(',');

    // Build Slack OAuth URL
    const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
    slackAuthUrl.searchParams.set('client_id', clientId);
    slackAuthUrl.searchParams.set('scope', scopes);
    slackAuthUrl.searchParams.set('redirect_uri', redirectUri);
    slackAuthUrl.searchParams.set('state', oauthState);
    slackAuthUrl.searchParams.set('user_scope', 'identity.basic,identity.email');

    // Log OAuth initiation for debugging
    console.log('Initiating Slack OAuth:', {
      client_id: clientId,
      redirect_uri: redirectUri,
      scopes,
      state: oauthState,
    });

    // Redirect to Slack OAuth
    return NextResponse.redirect(slackAuthUrl.toString());
  } catch (error) {
    console.error('Error initiating Slack OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Slack OAuth' },
      { status: 500 }
    );
  }
}