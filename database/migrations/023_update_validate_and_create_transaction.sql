-- 023_update_validate_and_create_transaction.sql
-- Updates validate_and_create_transaction to support explicit sender profile IDs
-- Run this migration (or execute the statements below in the Supabase SQL editor)

-- Drop previous definition that relied solely on auth.uid()
DROP FUNCTION IF EXISTS public.validate_and_create_transaction(uuid, integer, text);

-- Recreate the function with optional sender profile parameter
CREATE OR REPLACE FUNCTION public.validate_and_create_transaction(
  p_receiver_profile_id uuid,
  p_amount integer,
  p_message text DEFAULT NULL,
  p_sender_profile_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_profile_id uuid;
  v_workspace_id uuid;
  v_settings record;
  v_daily_amount_sent integer := 0;
  v_max_daily_amount integer;
  v_transaction_id uuid;
BEGIN
  -- Determine sender profile (explicit parameter takes precedence)
  IF p_sender_profile_id IS NOT NULL THEN
    SELECT id, workspace_id
      INTO v_sender_profile_id, v_workspace_id
    FROM public.profiles
    WHERE id = p_sender_profile_id;

    IF v_sender_profile_id IS NULL THEN
      RAISE EXCEPTION 'Sender profile not found';
    END IF;
  ELSE
    SELECT id, workspace_id
      INTO v_sender_profile_id, v_workspace_id
    FROM public.profiles
    WHERE auth_user_id = auth.uid();

    IF v_sender_profile_id IS NULL THEN
      RAISE EXCEPTION 'Sender profile not found';
    END IF;
  END IF;

  -- Fetch workspace settings (create defaults if absent)
  SELECT *
    INTO v_settings
  FROM public.workspace_settings
  WHERE workspace_id = v_workspace_id;

  IF v_settings IS NULL THEN
    INSERT INTO public.workspace_settings (workspace_id)
    VALUES (v_workspace_id)
    RETURNING * INTO v_settings;
  END IF;

  -- Validate transaction limits
  IF p_amount < v_settings.min_transaction_amount THEN
    RAISE EXCEPTION 'Amount too low. Minimum: %', v_settings.min_transaction_amount;
  END IF;

  IF p_amount > v_settings.max_transaction_amount THEN
    RAISE EXCEPTION 'Amount too high. Maximum: %', v_settings.max_transaction_amount;
  END IF;

  -- Check sender balance
  IF (SELECT giving_balance FROM public.profiles WHERE id = v_sender_profile_id) < p_amount THEN
    RAISE EXCEPTION 'Insufficient giving balance';
  END IF;

  -- Daily limit: default percentage of monthly allowance
  v_max_daily_amount := (v_settings.monthly_allowance * v_settings.daily_limit_percentage) / 100;

  SELECT total_amount_sent
    INTO v_daily_amount_sent
  FROM public.daily_transaction_limits
  WHERE profile_id = v_sender_profile_id
    AND transaction_date = current_date;

  IF v_daily_amount_sent IS NULL THEN
    v_daily_amount_sent := 0;
  END IF;

  IF (v_daily_amount_sent + p_amount) > v_max_daily_amount THEN
    RAISE EXCEPTION 'Daily limit exceeded. Max daily: %, already sent: %',
      v_max_daily_amount, v_daily_amount_sent;
  END IF;

  -- Create transaction record
  INSERT INTO public.transactions (
    workspace_id,
    sender_profile_id,
    receiver_profile_id,
    amount,
    message
  ) VALUES (
    v_workspace_id,
    v_sender_profile_id,
    p_receiver_profile_id,
    p_amount,
    p_message
  ) RETURNING id INTO v_transaction_id;

  -- Update balances
  UPDATE public.profiles
  SET giving_balance = giving_balance - p_amount
  WHERE id = v_sender_profile_id;

  UPDATE public.profiles
  SET redeemable_balance = redeemable_balance + p_amount
  WHERE id = p_receiver_profile_id;

  -- Update daily totals
  INSERT INTO public.daily_transaction_limits (profile_id, total_amount_sent)
  VALUES (v_sender_profile_id, p_amount)
  ON CONFLICT (profile_id, transaction_date)
  DO UPDATE SET
    total_amount_sent = daily_transaction_limits.total_amount_sent + EXCLUDED.total_amount_sent,
    updated_at = now();

  RETURN v_transaction_id;
END;
$$;

-- Restore execute permissions for authenticated users
GRANT EXECUTE ON FUNCTION public.validate_and_create_transaction(uuid, integer, text, uuid) TO authenticated;
