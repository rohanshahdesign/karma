// Slack Commands API Endpoint
// Handles incoming Slack slash commands with signature verification

import { NextRequest, NextResponse } from 'next/server';
import { 
  verifySlackSignature, 
  handleSlackCommand,
  SlackCommandPayload 
} from '../../../../lib/slack-commands';

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    
    // Get Slack headers
    const timestamp = request.headers.get('x-slack-request-timestamp');
    const signature = request.headers.get('x-slack-signature');
    
    if (!timestamp || !signature) {
      console.error('Missing Slack signature headers');
      return NextResponse.json(
        { error: 'Missing signature headers' },
        { status: 400 }
      );
    }

    // Get signing secret
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (!signingSecret) {
      console.error('SLACK_SIGNING_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify Slack signature
    if (!verifySlackSignature(body, timestamp, signature, signingSecret)) {
      console.error('Invalid Slack signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = new URLSearchParams(body);
    const payload: SlackCommandPayload = {
      token: formData.get('token') || '',
      team_id: formData.get('team_id') || '',
      team_domain: formData.get('team_domain') || '',
      channel_id: formData.get('channel_id') || '',
      channel_name: formData.get('channel_name') || '',
      user_id: formData.get('user_id') || '',
      user_name: formData.get('user_name') || '',
      command: formData.get('command') || '',
      text: formData.get('text') || '',
      response_url: formData.get('response_url') || '',
      trigger_id: formData.get('trigger_id') || '',
    };

    // Log command for debugging (don't log sensitive data in production)
    console.log('Slack command received:', {
      command: payload.command,
      team_id: payload.team_id,
      user_id: payload.user_id,
      text: payload.text ? '[REDACTED]' : undefined,
    });

    // Handle the command
    const response = await handleSlackCommand(payload.command, payload);
    
    // Return Slack-formatted response
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error processing Slack command:', error);
    
    return NextResponse.json({
      response_type: 'ephemeral',
      text: '❌ An internal error occurred while processing your command. Please try again later.',
    });
  }
}

// GET method not allowed
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}