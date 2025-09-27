// API route for individual transaction operations
// GET /api/transactions/[id] - Get transaction details

import { NextRequest } from 'next/server';
import {
  withAuth,
  withErrorHandling,
  createSuccessResponse,
  createNotFoundResponse,
  createForbiddenResponse,
} from '../../../../lib/api-utils';
import { getTransaction } from '../../../../lib/database';

// GET /api/transactions/[id] - Get transaction details
export const GET = withErrorHandling(
  withAuth(async (req) => {
    const { profile } = req.user;
    const transactionId = req.url.split('/').pop();

    if (!transactionId) {
      return createNotFoundResponse('Transaction');
    }

    try {
      const transaction = await getTransaction(transactionId);

      // Check if user has access to this transaction
      if (
        transaction.sender_profile_id !== profile.id &&
        transaction.receiver_profile_id !== profile.id
      ) {
        return createForbiddenResponse('Access denied to this transaction');
      }

      return createSuccessResponse({ transaction });
    } catch (error) {
      throw error;
    }
  })
);
