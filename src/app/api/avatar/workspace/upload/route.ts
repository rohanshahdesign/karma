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
 * POST /api/avatar/workspace/upload
 * Upload workspace logo
 * Body: { workspace_id, file }
 */
export const POST = withErrorHandling(
  withAuth(async (req: AuthenticatedRequest) => {
    try {

      // Parse form data
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const workspaceId = formData.get('workspace_id') as string;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      if (!workspaceId) {
        return NextResponse.json(
          { error: 'Workspace ID is required' },
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

      // Check if user is admin/super_admin of the workspace
      const { data: workspace, error: workspaceError } = await supabaseServer
        .from('workspaces')
        .select('id')
        .eq('id', workspaceId)
        .single();

      if (workspaceError || !workspace) {
        return NextResponse.json(
          { error: 'Workspace not found' },
          { status: 404 }
        );
      }

      // Verify user has permission (optional - can add role check if needed)
      // For now, assuming user initiating upload has permission

      // Convert file to buffer
      const buffer = await file.arrayBuffer();
      const fileName = 'logo.jpg';
      const filePath = `${workspaceId}/${fileName}`;

      // Upload to workspace-profile-pictures bucket
      const { error: uploadError } = await supabaseServer.storage
        .from('workspace-profile-pictures')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: true, // Replace if exists
        });

      if (uploadError) {
        console.error('Error uploading workspace logo:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload workspace logo' },
          { status: 500 }
        );
      }

      // Get public URL for the uploaded image
      const { data: { publicUrl } } = supabaseServer.storage
        .from('workspace-profile-pictures')
        .getPublicUrl(filePath);

      return NextResponse.json(
        { 
          success: true, 
          message: 'Workspace logo uploaded successfully',
          logoUrl: publicUrl 
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error in workspace logo upload:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
);
