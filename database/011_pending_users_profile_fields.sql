-- 011_pending_users_profile_fields.sql
-- Add Google profile fields to pending_users table

-- Add profile fields to store Google account data temporarily
alter table public.pending_users 
add column if not exists full_name text,
add column if not exists avatar_url text;