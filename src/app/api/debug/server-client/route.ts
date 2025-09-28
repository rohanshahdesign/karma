// Test API endpoint to verify server-side Supabase client
// GET /api/debug/server-client - Test if server client works

import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabase-server';

export async function GET() {
  try {
    console.log('=== SERVER CLIENT TEST ===');
    console.log('supabaseServer:', typeof supabaseServer);
    console.log('supabaseServer.from:', typeof supabaseServer.from);
    console.log('supabaseServer.auth:', typeof supabaseServer.auth);
    
    // Test 1: Simple query
    console.log('Testing simple query...');
    const { data, error } = await supabaseServer
      .from('invitations')
      .select('id')
      .limit(1);
      
    console.log('Query result:', { data, error });
    
    // Test 2: Auth method test
    console.log('Testing auth methods...');
    console.log('getUser method:', typeof supabaseServer.auth.getUser);
    
    return NextResponse.json({
      success: true,
      serverClientType: typeof supabaseServer,
      fromMethodType: typeof supabaseServer.from,
      authMethodType: typeof supabaseServer.auth,
      getUserMethodType: typeof supabaseServer.auth.getUser,
      testQuerySuccess: !error,
      testQueryData: data,
      testQueryError: error,
      environment: {
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      }
    });
    
  } catch (error) {
    console.error('Server client test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}