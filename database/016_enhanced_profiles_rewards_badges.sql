-- 016_enhanced_profiles_rewards_badges.sql
-- Comprehensive schema updates for Tasks 9.1-9.4
-- Enhanced profiles, rewards system, badges, and storage

-- ============================================================================
-- PHASE 1: Enhanced Profile Fields
-- ============================================================================

-- Add new profile fields for enhanced onboarding
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text,
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS portfolio_url text,
ADD COLUMN IF NOT EXISTS profile_picture_path text;

-- Create unique constraint on username per workspace
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_workspace 
ON public.profiles(workspace_id, username) 
WHERE username IS NOT NULL;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username 
ON public.profiles(username) 
WHERE username IS NOT NULL;

-- ============================================================================
-- PHASE 2: Storage Setup for Profile Pictures
-- ============================================================================

-- Create storage bucket for profile pictures (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures', 
  'profile-pictures', 
  true, 
  2097152, -- 2MB limit
  '{"image/jpeg","image/png","image/webp"}'
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile pictures

-- Policy: Allow authenticated users to upload their own profile pictures
CREATE POLICY "Users can upload their own profile picture" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow public read access to all profile pictures
CREATE POLICY "Profile pictures are publicly accessible" ON storage.objects
FOR SELECT TO public USING (
  bucket_id = 'profile-pictures'
);

-- Policy: Allow users to update their own profile pictures
CREATE POLICY "Users can update their own profile picture" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
) WITH CHECK (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow users to delete their own profile pictures
CREATE POLICY "Users can delete their own profile picture" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- PHASE 3: Default Badge Definitions
-- ============================================================================

-- Function to create default badges for a workspace
CREATE OR REPLACE FUNCTION public.create_default_badges(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Transaction milestone badges
  INSERT INTO public.badges (workspace_id, name, description, icon_url, criteria, active) VALUES
  (p_workspace_id, 'First Steps', 'Sent your first karma transaction', '/badges/first-steps.svg', 
   '{"type": "transaction_milestone", "condition": "transactions_sent", "value": 1}', true),
  (p_workspace_id, 'Getting Started', 'Sent 10 karma transactions', '/badges/getting-started.svg',
   '{"type": "transaction_milestone", "condition": "transactions_sent", "value": 10}', true),
  (p_workspace_id, 'Active Member', 'Sent 50 karma transactions', '/badges/active-member.svg',
   '{"type": "transaction_milestone", "condition": "transactions_sent", "value": 50}', true),
  (p_workspace_id, 'Super Active', 'Sent 100 karma transactions', '/badges/super-active.svg',
   '{"type": "transaction_milestone", "condition": "transactions_sent", "value": 100}', true);

  -- Karma amount milestone badges
  INSERT INTO public.badges (workspace_id, name, description, icon_url, criteria, active) VALUES
  (p_workspace_id, 'Generous', 'Sent 100 karma in total', '/badges/generous.svg',
   '{"type": "karma_milestone", "condition": "total_karma_sent", "value": 100}', true),
  (p_workspace_id, 'Big Giver', 'Sent 500 karma in total', '/badges/big-giver.svg',
   '{"type": "karma_milestone", "condition": "total_karma_sent", "value": 500}', true),
  (p_workspace_id, 'Karma Master', 'Sent 1000 karma in total', '/badges/karma-master.svg',
   '{"type": "karma_milestone", "condition": "total_karma_sent", "value": 1000}', true);

  -- Receiving karma badges
  INSERT INTO public.badges (workspace_id, name, description, icon_url, criteria, active) VALUES
  (p_workspace_id, 'Well Liked', 'Received 100 karma in total', '/badges/well-liked.svg',
   '{"type": "karma_milestone", "condition": "total_karma_received", "value": 100}', true),
  (p_workspace_id, 'Team Player', 'Received karma from 10 different people', '/badges/team-player.svg',
   '{"type": "social_milestone", "condition": "unique_senders", "value": 10}', true),
  (p_workspace_id, 'Most Appreciated', 'Received 500 karma in total', '/badges/most-appreciated.svg',
   '{"type": "karma_milestone", "condition": "total_karma_received", "value": 500}', true);

  -- Time-based badges
  INSERT INTO public.badges (workspace_id, name, description, icon_url, criteria, active) VALUES
  (p_workspace_id, 'Veteran', 'Been a member for 1 year', '/badges/veteran.svg',
   '{"type": "time_milestone", "condition": "days_since_joined", "value": 365}', true),
  (p_workspace_id, 'Consistent', 'Sent karma every week for a month', '/badges/consistent.svg',
   '{"type": "streak_milestone", "condition": "weekly_streak", "value": 4}', true);

  -- Special achievement badges  
  INSERT INTO public.badges (workspace_id, name, description, icon_url, criteria, active) VALUES
  (p_workspace_id, 'Welcoming Committee', 'First to send karma to a new member', '/badges/welcoming.svg',
   '{"type": "special_achievement", "condition": "first_to_welcome", "value": 1}', true),
  (p_workspace_id, 'Encourager', 'Sent karma with messages 50 times', '/badges/encourager.svg',
   '{"type": "special_achievement", "condition": "messages_sent", "value": 50}', true);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_default_badges(uuid) TO authenticated;

-- ============================================================================
-- PHASE 4: Badge Award Tracking and Functions
-- ============================================================================

-- Create table to track badge progress (for complex badges)
CREATE TABLE IF NOT EXISTS public.badge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  current_value integer DEFAULT 0,
  target_value integer NOT NULL,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(profile_id, badge_id)
);

-- Create index for efficient badge progress queries
CREATE INDEX IF NOT EXISTS idx_badge_progress_profile 
ON public.badge_progress(profile_id);

-- Function to check and award badges based on criteria
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_profile_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_badge record;
  v_awarded_badges text[] := '{}';
  v_current_value integer;
  v_should_award boolean := false;
BEGIN
  -- Get profile's workspace
  SELECT workspace_id INTO v_workspace_id 
  FROM public.profiles 
  WHERE id = p_profile_id;
  
  IF v_workspace_id IS NULL THEN
    RETURN v_awarded_badges;
  END IF;

  -- Loop through all active badges for this workspace
  FOR v_badge IN 
    SELECT * FROM public.badges 
    WHERE workspace_id = v_workspace_id AND active = true
  LOOP
    -- Check if user already has this badge
    IF EXISTS (
      SELECT 1 FROM public.user_badges 
      WHERE profile_id = p_profile_id AND badge_id = v_badge.id
    ) THEN
      CONTINUE; -- Skip if already awarded
    END IF;

    -- Reset award flag
    v_should_award := false;
    v_current_value := 0;

    -- Check badge criteria based on type
    IF v_badge.criteria->>'type' = 'transaction_milestone' THEN
      IF v_badge.criteria->>'condition' = 'transactions_sent' THEN
        SELECT COUNT(*) INTO v_current_value
        FROM public.transactions 
        WHERE sender_profile_id = p_profile_id;
        
        v_should_award := v_current_value >= (v_badge.criteria->>'value')::integer;
      END IF;
      
    ELSIF v_badge.criteria->>'type' = 'karma_milestone' THEN
      IF v_badge.criteria->>'condition' = 'total_karma_sent' THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_current_value
        FROM public.transactions 
        WHERE sender_profile_id = p_profile_id;
        
        v_should_award := v_current_value >= (v_badge.criteria->>'value')::integer;
        
      ELSIF v_badge.criteria->>'condition' = 'total_karma_received' THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_current_value
        FROM public.transactions 
        WHERE receiver_profile_id = p_profile_id;
        
        v_should_award := v_current_value >= (v_badge.criteria->>'value')::integer;
      END IF;
      
    ELSIF v_badge.criteria->>'type' = 'social_milestone' THEN
      IF v_badge.criteria->>'condition' = 'unique_senders' THEN
        SELECT COUNT(DISTINCT sender_profile_id) INTO v_current_value
        FROM public.transactions 
        WHERE receiver_profile_id = p_profile_id;
        
        v_should_award := v_current_value >= (v_badge.criteria->>'value')::integer;
      END IF;
      
    ELSIF v_badge.criteria->>'type' = 'time_milestone' THEN
      IF v_badge.criteria->>'condition' = 'days_since_joined' THEN
        SELECT EXTRACT(DAY FROM now() - created_at)::integer INTO v_current_value
        FROM public.profiles 
        WHERE id = p_profile_id;
        
        v_should_award := v_current_value >= (v_badge.criteria->>'value')::integer;
      END IF;
    END IF;

    -- Award the badge if criteria met
    IF v_should_award THEN
      INSERT INTO public.user_badges (workspace_id, profile_id, badge_id, achieved_at)
      VALUES (v_workspace_id, p_profile_id, v_badge.id, now())
      ON CONFLICT (profile_id, badge_id) DO NOTHING;
      
      v_awarded_badges := array_append(v_awarded_badges, v_badge.name);
    END IF;

    -- Update or insert badge progress tracking
    INSERT INTO public.badge_progress (workspace_id, profile_id, badge_id, current_value, target_value)
    VALUES (v_workspace_id, p_profile_id, v_badge.id, v_current_value, (v_badge.criteria->>'value')::integer)
    ON CONFLICT (profile_id, badge_id) 
    DO UPDATE SET 
      current_value = EXCLUDED.current_value,
      last_updated = now();
  END LOOP;

  RETURN v_awarded_badges;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_and_award_badges(uuid) TO authenticated;

-- ============================================================================
-- PHASE 5: Trigger for Automatic Badge Awarding
-- ============================================================================

-- Function to be called by trigger after transaction insert
CREATE OR REPLACE FUNCTION public.trigger_check_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_badges text[];
  receiver_badges text[];
BEGIN
  -- Check badges for sender
  sender_badges := public.check_and_award_badges(NEW.sender_profile_id);
  
  -- Check badges for receiver  
  receiver_badges := public.check_and_award_badges(NEW.receiver_profile_id);

  -- Could log badge awards here or trigger notifications
  -- For now, just return the new transaction
  RETURN NEW;
END;
$$;

-- Create trigger on transactions table
DROP TRIGGER IF EXISTS trigger_badge_check ON public.transactions;
CREATE TRIGGER trigger_badge_check
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_check_badges();

-- ============================================================================
-- PHASE 6: Default Rewards Catalog
-- ============================================================================

-- Function to create default rewards for a workspace
CREATE OR REPLACE FUNCTION public.create_default_rewards(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Gift Cards
  INSERT INTO public.rewards (workspace_id, title, description, image_url, price, category, active) VALUES
  (p_workspace_id, '$25 Amazon Gift Card', 'Treat yourself to something nice from Amazon', '/rewards/amazon-giftcard.jpg', 250, 'Gift Cards', true),
  (p_workspace_id, '$50 Amazon Gift Card', 'Even more shopping power on Amazon', '/rewards/amazon-giftcard.jpg', 500, 'Gift Cards', true),
  (p_workspace_id, '$25 Starbucks Gift Card', 'Fuel your caffeine addiction', '/rewards/starbucks-giftcard.jpg', 250, 'Gift Cards', true),
  (p_workspace_id, '$50 Restaurant Gift Card', 'Enjoy a nice meal out (local restaurants)', '/rewards/restaurant-giftcard.jpg', 500, 'Gift Cards', true);

  -- Experiences & Time Off
  INSERT INTO public.rewards (workspace_id, title, description, image_url, price, category, active) VALUES
  (p_workspace_id, 'Extra PTO Day', 'One additional day of paid time off', '/rewards/pto-day.jpg', 800, 'Time Off', true),
  (p_workspace_id, 'Work From Home Day', 'One flexible work from home day', '/rewards/wfh-day.jpg', 300, 'Time Off', true),
  (p_workspace_id, 'Extended Lunch Break', 'Take an extra hour for lunch today', '/rewards/long-lunch.jpg', 150, 'Time Off', true),
  (p_workspace_id, 'Lunch with Leadership', 'One-on-one lunch with CEO or department head', '/rewards/lunch-leadership.jpg', 600, 'Experiences', true);

  -- Company Swag
  INSERT INTO public.rewards (workspace_id, title, description, image_url, price, category, active) VALUES
  (p_workspace_id, 'Company T-Shirt', 'High-quality branded t-shirt in your size', '/rewards/company-tshirt.jpg', 200, 'Swag', true),
  (p_workspace_id, 'Company Hoodie', 'Cozy branded hoodie for those chilly days', '/rewards/company-hoodie.jpg', 400, 'Swag', true),
  (p_workspace_id, 'Branded Water Bottle', 'Stay hydrated with our premium water bottle', '/rewards/water-bottle.jpg', 150, 'Swag', true),
  (p_workspace_id, 'Company Backpack', 'Professional branded backpack for work or travel', '/rewards/company-backpack.jpg', 350, 'Swag', true);

  -- Learning & Development
  INSERT INTO public.rewards (workspace_id, title, description, image_url, price, category, active) VALUES
  (p_workspace_id, 'Online Course Credit', '$50 credit for Udemy, Coursera, or similar platform', '/rewards/online-course.jpg', 500, 'Learning', true),
  (p_workspace_id, 'Book Allowance', '$30 allowance for professional development books', '/rewards/book-allowance.jpg', 300, 'Learning', true),
  (p_workspace_id, 'Conference Ticket', 'Ticket to relevant industry conference or workshop', '/rewards/conference-ticket.jpg', 1500, 'Learning', true);

  -- Office Perks
  INSERT INTO public.rewards (workspace_id, title, description, image_url, price, category, active) VALUES
  (p_workspace_id, 'Reserved Parking Spot', 'Your own parking spot for one month', '/rewards/parking-spot.jpg', 400, 'Office Perks', true),
  (p_workspace_id, 'Premium Office Snacks', 'Your favorite snacks stocked in your area', '/rewards/office-snacks.jpg', 200, 'Office Perks', true),
  (p_workspace_id, 'Desk Plant', 'Beautiful desk plant to brighten your workspace', '/rewards/desk-plant.jpg', 100, 'Office Perks', true);

  -- Recognition
  INSERT INTO public.rewards (workspace_id, title, description, image_url, price, category, active) VALUES
  (p_workspace_id, 'Employee Spotlight', 'Feature in company newsletter or internal social', '/rewards/employee-spotlight.jpg', 300, 'Recognition', true),
  (p_workspace_id, 'Team Lunch Sponsor', 'Sponsor lunch for your entire team', '/rewards/team-lunch.jpg', 800, 'Recognition', true);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_default_rewards(uuid) TO authenticated;

-- ============================================================================
-- PHASE 7: Activity Feed Table (for public transactions + badge achievements)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  activity_type text NOT NULL, -- 'transaction', 'badge_earned', 'reward_redeemed', 'member_joined'
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  metadata jsonb, -- Flexible field for activity-specific data
  created_at timestamptz DEFAULT now()
);

-- Create indexes for efficient activity feed queries
CREATE INDEX IF NOT EXISTS idx_activity_feed_workspace_time 
ON public.activity_feed(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_feed_actor 
ON public.activity_feed(actor_profile_id, created_at DESC);

-- Function to add activity to feed
CREATE OR REPLACE FUNCTION public.add_activity_feed_entry(
  p_workspace_id uuid,
  p_activity_type text,
  p_actor_profile_id uuid,
  p_target_profile_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_id uuid;
BEGIN
  INSERT INTO public.activity_feed (
    workspace_id, 
    activity_type, 
    actor_profile_id, 
    target_profile_id, 
    metadata
  ) VALUES (
    p_workspace_id,
    p_activity_type,
    p_actor_profile_id, 
    p_target_profile_id,
    p_metadata
  ) RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.add_activity_feed_entry(uuid, text, uuid, uuid, jsonb) TO authenticated;

-- ============================================================================
-- PHASE 8: Enhanced RPC Functions
-- ============================================================================

-- Update join_workspace_with_code to handle new profile fields
CREATE OR REPLACE FUNCTION public.join_workspace_with_code_enhanced(
  p_invitation_code text,
  p_user_email text,
  p_full_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_username text DEFAULT NULL,
  p_job_title text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_portfolio_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
  v_workspace_id uuid;
  v_profile_id uuid;
  v_final_username text;
BEGIN
  -- Validate invitation code
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE code = p_invitation_code AND active = true;
  
  IF v_invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;
  
  -- Check invitation hasn't exceeded max uses
  IF v_invitation.max_uses IS NOT NULL AND v_invitation.uses_count >= v_invitation.max_uses THEN
    RAISE EXCEPTION 'Invitation code has reached maximum uses';
  END IF;
  
  -- Check invitation hasn't expired
  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation code has expired';
  END IF;
  
  v_workspace_id := v_invitation.workspace_id;
  
  -- Generate username if not provided
  IF p_username IS NULL OR p_username = '' THEN
    -- Generate from email (part before @) and make unique
    v_final_username := split_part(p_user_email, '@', 1);
    -- Ensure uniqueness within workspace
    WHILE EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE workspace_id = v_workspace_id AND username = v_final_username
    ) LOOP
      v_final_username := v_final_username || floor(random() * 1000)::text;
    END LOOP;
  ELSE
    v_final_username := p_username;
    -- Check username uniqueness
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE workspace_id = v_workspace_id AND username = v_final_username
    ) THEN
      RAISE EXCEPTION 'Username already taken in this workspace';
    END IF;
  END IF;
  
  -- Create profile with enhanced fields
  INSERT INTO public.profiles (
    auth_user_id,
    workspace_id,
    email,
    full_name,
    avatar_url,
    username,
    job_title,
    bio,
    portfolio_url,
    role,
    giving_balance,
    redeemable_balance,
    active
  ) VALUES (
    auth.uid(),
    v_workspace_id,
    p_user_email,
    p_full_name,
    p_avatar_url,
    v_final_username,
    p_job_title,
    p_bio,
    p_portfolio_url,
    'employee',
    100, -- Default giving balance
    0,   -- Default redeemable balance
    true
  ) RETURNING id INTO v_profile_id;
  
  -- Update invitation usage count
  UPDATE public.invitations
  SET uses_count = uses_count + 1,
      updated_at = now()
  WHERE id = v_invitation.id;
  
  -- Create default badges for workspace if none exist
  IF NOT EXISTS (SELECT 1 FROM public.badges WHERE workspace_id = v_workspace_id LIMIT 1) THEN
    PERFORM public.create_default_badges(v_workspace_id);
  END IF;
  
  -- Create default rewards for workspace if none exist
  IF NOT EXISTS (SELECT 1 FROM public.rewards WHERE workspace_id = v_workspace_id LIMIT 1) THEN
    PERFORM public.create_default_rewards(v_workspace_id);
  END IF;
  
  -- Add activity feed entry for new member
  PERFORM public.add_activity_feed_entry(
    v_workspace_id,
    'member_joined',
    v_profile_id,
    NULL,
    json_build_object(
      'username', v_final_username,
      'full_name', p_full_name
    )::jsonb
  );
  
  -- Check for any immediate badge awards (like "First Steps" badges)
  PERFORM public.check_and_award_badges(v_profile_id);
  
  RETURN v_workspace_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.join_workspace_with_code_enhanced(text, text, text, text, text, text, text, text) TO authenticated;

-- ============================================================================
-- PHASE 9: RLS Policies for New Tables
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.badge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Badge progress policies
DROP POLICY IF EXISTS "badge_progress_read" ON public.badge_progress;
CREATE POLICY "badge_progress_read" ON public.badge_progress
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.workspace_id = badge_progress.workspace_id
      AND me.auth_user_id = auth.uid()
  )
);

-- Activity feed policies  
DROP POLICY IF EXISTS "activity_feed_read" ON public.activity_feed;
CREATE POLICY "activity_feed_read" ON public.activity_feed
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.workspace_id = activity_feed.workspace_id
      AND me.auth_user_id = auth.uid()
  )
);

-- Activity feed insert policy (for system functions)
DROP POLICY IF EXISTS "activity_feed_insert_system" ON public.activity_feed;
CREATE POLICY "activity_feed_insert_system" ON public.activity_feed
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.workspace_id = activity_feed.workspace_id
      AND me.auth_user_id = auth.uid()
      AND me.role IN ('admin', 'super_admin')
  )
  OR auth.uid() = actor_profile_id
);

-- ============================================================================
-- PHASE 10: Helper Functions for Frontend
-- ============================================================================

-- Function to get profile by username
CREATE OR REPLACE FUNCTION public.get_profile_by_username(
  p_username text,
  p_workspace_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  auth_user_id uuid,
  workspace_id uuid,
  email text,
  full_name text,
  avatar_url text,
  username text,
  job_title text,
  bio text,
  portfolio_url text,
  role text,
  giving_balance integer,
  redeemable_balance integer,
  department text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_workspace_id uuid;
BEGIN
  -- Get current user's workspace if not provided
  IF p_workspace_id IS NULL THEN
    SELECT profiles.workspace_id INTO v_current_workspace_id
    FROM public.profiles
    WHERE auth_user_id = auth.uid();
  ELSE
    v_current_workspace_id := p_workspace_id;
  END IF;
  
  -- Return profile if user has access (same workspace)
  RETURN QUERY
  SELECT p.id, p.auth_user_id, p.workspace_id, p.email, p.full_name, p.avatar_url,
         p.username, p.job_title, p.bio, p.portfolio_url, p.role, p.giving_balance,
         p.redeemable_balance, p.department, p.active, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE p.username = p_username 
    AND p.workspace_id = v_current_workspace_id
    AND EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.workspace_id = p.workspace_id
        AND me.auth_user_id = auth.uid()
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_profile_by_username(text, uuid) TO authenticated;

-- ============================================================================
-- FINAL NOTES
-- ============================================================================

-- Manual steps needed after running this SQL:
-- 1. Update existing workspaces to have default badges and rewards:
--    SELECT public.create_default_badges(id) FROM public.workspaces;
--    SELECT public.create_default_rewards(id) FROM public.workspaces;
-- 2. That's it! Storage bucket and policies are created automatically.

-- This file provides the complete database foundation for:
-- ✅ Enhanced profile fields with username support
-- ✅ Profile picture storage preparation  
-- ✅ Comprehensive badge system with automatic awarding
-- ✅ Default rewards catalog for all workspaces
-- ✅ Activity feed for public transactions and achievements
-- ✅ Enhanced RPC functions for joining workspaces
-- ✅ All necessary RLS policies
-- ✅ Helper functions for frontend integration