// API route for transaction operations
// GET /api/transactions - List transactions for current user
// POST /api/transactions - Create new transaction

import {
  withAuth,
  withErrorHandling,
  createSuccessResponse,
  parsePaginationParams,
} from '../../../lib/api-utils';
import {
  getTransactionsByProfile,
  getProfile,
} from '../../../lib/database';
import { executeTransaction } from '../../../lib/balance';
import { CreateTransactionInput } from '../../../lib/types';

// GET /api/transactions - List transactions for current user
export const GET = withErrorHandling(
  withAuth(async (req) => {
    const { profile } = req.user;
    const pagination = parsePaginationParams(req);

    try {
      const transactions = await getTransactionsByProfile(profile.id, {
        page: pagination.page,
        limit: pagination.limit,
        sort: [{ field: 'created_at', order: 'desc' }],
      });

      return createSuccessResponse(transactions);
    } catch (error) {
      throw error;
    }
  })
);

// POST /api/transactions - Create new transaction
export const POST = withErrorHandling(
  withAuth(async (req) => {
    const { profile } = req.user;
    const body = (await req.json()) as CreateTransactionInput;

    // Validate required fields
    if (!body.receiver_profile_id || !body.amount) {
      return createSuccessResponse(
        null,
        'Missing required fields: receiver_profile_id, amount',
        400
      );
    }

    // Validate amount
    if (body.amount <= 0) {
      return createSuccessResponse(null, 'Amount must be greater than 0', 400);
    }

    try {
      // Check if receiver exists and is in same workspace
      const receiver = await getProfile(body.receiver_profile_id);
      if (receiver.workspace_id !== profile.workspace_id) {
        return createSuccessResponse(
          null,
          'Receiver must be in the same workspace',
          400
        );
      }

      // Prevent self-transactions
      if (receiver.id === profile.id) {
        return createSuccessResponse(
          null,
          'Cannot send karma to yourself',
          400
        );
      }

  // Create transaction using balance utilities
  const transactionId = await executeTransaction(
    profile.id,
    body.receiver_profile_id,
    body.amount,
    body.message
  );

      return createSuccessResponse(
        { transactionId },
        'Transaction created successfully',
        201
      );
    } catch (error) {
      throw error;
    }
  })
);
