// Environment Variable Validation
// Validates required environment variables for different features

interface EnvValidationResult {
  isValid: boolean;
  missingVars: string[];
  warnings: string[];
}

// Core required environment variables
const CORE_REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

// Google OAuth required variables
const GOOGLE_OAUTH_VARS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
] as const;

// Slack integration required variables
const SLACK_REQUIRED_VARS = [
  'SLACK_CLIENT_ID',
  'SLACK_CLIENT_SECRET',
  'SLACK_SIGNING_SECRET',
  'SLACK_REDIRECT_URI',
] as const;

// Teams integration required variables (future)
const TEAMS_REQUIRED_VARS = [
  'TEAMS_CLIENT_ID',
  'TEAMS_CLIENT_SECRET',
] as const;

export function validateCoreEnvironment(): EnvValidationResult {
  const missing = CORE_REQUIRED_VARS.filter(
    (varName) => !process.env[varName]
  );

  return {
    isValid: missing.length === 0,
    missingVars: missing,
    warnings: [],
  };
}

export function validateGoogleOAuth(): EnvValidationResult {
  const missing = GOOGLE_OAUTH_VARS.filter(
    (varName) => !process.env[varName]
  );

  return {
    isValid: missing.length === 0,
    missingVars: missing,
    warnings: missing.length > 0 ? ['Google OAuth login will not work'] : [],
  };
}

export function validateSlackIntegration(): EnvValidationResult {
  const missing = SLACK_REQUIRED_VARS.filter(
    (varName) => !process.env[varName]
  );
  
  const warnings: string[] = [];
  
  // Check if we're in development and warn about Slack limitations
  if (process.env.NODE_ENV === 'development') {
    warnings.push(
      'Slack integration requires HTTPS and public URLs - not available in localhost development'
    );
    warnings.push(
      'For local Slack testing, use ngrok or deploy to staging environment'
    );
  }
  
  // Check redirect URI format
  const redirectUri = process.env.SLACK_REDIRECT_URI;
  if (redirectUri && !redirectUri.startsWith('https://')) {
    warnings.push(
      'SLACK_REDIRECT_URI should use HTTPS for production (Slack requirement)'
    );
  }

  return {
    isValid: missing.length === 0,
    missingVars: missing,
    warnings,
  };
}

export function validateTeamsIntegration(): EnvValidationResult {
  const missing = TEAMS_REQUIRED_VARS.filter(
    (varName) => !process.env[varName]
  );

  return {
    isValid: missing.length === 0,
    missingVars: missing,
    warnings: missing.length > 0 ? ['Microsoft Teams integration will not work'] : [],
  };
}

// Check which integrations are available
export function getAvailableIntegrations() {
  const googleAuth = validateGoogleOAuth();
  const slackIntegration = validateSlackIntegration();
  const teamsIntegration = validateTeamsIntegration();

  return {
    google: googleAuth.isValid,
    slack: slackIntegration.isValid && process.env.NODE_ENV === 'production',
    teams: teamsIntegration.isValid,
    slackDevelopmentNote: process.env.NODE_ENV === 'development' ? 
      'Slack integration disabled in development (requires HTTPS)' : null,
  };
}

// Comprehensive environment validation
export function validateEnvironment(): {
  core: EnvValidationResult;
  google: EnvValidationResult;
  slack: EnvValidationResult;
  teams: EnvValidationResult;
  summary: {
    allValid: boolean;
    criticalMissing: string[];
    totalWarnings: number;
    availableFeatures: string[];
  };
} {
  const core = validateCoreEnvironment();
  const google = validateGoogleOAuth();
  const slack = validateSlackIntegration();
  const teams = validateTeamsIntegration();

  const criticalMissing = [...core.missingVars, ...google.missingVars];
  const totalWarnings = [
    ...core.warnings,
    ...google.warnings,
    ...slack.warnings,
    ...teams.warnings,
  ].length;

  const availableFeatures: string[] = [];
  if (core.isValid && google.isValid) availableFeatures.push('Authentication');
  if (slack.isValid) availableFeatures.push('Slack Integration');
  if (teams.isValid) availableFeatures.push('Teams Integration');

  return {
    core,
    google,
    slack,
    teams,
    summary: {
      allValid: core.isValid && google.isValid,
      criticalMissing,
      totalWarnings,
      availableFeatures,
    },
  };
}

// Helper to check if Slack integration is enabled and ready
export function isSlackIntegrationReady(): boolean {
  const slackValidation = validateSlackIntegration();
  
  // Only enable Slack in production or if explicitly forced
  const isProduction = process.env.NODE_ENV === 'production';
  const forceSlackLocal = process.env.FORCE_SLACK_LOCAL === 'true';
  
  return slackValidation.isValid && (isProduction || forceSlackLocal);
}

// Helper to get Slack configuration safely
export function getSlackConfig(): {
  clientId?: string;
  redirectUri?: string;
  isReady: boolean;
  developmentNote?: string;
} {
  if (!isSlackIntegrationReady()) {
    return {
      isReady: false,
      developmentNote: process.env.NODE_ENV === 'development' ? 
        'Slack integration requires HTTPS - use ngrok or deploy to test' : undefined,
    };
  }

  return {
    clientId: process.env.SLACK_CLIENT_ID,
    redirectUri: process.env.SLACK_REDIRECT_URI,
    isReady: true,
  };
}

// Log environment status on startup
export function logEnvironmentStatus(): void {
  const validation = validateEnvironment();
  
  console.log('=== ENVIRONMENT VALIDATION ===');
  
  if (validation.summary.allValid) {
    console.log('✅ Core environment: Valid');
  } else {
    console.log('❌ Core environment: Missing variables');
    validation.summary.criticalMissing.forEach((varName) => {
      console.log(`   - Missing: ${varName}`);
    });
  }
  
  console.log(`📱 Available features: ${validation.summary.availableFeatures.join(', ')}`);
  
  if (validation.slack.warnings.length > 0) {
    console.log('⚠️  Slack Integration Notes:');
    validation.slack.warnings.forEach((warning) => {
      console.log(`   - ${warning}`);
    });
  }
  
  console.log('================================');
}