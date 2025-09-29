-- Debug script to check what profiles exist
-- Run this in Supabase SQL editor to see what data we have

-- Check all profiles
SELECT 
    id, 
    email, 
    username, 
    full_name,
    workspace_id,
    created_at
FROM public.profiles;

-- Check if the get_profile_by_username function works
-- Replace 'your_username_here' with the actual username you're trying to access
-- SELECT * FROM public.get_profile_by_username('your_username_here');

-- Check workspaces
SELECT id, name, created_at FROM public.workspaces;