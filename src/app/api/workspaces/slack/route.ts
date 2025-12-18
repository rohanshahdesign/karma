// Slack Workspace Association API
// Allows admins to manage Slack team linkage to workspaces

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabase-server';
import { 
  linkWorkspaceToSlackTeam, 
  getWorkspaceBySlackTeam,
  getSlackMembershipsByWorkspace
} from '../../../../lib/slack';
import { getProfileByAuthUserId } from '../../../../lib/database';
import { isAdmin } from '../../../../lib/permissions-client';
import { SlackMembership } from '../../../../lib/supabase-types';

// GET /api/workspaces/slack - Get Slack association info for current workspace
export async function GET() {
  try {
    // Get the authenticated user
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's profile
    const profile = await getProfileByAuthUserId(user.id);
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Check if user is admin
    if (!isAdmin(profile)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get workspace information
    const { data: workspace, error } = await supabaseServer
      .from('workspaces')
      .select('id, name, slack_team_id')
      .eq('id', profile.workspace_id)
      .single();

    if (error) {
      console.error('Error fetching workspace:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workspace' },
        { status: 500 }
      );
    }

    // Get Slack memberships if linked
    let slackMemberships: SlackMembership[] = [];
    if (workspace.slack_team_id) {
      slackMemberships = await getSlackMembershipsByWorkspace(workspace.id);
    }

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slack_team_id: workspace.slack_team_id,
        is_slack_linked: !!workspace.slack_team_id,
      },
      slack_memberships: slackMemberships,
      member_count: slackMemberships.length,
    });

  } catch (error) {
    console.error('Error in Slack workspace association GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/slack - Link workspace to Slack team
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's profile
    const profile = await getProfileByAuthUserId(user.id);
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Check if user is admin
    if (!isAdmin(profile)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const { slack_team_id, action } = await request.json();
    
    if (!slack_team_id) {
      return NextResponse.json(
        { error: 'slack_team_id is required' },
        { status: 400 }
      );
    }

    if (action === 'link') {
      // Check if this Slack team is already linked to another workspace
      const existingWorkspace = await getWorkspaceBySlackTeam(slack_team_id);
      if (existingWorkspace && existingWorkspace.id !== profile.workspace_id) {
        return NextResponse.json(
          { 
            error: 'Slack team is already linked to another workspace',
            existing_workspace: existingWorkspace.name 
          },
          { status: 409 }
        );
      }

      // Link the workspace to Slack team
      const linked = await linkWorkspaceToSlackTeam(profile.workspace_id, slack_team_id);
      
      if (!linked) {
        return NextResponse.json(
          { error: 'Failed to link workspace to Slack team' },
          { status: 500 }
        );
      }

      console.log('Workspace linked to Slack team:', {
        workspace_id: profile.workspace_id,
        slack_team_id,
        linked_by: user.id,
      });

      return NextResponse.json({
        success: true,
        message: 'Workspace linked to Slack team successfully',
        slack_team_id,
      });

    } else if (action === 'unlink') {
      // Unlink workspace from Slack team
      const { error } = await supabaseServer
        .from('workspaces')
        .update({ slack_team_id: null })
        .eq('id', profile.workspace_id);

      if (error) {
        console.error('Error unlinking workspace:', error);
        return NextResponse.json(
          { error: 'Failed to unlink workspace from Slack team' },
          { status: 500 }
        );
      }

      // Optionally clean up Slack memberships
      await supabaseServer
        .from('slack_memberships')
        .update({ is_active: false })
        .eq('workspace_id', profile.workspace_id)
        .eq('slack_team_id', slack_team_id);

      console.log('Workspace unlinked from Slack team:', {
        workspace_id: profile.workspace_id,
        slack_team_id,
        unlinked_by: user.id,
      });

      return NextResponse.json({
        success: true,
        message: 'Workspace unlinked from Slack team successfully',
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "link" or "unlink"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in Slack workspace association POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
