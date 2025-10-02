// Slack OAuth Callback Route
// Handles the OAuth callback from Slack and creates/links user identity

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { saveSlackIdentity, linkWorkspaceToSlackTeam, SlackOAuthTokens } from '../../../../../lib/slack';
import { getProfileByAuthUserId } from '../../../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      console.error('Slack OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/auth/error?error=slack_oauth_${error}`, request.url)
      );
    }

    if (!code) {
      console.error('No authorization code received from Slack');
      return NextResponse.redirect(
        new URL('/auth/error?error=slack_oauth_no_code', request.url)
      );
    }

    // Verify state parameter for CSRF protection
    const cookieStore = await cookies();
    const storedState = cookieStore.get('slack_oauth_state')?.value;
    const redirectTo = cookieStore.get('slack_oauth_redirect_to')?.value || '/home';
    const oauthAccessToken = cookieStore.get('slack_oauth_token')?.value || null;

    if (!storedState || storedState !== state) {
      console.error('Invalid OAuth state parameter');
      return NextResponse.redirect(
        new URL('/auth/error?error=slack_oauth_invalid_state', request.url)
      );
    }

    const authUserId = cookieStore.get('slack_oauth_user')?.value;

    // Clear the OAuth state cookies
    cookieStore.delete('slack_oauth_state');
    cookieStore.delete('slack_oauth_redirect_to');
    cookieStore.delete('slack_oauth_user');
    cookieStore.delete('slack_oauth_token');

    if (!authUserId) {
      console.error('No user context found for Slack linking');
      return NextResponse.redirect(
        new URL('/auth/error?error=slack_oauth_no_user', request.url)
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(code);
    if (!tokenResponse) {
      console.error('Failed to exchange code for token');
      return NextResponse.redirect(
        new URL('/auth/error?error=slack_oauth_token_exchange', request.url)
      );
    }

    // Get user's profile using server-side function
    const profile = await getProfileByAuthUserId(authUserId);
    if (!profile) {
      console.error('No profile found for authenticated user');
      return NextResponse.redirect(
        new URL('/auth/error?error=slack_oauth_no_profile', request.url)
      );
    }

    // Save the Slack identity
    try {
      await saveSlackIdentity(profile.id, tokenResponse);
      console.log('Slack identity saved successfully for profile:', profile.id);
      
      // If this is the first admin connecting from this Slack team,
      // we can link the workspace to the Slack team
      if (profile.role === 'admin' || profile.role === 'super_admin') {
        let linked = false;

        if (oauthAccessToken) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

          if (supabaseUrl && supabaseAnonKey) {
            try {
              const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
                global: {
                  headers: {
                    Authorization: `Bearer ${oauthAccessToken}`,
                  },
                },
              });

              const { data, error } = await supabaseUserClient.rpc('link_workspace_to_slack_team', {
                p_workspace_id: profile.workspace_id,
                p_team_id: tokenResponse.team_id,
              });

              if (error) {
                console.error('User-context workspace linking failed:', error);
              } else {
                linked = Boolean(data);
              }
            } catch (clientError) {
              console.error('Error creating user-context Supabase client:', clientError);
            }
          } else {
            console.warn('Supabase URL or anon key missing; cannot link workspace with user context');
          }
        } else {
          console.warn('Slack OAuth access token cookie missing; falling back to service client for linking');
        }

        if (!linked) {
          const fallbackLinked = await linkWorkspaceToSlackTeam(profile.workspace_id, tokenResponse.team_id);
          linked = fallbackLinked;
        }

        if (linked) {
          console.log('Workspace linked to Slack team:', {
            workspace_id: profile.workspace_id,
            slack_team_id: tokenResponse.team_id,
          });
        } else {
          console.warn('Workspace linking did not succeed for workspace:', profile.workspace_id);
        }
      }

      // Redirect to success page or back to the app
      const successUrl = new URL(redirectTo, request.url);
      successUrl.searchParams.set('slack_connected', 'true');
      return NextResponse.redirect(successUrl);
      
    } catch (error) {
      console.error('Error saving Slack identity:', error);
      return NextResponse.redirect(
        new URL('/auth/error?error=slack_oauth_save_failed', request.url)
      );
    }

  } catch (error) {
    console.error('Unexpected error in Slack OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/auth/error?error=slack_oauth_unexpected', request.url)
    );
  }
}

async function exchangeCodeForToken(code: string): Promise<SlackOAuthTokens | null> {
  try {
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = process.env.SLACK_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Missing Slack OAuth configuration');
      return null;
    }

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();
    
    if (!data.ok) {
      console.error('Slack OAuth token exchange failed:', data.error);
      return null;
    }

    console.log('Slack OAuth token exchange successful:', {
      team_id: data.team?.id,
      user_id: data.authed_user?.id,
      scope: data.scope,
    });

    // Return structured token data
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_in ? 
        new Date(Date.now() + data.expires_in * 1000).toISOString() : 
        undefined,
      scope: data.scope,
      team_id: data.team.id,
      user_id: data.authed_user.id,
      user_email: data.authed_user.email,
    };
  } catch (error) {
    console.error('Error in token exchange:', error);
    return null;
  }
}