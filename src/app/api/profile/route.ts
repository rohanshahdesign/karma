// API route for user profile operations
// GET /api/profile - Get current user's profile
// PUT /api/profile - Update current user's profile

import { NextRequest } from 'next/server';
import {
  withAuth,
  withErrorHandling,
  createSuccessResponse,
  createNotFoundResponse,
} from '../../../lib/api-utils';
import { getProfileByAuthUserId, updateProfile } from '../../../lib/database';
import { UpdateProfileInput } from '../../../lib/types';

// GET /api/profile - Get current user's profile
export const GET = withErrorHandling(
  withAuth(async (req) => {
    const { profile } = req.user;

    try {
      const userProfile = await getProfileByAuthUserId(req.user.id);
      return createSuccessResponse({ profile: userProfile });
    } catch (error) {
      throw error;
    }
  })
);

// PUT /api/profile - Update current user's profile
export const PUT = withErrorHandling(
  withAuth(async (req) => {
    const { profile } = req.user;
    const body = (await req.json()) as UpdateProfileInput;

    try {
      const updatedProfile = await updateProfile(profile.id, body);
      return createSuccessResponse(
        { profile: updatedProfile },
        'Profile updated successfully'
      );
    } catch (error) {
      throw error;
    }
  })
);
