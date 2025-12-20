-- 027_get_workspace_stats.sql
-- RPC function to get workspace statistics

create or replace function public.get_workspace_stats(
  p_workspace_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stats json;
  v_total_members integer;
  v_total_transactions integer;
  v_total_karma_sent bigint;
  v_total_karma_received bigint;
  v_active_today integer;
  v_active_this_week integer;
  v_active_this_month integer;
  v_today_start timestamp with time zone;
  v_week_start timestamp with time zone;
  v_month_start timestamp with time zone;
begin
  -- Check if user has access to this workspace
  if not exists (
    select 1 from public.profiles
    where workspace_id = p_workspace_id
    and auth_user_id = auth.uid()
  ) then
    raise exception 'Access denied to workspace';
  end if;

  -- Calculate time boundaries
  v_today_start := date_trunc('day', now());
  v_week_start := date_trunc('week', now());
  v_month_start := date_trunc('month', now());

  -- Get total members (active profiles)
  select count(*) into v_total_members
  from public.profiles
  where workspace_id = p_workspace_id
  and active = true;

  -- Get total transactions
  select count(*) into v_total_transactions
  from public.transactions
  where workspace_id = p_workspace_id;

  -- Calculate period-based stats (this month) for dashboard KPIs
  -- Karma sent this month
  select coalesce(sum(amount), 0) into v_total_karma_sent
  from public.transactions
  where workspace_id = p_workspace_id
  and created_at >= v_month_start;
  
  -- Karma received this month (same as sent - every transaction has both sender and receiver)
  v_total_karma_received := v_total_karma_sent;

  -- Active members today (unique profiles who sent or received today)
  select count(distinct profile_id) into v_active_today
  from (
    select sender_profile_id as profile_id
    from public.transactions
    where workspace_id = p_workspace_id
    and created_at >= v_today_start
    union
    select receiver_profile_id as profile_id
    from public.transactions
    where workspace_id = p_workspace_id
    and created_at >= v_today_start
  ) active_profiles;

  -- Active members this week
  select count(distinct profile_id) into v_active_this_week
  from (
    select sender_profile_id as profile_id
    from public.transactions
    where workspace_id = p_workspace_id
    and created_at >= v_week_start
    union
    select receiver_profile_id as profile_id
    from public.transactions
    where workspace_id = p_workspace_id
    and created_at >= v_week_start
  ) active_profiles;

  -- Active members this month
  select count(distinct profile_id) into v_active_this_month
  from (
    select sender_profile_id as profile_id
    from public.transactions
    where workspace_id = p_workspace_id
    and created_at >= v_month_start
    union
    select receiver_profile_id as profile_id
    from public.transactions
    where workspace_id = p_workspace_id
    and created_at >= v_month_start
  ) active_profiles;

  -- Build result JSON
  v_stats := json_build_object(
    'total_members', v_total_members,
    'total_transactions', v_total_transactions,
    'total_karma_sent', v_total_karma_sent,
    'total_karma_received', v_total_karma_received,
    'active_members_today', coalesce(v_active_today, 0),
    'active_members_this_week', coalesce(v_active_this_week, 0),
    'active_members_this_month', coalesce(v_active_this_month, 0)
  );

  return v_stats;
end;
$$;

grant execute on function public.get_workspace_stats(uuid) to authenticated;

