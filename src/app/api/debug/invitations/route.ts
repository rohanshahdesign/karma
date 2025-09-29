// Debug API endpoint to test server-side database access
// GET /api/debug/invitations - Test invitation lookup with server-side client

import { NextResponse } from 'next/server';
import { debugInvitationLookup } from '../../../../lib/database-server';

interface CodeResult {
  data: unknown;
  error: unknown;
}

export async function GET() {
  try {
    console.log('=== DEBUG API INVITATIONS ===');
    
    // Use the debug function from database-server
    const debugResult = await debugInvitationLookup('TEST');
    
    const { allInvitations, activeCheck } = debugResult;
    
    // Test specific codes
    const testCodes = ['0E03JN', 'C3F6O7'];
    const codeResults: Record<string, CodeResult> = {};
    
    for (const code of testCodes) {
      const codeDebug = await debugInvitationLookup(code);
      codeResults[code] = { 
        data: codeDebug.exactMatches, 
        error: null 
      };
    }
    
    return NextResponse.json({
      success: true,
      serverClientWorking: !!allInvitations,
      totalInvitations: allInvitations?.length || 0,
      allInvitations,
      allError: null,
      codeResults,
      sample: activeCheck,
      sampleError: null,
      environment: {
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      }
    });
    
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}