import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { withAuth, withErrorHandling } from '@/lib/api-utils';

/**
 * DELETE /api/avatar/workspace/remove
 * Remove workspace logo
 * Body: { workspace_id }
 */
export const DELETE = withErrorHandling(
  withAuth(async (req: NextRequest) => {
    try {
      const body = await req.json();
      const { workspace_id } = body;

      if (!workspace_id) {
        return NextResponse.json(
          { error: 'Workspace ID is required' },
          { status: 400 }
        );
      }

      // Delete the logo from storage
      const { error: deleteError } = await supabaseServer.storage
        .from('workspace-profile-pictures')
        .remove([`${workspace_id}/logo.jpg`]);

      if (deleteError) {
        console.error('Error deleting workspace logo from storage:', deleteError);
        // Don't fail if file doesn't exist
      }

      return NextResponse.json(
        { 
          success: true, 
          message: 'Workspace logo removed. Fallback to initials.' 
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error in workspace logo removal:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
);
