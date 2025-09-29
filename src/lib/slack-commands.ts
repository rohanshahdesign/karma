// Slack Command Handlers
// Utilities for handling Slack slash commands with signature verification

import { createHmac, timingSafeEqual } from 'crypto';
import { 
  getProfileBySlackUser, 
  getWorkspaceBySlackTeam,
  validateSlackUserId,
  parseSlackMention 
} from './slack';
import { validateAndCreateTransaction } from './database';

// Slack command payload interface
export interface SlackCommandPayload {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id: string;
}

// Slack response types
export interface SlackResponse {
  response_type: 'ephemeral' | 'in_channel';
  text: string;
  attachments?: SlackAttachment[];
  blocks?: unknown[];
}

export interface SlackAttachment {
  color: string;
  title?: string;
  text: string;
  footer?: string;
  ts?: number;
}

// Verify Slack request signature
export function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string,
  signingSecret: string
): boolean {
  try {
    // Check timestamp to prevent replay attacks (within 5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp);
    
    if (Math.abs(currentTime - requestTime) > 300) {
      console.error('Slack request timestamp too old');
      return false;
    }

    // Create signature string
    const sigBasestring = `v0:${timestamp}:${body}`;
    
    // Create expected signature
    const expectedSignature = 'v0=' + createHmac('sha256', signingSecret)
      .update(sigBasestring)
      .digest('hex');

    // Compare signatures using timing-safe comparison
    const expectedBuffer = Buffer.from(expectedSignature);
    const signatureBuffer = Buffer.from(signature);
    
    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (error) {
    console.error('Error verifying Slack signature:', error);
    return false;
  }
}

// Parse /send-karma command text
export function parseKarmaCommand(text: string): {
  recipient: string | null;
  amount: number | null;
  message: string | null;
  error: string | null;
} {
  if (!text || text.trim() === '') {
    return {
      recipient: null,
      amount: null,
      message: null,
      error: 'Usage: `/send-karma @user amount [message]`'
    };
  }

  // Split command into parts
  const parts = text.trim().split(/\s+/);
  
  if (parts.length < 2) {
    return {
      recipient: null,
      amount: null,
      message: null,
      error: 'Usage: `/send-karma @user amount [message]`\nExample: `/send-karma @john 10 Great job!`'
    };
  }

  // Extract recipient (either @mention or user ID)
  const recipientPart = parts[0];
  let recipient: string | null = null;

  if (recipientPart.startsWith('<@') && recipientPart.endsWith('>')) {
    // Parse Slack mention format: <@U123ABC> or <@U123ABC|username>
    recipient = parseSlackMention(recipientPart);
  } else if (validateSlackUserId(recipientPart)) {
    // Raw Slack user ID
    recipient = recipientPart;
  }

  if (!recipient) {
    return {
      recipient: null,
      amount: null,
      message: null,
      error: 'Invalid recipient. Use @mention or Slack user ID.\nExample: `/send-karma @john 10 Great job!`'
    };
  }

  // Extract amount
  const amountPart = parts[1];
  const amount = parseInt(amountPart);

  if (isNaN(amount) || amount <= 0) {
    return {
      recipient,
      amount: null,
      message: null,
      error: 'Amount must be a positive number.\nExample: `/send-karma @john 10 Great job!`'
    };
  }

  // Extract message (everything after amount)
  const message = parts.slice(2).join(' ') || null;

  return {
    recipient,
    amount,
    message,
    error: null
  };
}

// Handle /send-karma command
export async function handleSendKarmaCommand(
  payload: SlackCommandPayload
): Promise<SlackResponse> {
  try {
    // Parse the command
    const parsed = parseKarmaCommand(payload.text);
    
    if (parsed.error) {
      return {
        response_type: 'ephemeral',
        text: `❌ ${parsed.error}`,
      };
    }

    // Get workspace by Slack team
    const workspace = await getWorkspaceBySlackTeam(payload.team_id);
    if (!workspace) {
      return {
        response_type: 'ephemeral',
        text: '❌ This Slack team is not linked to a karma workspace. Please contact your admin.',
      };
    }

    // Resolve sender
    const senderProfile = await getProfileBySlackUser(payload.user_id, payload.team_id);
    if (!senderProfile) {
      return {
        response_type: 'ephemeral',
        text: '❌ You need to connect your karma account first. Please sign in to the karma platform and link your Slack account.',
      };
    }

    // Resolve recipient
    const recipientProfile = await getProfileBySlackUser(parsed.recipient!, payload.team_id);
    if (!recipientProfile) {
      const recipientMention = `<@${parsed.recipient}>`;
      return {
        response_type: 'ephemeral',
        text: `❌ ${recipientMention} hasn't connected their karma account yet. They need to sign in to the platform and link their Slack account.`,
      };
    }

    // Check if sender is trying to send to themselves
    if (senderProfile.id === recipientProfile.id) {
      return {
        response_type: 'ephemeral',
        text: '❌ You cannot send karma to yourself!',
      };
    }

    // Create the transaction
    try {
      const transactionId = await validateAndCreateTransaction({
        p_sender_profile_id: senderProfile.id,
        p_receiver_profile_id: recipientProfile.id,
        p_amount: parsed.amount!,
        p_message: parsed.message || undefined,
      });

      // Success response
      const recipientMention = `<@${parsed.recipient}>`;
      const currencyName = workspace.currency_name.toLowerCase();
      const messageText = parsed.message ? ` with message: "${parsed.message}"` : '';
      
      return {
        response_type: 'in_channel',
        text: `✅ <@${payload.user_id}> sent ${parsed.amount} ${currencyName} to ${recipientMention}${messageText}`,
        attachments: [{
          color: 'good',
          text: `Transaction ID: ${transactionId}`,
          footer: 'Karma Platform',
          ts: Math.floor(Date.now() / 1000),
        }],
      };

    } catch (transactionError: unknown) {
      console.error('Transaction failed:', transactionError);
      
      // Handle specific transaction errors
      const errorMessage = transactionError instanceof Error ? transactionError.message : String(transactionError);
      
      if (errorMessage.includes('insufficient balance')) {
        return {
          response_type: 'ephemeral',
          text: `❌ Insufficient balance. You don't have enough ${workspace.currency_name.toLowerCase()} to send ${parsed.amount}.`,
        };
      }
      
      if (errorMessage.includes('daily limit')) {
        return {
          response_type: 'ephemeral',
          text: `❌ Daily limit exceeded. You've reached your daily sending limit.`,
        };
      }
      
      if (errorMessage.includes('transaction limits')) {
        return {
          response_type: 'ephemeral',
          text: `❌ Amount is outside allowed limits. Check your workspace settings for min/max transaction amounts.`,
        };
      }

      return {
        response_type: 'ephemeral',
        text: `❌ Failed to send ${workspace.currency_name.toLowerCase()}. Please try again or contact support.`,
      };
    }

  } catch (error) {
    console.error('Error handling send-karma command:', error);
    return {
      response_type: 'ephemeral',
      text: '❌ An error occurred while processing your command. Please try again later.',
    };
  }
}

// Handle /karma-balance command
export async function handleKarmaBalanceCommand(
  payload: SlackCommandPayload
): Promise<SlackResponse> {
  try {
    // Get workspace by Slack team
    const workspace = await getWorkspaceBySlackTeam(payload.team_id);
    if (!workspace) {
      return {
        response_type: 'ephemeral',
        text: '❌ This Slack team is not linked to a karma workspace.',
      };
    }

    // Resolve user
    const profile = await getProfileBySlackUser(payload.user_id, payload.team_id);
    if (!profile) {
      return {
        response_type: 'ephemeral',
        text: '❌ You need to connect your karma account first. Please sign in to the karma platform and link your Slack account.',
      };
    }

    const currencyName = workspace.currency_name;
    
    return {
      response_type: 'ephemeral',
      text: `💰 Your ${currencyName} Balance`,
      attachments: [{
        color: 'good',
        text: [
          `**Giving Balance**: ${profile.giving_balance} ${currencyName.toLowerCase()} (available to send)`,
          `**Redeemable Balance**: ${profile.redeemable_balance} ${currencyName.toLowerCase()} (earned from others)`,
        ].join('\n'),
        footer: 'Karma Platform',
      }],
    };

  } catch (error) {
    console.error('Error handling karma-balance command:', error);
    return {
      response_type: 'ephemeral',
      text: '❌ An error occurred while fetching your balance. Please try again later.',
    };
  }
}

// Main command router
export async function handleSlackCommand(
  command: string,
  payload: SlackCommandPayload
): Promise<SlackResponse> {
  switch (command) {
    case '/send-karma':
      return handleSendKarmaCommand(payload);
    case '/karma-balance':
      return handleKarmaBalanceCommand(payload);
    default:
      return {
        response_type: 'ephemeral',
        text: `❌ Unknown command: ${command}`,
      };
  }
}