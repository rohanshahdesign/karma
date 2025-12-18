// API route for transaction operations
// GET /api/transactions - List transactions for current user with filters
// POST /api/transactions - Create new transaction

import {
  withErrorHandling,
  createSuccessResponse,
  parsePaginationParams,
  createUnauthorizedResponse,
  getQueryParams,
  withAuth,
  AuthenticatedRequest,
} from '../../../lib/api-utils';
import {
  getProfile,
  getTransactionsByProfile,
  getTransactionsByWorkspace,
} from '../../../lib/database';
import { executeTransaction } from '../../../lib/balance';
import { CreateTransactionInput } from '../../../lib/types';
import { getCurrentProfileServer } from '../../../lib/permissions-server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase-server';

// GET /api/transactions - List transactions for current user with filters
export const GET = withErrorHandling(
  async (req: NextRequest): Promise<NextResponse> => {
    // Get auth token from header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createUnauthorizedResponse('Missing or invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const profile = await getCurrentProfileServer(token);
    
    if (!profile) {
      return createUnauthorizedResponse('Invalid or expired token');
    }

    const pagination = parsePaginationParams(req);
    const params = getQueryParams(req);
    
    // Extract filter parameters
    const search = params.search || '';
    const type = params.type || 'all';
    const dateFilter = params.dateFilter || 'all';
    const customDateFrom = params.customDateFrom;
    const customDateTo = params.customDateTo;
    const view = params.view || 'you'; // 'you' or 'everyone'

    try {
      // Build the base query
      const page_num = pagination.page || 1;
      const limit_num = Math.min(pagination.limit || 20, 100);
      const offset = (page_num - 1) * limit_num;

      let query = supabaseServer
        .from('transactions')
        .select(
          `
          *,
          sender_profile:profiles!sender_profile_id (*),
          receiver_profile:profiles!receiver_profile_id (*),
          workspace:workspaces (*)
        `,
          { count: 'exact' }
        );

      // Build the base condition for current user
      if (view === 'you') {
        // For 'you' view, filter by type
        if (type === 'sent') {
          query = query.eq('sender_profile_id', profile.id);
        } else if (type === 'received') {
          query = query.eq('receiver_profile_id', profile.id);
        } else {
          // type === 'all' - show both sent and received
          query = query.or(
            `sender_profile_id.eq.${profile.id},receiver_profile_id.eq.${profile.id}`
          );
        }
      } else {
        // For 'everyone' view, filter by workspace
        query = query.eq('workspace_id', profile.workspace_id);
      }

      // Add date range filters
      if (dateFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let startDate: Date;
        
        switch (dateFilter) {
          case 'today':
            startDate = today;
            query = query.gte('created_at', startDate.toISOString());
            break;
          case 'week':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 7);
            query = query.gte('created_at', startDate.toISOString());
            break;
          case 'month':
            startDate = new Date(today);
            startDate.setMonth(startDate.getMonth() - 1);
            query = query.gte('created_at', startDate.toISOString());
            break;
          case 'custom':
            if (customDateFrom) {
              query = query.gte('created_at', new Date(customDateFrom).toISOString());
            }
            if (customDateTo) {
              const endDate = new Date(customDateTo);
              endDate.setHours(23, 59, 59, 999);
              query = query.lte('created_at', endDate.toISOString());
            }
            break;
        }
      }

      // Add search filter - search in message field
      if (search.trim()) {
        const searchPattern = `%${search}%`;
        query = query.ilike('message', searchPattern);
      }

      // Apply sorting
      query = query.order('created_at', { ascending: false });

      // Apply pagination
      query = query.range(offset, offset + limit_num - 1);

      // Execute query
      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const result = {
        data: data || [],
        pagination: {
          page: page_num,
          limit: limit_num,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit_num),
          has_next: page_num < Math.ceil((count || 0) / limit_num),
          has_prev: page_num > 1,
        },
        success: true,
      };

      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      throw error;
    }
  }
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
