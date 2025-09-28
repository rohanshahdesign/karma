// Debug API endpoint to test specific invitation codes
// GET /api/debug/test-code?code=ABC123 - Test if a specific code can be used for joining

import { NextRequest, NextResponse } from 'next/server';
import { getInvitationByCode } from '../../../../lib/database-server';

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
    
    // Search for the code using server-side function (bypasses RLS)
    try {
      const invitation = await getInvitationByCode(code.toUpperCase());
      console.log('Code test result - success:', invitation);
      
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
    } catch (testError) {
      console.log('Code test result - error:', testError);
      return NextResponse.json({
        success: false,
        message: `Code "${code.toUpperCase()}" not found or inactive`,
        searchedCode: code.toUpperCase(),
        error: testError
      });
    }
    
  } catch (error) {
    console.error('Test code API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}