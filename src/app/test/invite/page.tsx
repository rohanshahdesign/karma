'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TestResult {
  success: boolean;
  message: string;
  error?: unknown;
  invitation?: unknown;
  user?: unknown;
  existingProfile?: unknown;
  canJoin?: boolean;
  apiResponse?: unknown;
  invitations?: unknown;
  createdInvitation?: unknown;
  workspaceId?: string;
  searchedCode?: string;
  cleanedInvitations?: number;
  activeCode?: string;
}

export default function TestInvitePage() {
  const [testCode, setTestCode] = useState('');
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const testInviteCode = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('Testing invite code:', testCode);
      
      // Test 1: Check if invitation exists in database
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('code', testCode.toUpperCase())
        .eq('active', true)
        .single();
      
      console.log('Invitation query result:', { invitation, inviteError });
      
      if (inviteError) {
        setResult({
          success: false,
          message: 'Invitation not found in database',
          error: inviteError,
          invitation: null
        });
        return;
      }
      
      // Test 2: Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Current user:', { user, userError });
      
      if (userError || !user) {
        setResult({
          success: false,
          message: 'User not authenticated',
          error: userError,
          invitation,
          user: null
        });
        return;
      }
      
      // Test 3: Check if user already has profile
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      
      console.log('Existing profile check:', { existingProfile, profileError });
      
      setResult({
        success: true,
        message: 'All checks passed',
        invitation,
        user: {
          id: user.id,
          email: user.email
        },
        existingProfile,
        canJoin: !existingProfile
      });
      
    } catch (err) {
      console.error('Test error:', err);
      setResult({
        success: false,
        message: 'Test failed with exception',
        error: err
      });
    } finally {
      setLoading(false);
    }
  };
  
  const testJoinWorkspace = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/invitations/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invite_code: testCode
        })
      });
      
      const data = await response.json();
      console.log('Join API response:', data);
      
      setResult({
        success: response.ok,
        message: `Join API returned: ${response.status}`,
        apiResponse: data
      });
      
    } catch (err) {
      console.error('Join API error:', err);
      setResult({
        success: false,
        message: 'Join API failed',
        error: err
      });
    } finally {
      setLoading(false);
    }
  };
  
  const listAllInvitations = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('All invitations:', { data, error });
      
      setResult({
        success: !error,
        message: `Found ${data?.length || 0} invitations`,
        invitations: data,
        error
      });
      
    } catch (err) {
      setResult({
        success: false,
        message: 'Failed to list invitations',
        error: err
      });
    } finally {
      setLoading(false);
    }
  };
  
  const testCreateInvitation = async () => {
    setLoading(true);
    
    try {
      // Get current user profile first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();
        
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      // Generate human-readable code for users
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let readableCode = '';
      for (let i = 0; i < 6; i++) {
        readableCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          workspace_id: profile.workspace_id,
          code: readableCode,      // Human-readable code for users
          created_by_profile_id: profile.id,
          uses_count: 0,
          active: true
          // token will be auto-generated as UUID by database
        })
        .select()
        .single();
      
      console.log('Create invitation result:', { data, error });
      
      setResult({
        success: !error,
        message: error ? 'Failed to create invitation' : `Created invitation with code: ${data?.code}`,
        createdInvitation: data,
        error: error ? {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        } : null
      });
      
    } catch (err) {
      setResult({
        success: false,
        message: 'Failed to create invitation',
        error: err
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite System Debug Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Test Invite Code:
            </label>
            <Input
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              placeholder="Enter invite code (e.g., XQMU49)"
              className="mb-4"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={testInviteCode} 
              disabled={loading || !testCode}
              variant="outline"
            >
              Test Invite Code
            </Button>
            
            <Button 
              onClick={testJoinWorkspace} 
              disabled={loading || !testCode}
              variant="outline"
            >
              Test Join API
            </Button>
            
            <Button 
              onClick={listAllInvitations} 
              disabled={loading}
              variant="outline"
            >
              List All Invitations
            </Button>
            
            <Button 
              onClick={testCreateInvitation} 
              disabled={loading}
              variant="outline"
            >
              Test Create Invitation
            </Button>
            
            <Button 
              onClick={async () => {
                setLoading(true);
                try {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('workspace_id')
                    .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id)
                    .single();
                    
                  const { data, error } = await supabase
                    .from('invitations')
                    .select('id, code, token, active, created_at, uses_count')
                    .eq('workspace_id', profile?.workspace_id)
                    .order('created_at', { ascending: false });
                    
                  setResult({
                    success: !error,
                    message: `Found ${data?.length || 0} invitations for your workspace`,
                    invitations: data,
                    workspaceId: profile?.workspace_id,
                    error
                  });
                } catch (err) {
                  setResult({ success: false, message: 'Debug failed', error: err });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              variant="outline"
            >
              Debug Current Invitations
            </Button>
            
            <Button 
              onClick={async () => {
                if (!testCode) {
                  setResult({ success: false, message: 'Please enter a code to test first' });
                  return;
                }
                
                setLoading(true);
                try {
                  // Test if the code exists and is active
                  const { data: invitation, error } = await supabase
                    .from('invitations')
                    .select('*')
                    .eq('code', testCode.toUpperCase())
                    .eq('active', true)
                    .single();
                    
                  console.log('Join test result:', { invitation, error });
                  
                  if (error || !invitation) {
                    setResult({
                      success: false,
                      message: `Code "${testCode.toUpperCase()}" not found or inactive`,
                      searchedCode: testCode.toUpperCase(),
                      error
                    });
                    return;
                  }
                  
                  setResult({
                    success: true,
                    message: `Code "${testCode.toUpperCase()}" found and active!`,
                    invitation,
                    searchedCode: testCode.toUpperCase()
                  });
                  
                } catch (err) {
                  setResult({ success: false, message: 'Join test failed', error: err });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || !testCode}
              variant="outline"
            >
              Test If Code Can Join
            </Button>
            
            <Button 
              onClick={async () => {
                setLoading(true);
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) throw new Error('Not authenticated');
                  
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('workspace_id')
                    .eq('auth_user_id', user.id)
                    .single();
                    
                  if (!profile) throw new Error('Profile not found');
                  
                  // Get all invitations for workspace
                  const { data: invitations } = await supabase
                    .from('invitations')
                    .select('*')
                    .eq('workspace_id', profile.workspace_id)
                    .order('created_at', { ascending: false });
                    
                  if (!invitations || invitations.length <= 1) {
                    setResult({
                      success: false,
                      message: 'No cleanup needed - only one or zero invitations found'
                    });
                    return;
                  }
                  
                  // Keep the most recent one, disable the rest
                  const [latest, ...oldOnes] = invitations;
                  
                  // Disable old invitations
                  const { error: disableError } = await supabase
                    .from('invitations')
                    .update({ active: false })
                    .in('id', oldOnes.map(inv => inv.id));
                    
                  if (disableError) throw disableError;
                  
                  // Make sure latest is active
                  const { error: activateError } = await supabase
                    .from('invitations')
                    .update({ active: true })
                    .eq('id', latest.id);
                    
                  if (activateError) throw activateError;
                  
                  setResult({
                    success: true,
                    message: `Cleanup complete! Disabled ${oldOnes.length} old invitations, kept latest: ${latest.code}`,
                    cleanedInvitations: oldOnes.length,
                    activeCode: latest.code
                  });
                  
                } catch (err) {
                  setResult({ success: false, message: 'Cleanup failed', error: err });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              variant="outline"
            >
              Cleanup Duplicate Invitations
            </Button>
          </div>
          
          {loading && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2">Testing...</span>
            </div>
          )}
          
          {result && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-semibold mb-2">
                Result: {result?.success ? '✅ Success' : '❌ Failed'}
              </h3>
              <p className="mb-2">{result?.message}</p>
              
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">
                  View Raw Data
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}