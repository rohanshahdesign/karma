import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

/**
 * GET /api/avatar/user/[profileId]
 * Fetches the latest Google profile picture for a user
 * 
 * Query Parameters:
 * - format=json: Returns JSON response { avatarUrl: string } instead of redirect
 *                Useful for client-side caching (default: 307 redirect)
 * 
 * Default behavior: Returns a redirect (307) to the Google avatar URL
 * Public endpoint - no authentication required (avatars are public)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId } = await params;
    const supabase = supabaseServer;

    // Check if JSON format is requested
    const url = new URL(request.url);
    const formatJson = url.searchParams.get('format') === 'json';

    // Get the profile to find the associated auth user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('auth_user_id')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get the auth user to access their metadata (which contains Google profile picture)
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(
      profile.auth_user_id
    );

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Try to get Google avatar from user metadata
    const googleAvatarUrl = 
      user.user_metadata?.picture ||
      user.user_metadata?.avatar_url ||
      null;

    if (!googleAvatarUrl) {
      return NextResponse.json(
        { error: 'No avatar available' },
        { status: 404 }
      );
    }

    // Return JSON response if requested (for client-side caching)
    if (formatJson) {
      return NextResponse.json(
        { 
          success: true,
          avatarUrl: googleAvatarUrl 
        },
        { status: 200 }
      );
    }

    // Default behavior: Redirect to the Google image URL
    return NextResponse.redirect(googleAvatarUrl, { status: 307 });
  } catch (error) {
    console.error('Error fetching user avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
