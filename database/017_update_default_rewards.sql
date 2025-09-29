-- 017_update_default_rewards.sql
-- Update default rewards for all workspaces and create function for new workspace creation

-- ============================================================================
-- STEP 1: Clear existing default rewards and insert new ones
-- ============================================================================

-- First, deactivate all existing rewards (soft delete)
UPDATE public.rewards 
SET active = false, updated_at = now() 
WHERE active = true;

-- Create the new comprehensive default rewards function
CREATE OR REPLACE FUNCTION public.create_default_rewards_v2(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Learning & Development (Most promoted - Lowest cost)
  INSERT INTO public.rewards (workspace_id, title, description, image_url, price, category, active) VALUES
  (p_workspace_id, 'Professional Development Book', 'Up to $30 reimbursement for career growth books', '/rewards/book-allowance.jpg', 150, 'Learning', true),
  (p_workspace_id, 'Online Course Credit', '$50 credit for Udemy, Coursera, LinkedIn Learning, or similar platforms', '/rewards/online-course.jpg', 200, 'Learning', true),
  (p_workspace_id, 'Skill Workshop Access', 'Access to premium workshops or webinars up to $75', '/rewards/workshop.jpg', 250, 'Learning', true),
  (p_workspace_id, 'Premium Course Bundle', 'Up to $200 for comprehensive online courses or certifications', '/rewards/premium-course.jpg', 400, 'Learning', true),
  (p_workspace_id, 'Paid Lunch & Learn Session', 'Lunch meeting with team lead or mentor for career guidance', '/rewards/lunch-learn.jpg', 180, 'Learning', true),
  (p_workspace_id, 'Conference Attendance', 'Ticket to relevant industry conference or professional event', '/rewards/conference-ticket.jpg', 800, 'Learning', true);
  
  -- Time Off (Higher cost to balance usage)
  INSERT INTO public.rewards (workspace_id, title, description, image_url, price, category, active) VALUES
  (p_workspace_id, 'Work From Home Day', 'One flexible remote work day', '/rewards/wfh-day.jpg', 300, 'Time Off', true),
  (p_workspace_id, 'Half Day Leave', 'Half day paid time off (4 hours)', '/rewards/half-day.jpg', 600, 'Time Off', true),
  (p_workspace_id, 'Full Day Leave', 'One full day of paid time off', '/rewards/pto-day.jpg', 1000, 'Time Off', true),
  (p_workspace_id, 'Extended Lunch Break', 'Take an extra hour for lunch (2-hour lunch break)', '/rewards/long-lunch.jpg', 120, 'Time Off', true),
  (p_workspace_id, 'Late Start Day', 'Start work 2 hours later than usual', '/rewards/late-start.jpg', 200, 'Time Off', true),
  (p_workspace_id, 'Early Finish Day', 'Leave work 2 hours early', '/rewards/early-finish.jpg', 220, 'Time Off', true);
  
  -- Personal & Team Growth
  INSERT INTO public.rewards (workspace_id, title, description, image_url, price, category, active) VALUES
  (p_workspace_id, 'Leadership Coffee Chat', 'One-on-one mentoring session with senior leadership', '/rewards/leadership-chat.jpg', 350, 'Growth', true),
  (p_workspace_id, 'Cross-Department Shadow', 'Half-day shadowing experience in different department', '/rewards/shadow-experience.jpg', 400, 'Growth', true),
  (p_workspace_id, 'Team Building Budget', 'Lead a team activity with $100 budget (pizza, games, etc.)', '/rewards/team-building.jpg', 500, 'Growth', true),
  (p_workspace_id, 'Skill Sharing Session', 'Host a knowledge-sharing session and get recognition', '/rewards/skill-share.jpg', 300, 'Growth', true),
  (p_workspace_id, 'Innovation Time', '4 hours of dedicated time to work on a passion project', '/rewards/innovation-time.jpg', 450, 'Growth', true);
  
  -- Wellness & Recognition
  INSERT INTO public.rewards (workspace_id, title, description, image_url, price, category, active) VALUES
  (p_workspace_id, 'Wellness Stipend', '$50 towards gym membership, fitness class, or wellness activity', '/rewards/wellness.jpg', 250, 'Wellness', true),
  (p_workspace_id, 'Employee Spotlight', 'Feature in company newsletter and social media', '/rewards/employee-spotlight.jpg', 200, 'Recognition', true),
  (p_workspace_id, 'Premium Coffee/Tea Supply', 'Your favorite premium coffee or tea stocked for a month', '/rewards/premium-coffee.jpg', 180, 'Office Perks', true);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_default_rewards_v2(uuid) TO authenticated;

-- ============================================================================
-- STEP 2: Update existing workspaces with new default rewards
-- ============================================================================

-- Apply new default rewards to all existing workspaces
DO $$
DECLARE
  workspace_record RECORD;
BEGIN
  -- Loop through all existing workspaces
  FOR workspace_record IN SELECT id FROM public.workspaces LOOP
    -- Create default rewards for each workspace
    PERFORM public.create_default_rewards_v2(workspace_record.id);
    
    -- Log the update
    RAISE NOTICE 'Updated default rewards for workspace: %', workspace_record.id;
  END LOOP;
END;
$$;

-- ============================================================================
-- STEP 3: Update the create_workspace_with_owner function
-- ============================================================================

-- Update the workspace creation function to use the new rewards
CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(
  p_name text,
  p_slug text,
  p_currency_name text DEFAULT 'karma',
  p_monthly_allowance integer DEFAULT 100,
  p_owner_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_auth_user_id uuid;
  v_profile_id uuid;
BEGIN
  -- Get the current user's auth ID
  v_auth_user_id := auth.uid();
  
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Create the workspace
  INSERT INTO public.workspaces (name, slug, currency_name, monthly_allowance)
  VALUES (p_name, p_slug, p_currency_name, p_monthly_allowance)
  RETURNING id INTO v_workspace_id;

  -- Create workspace settings with defaults
  INSERT INTO public.workspace_settings (
    workspace_id,
    min_transaction_amount,
    max_transaction_amount,
    daily_limit_percentage,
    currency_name
  ) VALUES (
    v_workspace_id,
    5,  -- Default min amount
    50, -- Default max amount
    30, -- Default daily limit 30%
    p_currency_name
  );

  -- Create profile for the workspace owner
  INSERT INTO public.profiles (
    auth_user_id,
    workspace_id,
    email,
    role,
    giving_balance,
    redeemable_balance,
    active
  ) VALUES (
    v_auth_user_id,
    v_workspace_id,
    COALESCE(p_owner_email, (SELECT email FROM auth.users WHERE id = v_auth_user_id)),
    'super_admin',
    p_monthly_allowance,
    0,
    true
  ) RETURNING id INTO v_profile_id;

  -- Create default rewards for the new workspace
  PERFORM public.create_default_rewards_v2(v_workspace_id);
  
  -- Create default badges for the new workspace  
  PERFORM public.create_default_badges(v_workspace_id);

  RETURN v_workspace_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_workspace_with_owner(text, text, text, integer, text) TO authenticated;

-- ============================================================================
-- STEP 4: Update the setup function used by the frontend
-- ============================================================================

-- Create a function to refresh rewards for existing workspaces (for manual use)
CREATE OR REPLACE FUNCTION public.refresh_workspace_rewards(p_workspace_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  workspace_record RECORD;
  updated_count integer := 0;
BEGIN
  -- If specific workspace provided, update only that one
  IF p_workspace_id IS NOT NULL THEN
    -- Deactivate existing rewards for this workspace
    UPDATE public.rewards 
    SET active = false, updated_at = now() 
    WHERE workspace_id = p_workspace_id AND active = true;
    
    -- Create new default rewards
    PERFORM public.create_default_rewards_v2(p_workspace_id);
    updated_count := 1;
  ELSE
    -- Update all workspaces
    FOR workspace_record IN SELECT id FROM public.workspaces LOOP
      -- Deactivate existing rewards for this workspace
      UPDATE public.rewards 
      SET active = false, updated_at = now() 
      WHERE workspace_id = workspace_record.id AND active = true;
      
      -- Create new default rewards
      PERFORM public.create_default_rewards_v2(workspace_record.id);
      updated_count := updated_count + 1;
    END LOOP;
  END IF;
  
  RETURN format('Updated default rewards for %s workspace(s)', updated_count);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.refresh_workspace_rewards(uuid) TO authenticated;

-- ============================================================================
-- STEP 5: Add helpful comments and completion notice
-- ============================================================================

COMMENT ON FUNCTION public.create_default_rewards_v2(uuid) IS 
'Creates the updated default rewards focused on learning and time-off for a workspace';

COMMENT ON FUNCTION public.refresh_workspace_rewards(uuid) IS 
'Refreshes default rewards for one or all workspaces. Call with workspace_id or NULL for all workspaces';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 017 completed successfully!';
  RAISE NOTICE 'All workspaces now have updated default rewards with learning & time-off focus';
  RAISE NOTICE 'New workspaces will automatically get these rewards';
END;
$$;