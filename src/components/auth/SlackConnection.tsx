'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { hasSlackConnected, getUserSlackIdentities, SlackIdentityPublic } from '../../lib/slack';
import { getSlackConfig } from '../../lib/env-validation';

interface SlackConnectionProps {
  profileId: string;
  onConnectionChange?: (connected: boolean) => void;
}

export default function SlackConnection({ profileId, onConnectionChange }: SlackConnectionProps) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [slackIdentities, setSlackIdentities] = useState<SlackIdentityPublic[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [slackAvailable, setSlackAvailable] = useState<boolean>(true);
  const [developmentNote, setDevelopmentNote] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const loadSlackIdentities = useCallback(async () => {
    try {
      const identities = await getUserSlackIdentities(profileId);
      setSlackIdentities(identities);
    } catch (error) {
      console.error('Error loading Slack identities:', error);
    }
  }, [profileId]);

  const loadConnectionStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const connected = await hasSlackConnected(profileId);
      setIsConnected(connected);
      
      if (connected) {
        await loadSlackIdentities();
      }
    } catch (error) {
      console.error('Error checking Slack connection:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profileId, loadSlackIdentities]);

  // Check for successful connection from OAuth callback
  useEffect(() => {
    const slackConnected = searchParams.get('slack_connected');
    if (slackConnected === 'true') {
      setIsConnected(true);
      loadSlackIdentities();
      onConnectionChange?.(true);
      
      // Clear the URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('slack_connected');
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [searchParams, router, onConnectionChange, loadSlackIdentities]);

  // Check Slack availability and load initial connection status
  useEffect(() => {
    const slackConfig = getSlackConfig();
    setSlackAvailable(slackConfig.isReady);
    setDevelopmentNote(slackConfig.developmentNote || null);
    
    if (slackConfig.isReady) {
      loadConnectionStatus();
    } else {
      setIsLoading(false);
    }
  }, [profileId, loadConnectionStatus]);

  const handleConnectSlack = () => {
    setIsConnecting(true);
    
    // Get current URL for redirect after OAuth
    const currentUrl = window.location.pathname + window.location.search;
    const slackOAuthUrl = `/api/auth/slack?redirect_to=${encodeURIComponent(currentUrl)}`;
    
    window.location.href = slackOAuthUrl;
  };

  const handleDisconnectSlack = async (teamId: string) => {
    if (!confirm('Are you sure you want to disconnect this Slack integration?')) {
      return;
    }

    try {
      const response = await fetch('/api/auth/slack/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_id: teamId,
        }),
      });

      if (response.ok) {
        // Reload connection status
        await loadConnectionStatus();
        onConnectionChange?.(false);
      } else {
        console.error('Failed to disconnect Slack');
        alert('Failed to disconnect Slack. Please try again.');
      }
    } catch (error) {
      console.error('Error disconnecting Slack:', error);
      alert('Error disconnecting Slack. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            <span className="ml-2">Checking Slack connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show development notice if Slack is not available
  if (!slackAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
            </svg>
            Slack Integration
            <span className="text-sm font-normal text-gray-500">(Unavailable in Development)</span>
          </CardTitle>
          <CardDescription>
            Slack integration requires HTTPS and is only available in production environments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3 text-sm text-gray-600">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Development Mode Limitation</p>
              <p className="mb-2">{developmentNote}</p>
              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>To test Slack integration:</strong></p>
                <p>• Use ngrok to expose localhost with HTTPS</p>
                <p>• Deploy to staging/production environment</p>
                <p>• Set FORCE_SLACK_LOCAL=true in .env.local (advanced)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
          </svg>
          Slack Integration
        </CardTitle>
        <CardDescription>
          Connect your Slack account to send and receive karma directly from Slack
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-4">
            <div className="flex items-start space-x-3 text-sm text-gray-600">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">No Slack account connected</p>
                <p>Connect your Slack account to use karma commands and receive notifications in your Slack workspace.</p>
              </div>
            </div>
            <Button 
              onClick={handleConnectSlack} 
              disabled={isConnecting}
              className="w-full bg-[#4A154B] hover:bg-[#611f69] text-white"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting to Slack...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                  </svg>
                  Connect Slack Account
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start space-x-3 text-sm text-green-700">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Slack account connected</p>
                <p>You can now use karma commands in Slack and receive notifications.</p>
              </div>
            </div>
            
            {slackIdentities.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Connected Slack Workspaces:</h4>
                {slackIdentities.map((identity) => (
                  <div key={identity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Team: {identity.slack_team_id}</p>
                      {identity.slack_email && (
                        <p className="text-xs text-gray-600">{identity.slack_email}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Connected {new Date(identity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnectSlack(identity.slack_team_id)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      Disconnect
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <Button 
              onClick={handleConnectSlack} 
              variant="outline"
              className="w-full"
              disabled={isConnecting}
            >
              Connect Additional Slack Workspace
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}