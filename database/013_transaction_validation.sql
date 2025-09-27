-- 013_transaction_validation.sql
-- RPC to validate and create transactions with limits

create or replace function public.validate_and_create_transaction(
  p_receiver_profile_id uuid,
  p_amount integer,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_profile_id uuid;
  v_workspace_id uuid;
  v_settings record;
  v_daily_limit record;
  v_daily_amount_sent integer := 0;
  v_max_daily_amount integer;
  v_transaction_id uuid;
begin
  -- Get sender profile
  select id, workspace_id into v_sender_profile_id, v_workspace_id
  from public.profiles
  where auth_user_id = auth.uid();
  
  if v_sender_profile_id is null then
    raise exception 'Sender profile not found';
  end if;

  -- Get workspace settings
  select * into v_settings
  from public.workspace_settings
  where workspace_id = v_workspace_id;
  
  if v_settings is null then
    -- Create default settings if none exist
    insert into public.workspace_settings (workspace_id)
    values (v_workspace_id)
    returning * into v_settings;
  end if;

  -- Validate amount limits
  if p_amount < v_settings.min_transaction_amount then
    raise exception 'Amount too low. Minimum: %', v_settings.min_transaction_amount;
  end if;
  
  if p_amount > v_settings.max_transaction_amount then
    raise exception 'Amount too high. Maximum: %', v_settings.max_transaction_amount;
  end if;

  -- Check sender has enough balance
  if (select giving_balance from public.profiles where id = v_sender_profile_id) < p_amount then
    raise exception 'Insufficient giving balance';
  end if;

  -- Calculate daily limit (30% of monthly allowance by default)
  v_max_daily_amount := (v_settings.monthly_allowance * v_settings.daily_limit_percentage) / 100;

  -- Get today's total sent amount
  select total_amount_sent into v_daily_amount_sent
  from public.daily_transaction_limits
  where profile_id = v_sender_profile_id
    and transaction_date = current_date;

  if v_daily_amount_sent is null then
    v_daily_amount_sent := 0;
  end if;

  -- Check daily limit
  if (v_daily_amount_sent + p_amount) > v_max_daily_amount then
    raise exception 'Daily limit exceeded. Max daily: %, already sent: %', 
      v_max_daily_amount, v_daily_amount_sent;
  end if;

  -- Create transaction
  insert into public.transactions (
    workspace_id, sender_profile_id, receiver_profile_id, amount, message
  ) values (
    v_workspace_id, v_sender_profile_id, p_receiver_profile_id, p_amount, p_message
  ) returning id into v_transaction_id;

  -- Update sender's giving balance
  update public.profiles
  set giving_balance = giving_balance - p_amount
  where id = v_sender_profile_id;

  -- Update receiver's redeemable balance
  update public.profiles
  set redeemable_balance = redeemable_balance + p_amount
  where id = p_receiver_profile_id;

  -- Update daily limit tracking
  insert into public.daily_transaction_limits (profile_id, total_amount_sent)
  values (v_sender_profile_id, p_amount)
  on conflict (profile_id, transaction_date)
  do update set 
    total_amount_sent = daily_transaction_limits.total_amount_sent + p_amount,
    updated_at = now();

  return v_transaction_id;
end;
$$;

grant execute on function public.validate_and_create_transaction(uuid, integer, text) to authenticated;
