// API route to fetch workspace departments
// GET /api/workspaces/departments?workspace_id=xxx

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getAuthenticatedUserForJoin } from '@/lib/api-utils';

const DEFAULT_DEPARTMENTS = ['Frontend', 'Backend', 'UAT', 'QA', 'Design', 'Marketing', 'HR'];

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user using the proper authentication helper
    const { profile: userProfile } = await getAuthenticatedUserForJoin(request);
    
    if (!userProfile) {
      return NextResponse.json(
        { success: false, error: 'Profile required - please complete onboarding', code: 'UNAUTHORIZED' },
        { status: 403 }
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

    // Verify user belongs to the requested workspace
    if (userProfile.workspace_id !== workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this workspace', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Fetch departments from workspace_settings
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
