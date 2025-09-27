-- 0000_schema_migrations.sql
-- Creates a simple tracking table for applied migrations

create table if not exists public.schema_migrations (
  id serial primary key,
  filename text not null unique,
  applied_at timestamptz not null default now()
);


