import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { ProfileUpdate } from '@/lib/supabase-types';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseServer.auth.getUser(token);
    
    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { profile_id, updates } = body;

    // Validate required fields
    if (!profile_id) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      );
    }

    // Get the current profile to verify ownership
    const { data: currentProfile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('id, auth_user_id')
      .eq('id', profile_id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Verify that the authenticated user owns this profile
    if (currentProfile.auth_user_id !== userData.user.id) {
      return NextResponse.json(
        { error: 'You can only update your own profile' },
        { status: 403 }
      );
    }

    // Prepare the updates - only include allowed fields
    const allowedFields = ['full_name', 'job_title', 'department', 'bio', 'avatar_url'];
    const profileUpdates: ProfileUpdate = {};

    for (const field of allowedFields) {
      if (field in updates) {
        profileUpdates[field as keyof typeof profileUpdates] = updates[field];
      }
    }

    // Add updated_at timestamp
    profileUpdates.updated_at = new Date().toISOString();

    // Update the profile
    const { data: updatedProfile, error: updateError } = await supabaseServer
      .from('profiles')
      .update(profileUpdates)
      .eq('id', profile_id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: updatedProfile
    });

  } catch (error) {
    console.error('Profile update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}