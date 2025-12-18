// API route for transaction operations
// GET /api/transactions - List transactions for current user with filters
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

// GET /api/transactions - List transactions for current user with filters
export const GET = withErrorHandling(
  withAuth(async (req) => {
    const { profile } = req.user;
    const pagination = parsePaginationParams(req);
    
    // Extract filter parameters from query
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const type = url.searchParams.get('type') || 'all';
    const dateFilter = url.searchParams.get('dateFilter') || 'all';
    const customDateFrom = url.searchParams.get('customDateFrom');
    const customDateTo = url.searchParams.get('customDateTo');
    const view = url.searchParams.get('view') || 'you'; // 'you' or 'everyone'

    try {
      // Build filters array
      const filters: Array<{
        field: string;
        operator: 'gte' | 'lte' | 'eq' | 'neq' | 'gt' | 'lt' | 'like' | 'in' | 'not_in';
        value: unknown;
      }> = [];
      
      // Add date range filters
      if (dateFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let startDate: Date;
        
        switch (dateFilter) {
          case 'today':
            startDate = today;
            filters.push({
              field: 'created_at',
              operator: 'gte' as const,
              value: startDate.toISOString(),
            });
            break;
          case 'week':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 7);
            filters.push({
              field: 'created_at',
              operator: 'gte' as const,
              value: startDate.toISOString(),
            });
            break;
          case 'month':
            startDate = new Date(today);
            startDate.setMonth(startDate.getMonth() - 1);
            filters.push({
              field: 'created_at',
              operator: 'gte' as const,
              value: startDate.toISOString(),
            });
            break;
          case 'custom':
            if (customDateFrom) {
              filters.push({
                field: 'created_at',
                operator: 'gte' as const,
                value: new Date(customDateFrom).toISOString(),
              });
            }
            if (customDateTo) {
              const endDate = new Date(customDateTo);
              endDate.setHours(23, 59, 59, 999);
              filters.push({
                field: 'created_at',
                operator: 'lte' as const,
                value: endDate.toISOString(),
              });
            }
            break;
        }
      }
      
      // Add transaction type filter for 'you' view only
      if (view === 'you' && type !== 'all') {
        filters.push({
          field: type === 'sent' ? 'sender_profile_id' : 'receiver_profile_id',
          operator: 'eq' as const,
          value: profile.id,
        });
      }

      const transactions = await getTransactionsByProfile(profile.id, {
        page: pagination.page,
        limit: pagination.limit,
        sort: [{ field: 'created_at', order: 'desc' }],
        filters: filters.length > 0 ? filters : undefined,
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
