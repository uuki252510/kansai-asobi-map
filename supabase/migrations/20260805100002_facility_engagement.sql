-- ============================================================
-- 施設データベース拡張 (3/3): イベント・クーポン・チケット・
-- 指標・監査ログ・リビジョン・インポートジョブ
-- ============================================================

-- ---- イベント (複数日・繰り返し対応) ----
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references public.places(id) on delete set null,
  name text not null,
  name_kana text,
  slug text unique,
  summary text,
  description text,
  venue_name text,
  address text,
  latitude double precision,
  longitude double precision,
  start_at timestamptz not null,
  end_at timestamptz not null,
  recurrence_rule text, -- iCal RRULE 形式
  reception_start_at timestamptz,
  reception_end_at timestamptz,
  application_deadline timestamptz,
  capacity int check (capacity is null or capacity >= 0),
  target_age_min int,
  target_age_max int,
  child_price int check (child_price is null or child_price >= 0),
  adult_price int check (adult_price is null or adult_price >= 0),
  reservation_required boolean,
  same_day_available boolean,
  application_url text,
  official_url text,
  organizer_name text,
  organizer_contact text,
  status text not null default 'draft' check (status in ('draft','published','archived','cancelled')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at >= start_at),
  check (target_age_max is null or target_age_min is null or target_age_max >= target_age_min)
);
create index if not exists events_place_idx on public.events (place_id);
create index if not exists events_period_idx on public.events (start_at, end_at) where status = 'published';

create table if not exists public.event_occurrences (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  check (end_at >= start_at)
);
create index if not exists event_occurrences_event_idx on public.event_occurrences (event_id, start_at);

-- ---- クーポン ----
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  name text not null,
  description text,
  discount_type text not null check (discount_type in
    ('amount','percent','child_free','adult_free','gift','set_discount')),
  discount_value int check (discount_value is null or discount_value >= 0),
  minimum_purchase_amount int,
  valid_from date,
  valid_until date,
  usage_limit int,
  per_user_limit int,
  applicable_days text,
  reservation_required boolean,
  display_code text,
  terms text,
  status text not null default 'draft' check (status in ('draft','published','expired','archived')),
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);
create index if not exists coupons_place_idx on public.coupons (place_id) where status = 'published';

-- ---- チケット (外部予約サービス連携) ----
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  name text not null,
  description text,
  provider_name text,
  external_ticket_url text not null,
  sale_price int check (sale_price is null or sale_price >= 0),
  regular_price int check (regular_price is null or regular_price >= 0),
  currency text not null default 'JPY',
  valid_from date,
  valid_until date,
  usage_validity text,
  cancellation_policy text,
  inventory_status text check (inventory_status is null or inventory_status in
    ('in_stock','low','sold_out','unknown')),
  is_featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','expired','archived')),
  created_at timestamptz not null default now()
);
create index if not exists tickets_place_idx on public.tickets (place_id) where status = 'published';

-- ---- 行動ログ / 日次集計 (ランキング用) ----
create table if not exists public.facility_interactions (
  id bigint generated always as identity primary key,
  place_id uuid not null references public.places(id) on delete cascade,
  interaction_type text not null check (interaction_type in
    ('detail_view','save','review','ticket_click','reservation_click','map_click','phone_click','website_click')),
  session_id text,
  created_at timestamptz not null default now()
);
create index if not exists facility_interactions_place_time_idx
  on public.facility_interactions (place_id, created_at desc);

create table if not exists public.facility_metrics_daily (
  place_id uuid not null references public.places(id) on delete cascade,
  date date not null,
  detail_views int not null default 0,
  saves int not null default 0,
  reviews int not null default 0,
  ticket_clicks int not null default 0,
  reservation_clicks int not null default 0,
  map_clicks int not null default 0,
  website_clicks int not null default 0,
  score numeric(10,2) not null default 0,
  primary key (place_id, date)
);

-- ---- 監査ログ / リビジョン ----
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('insert','update','delete','publish','unpublish','approve','reject')),
  old_data jsonb,
  new_data jsonb,
  actor text,
  ip_address text,
  user_agent text,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_record_idx on public.audit_logs (table_name, record_id, created_at desc);

create table if not exists public.facility_revisions (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  snapshot jsonb not null,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists facility_revisions_place_idx on public.facility_revisions (place_id, created_at desc);

-- ---- CSVインポートジョブ ----
create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'facilities',
  status text not null default 'pending' check (status in
    ('pending','validating','importing','completed','completed_with_errors','failed')),
  file_name text,
  total_rows int not null default 0,
  success_rows int not null default 0,
  error_rows int not null default 0,
  mode text not null default 'upsert' check (mode in ('insert_only','update_only','upsert')),
  created_by text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.import_job_rows (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.import_jobs(id) on delete cascade,
  row_number int not null,
  raw jsonb not null,
  status text not null default 'pending' check (status in ('pending','success','error','skipped')),
  error text,
  place_id uuid references public.places(id) on delete set null
);
create index if not exists import_job_rows_job_idx on public.import_job_rows (job_id, row_number);

-- ---- RLS ----
alter table public.events enable row level security;
alter table public.event_occurrences enable row level security;
alter table public.coupons enable row level security;
alter table public.tickets enable row level security;
alter table public.facility_interactions enable row level security;
alter table public.facility_metrics_daily enable row level security;
alter table public.audit_logs enable row level security;
alter table public.facility_revisions enable row level security;
alter table public.import_jobs enable row level security;
alter table public.import_job_rows enable row level security;

create policy "public read published events" on public.events for select using (status = 'published');
create policy "public read published event occurrences" on public.event_occurrences for select
  using (exists (select 1 from public.events e where e.id = event_id and e.status = 'published'));
create policy "public read published coupons" on public.coupons for select using (status = 'published');
create policy "public read published tickets" on public.tickets for select using (status = 'published');
-- 行動ログは匿名insertのみ許可 (readはservice roleのみ)
create policy "anyone can log interactions" on public.facility_interactions for insert
  with check (session_id is null or char_length(session_id) <= 100);
-- metrics/audit/revisions/import は service role のみ (ポリシー無し = 全拒否)
