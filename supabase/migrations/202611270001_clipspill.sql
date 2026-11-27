begin;

create table public.creator_profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  channel_handle text not null default '' check (char_length(channel_handle) <= 600),
  competitor_handles text[] not null default '{}' check (cardinality(competitor_handles) <= 5),
  cadence text not null default 'weekly' check (cadence in ('weekly', '48h', '72h', 'post-upload')),
  delivery_time time not null default '09:00',
  delivery_day integer not null default 1 check (delivery_day between 0 and 6),
  delivery_channel text not null default 'email' check (delivery_channel in ('email', 'whatsapp')),
  updated_at timestamptz not null default now()
);

create table public.creator_digests (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  digest_id text not null check (char_length(digest_id) between 1 and 100),
  digest jsonb not null check (jsonb_typeof(digest) = 'object' and octet_length(digest::text) <= 280000),
  saved_at timestamptz not null default now(),
  primary key (user_id, digest_id)
);

create index creator_digests_history_idx on public.creator_digests (user_id, saved_at desc);

alter table public.creator_profiles enable row level security;
alter table public.creator_digests enable row level security;

revoke all on public.creator_profiles, public.creator_digests from anon, authenticated;
grant select, insert, update on public.creator_profiles, public.creator_digests to authenticated;

create policy "Manage own creator profile" on public.creator_profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Manage own creator digests" on public.creator_digests for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

commit;
