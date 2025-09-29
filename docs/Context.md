# Karma Recognition Platform - Development Context

## Project Overview

This is a **Dynamic Currency Recognition Platform** - a workplace recognition system where employees can give each other customizable currency (karma, coins, points, etc.) that can be redeemed for rewards. The platform features a dual balance system, anti-exploitation measures, role-based access control, and full client-server separation for security.

## Current Status (As of Latest Update)

### ✅ Completed Core Features

- **Project Setup**: Next.js 15.5.3 with App Router, TypeScript, Tailwind CSS v4, ShadCN components
- **Environment**: Full Supabase integration with client/server boundary separation
- **Database**: Complete schema with comprehensive RLS policies, migrations system
- **Authentication**: Working Google OAuth flow, secure user onboarding, workspace creation/joining
- **Role-Based Access**: Complete permission system, protected routes, role management
- **Transaction System**: Working karma sending/receiving with limits and validation
- **Dynamic Currency**: Customizable currency names per workspace with formatting utilities
- **UI/UX**: Responsive dashboard, transaction history, leaderboards, and user management
- **Security**: Proper client-server separation, RLS enforcement, server-side validation
- **Data Visualization**: Working leaderboards, transaction history with filtering

### 🎯 Recently Completed Features

1. **Dynamic Currency System**: Workspaces can customize currency names (karma, coins, points, etc.)
2. **Client-Server Architecture**: Proper separation between client-safe and server-only operations
3. **Transaction Management**: Full CRUD operations with real-time balance updates
4. **Leaderboard System**: Rankings with time period filtering and statistics
5. **User Interface**: Polished responsive design with proper mobile support
6. **Security Hardening**: RLS policies, server-side validation, and secure API endpoints

## Technical Architecture

### Frontend Stack

- **Framework**: Next.js 15.5.3 with App Router (Server & Client Components)
- **Styling**: Tailwind CSS v4 with PostCSS configuration
- **Components**: ShadCN/Radix UI component system with custom theming
- **Language**: TypeScript with strict mode
- **State Management**: React Context for currency settings, Supabase client for data
- **Deployment**: Vercel with automatic deployments

### Backend Stack

- **Database**: Supabase PostgreSQL with full RLS implementation
- **Auth**: Supabase Auth with Google OAuth 2.0 integration
- **API**: Next.js API routes with server-side Supabase client
- **Security**: Comprehensive Row Level Security policies, client-server separation
- **Real-time**: Supabase subscriptions for live updates

### Client-Server Architecture

- **Client-Side**: `supabase` instance for user authentication and RLS-compliant queries
- **Server-Side**: `supabaseServer` with service role key for administrative operations
- **Database Modules**: 
  - `database.ts`: Client-safe functions using regular Supabase client
  - `database-server.ts`: Server-only functions bypassing RLS for admin operations
- **API Security**: Bearer token validation, role-based access control

### Key Files Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   │   ├── login/         # Google OAuth login
│   │   └── onboarding/    # Workspace creation/joining flow
│   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── home/          # Main dashboard with currency sending
│   │   ├── transactions/  # Transaction history with filtering
│   │   ├── leaderboard/   # Rankings and statistics
│   │   ├── send/          # Currency sending interface
│   │   └── workspaces/    # Workspace management
│   ├── api/               # Next.js API routes
│   │   ├── transactions/  # Transaction CRUD operations
│   │   ├── profile/       # User profile management
│   │   ├── workspaces/    # Workspace management APIs
│   │   └── invitations/   # Invitation handling
│   └── auth/callback/     # OAuth callback handler
├── components/
│   ├── auth/              # Authentication components
│   ├── ui/                # ShadCN UI component system
│   ├── dashboard/         # Dashboard-specific components
│   └── shared/            # Reusable shared components
├── contexts/              # React Context providers
│   └── CurrencyContext.tsx  # Dynamic currency system
└── lib/
    ├── supabase.ts        # Client-side Supabase client
    ├── supabase-server.ts # Server-side Supabase client (Service Role)
    ├── database.ts        # Client-safe database functions
    ├── database-server.ts # Server-only database functions
    ├── permissions.ts     # Role-based access control
    ├── currency.ts        # Currency formatting utilities
    └── balance.ts         # Balance calculation utilities

database/
├── migrations/            # Ordered SQL migration files
├── 001_tables.sql        # Core database schema
├── 004_rls.sql           # Row Level Security policies
├── 009_policy_helpers.sql # RLS helper functions
├── 010_rpc_create_workspace.sql  # Workspace creation RPC
├── 013_transaction_validation.sql # Transaction limits RPC
└── 015_role_management.sql # Role promotion/demotion RPC
```

## Database Schema

### Core Tables

- **workspaces**: Organization/company data
- **profiles**: User profiles with roles and balances
- **transactions**: Karma transfers between users
- **invitations**: Workspace invitation codes/links
- **pending_users**: Users who logged in but haven't joined workspace
- **daily_sent_karma**: Daily transaction limits tracking

### User Roles

- **super_admin**: Full control, can promote/demote admins
- **admin**: Can manage workspace settings, members, rewards
- **employee**: Can send karma, view basic features

### Dynamic Currency System

The platform supports customizable currency names per workspace:
- **Currency Context**: React context providing dynamic currency names throughout the app
- **Currency Utilities**: Formatting functions for proper pluralization and display
- **Database Integration**: Workspace-specific currency names stored in database
- **UI Integration**: All hardcoded "karma" references replaced with dynamic currency names

### Dual Balance System

- **giving_balance**: Monthly allowance for sending currency (resets monthly)
- **redeemable_balance**: Accumulated currency received (for rewards)
- **Balance Tracking**: Real-time balance updates with transaction validation

## Authentication Flow

1. **Login**: Google OAuth → Supabase Auth
2. **Profile Check**: If no profile exists → `/onboarding`
3. **Onboarding**: Create workspace OR join with invite code
4. **Dashboard**: Access to `/home` with role-based features

## Anti-Exploitation Measures

### Transaction Limits

- **Min Amount**: 5 karma per transaction
- **Max Amount**: 20 karma per transaction
- **Daily Limit**: 30% of monthly allowance per day
- **Monthly Reset**: Giving balance resets to monthly allowance

### Workspace Settings (Admin Configurable)

- `min_transaction_amount`: Minimum karma per transaction
- `max_transaction_amount`: Maximum karma per transaction
- `daily_limit_percentage`: % of monthly allowance per day
- `reward_approval_threshold`: Rewards above this need admin approval

## Key Implementation Details

### Dynamic Currency System (`src/contexts/CurrencyContext.tsx`)

```typescript
// Currency context usage
const { currencyName } = useCurrency();

// Dynamic UI text
<p>Send {currencyName.toLowerCase()} to colleagues</p>
<h2>Total {currencyName} Sent</h2>

// Currency formatting utilities
formatCurrencyAmount(amount, currencyName); // "5 coins" or "1 point"
formatCurrencyName(amount, currencyName);   // Handles pluralization
```

### Client-Server Database Architecture

```typescript
// Client-safe operations (database.ts)
export async function getTransactionsByProfile(profileId: string) {
  // Uses regular supabase client, subject to RLS
  return supabase.from('transactions').select('*').eq('user_id', profileId);
}

// Server-only operations (database-server.ts)
export async function createWorkspaceInvitation(workspaceId: string) {
  // Uses supabaseServer with service role key, bypasses RLS
  return supabaseServer.from('invitations').insert({ workspace_id: workspaceId });
}
```

### Permission System (`src/lib/permissions.ts`)

```typescript
// Get current user profile
const profile = await getCurrentProfile();

// Check permissions
if (canManageMembers(profile)) {
  // Show member management UI
}

// Role hierarchy
isSuperAdmin(profile); // Can promote/demote admins
isAdmin(profile); // Can manage workspace settings
isEmployee(profile); // Basic user permissions
```

### Protected Routes (`src/components/auth/ProtectedRoute.tsx`)

```typescript
// Protect admin-only pages
<AdminOnly>
  <AdminSettings />
</AdminOnly>

// Custom role requirements
<ProtectedRoute requiredRoles={['admin', 'super_admin']}>
  <MemberManagement />
</ProtectedRoute>
```

### Database RPC Functions

- `create_workspace_with_owner()`: Atomic workspace + super admin creation
- `validate_and_create_transaction()`: Enforces limits and updates balances
- `promote_user_to_admin()`: Super admin can promote employees
- `demote_admin_to_employee()`: Super admin can demote admins

## Environment Variables Required

### Local Development (.env.local)

```env
# Client-side variables (accessible in browser)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_REDIRECT_TO=http://localhost:3000/auth/callback

# Server-side only variables (NEVER exposed to browser)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Production (Vercel)

- Same environment variables as local development
- Google OAuth configured in Supabase Dashboard
- Redirect URLs: Production domain auth callback
- Service Role Key used for server-side operations that bypass RLS

## Recent Changes & Fixes

### Major Architecture Improvements

- **Client-Server Separation**: Implemented proper boundary between client and server-side Supabase operations
- **Database Module Split**: Created separate `database.ts` and `database-server.ts` for security
- **Service Role Integration**: Added server-side client with service role key for admin operations
- **Runtime Error Fixes**: Resolved "d.supabase.from is not a function" errors from improper client usage

### Dynamic Currency System Implementation

- **Currency Context**: Implemented React context for workspace-specific currency names
- **UI Updates**: Replaced all hardcoded "karma" references with dynamic currency names
- **Formatting Utilities**: Created currency formatting functions with proper pluralization
- **Database Integration**: Currency names stored in workspace settings

### Feature Completions

- **Transaction System**: Full CRUD operations with balance updates and validation
- **Leaderboard**: Working rankings with time period filtering and statistics
- **User Interface**: Responsive design improvements and mobile optimization
- **Authentication Flow**: Stable Google OAuth with proper session handling

### Security Hardening

- **RLS Policies**: Comprehensive Row Level Security implementation
- **API Endpoints**: Server-side validation and Bearer token authentication
- **Environment Security**: Proper separation of public and private environment variables
- **Client Safety**: Eliminated server-only client imports in client components

### OAuth Flow Fixes

- Created dedicated `/auth/callback` page for OAuth redirects
- Added `AuthHashHandler` component for hash token processing
- Fixed redirect loops in login flow
- Improved session persistence and state management

### Transaction System Fixes

- Implemented proper balance validation and updates
- Created transaction history with filtering capabilities
- Added real-time balance updates on transaction completion
- Fixed currency display formatting throughout the application

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow Next.js App Router conventions
- Use Tailwind CSS for styling
- Implement proper error handling
- Add loading states for async operations

### Database Changes

- Always create new SQL files in `database/` folder
- Update `database/README.md` with new file order
- Test RLS policies thoroughly
- Use `SECURITY DEFINER` functions for complex operations

### Security Considerations

- All database operations go through RLS policies
- Use permission checks in frontend components
- Validate user input on both client and server
- Never expose sensitive data in client-side code

## Common Issues & Solutions

### Tailwind CSS Not Working

- Ensure `postcss.config.js` exists (not `.mjs`)
- Check `src/app/globals.css` has `@import 'tailwindcss'`
- Restart dev server after config changes

### RLS Policy Errors

- Use helper functions from `009_policy_helpers.sql`
- Avoid recursive policy checks
- Test policies with different user roles

### OAuth Redirect Issues

- Verify redirect URLs in Google Cloud Console
- Check Supabase Dashboard URL settings
- Ensure callback page handles hash tokens properly

## Current Application Status

### ✅ Fully Functional Features

1. **Authentication System**: Google OAuth with secure session management
2. **Workspace Management**: Creation, joining, and invitation system
3. **Currency System**: Full sending/receiving with dynamic currency names
4. **Transaction History**: Complete history with filtering and pagination
5. **Leaderboard System**: Rankings with time period filtering
6. **User Management**: Role-based access control and permissions
7. **Responsive UI**: Mobile-optimized interface with ShadCN components

### 🛠️ Next Enhancement Opportunities

1. **Reward System**: Implement reward catalog and redemption workflow
2. **Badge System**: Achievement tracking and badge awarding
3. **Advanced Analytics**: Detailed workspace analytics and reporting
4. **Integration APIs**: Slack/Teams integration for sending currency
5. **Admin Dashboard**: Enhanced workspace settings and member management

## Testing Strategy

- Test all user flows: login → onboarding → dashboard
- Verify role-based access control works correctly
- Test transaction limits and validation
- Ensure RLS policies prevent unauthorized access
- Test OAuth flow in both local and production environments

## Deployment Status

### Current Deployment

- **Platform**: Vercel with automatic deployments
- **Database**: Supabase with complete RLS policies implemented
- **Authentication**: Google OAuth configured and working
- **Environment**: All required environment variables configured
- **Security**: Service Role Key properly secured server-side
- **Build Status**: Successfully compiling with TypeScript strict mode

### Production Readiness

- **Core Features**: All essential features implemented and tested
- **Security**: Comprehensive RLS policies and client-server separation
- **Performance**: Optimized queries and proper loading states
- **UI/UX**: Responsive design with mobile optimization
- **Error Handling**: Proper error boundaries and user feedback

---

**Last Updated**: Current session (Application now fully functional with core features)
**Status**: Production-ready MVP with working currency system, transactions, and user management
**Next AI**: Application is fully functional. Ready for enhancement features like rewards system, badges, or advanced analytics.
