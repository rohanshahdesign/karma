// Debug API endpoint to test server-side database access
// GET /api/debug/invitations - Test invitation lookup with server-side client

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    console.log('=== DEBUG API INVITATIONS ===');
    
    // Test 1: Check if server client is working
    console.log('Testing server-side Supabase client...');
    
    // Test 2: Get all invitations (should bypass RLS)
    const { data: allInvitations, error: allError } = await supabaseServer
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
      
    console.log('All invitations result:', { data: allInvitations, error: allError });
    
    // Test 3: Check specific codes
    const testCodes = ['0E03JN', 'C3F6O7'];
    const codeResults = {};
    
    for (const code of testCodes) {
      const { data: codeData, error: codeError } = await supabaseServer
        .from('invitations')
        .select('*')
        .eq('code', code);
        
      codeResults[code] = { data: codeData, error: codeError };
      console.log(`Code ${code} result:`, codeResults[code]);
    }
    
    // Test 4: Check active field types
    const { data: sample, error: sampleError } = await supabaseServer
      .from('invitations')
      .select('id, code, active, created_at')
      .limit(5);
      
    console.log('Sample invitations:', { data: sample, error: sampleError });
    
    return NextResponse.json({
      success: true,
      serverClientWorking: !!allInvitations || !!allError,
      totalInvitations: allInvitations?.length || 0,
      allInvitations,
      allError,
      codeResults,
      sample,
      sampleError,
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