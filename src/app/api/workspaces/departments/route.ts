// API route to fetch workspace departments
// GET /api/workspaces/departments?workspace_id=xxx

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthenticatedUserForJoin } from '@/lib/api-utils';

const DEFAULT_DEPARTMENTS = ['Frontend', 'Backend', 'UAT', 'QA', 'Design', 'Marketing', 'HR'];

export async function GET(request: NextRequest) {
  try {
    // Authenticate the user - must be signed in to fetch departments
    // But they don't need a profile in this specific workspace yet (they might be joining)
    const { id: userId } = await getAuthenticatedUserForJoin(request);
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'workspace_id parameter is required', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }

    // Fetch departments from workspace_settings
    // Authenticated users can fetch departments for any workspace (departments are not sensitive data)
    // This allows users joining a new workspace to see the department options
    const { data: settings, error: settingsError } = await supabaseServer
      .from('workspace_settings')
      .select('departments')
      .eq('workspace_id', workspaceId)
      .single();

    if (settingsError) {
      console.error('Error fetching workspace settings:', settingsError);
      // Return defaults if settings not found
      return NextResponse.json({
        success: true,
        data: { departments: DEFAULT_DEPARTMENTS },
        message: 'Using default departments'
      });
    }

    // Parse departments from JSONB
    const departments = settings.departments || DEFAULT_DEPARTMENTS;

    return NextResponse.json({
      success: true,
      data: { departments },
      message: 'Departments fetched successfully'
    });

  } catch (error) {
    console.error('Error in departments API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
