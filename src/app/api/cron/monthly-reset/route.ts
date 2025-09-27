// Cron job endpoint for monthly balance resets
// POST /api/cron/monthly-reset - Triggered by external cron service

import {
  withErrorHandling,
  createSuccessResponse,
  createUnauthorizedResponse,
} from '../../../../lib/api-utils';
import {
  resetAllWorkspacesAllowances,
  scheduleMonthlyReset,
} from '../../../../lib/monthly-reset';

// POST /api/cron/monthly-reset - Execute monthly balance reset
export const POST = withErrorHandling(async (req) => {
  try {
    // Verify the request is from an authorized cron service
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Check if we have a cron secret configured
    if (cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        return createUnauthorizedResponse('Invalid or missing cron authorization');
      }
    }
    
    // Alternative: Check if request is from Vercel Cron
    const cronHeader = req.headers.get('vercel-cron');
    if (process.env.VERCEL && cronHeader !== '1') {
      return createUnauthorizedResponse('Request not from Vercel Cron');
    }

    console.log('Starting monthly balance reset cron job...');
    
    // Execute the monthly reset
    await scheduleMonthlyReset();

    // Also get summary of what was done
    const results = await resetAllWorkspacesAllowances();
    
    const summary = {
      timestamp: new Date().toISOString(),
      workspacesProcessed: results.length,
      totalProfilesReset: results.reduce((sum, r) => sum + r.profilesReset, 0),
      totalAllowanceAdded: results.reduce((sum, r) => sum + r.totalAllowanceAdded, 0),
      successfulWorkspaces: results.filter(r => r.errors.length === 0).length,
      errorsCount: results.reduce((sum, r) => sum + r.errors.length, 0),
      errors: results.filter(r => r.errors.length > 0).map(r => ({
        workspaceName: r.workspaceName,
        errors: r.errors,
      })),
    };

    console.log('Monthly balance reset completed:', summary);

    return createSuccessResponse(
      { summary },
      `Monthly reset completed successfully. ${summary.totalProfilesReset} profiles updated across ${summary.workspacesProcessed} workspaces.`
    );

  } catch (error) {
    console.error('Monthly reset cron job failed:', error);
    throw error;
  }
});

// GET /api/cron/monthly-reset - Health check for cron job
export const GET = withErrorHandling(async () => {
  return createSuccessResponse(
    { 
      status: 'ready',
      timestamp: new Date().toISOString(),
      nextReset: getNextResetDate(),
    },
    'Monthly reset cron job is ready'
  );
});

// Helper function to calculate next reset date (1st of next month)
function getNextResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}