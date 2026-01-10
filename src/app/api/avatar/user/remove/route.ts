import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { withAuth, withErrorHandling } from '@/lib/api-utils';

interface AuthenticatedRequest extends NextRequest {
  user?: {
    profile: {
      id: string;
      [key: string]: unknown;
    };
  };
}

/**
 * DELETE /api/avatar/user/remove
 * Remove custom user avatar and fallback to Google avatar
 */
export const DELETE = withErrorHandling(
  withAuth(async (req: AuthenticatedRequest) => {
    try {
      const { profile } = req.user || {};
      if (!profile) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 401 }
        );
      }

      // Delete all uploaded avatar files from storage (could have multiple due to cache busting)
      try {
        const { data: existingFiles } = await supabaseServer.storage
          .from('user-profile-pictures')
          .list(profile.id);
        
        if (existingFiles && existingFiles.length > 0) {
          // Delete all files in the user's folder
          const filesToDelete = existingFiles.map(f => `${profile.id}/${f.name}`);
          const { error: deleteError } = await supabaseServer.storage
            .from('user-profile-pictures')
            .remove(filesToDelete);
          
          if (deleteError) {
            console.error('Error deleting avatar from storage:', deleteError);
            // Don't fail if file doesn't exist
          }
        }
      } catch (err) {
        console.warn('Warning: Error deleting old avatars:', err);
        // Don't fail - continue with profile update
      }

      // Update profile to mark that they no longer have a custom avatar
      const { error: updateError } = await supabaseServer
        .from('profiles')
        .update({ has_custom_avatar: false })
        .eq('id', profile.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return NextResponse.json(
          { error: 'Failed to remove avatar' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { 
          success: true, 
          message: 'Avatar removed. Fallback to Google avatar.' 
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error in avatar removal:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
);
