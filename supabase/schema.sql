create extension if not exists pgcrypto;

create table if not exists public.screams (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  country_code text,
  language text not null check (language in ('ru', 'en')),
  transcript text,
  response text not null,
  peak_volume numeric,
  duration_ms integer,
  user_agent text,
  ip_hash text
);

alter table public.screams enable row level security;

drop policy if exists "Public can read recent screams" on public.screams;
create policy "Public can read recent screams"
on public.screams
for select
to anon
using (true);

create index if not exists screams_created_at_idx on public.screams (created_at desc);
create index if not exists screams_country_created_idx on public.screams (country_code, created_at desc);
