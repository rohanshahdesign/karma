// Server-side Supabase client with service role key (bypasses RLS)
// Use this for server-side API operations that need full database access

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== SUPABASE SERVER CLIENT INIT ===');
console.log('URL present:', !!supabaseUrl);
console.log('Service key present:', !!supabaseServiceKey);
console.log('Service key length:', supabaseServiceKey?.length || 0);

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

// Create client with service role key - bypasses RLS policies
console.log('Creating Supabase server client...');
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('Supabase server client created:', typeof supabaseServer);

export default supabaseServer;