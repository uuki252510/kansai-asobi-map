-- きょうどこいこ？ recommendation and outing schema
-- Additive only: existing place rows, URLs, reviews, and admin data are preserved.

alter table public.places
  add column if not exists mood_tags text[] not null default '{}',
  add column if not exists companion_types text[] not null default '{}',
  add column if not exists recommended_weather text[] not null default '{}',
  add column if not exists recommended_seasons text[] not null default '{}',
  add column if not exists recommended_time_of_day text[] not null default '{}',
  add column if not exists average_stay_minutes integer,
  add column if not exists activity_level smallint,
  add column if not exists healing_score smallint,
  add column if not exists child_fun_score smallint,
  add column if not exists date_score smallint,
  add column if not exists photo_score smallint,
  add column if not exists rainy_day_score smallint,
  add column if not exists crowd_level text,
  add column if not exists price_min integer,
  add column if not exists price_max integer,
  add column if not exists recommended_age_min smallint,
  add column if not exists recommended_age_max smallint,
  add column if not exists reservation_required boolean,
  add column if not exists same_day_booking boolean,
  add column if not exists stroller_accessible boolean,
  add column if not exists barrier_free boolean,
  add column if not exists pet_friendly boolean,
  add column if not exists meal_available boolean,
  add column if not exists last_verified_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'places_recommendation_scores_check'
      and conrelid = 'public.places'::regclass
  ) then
    alter table public.places add constraint places_recommendation_scores_check check (
      (activity_level is null or activity_level between 0 and 100) and
      (healing_score is null or healing_score between 0 and 100) and
      (child_fun_score is null or child_fun_score between 0 and 100) and
      (date_score is null or date_score between 0 and 100) and
      (photo_score is null or photo_score between 0 and 100) and
      (rainy_day_score is null or rainy_day_score between 0 and 100)
    );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'places_recommendation_values_check'
      and conrelid = 'public.places'::regclass
  ) then
    alter table public.places add constraint places_recommendation_values_check check (
      (average_stay_minutes is null or average_stay_minutes > 0) and
      (price_min is null or price_min >= 0) and
      (price_max is null or price_max >= 0) and
      (price_min is null or price_max is null or price_max >= price_min) and
      (recommended_age_min is null or recommended_age_min between 0 and 100) and
      (recommended_age_max is null or recommended_age_max between 0 and 100) and
      (recommended_age_min is null or recommended_age_max is null or recommended_age_max >= recommended_age_min) and
      (crowd_level is null or crowd_level in ('quiet', 'normal', 'busy', 'very_busy'))
    );
  end if;
end $$;

create index if not exists places_mood_tags_idx on public.places using gin (mood_tags);
create index if not exists places_companion_types_idx on public.places using gin (companion_types);
create index if not exists places_recommended_weather_idx on public.places using gin (recommended_weather);
create index if not exists places_recommendation_active_idx
  on public.places (prefecture, indoor_type, price_type)
  where is_published = true;

create table if not exists public.recommendation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  event_name text not null,
  conditions jsonb not null default '{}'::jsonb,
  result_place_ids uuid[] not null default '{}',
  weather_snapshot jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outing_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete restrict,
  visited_on date not null default current_date,
  companion_types text[] not null default '{}',
  note text,
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outing_photos (
  id uuid primary key default gen_random_uuid(),
  outing_id uuid not null references public.outing_history(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  relationship text,
  birth_year smallint,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (birth_year is null or birth_year between 1900 and 2200)
);

create table if not exists public.share_groups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  public_token uuid not null default gen_random_uuid() unique,
  title text not null default '週末どこに行く？',
  status text not null default 'open' check (status in ('open', 'closed')),
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.share_group_spots (
  id uuid primary key default gen_random_uuid(),
  share_group_id uuid not null references public.share_groups(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete restrict,
  position smallint not null check (position between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (share_group_id, place_id),
  unique (share_group_id, position)
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  share_group_id uuid not null references public.share_groups(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete restrict,
  voter_name text not null,
  voter_fingerprint text not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (share_group_id, voter_fingerprint)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  companion_types text[] not null default '{}',
  mood_tags text[] not null default '{}',
  default_budget_max integer,
  default_travel_minutes integer,
  default_transport text,
  home_prefecture text,
  home_latitude double precision,
  home_longitude double precision,
  detail_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (default_budget_max is null or default_budget_max >= 0),
  check (default_travel_minutes is null or default_travel_minutes > 0)
);

create table if not exists public.weather_cache (
  cache_key text primary key,
  latitude double precision not null,
  longitude double precision not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recommendation_logs_user_id_idx on public.recommendation_logs(user_id);
create index if not exists recommendation_logs_session_id_idx on public.recommendation_logs(session_id);
create index if not exists recommendation_logs_created_at_idx on public.recommendation_logs(created_at desc);
create index if not exists outing_history_user_id_idx on public.outing_history(user_id);
create index if not exists outing_history_place_id_idx on public.outing_history(place_id);
create index if not exists outing_history_visited_on_idx on public.outing_history(visited_on desc);
create index if not exists outing_photos_outing_id_idx on public.outing_photos(outing_id);
create index if not exists outing_photos_user_id_idx on public.outing_photos(user_id);
create index if not exists family_members_user_id_idx on public.family_members(user_id);
create index if not exists share_groups_owner_user_id_idx on public.share_groups(owner_user_id);
create index if not exists share_group_spots_group_id_idx on public.share_group_spots(share_group_id);
create index if not exists share_group_spots_place_id_idx on public.share_group_spots(place_id);
create index if not exists votes_share_group_id_idx on public.votes(share_group_id);
create index if not exists votes_place_id_idx on public.votes(place_id);
create index if not exists weather_cache_expires_at_idx on public.weather_cache(expires_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'places',
    'recommendation_logs',
    'outing_history',
    'outing_photos',
    'family_members',
    'share_groups',
    'share_group_spots',
    'votes',
    'user_preferences',
    'weather_cache'
  ]
  loop
    if not exists (
      select 1
      from pg_trigger
      where tgname = table_name || '_set_updated_at'
        and tgrelid = ('public.' || table_name)::regclass
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
        table_name || '_set_updated_at',
        table_name
      );
    end if;
  end loop;
end $$;

alter table public.recommendation_logs enable row level security;
alter table public.outing_history enable row level security;
alter table public.outing_photos enable row level security;
alter table public.family_members enable row level security;
alter table public.share_groups enable row level security;
alter table public.share_group_spots enable row level security;
alter table public.votes enable row level security;
alter table public.user_preferences enable row level security;
alter table public.weather_cache enable row level security;

create policy "clients can insert analytics events"
  on public.recommendation_logs for insert
  to anon, authenticated
  with check (user_id is null or (select auth.uid()) = user_id);

create policy "users can read own analytics events"
  on public.recommendation_logs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "users manage own outing history"
  on public.outing_history for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users manage own outing photos"
  on public.outing_photos for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users manage own family members"
  on public.family_members for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "owners manage share groups"
  on public.share_groups for all
  to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

create policy "owners manage share group spots"
  on public.share_group_spots for all
  to authenticated
  using (
    exists (
      select 1 from public.share_groups groups
      where groups.id = share_group_id
        and groups.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.share_groups groups
      where groups.id = share_group_id
        and groups.owner_user_id = (select auth.uid())
    )
  );

create policy "owners can read group votes"
  on public.votes for select
  to authenticated
  using (
    exists (
      select 1 from public.share_groups groups
      where groups.id = share_group_id
        and groups.owner_user_id = (select auth.uid())
    )
  );

create policy "users manage own preferences"
  on public.user_preferences for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.recommendation_logs from anon, authenticated;
revoke all on public.outing_history from anon, authenticated;
revoke all on public.outing_photos from anon, authenticated;
revoke all on public.family_members from anon, authenticated;
revoke all on public.share_groups from anon, authenticated;
revoke all on public.share_group_spots from anon, authenticated;
revoke all on public.votes from anon, authenticated;
revoke all on public.user_preferences from anon, authenticated;
revoke all on public.weather_cache from anon, authenticated;

grant insert on public.recommendation_logs to anon, authenticated;
grant select on public.recommendation_logs to authenticated;
grant select, insert, update, delete on public.outing_history to authenticated;
grant select, insert, update, delete on public.outing_photos to authenticated;
grant select, insert, update, delete on public.family_members to authenticated;
grant select, insert, update, delete on public.share_groups to authenticated;
grant select, insert, update, delete on public.share_group_spots to authenticated;
grant select on public.votes to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;

comment on column public.places.mood_tags is 'Recommendation moods such as relax, active, food, healing, photo, discovery';
comment on column public.places.companion_types is 'Recommended companion groups such as solo, couple, friends, family, children, multigenerational';
comment on table public.share_groups is 'Vote groups are accessed publicly only through the server API using public_token; direct anonymous table access is intentionally disabled.';
