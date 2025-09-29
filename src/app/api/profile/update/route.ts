import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { ProfileUpdate } from '@/lib/supabase-types';
import { getAuthenticatedUserForJoin } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user using the proper authentication helper
    const { id: userId, profile: userProfile } = await getAuthenticatedUserForJoin(request);
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Profile required - please complete onboarding' },
        { status: 403 }
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
    if (currentProfile.auth_user_id !== userId) {
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