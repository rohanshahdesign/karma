import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { withAuth, withErrorHandling } from '@/lib/api-utils';
import { MAX_AVATAR_FILE_SIZE, getFileSizeErrorMessage } from '@/lib/avatar-constants';

interface AuthenticatedRequest extends NextRequest {
  user?: {
    profile: {
      id: string;
      [key: string]: unknown;
    };
  };
}

/**
 * POST /api/avatar/user/upload
 * Upload a custom user profile picture
 * Replaces the default Google avatar for the authenticated user
 */
export const POST = withErrorHandling(
  withAuth(async (req: AuthenticatedRequest) => {
    try {
      const { profile } = req.user || {};
      if (!profile) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 401 }
        );
      }
      
      // Parse form data
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Validate file size (1 MB limit)
      if (file.size > MAX_AVATAR_FILE_SIZE) {
        return NextResponse.json(
          { error: getFileSizeErrorMessage(file.size) },
          { status: 413 }
        );
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'File must be an image' },
          { status: 400 }
        );
      }

      // Convert file to buffer
      const buffer = await file.arrayBuffer();
      
      // Generate unique filename with timestamp + random string to bust cache
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileExtension = file.type === 'image/jpeg' ? 'jpg' : 
                           file.type === 'image/png' ? 'png' :
                           file.type === 'image/webp' ? 'webp' :
                           file.type === 'image/gif' ? 'gif' : 'jpg';
      const fileName = `avatar-${timestamp}-${randomSuffix}.${fileExtension}`;
      const filePath = `${profile.id}/${fileName}`;

      // Delete old avatar files before uploading new one (storage cleanup)
      try {
        const { data: existingFiles } = await supabaseServer.storage
          .from('user-profile-pictures')
          .list(profile.id);
        
        if (existingFiles && existingFiles.length > 0) {
          // Delete all existing files in the user's folder
          const filesToDelete = existingFiles.map(f => `${profile.id}/${f.name}`);
          const { error: deleteError } = await supabaseServer.storage
            .from('user-profile-pictures')
            .remove(filesToDelete);
          
          if (deleteError) {
            console.warn('Warning: Could not delete old avatars:', deleteError);
            // Don't throw - we can still continue with the upload
          }
        }
      } catch (err) {
        console.warn('Warning: Error listing old avatars:', err);
        // Don't throw - we can still continue with the upload
      }

      // Upload to user-profile-pictures bucket
      const { error: uploadError } = await supabaseServer.storage
        .from('user-profile-pictures')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false, // Don't upsert - we want a new unique file
        });

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload avatar' },
          { status: 500 }
        );
      }

      // Get public URL for the uploaded image
      const { data: { publicUrl } } = supabaseServer.storage
        .from('user-profile-pictures')
        .getPublicUrl(filePath);

      console.log('Avatar public URL:', publicUrl);

      // Update profile with custom avatar URL and mark as having custom avatar
      const { error: updateError } = await supabaseServer
        .from('profiles')
        .update({ 
          has_custom_avatar: true,
          avatar_url: publicUrl 
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { 
          success: true, 
          message: 'Avatar uploaded successfully',
          avatarUrl: publicUrl 
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error in avatar upload:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
);
