-- places table
create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  prefecture text not null,
  city text not null,
  address text not null,
  latitude double precision,
  longitude double precision,
  indoor_type text not null default 'outdoor', -- 'indoor' | 'outdoor' | 'both'
  target_ages text[] not null default '{}',     -- e.g. ['0-2', '3-5', '6-12']
  price_type text not null default 'free',       -- 'free' | 'paid' | 'mixed'
  price_note text,
  has_parking boolean not null default false,
  has_nursing_room boolean not null default false,
  has_diaper_space boolean not null default false,
  rainy_day_ok boolean not null default false,
  opening_hours text,
  image_url text,
  google_map_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- reviews table
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  user_name text not null default '匿名',
  created_at timestamptz not null default now()
);

-- indexes
create index if not exists places_prefecture_idx on places(prefecture);
create index if not exists places_is_published_idx on places(is_published);
create index if not exists reviews_place_id_idx on reviews(place_id);

-- RLS
alter table places enable row level security;
alter table reviews enable row level security;

-- Public read published places
create policy "public can read published places"
  on places for select
  using (is_published = true);

-- Public read reviews
create policy "public can read reviews"
  on reviews for select
  using (true);

-- Public can insert reviews
create policy "public can insert reviews"
  on reviews for insert
  with check (true);

-- Admin full access (service_role bypasses RLS automatically)
