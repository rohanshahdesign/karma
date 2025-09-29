// Slack Integration Security and Audit Logging
// Enhanced security features and audit trail for Slack operations

import { supabaseServer } from './supabase-server';

// Audit event types
export type SlackAuditEventType = 
  | 'oauth_completed'
  | 'oauth_failed'
  | 'command_executed'
  | 'command_failed'
  | 'token_refreshed'
  | 'identity_disconnected'
  | 'workspace_linked'
  | 'workspace_unlinked'
  | 'signature_verification_failed';

// Audit log entry
export interface SlackAuditLog {
  id?: string;
  event_type: SlackAuditEventType;
  slack_user_id?: string;
  slack_team_id?: string;
  profile_id?: string;
  workspace_id?: string;
  command?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  created_at?: string;
}

// Create audit log table if it doesn't exist
const createAuditLogTable = `
CREATE TABLE IF NOT EXISTS public.slack_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  slack_user_id TEXT,
  slack_team_id TEXT,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  command TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slack_audit_logs_event_type ON public.slack_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_slack_audit_logs_slack_team_id ON public.slack_audit_logs(slack_team_id);
CREATE INDEX IF NOT EXISTS idx_slack_audit_logs_profile_id ON public.slack_audit_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_slack_audit_logs_created_at ON public.slack_audit_logs(created_at);
`;

// Initialize audit logging (run this once)
export async function initializeSlackAuditLogging(): Promise<boolean> {
  try {
    const { error } = await supabaseServer.rpc('exec_sql', {
      sql: createAuditLogTable
    });
    
    if (error) {
      console.error('Failed to create audit log table:', error);
      return false;
    }
    
    console.log('Slack audit logging initialized');
    return true;
  } catch (error) {
    console.error('Error initializing audit logging:', error);
    return false;
  }
}

// Log audit event
export async function logSlackAuditEvent(entry: SlackAuditLog): Promise<void> {
  try {
    const { error } = await supabaseServer
      .from('slack_audit_logs')
      .insert({
        event_type: entry.event_type,
        slack_user_id: entry.slack_user_id || null,
        slack_team_id: entry.slack_team_id || null,
        profile_id: entry.profile_id || null,
        workspace_id: entry.workspace_id || null,
        command: entry.command || null,
        metadata: entry.metadata || {},
        ip_address: entry.ip_address || null,
        user_agent: entry.user_agent || null,
        success: entry.success,
        error_message: entry.error_message || null,
      });

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
}

// Get audit logs for a workspace (admin only)
export async function getSlackAuditLogs(
  workspaceId: string, 
  options: {
    limit?: number;
    offset?: number;
    eventType?: SlackAuditEventType;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<SlackAuditLog[]> {
  try {
    let query = supabaseServer
      .from('slack_audit_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (options.eventType) {
      query = query.eq('event_type', options.eventType);
    }

    if (options.startDate) {
      query = query.gte('created_at', options.startDate);
    }

    if (options.endDate) {
      query = query.lte('created_at', options.endDate);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

// Enhanced token encryption using a key derivation function
function getEncryptionKey(): string {
  const baseKey = process.env.SLACK_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-key';
  return Buffer.from(baseKey).toString('base64').substring(0, 32);
}

// Improved token encryption (still basic - in production use proper crypto libraries)
export function encryptSlackToken(token: string): string {
  try {
    // In production, use proper encryption like crypto.createCipher or a library like libsodium
    const key = getEncryptionKey();
    const encrypted = Buffer.from(token + ':' + key).toString('base64');
    return encrypted;
  } catch (error) {
    console.error('Error encrypting token:', error);
    throw new Error('Token encryption failed');
  }
}

export function decryptSlackToken(encryptedToken: string): string {
  try {
    const key = getEncryptionKey();
    const decrypted = Buffer.from(encryptedToken, 'base64').toString();
    const [token] = decrypted.split(':' + key);
    
    if (!token) {
      throw new Error('Invalid encrypted token format');
    }
    
    return token;
  } catch (error) {
    console.error('Error decrypting token:', error);
    throw new Error('Token decryption failed');
  }
}

// Rate limiting for Slack operations
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 60, 
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = `slack_${identifier}`;
  const current = rateLimitMap.get(key);

  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
}

// Validate Slack team/user IDs format
export function validateSlackIds(teamId?: string, userId?: string): boolean {
  if (teamId && !/^T[A-Z0-9]+$/.test(teamId)) {
    return false;
  }
  
  if (userId && !/^[UW][A-Z0-9]+$/.test(userId)) {
    return false;
  }

  return true;
}

// Security headers for Slack responses
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };
}

// Token refresh helper
export async function refreshSlackToken(slackIdentityId: string): Promise<boolean> {
  try {
    // Get current identity
    const { data: identity, error: fetchError } = await supabaseServer
      .from('slack_identities')
      .select('*')
      .eq('id', slackIdentityId)
      .single();

    if (fetchError || !identity) {
      console.error('Failed to fetch Slack identity for refresh:', fetchError);
      return false;
    }

    // Check if refresh token exists
    if (!identity.refresh_token) {
      console.log('No refresh token available for Slack identity:', slackIdentityId);
      return false;
    }

    // Decrypt refresh token
    const refreshToken = decryptSlackToken(identity.refresh_token);

    // Call Slack token refresh API
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Slack token refresh failed:', data.error);
      await logSlackAuditEvent({
        event_type: 'token_refreshed',
        slack_user_id: identity.slack_user_id,
        slack_team_id: identity.slack_team_id,
        profile_id: identity.profile_id,
        success: false,
        error_message: data.error,
      });
      return false;
    }

    // Update identity with new tokens
    const { error: updateError } = await supabaseServer
      .from('slack_identities')
      .update({
        access_token: encryptSlackToken(data.access_token),
        refresh_token: data.refresh_token ? encryptSlackToken(data.refresh_token) : identity.refresh_token,
        token_expires_at: data.expires_in ? 
          new Date(Date.now() + data.expires_in * 1000).toISOString() : 
          null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', slackIdentityId);

    if (updateError) {
      console.error('Failed to update refreshed tokens:', updateError);
      return false;
    }

    // Log successful refresh
    await logSlackAuditEvent({
      event_type: 'token_refreshed',
      slack_user_id: identity.slack_user_id,
      slack_team_id: identity.slack_team_id,
      profile_id: identity.profile_id,
      success: true,
    });

    console.log('Successfully refreshed Slack token for identity:', slackIdentityId);
    return true;

  } catch (error) {
    console.error('Error refreshing Slack token:', error);
    return false;
  }
}

// Check if token needs refresh (within 1 hour of expiry)
export function shouldRefreshToken(tokenExpiresAt?: string): boolean {
  if (!tokenExpiresAt) return false;
  
  const expiryTime = new Date(tokenExpiresAt).getTime();
  const currentTime = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  return (expiryTime - currentTime) < oneHour;
}