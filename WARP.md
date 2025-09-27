# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is the **Karma Recognition Platform** - a workplace recognition system built with Next.js 15.5.3 where employees can give each other "karma points" that can be redeemed for rewards. The platform features a dual balance system, role-based access control, and anti-exploitation measures.

## Essential Commands

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

### Code Quality
```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check code formatting
npm run format:check
```

### Testing & Database
```bash
# Run database migrations (manual process)
# Execute files in database/ folder in order specified in database/README.md

# Test specific API endpoint
curl http://localhost:3000/api/[endpoint]
```

### Single Test Examples
```bash
# Test authentication flow
curl -X GET http://localhost:3000/auth/callback

# Test protected route (requires auth)
curl -X GET http://localhost:3000/api/profile -H "Authorization: Bearer TOKEN"
```

## Tech Stack & Architecture

### Frontend Stack
- **Framework**: Next.js 15.5.3 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + PostCSS
- **Components**: ShadCN/Radix UI (@radix-ui/react-dialog, @radix-ui/react-slot)
- **Utilities**: class-variance-authority, clsx, tailwind-merge
- **Icons**: lucide-react

### Backend & Database
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Authentication**: Supabase Auth with Google OAuth
- **API**: Next.js API routes (App Router)
- **ORM**: Direct Supabase client queries

### Key Dependencies
- **Supabase**: @supabase/supabase-js v2.57.4
- **React**: v19.1.0 with react-dom v19.1.0
- **Animation**: tailwindcss-animate

## High-Level Architecture

### Dual Balance System
The core business logic revolves around two separate balances:
- **Giving Balance**: Monthly allowance for sending karma (resets monthly, cannot be used for rewards)
- **Redeemable Balance**: Accumulated karma received from others (used for reward redemptions)

### Role-Based Access Control (3 Tiers)
- **Super Admin**: Full workspace control, can promote/demote admins
- **Admin**: Manage members, settings, approve redemptions
- **Employee**: Send/receive karma, basic dashboard access

### Database Architecture
**Core Tables:**
- `workspaces`: Organization data and settings
- `profiles`: User data with roles and balances
- `transactions`: Karma transfers between users
- `invitations`: Workspace invite codes/links
- `daily_sent_karma`: Anti-exploitation tracking

**Key RPC Functions:**
- `create_workspace_with_owner()`: Atomic workspace creation
- `validate_and_create_transaction()`: Transaction validation with limits
- `promote_user_to_admin()` / `demote_admin_to_employee()`: Role management

### Anti-Exploitation System
- **Transaction Limits**: Min/max amounts per transaction (default: 5-20 karma)
- **Daily Limits**: 30% of monthly allowance per day
- **Workspace Settings**: Admin-configurable limits via database settings

## Directory Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth pages (login, onboarding)
│   ├── (dashboard)/         # Protected dashboard pages
│   ├── auth/callback/       # OAuth callback handler
│   ├── AuthHashHandler.tsx  # Hash token processing
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── lib/                    # Core business logic
│   ├── api-utils.ts        # API middleware & response utilities
│   ├── api-types.ts        # API response types & constants
│   ├── auth.ts             # Authentication utilities
│   ├── database.ts         # Database query utilities
│   ├── permissions.ts      # Role-based access control
│   ├── supabase.ts         # Supabase client configuration
│   ├── types.ts            # Core TypeScript types (470+ lines)
│   └── utils.ts            # General utilities

database/                   # SQL migrations (run in order)
├── migrations/            # Auto-generated migration files
├── 001_tables.sql        # Core database schema
├── 004_rls.sql           # Row Level Security policies
├── 010_rpc_create_workspace.sql  # Workspace creation
├── 013_transaction_validation.sql # Transaction limits
└── README.md             # Migration execution order

docs/                      # Project documentation
├── Context.md            # Development context & status
├── PRD.md               # Product requirements document
├── Tasks.md             # Task breakdown
└── Tech Implementation.md # Technical details
```

## Authentication Flow

1. **Google OAuth** → Supabase Auth
2. **Profile Check**: No profile → redirect to `/onboarding`
3. **Onboarding**: Create new workspace OR join via invite code
4. **Dashboard Access**: Role-based features at `/home`

## Environment Configuration

Required environment variables (see `.env.example`):
```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Google OAuth (Required)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Integrations (Optional)
SLACK_CLIENT_ID=
TEAMS_CLIENT_ID=
```

## Key Implementation Patterns

### Permission Checking
```typescript path=src/lib/permissions.ts start=37
export function hasRole(profile: Profile | null, requiredRoles: UserRole[]): boolean {
  if (!profile) return false;
  return requiredRoles.includes(profile.role);
}

export function isAdmin(profile: Profile | null): boolean {
  return hasRole(profile, ['admin', 'super_admin']);
}
```

### API Response Utilities
```typescript path=src/lib/api-utils.ts start=113
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = HTTP_STATUS.OK
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, message }, { status });
}
```

### Database RPC Calls
```sql path=database/013_transaction_validation.sql start=null
CREATE OR REPLACE FUNCTION validate_and_create_transaction(...)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
```

## Current Development Status

**Completed (50% of project - Tasks 1.1-6.0):**
- ✅ Project Setup (1.1-1.4): Next.js 15.5.3 + TypeScript + Tailwind CSS v4 + ShadCN
- ✅ Environment Setup (2.1-2.3): Supabase, Google OAuth, Vercel configuration
- ✅ Database Foundation (3.1-3.4): Schema, RLS policies, migrations, indexes
- ✅ Authentication System (4.1-4.5): Google OAuth, onboarding, role-based access, transaction limits
- ✅ Core API Layer (5.1-5.4): TypeScript types, database utilities, API foundation, CRUD endpoints
- ✅ API Utilities & Middleware (6.0): Request/response utilities, auth middleware, validation

**Currently In Progress (Task 6.1):**
- 🟡 Workspace Management: Creation interface, settings page, customization

**Next Immediate Tasks:**
- 📋 Task 6.2: Invitation System (6-digit codes, link generation, validation)
- 📋 Task 6.3: Member Management (invitation UI, role assignment, member removal)
- 📋 Task 6.4: Admin Settings Interface (transaction limits config, role promotion)
- 📋 Task 7.1-7.5: Dual Balance System (giving/redeemable balances, transfers, monthly resets)

**Future Development Phases:**
- 📋 Tasks 8.1-8.4: UI Component Library & Dashboard Interface
- 📋 Tasks 9.1-9.4: Advanced Features (profiles, leaderboards, badges, rewards)
- 📋 Tasks 10.1-10.4: Admin Features (dashboard, user management, analytics)
- 📋 Tasks 11.1-11.3: Integrations (Slack, Teams, webhooks)
- 📋 Tasks 12.1-12.4: Production Deployment (monitoring, testing)

## Development Context

This is an active project at approximately 50% completion with **40+ subtasks across 12 major categories**. The project follows a structured approach with database-first design, comprehensive TypeScript types, and security-focused RLS policies.

### Task Management & Dependencies
The project uses a comprehensive task tracking system (see `TODO.md` and `docs/Tasks.md`):
- **Critical Path**: Project Setup → Environment → Database → Auth → Core API → Workspace → Currency → UI
- **Parallel Development**: Advanced features can start after Core API (Task 5.4)
- **User vs Developer Tasks**: External service setup vs. coding implementation

### Business Logic Architecture
The platform implements several key business concepts:
- **Monthly Allowance Reset**: Cron-based system for giving balance resets
- **Anti-Exploitation**: Transaction limits (5-20 karma), daily caps (30% allowance)
- **Gamification**: Badge system with automatic awarding based on user activities
- **Dual Approval Workflow**: Some rewards require admin approval above threshold

### Integration Strategy
Designed for future integrations:
- **Slack/Teams**: Slash commands for currency sending (`/karma @user 10 for great work`)
- **External APIs**: Jira/GitHub integration for activity-based karma
- **Webhook Processing**: Vercel edge functions for external event handling

Key considerations for development:
- All database operations go through RLS policies with `SECURITY DEFINER` functions
- Permission checks required in UI components using role hierarchy
- Transaction limits enforced at database level with RPC validation
- OAuth flow uses hash-based tokens (AuthHashHandler.tsx)
- Real-time features planned using Supabase subscriptions
- Comprehensive error handling in API utilities with type-safe responses

## Database Migration Notes

- Execute SQL files in order per `database/README.md` (15 migration files)
- RLS policies prevent unauthorized data access between workspaces
- Use `SECURITY DEFINER` functions for complex operations to avoid recursive policy checks
- Helper functions in `009_policy_helpers.sql` provide secure profile access
- Key RPC functions handle atomic operations:
  - `create_workspace_with_owner()`: Creates workspace + assigns super admin
  - `validate_and_create_transaction()`: Enforces limits + updates balances
  - `promote_user_to_admin()` / `demote_admin_to_employee()`: Role management

## Additional Planned Features

### Core Features (Not Yet Implemented)
- **Real-time Activity Feed**: Live transaction updates using Supabase subscriptions
- **Leaderboard System**: Weekly/monthly/all-time rankings with team filtering
- **Badge Achievement System**: Automatic badge awarding ("Generous Giver", "Team Player", etc.)
- **Reward Redemption**: Catalog management with approval workflows
- **Monthly Balance Reset**: Automated cron job for giving balance resets

### Advanced Integrations
- **Slack Integration**: `/karma @user 10 for great work` slash commands
- **Microsoft Teams**: Bot commands and adaptive cards
- **External APIs**: Jira/GitHub integration for automatic karma earning
- **Webhook System**: Vercel edge functions for external event processing

### Performance & Scalability
- **Caching Strategy**: Supabase query caching for leaderboards and analytics
- **Real-time Optimization**: Connection pooling for WebSocket subscriptions
- **Background Jobs**: Queue system for heavy operations (monthly resets, badge calculation)
- **Image Optimization**: Supabase Storage for avatars and reward images
