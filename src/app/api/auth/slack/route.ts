// Slack OAuth Initiation Route
// Handles redirecting users to Slack OAuth authorization

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSlackConfig } from '../../../../lib/env-validation';
import { getAuthenticatedUserForJoin } from '../../../../lib/api-utils';

interface SlackInitiatePayload {
  redirect_to?: string;
}

export async function POST(request: NextRequest) {
  try {
    const slackConfig = getSlackConfig();

    if (!slackConfig.isReady) {
      console.error('Slack integration not available:', slackConfig.developmentNote);
      return NextResponse.json(
        {
          error: 'Slack OAuth not available',
          note: slackConfig.developmentNote || 'Slack OAuth not configured',
        },
        { status: 503 }
      );
    }

    const { clientId, redirectUri } = slackConfig;

    if (!clientId || !redirectUri) {
      console.error('Missing clientId or redirectUri despite isReady being true');
      return NextResponse.json(
        { error: 'Slack OAuth configuration error' },
        { status: 500 }
      );
    }

    // Authenticate the user using the bearer token
    const user = await getAuthenticatedUserForJoin(request);
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;

    let body: SlackInitiatePayload = {};
    try {
      body = (await request.json()) as SlackInitiatePayload;
    } catch {
      body = {};
    }

    const redirectTo = body.redirect_to || '/home';

    const oauthState = crypto.randomUUID();

    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 600,
      path: '/',
    };

    cookieStore.set('slack_oauth_state', oauthState, cookieOptions);
    cookieStore.set('slack_oauth_user', user.id, cookieOptions);

    if (redirectTo) {
      cookieStore.set('slack_oauth_redirect_to', redirectTo, cookieOptions);
    }

    if (accessToken) {
      cookieStore.set('slack_oauth_token', accessToken, {
        ...cookieOptions,
        maxAge: 300,
      });
    }

    const scopes = [
      'users:read',
      'users:read.email',
      'chat:write',
      'commands',
      'team:read',
    ].join(',');

    const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
    slackAuthUrl.searchParams.set('client_id', clientId);
    slackAuthUrl.searchParams.set('scope', scopes);
    slackAuthUrl.searchParams.set('redirect_uri', redirectUri);
    slackAuthUrl.searchParams.set('state', oauthState);
    slackAuthUrl.searchParams.set('user_scope', 'identity.basic,identity.email');

    console.log('Initiating Slack OAuth:', {
      client_id: clientId,
      redirect_uri: redirectUri,
      scopes,
      state: oauthState,
      user_id: user.id,
    });

    return NextResponse.json({ url: slackAuthUrl.toString() });
  } catch (error) {
    console.error('Error initiating Slack OAuth:', error);

    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      typeof (error as { status?: number }).status === 'number'
    ) {
      const status = (error as { status: number }).status;
      const message = (error as { message?: string }).message || 'Slack OAuth initiation failed';
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json(
      { error: 'Failed to initiate Slack OAuth' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Use POST with authorization to initiate Slack OAuth' },
    { status: 405 }
  );
}
