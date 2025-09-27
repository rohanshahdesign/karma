-- 002_triggers.sql
-- updated_at trigger function and triggers

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_workspaces_updated_at'
  ) then
    create trigger trg_workspaces_updated_at
    before update on public.workspaces
    for each row execute function public.set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_profiles_updated_at'
  ) then
    create trigger trg_profiles_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_rewards_updated_at'
  ) then
    create trigger trg_rewards_updated_at
    before update on public.rewards
    for each row execute function public.set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_reward_redemptions_updated_at'
  ) then
    create trigger trg_reward_redemptions_updated_at
    before update on public.reward_redemptions
    for each row execute function public.set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_badges_updated_at'
  ) then
    create trigger trg_badges_updated_at
    before update on public.badges
    for each row execute function public.set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_integration_settings_updated_at'
  ) then
    create trigger trg_integration_settings_updated_at
    before update on public.integration_settings
    for each row execute function public.set_updated_at();
  end if;
end $$;


