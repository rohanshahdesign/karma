import { NextResponse } from 'next/server';
import { getSlackConfig } from '@/lib/env-validation';
import { withErrorHandling } from '@/lib/api-utils';

export const GET = withErrorHandling(async () => {
  const slackConfig = getSlackConfig();
  return NextResponse.json({
    isReady: slackConfig.isReady,
    developmentNote: slackConfig.developmentNote,
    environment: process.env.NODE_ENV,
    forceSlackLocal: process.env.FORCE_SLACK_LOCAL === 'true',
  });
});
