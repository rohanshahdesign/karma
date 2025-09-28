// Debug API endpoint to test specific invitation codes
// GET /api/debug/test-code?code=ABC123 - Test if a specific code can be used for joining

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    
    if (!code) {
      return NextResponse.json({
        success: false,
        message: 'No code provided. Use ?code=ABC123'
      }, { status: 400 });
    }
    
    console.log('Testing invitation code:', code);
    
    // Search for the code using server client (bypasses RLS)
    const { data: invitation, error } = await supabaseServer
      .from('invitations')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('active', true)
      .single();
    
    console.log('Code test result:', { invitation, error });
    
    if (error || !invitation) {
      return NextResponse.json({
        success: false,
        message: `Code "${code.toUpperCase()}" not found or inactive`,
        searchedCode: code.toUpperCase(),
        error
      });
    }
    
    return NextResponse.json({
      success: true,
      message: `Code "${code.toUpperCase()}" found and active!`,
      invitation: {
        id: invitation.id,
        code: invitation.code,
        workspace_id: invitation.workspace_id,
        active: invitation.active,
        expires_at: invitation.expires_at,
        max_uses: invitation.max_uses,
        uses_count: invitation.uses_count,
        created_at: invitation.created_at
      },
      searchedCode: code.toUpperCase()
    });
    
  } catch (error) {
    console.error('Test code API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}