# Karma Recognition Platform - Development Context

## Project Overview

This is a **Karma Recognition Platform** - a workplace recognition system where employees can give each other "karma points" that can be redeemed for rewards. The platform uses a dual balance system with anti-exploitation measures and role-based access control.

## Current Status (As of Latest Update)

### ✅ Completed Tasks (Tasks 1.1-4.5)

- **Project Setup**: Next.js 15.5.3 with TypeScript, Tailwind CSS v4, ShadCN components
- **Environment**: Supabase integration, Google OAuth, Vercel deployment
- **Database**: Complete schema with RLS policies, migrations system
- **Authentication**: Google OAuth flow, user onboarding, workspace creation/joining
- **Role-Based Access**: Permission system, protected routes, role management
- **Transaction Limits**: Anti-exploitation measures with min/max amounts, daily limits

### 🔄 Next Priority Tasks

1. **Task 5.1**: Create TypeScript Types (High Priority)
2. **Task 5.2**: Build Database Utilities (High Priority)
3. **Task 6.4**: Build Admin Settings Interface (Medium Priority)
4. **Task 7.1**: Implement Dual Balance System (High Priority)

## Technical Architecture

### Frontend Stack

- **Framework**: Next.js 15.5.3 with App Router
- **Styling**: Tailwind CSS v4 with PostCSS
- **Components**: ShadCN/Radix UI components
- **Language**: TypeScript
- **Deployment**: Vercel (https://redeemable.vercel.app)

### Backend Stack

- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with Google OAuth
- **API**: Next.js API routes (to be implemented)
- **Security**: Row Level Security (RLS) policies

### Key Files Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth-related pages
│   │   ├── login/         # Google OAuth login
│   │   └── onboarding/    # Workspace creation/joining
│   ├── (dashboard)/       # Protected dashboard pages
│   │   └── home/          # Main dashboard
│   └── auth/callback/     # OAuth callback handler
├── components/
│   ├── auth/              # Authentication components
│   ├── ui/                # ShadCN UI components
│   └── shared/            # Shared components
└── lib/
    ├── supabase.ts        # Supabase client
    ├── permissions.ts     # Role-based access control
    └── utils.ts           # Utility functions

database/
├── migrations/            # SQL migration files
├── 001_tables.sql        # Core database schema
├── 004_rls.sql           # Row Level Security policies
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

### Dual Balance System

- **giving_balance**: Monthly allowance for sending karma (resets monthly)
- **redeemable_balance**: Accumulated karma received (for rewards)

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
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_REDIRECT_TO=http://localhost:3000/auth/callback
```

### Production (Vercel)

- Same variables as local
- Google OAuth configured in Supabase Dashboard
- Redirect URLs: `https://redeemable.vercel.app/auth/callback`

## Recent Changes & Fixes

### OAuth Flow Fixes

- Created dedicated `/auth/callback` page for OAuth redirects
- Added `AuthHashHandler` component for hash token processing
- Fixed redirect loops in login flow

### RLS Policy Fixes

- Resolved "infinite recursion" errors in profile policies
- Created `SECURITY DEFINER` helper functions to avoid recursive checks
- Simplified initial insert policies for workspace/profile creation

### Transaction Limits Implementation

- Added workspace settings columns for configurable limits
- Created daily limit tracking table
- Implemented validation RPC with comprehensive checks

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

## Next Development Priorities

1. **TypeScript Types** (Task 5.1): Define proper types for all database entities
2. **Database Utilities** (Task 5.2): Create reusable query functions
3. **Admin Interface** (Task 6.4): Build workspace settings management UI
4. **Balance System** (Task 7.1): Implement karma sending/receiving logic
5. **Transaction History** (Task 7.3): Show transaction logs and analytics

## Testing Strategy

- Test all user flows: login → onboarding → dashboard
- Verify role-based access control works correctly
- Test transaction limits and validation
- Ensure RLS policies prevent unauthorized access
- Test OAuth flow in both local and production environments

## Deployment Notes

- Vercel deployment: https://redeemable.vercel.app
- Supabase project configured with Google OAuth
- Environment variables set in Vercel dashboard
- Database migrations applied in Supabase SQL editor

---

**Last Updated**: Current session
**Next AI**: Continue with Task 5.1 (TypeScript Types) or Task 6.4 (Admin Settings Interface)
