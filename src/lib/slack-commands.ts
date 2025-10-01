// Slack Command Handlers
// Utilities for handling Slack slash commands with signature verification

import { createHmac, timingSafeEqual } from 'crypto';
import { 
  getProfileBySlackUser, 
  getWorkspaceBySlackTeam,
  validateSlackUserId,
  parseSlackMention,
  getSlackIdentity,
  getDecryptedSlackTokens
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
  recipientHandle: string | null;
  rawRecipient: string | null;
  recipientHandle: string | null;
  rawRecipient: string | null;
  amount: number | null;
  message: string | null;
  error: string | null;
} {
  if (!text || text.trim() === '') {
    return {
      recipient: null,
      recipientHandle: null,
      rawRecipient: null,
      amount: null,
      message: null,
      error: 'Usage: `/send-karma @user amount [message]`'
    };
  }

  const trimmed = text.trim();

  // Extract the recipient portion, accounting for Slack mention syntax
  let recipientToken: string;
  let remainingText: string;

  if (trimmed.startsWith('<@')) {
    const closingIndex = trimmed.indexOf('>');
    if (closingIndex === -1) {
      return {
        recipient: null,
        recipientHandle: null,
        rawRecipient: null,
        amount: null,
        message: null,
        error: 'Invalid recipient format. Use Slack @mentions or a Slack user ID.',
      };
    }
    recipientToken = trimmed.slice(0, closingIndex + 1);
    remainingText = trimmed.slice(closingIndex + 1).trim();
  } else {
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) {
      return {
        recipient: null,
        recipientHandle: null,
        rawRecipient: null,
        amount: null,
        message: null,
        error: 'Usage: `/send-karma @user amount [message]`\nExample: `/send-karma @john 10 Great job!`',
      };
    }
    recipientToken = parts[0];
    remainingText = trimmed.slice(recipientToken.length).trim();
  }

  if (!remainingText) {
    return {
      recipient: null,
      recipientHandle: null,
      rawRecipient: recipientToken,
      amount: null,
      message: null,
      error: 'Usage: `/send-karma @user amount [message]`\nExample: `/send-karma @john 10 Great job!`'
    };
  }

  // Extract amount
  const amountParts = remainingText.split(/\s+/);
  const amountPart = amountParts[0];
  const parsedAmount = parseInt(amountPart, 10);
  const amount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : null;

  // Extract message (everything after amount)
  const message = amountParts.slice(1).join(' ') || null;

  let recipient: string | null = null;
  let recipientHandle: string | null = null;
  let error: string | null = null;

  if (recipientToken.startsWith('<@') && recipientToken.endsWith('>')) {
    recipient = parseSlackMention(recipientToken);
    if (!recipient) {
      error = 'Invalid recipient. Use @mention or Slack user ID.\nExample: `/send-karma @john 10 Great job!`';
    }
  } else if (validateSlackUserId(recipientToken)) {
    recipient = recipientToken;
  } else if (recipientToken.startsWith('@')) {
    recipientHandle = recipientToken.slice(1).trim();
    if (!recipientHandle) {
      error = 'Invalid recipient. Use @mention or Slack user ID.\nExample: `/send-karma @john 10 Great job!`';
    }
  } else {
    error = 'Invalid recipient. Use @mention or Slack user ID.\nExample: `/send-karma @john 10 Great job!`';
  }

  if (!amount) {
    return {
      recipient,
      recipientHandle,
      rawRecipient: recipientToken,
      amount: null,
      message: null,
      error: 'Amount must be a positive number.\nExample: `/send-karma @john 10 Great job!`'
    };
  }

  return {
    recipient,
    recipientHandle,
    rawRecipient: recipientToken,
    amount,
    message,
    error
  };
}

interface SlackMemberProfile {
  display_name?: string;
  display_name_normalized?: string;
  real_name?: string;
  real_name_normalized?: string;
}

interface SlackMember {
  id?: string;
  team_id?: string;
  deleted?: boolean;
  name?: string;
  profile?: SlackMemberProfile;
}

async function lookupSlackUserIdByHandle(
  handle: string,
  teamId: string,
  accessToken: string
): Promise<string | null> {
  const normalized = handle.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  let cursor: string | undefined;

  try {
    do {
      const url = new URL('https://slack.com/api/users.list');
      url.searchParams.set('limit', '200');
      if (cursor) {
        url.searchParams.set('cursor', cursor);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!data.ok) {
        console.error('Slack users.list error:', data.error);
        return null;
      }

      const members: SlackMember[] = Array.isArray(data.members) ? data.members : [];
      const match = members.find((member) => {
        if (!member || member.deleted) return false;
        if (member.team_id && member.team_id !== teamId) return false;

        const candidates = [
          member.name,
          member.profile?.display_name,
          member.profile?.display_name_normalized,
          member.profile?.real_name,
          member.profile?.real_name_normalized,
        ]
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.toLowerCase());

        return candidates.includes(normalized);
      });

      if (match?.id && typeof match.id === 'string') {
        return match.id;
      }

      const nextCursor = data.response_metadata?.next_cursor?.trim();
      cursor = nextCursor ? nextCursor : undefined;
    } while (cursor);
  } catch (error) {
    console.error('Error looking up Slack user by handle:', error);
    return null;
  }

  return null;
}

async function resolveSlackHandleToUserId(
  handle: string,
  teamId: string,
  senderProfileId: string
): Promise<string | null> {
  try {
    const identities = await getSlackIdentity(senderProfileId, teamId);
    if (!identities || identities.length === 0) {
      return null;
    }

    for (const identity of identities) {
      const tokens = await getDecryptedSlackTokens(identity);
      const userId = await lookupSlackUserIdByHandle(handle, teamId, tokens.access_token);
      if (userId) {
        return userId;
      }
    }
  } catch (error) {
    console.error('Error resolving Slack handle to user ID:', error);
  }

  return null;
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

    let recipientSlackId = parsed.recipient;

    if (!recipientSlackId && parsed.recipientHandle) {
      recipientSlackId = await resolveSlackHandleToUserId(
        parsed.recipientHandle,
        payload.team_id,
        senderProfile.id
      );

      if (!recipientSlackId) {
        return {
          response_type: 'ephemeral',
          text: `❌ Couldn't find Slack user @${parsed.recipientHandle}. Try selecting them from Slack's mention picker or paste their Slack user ID.`,
        };
      }
    }

    if (!recipientSlackId) {
      return {
        response_type: 'ephemeral',
        text: '❌ Invalid recipient. Use Slack @mentions or a Slack user ID.',
      };
    }

    // Resolve recipient
    const recipientProfile = await getProfileBySlackUser(recipientSlackId, payload.team_id);
    if (!recipientProfile) {
      const recipientMention = `<@${recipientSlackId}>`;
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
      const recipientMention = `<@${recipientSlackId}>`;
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