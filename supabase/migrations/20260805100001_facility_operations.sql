-- ============================================================
-- 施設データベース拡張 (2/3): 営業時間・料金・メディア・お知らせ・修正依頼
-- ============================================================

-- ---- 営業時間 (曜日別 + 1日複数帯) ----
create table if not exists public.facility_business_hours (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=日
  is_closed boolean not null default false,
  note text,
  valid_from date,
  valid_until date,
  created_at timestamptz not null default now()
);
create index if not exists facility_business_hours_place_idx on public.facility_business_hours (place_id);

create table if not exists public.facility_business_hour_slots (
  id uuid primary key default gen_random_uuid(),
  business_hour_id uuid not null references public.facility_business_hours(id) on delete cascade,
  opening_time time not null,
  closing_time time not null,
  last_entry_time time,
  sort_order int not null default 0,
  check (opening_time < closing_time)
);
create index if not exists facility_business_hour_slots_hour_idx on public.facility_business_hour_slots (business_hour_id);

-- ---- 臨時営業・休業 ----
create table if not exists public.facility_business_exceptions (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  date date not null,
  exception_type text not null check (exception_type in
    ('temporary_closure','special_open','shortened','year_end','maintenance')),
  opening_time time,
  closing_time time,
  last_entry_time time,
  reason text,
  notice text,
  created_at timestamptz not null default now(),
  unique (place_id, date, exception_type)
);
create index if not exists facility_business_exceptions_place_date_idx
  on public.facility_business_exceptions (place_id, date);

-- ---- 料金 (プラン + 区分) ----
create table if not exists public.facility_price_plans (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  plan_name text not null,
  plan_type text check (plan_type is null or plan_type in
    ('admission','timed','day_pass','coupon_ticket','monthly','annual_pass','per_activity','season','weekday','holiday')),
  day_type text check (day_type is null or day_type in ('all','weekday','holiday')),
  season_type text,
  duration_minutes int check (duration_minutes is null or duration_minutes > 0),
  valid_from date,
  valid_until date,
  reservation_required boolean,
  note text,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);
create index if not exists facility_price_plans_place_idx on public.facility_price_plans (place_id);

create table if not exists public.facility_price_tiers (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.facility_price_plans(id) on delete cascade,
  tier text not null check (tier in
    ('infant','toddler','elementary','junior_high','high_school','adult','senior','disabled','companion','group')),
  price int not null check (price >= 0),
  original_price int check (original_price is null or original_price >= 0),
  is_free boolean not null default false,
  conditions text,
  sort_order int not null default 0
);
create index if not exists facility_price_tiers_plan_idx on public.facility_price_tiers (plan_id);

-- ---- メディア ----
create table if not exists public.facility_media (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  media_type text not null default 'gallery' check (media_type in
    ('main','gallery','exterior','interior','attraction','food','map','floor_map','logo','video','panorama')),
  storage_path text,
  external_url text,
  alt_text text,
  caption text,
  copyright_holder text,
  source_url text,
  is_primary boolean not null default false,
  sort_order int not null default 100,
  width int,
  height int,
  status text not null default 'approved' check (status in ('pending','approved','rejected')),
  uploaded_by text,
  created_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);
create index if not exists facility_media_place_idx on public.facility_media (place_id, sort_order);

-- ---- お知らせ ----
create table if not exists public.facility_news (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  title text not null,
  slug text,
  summary text,
  content text,
  news_type text not null default 'info' check (news_type in
    ('temporary_closure','hours_change','new_attraction','campaign','maintenance','seasonal','info')),
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  is_important boolean not null default false,
  status text not null default 'published' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now()
);
create index if not exists facility_news_place_idx on public.facility_news (place_id, published_at desc);

-- ---- 情報修正リクエスト ----
create table if not exists public.facility_correction_requests (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  reporter_name text,
  reporter_email text,
  correction_type text not null check (correction_type in
    ('hours','price','closure','address','contact','facility_info','other')),
  current_value text,
  proposed_value text not null,
  reason text,
  evidence_url text,
  status text not null default 'pending' check (status in
    ('pending','investigating','approved','rejected','applied')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists facility_correction_requests_status_idx
  on public.facility_correction_requests (status, created_at desc);

-- ---- RLS ----
alter table public.facility_business_hours enable row level security;
alter table public.facility_business_hour_slots enable row level security;
alter table public.facility_business_exceptions enable row level security;
alter table public.facility_price_plans enable row level security;
alter table public.facility_price_tiers enable row level security;
alter table public.facility_media enable row level security;
alter table public.facility_news enable row level security;
alter table public.facility_correction_requests enable row level security;

create policy "public read published hours" on public.facility_business_hours for select
  using (exists (select 1 from public.places p where p.id = place_id and p.is_published));
create policy "public read published hour slots" on public.facility_business_hour_slots for select
  using (exists (
    select 1 from public.facility_business_hours h
    join public.places p on p.id = h.place_id
    where h.id = business_hour_id and p.is_published));
create policy "public read published exceptions" on public.facility_business_exceptions for select
  using (exists (select 1 from public.places p where p.id = place_id and p.is_published));
create policy "public read published price plans" on public.facility_price_plans for select
  using (exists (select 1 from public.places p where p.id = place_id and p.is_published));
create policy "public read published price tiers" on public.facility_price_tiers for select
  using (exists (
    select 1 from public.facility_price_plans pl
    join public.places p on p.id = pl.place_id
    where pl.id = plan_id and p.is_published));
create policy "public read approved media" on public.facility_media for select
  using (status = 'approved' and exists (select 1 from public.places p where p.id = place_id and p.is_published));
create policy "public read published news" on public.facility_news for select
  using (status = 'published' and exists (select 1 from public.places p where p.id = place_id and p.is_published));
-- 修正リクエストは匿名投稿を許可 (readは不可 = 個人情報保護)
create policy "anyone can submit corrections" on public.facility_correction_requests for insert
  with check (status = 'pending' and char_length(proposed_value) <= 2000);
