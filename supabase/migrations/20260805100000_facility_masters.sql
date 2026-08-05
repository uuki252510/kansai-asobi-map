-- ============================================================
-- 施設データベース拡張 (1/3): マスタ + 分類 + places追加列
-- 方針: places = facilities として追加型で拡張。破壊的変更なし。
-- ============================================================

-- ---- places への追加列 (識別・SEO・鮮度・ステータス) ----
alter table public.places
  add column if not exists slug text,
  add column if not exists facility_code text,
  add column if not exists publication_status text not null default 'published'
    check (publication_status in ('draft','pending_review','approved','published','suspended','archived','rejected')),
  add column if not exists catchphrase text,
  add column if not exists short_description text,
  add column if not exists recommended_points text,
  add column if not exists precautions text,
  add column if not exists seasonal_information text,
  add column if not exists search_keywords text,
  add column if not exists official_instagram_url text,
  add column if not exists official_x_url text,
  add column if not exists reservation_url text,
  add column if not exists phone_number text,
  add column if not exists phone_note text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_temporarily_closed boolean not null default false,
  add column if not exists is_permanently_closed boolean not null default false,
  add column if not exists confirmation_method text,
  add column if not exists confirmation_source_url text,
  add column if not exists confirmation_source_type text,
  add column if not exists next_confirmation_due_at timestamptz,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists noindex boolean not null default false,
  add column if not exists minimum_visit_minutes int,
  add column if not exists maximum_visit_minutes int,
  add column if not exists reservation_type text
    check (reservation_type is null or reservation_type in
      ('not_required','recommended','required','partially_required','timed_ticket','phone_only','web_only'));

create unique index if not exists places_slug_key on public.places (slug) where slug is not null;
create index if not exists places_publication_status_idx on public.places (publication_status);

-- ---- カテゴリー (親子対応) ----
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  image_url text,
  parent_id uuid references public.categories(id) on delete set null,
  sort_order int not null default 100,
  is_active boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.facility_categories (
  place_id uuid not null references public.places(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  is_primary boolean not null default false,
  primary key (place_id, category_id)
);
create index if not exists facility_categories_category_idx on public.facility_categories (category_id);

-- ---- タグ (グループ + 同義語統合) ----
create table if not exists public.tag_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 100
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  group_id uuid references public.tag_groups(id) on delete set null,
  description text,
  icon text,
  sort_order int not null default 100,
  is_filterable boolean not null default true,
  is_indexable boolean not null default false,
  is_active boolean not null default true,
  -- 同義語: 非null なら正規タグへのポインタ (雨天OK → 雨の日でもOK)
  canonical_tag_id uuid references public.tags(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.facility_tags (
  place_id uuid not null references public.places(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (place_id, tag_id)
);
create index if not exists facility_tags_tag_idx on public.facility_tags (tag_id);

-- ---- 設備 ----
create table if not exists public.amenities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text,
  icon text,
  sort_order int not null default 100,
  is_active boolean not null default true
);

create table if not exists public.facility_amenities (
  place_id uuid not null references public.places(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  available boolean not null default true,
  free_or_paid text check (free_or_paid is null or free_or_paid in ('free','paid')),
  fee int check (fee is null or fee >= 0),
  location_note text,
  usage_note text,
  primary key (place_id, amenity_id)
);

-- ---- 利用目的 ----
create table if not exists public.purposes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 100,
  is_active boolean not null default true
);

create table if not exists public.facility_purposes (
  place_id uuid not null references public.places(id) on delete cascade,
  purpose_id uuid not null references public.purposes(id) on delete cascade,
  primary key (place_id, purpose_id)
);

-- ---- 年齢帯別おすすめ度 (0-5の5段階) ----
create table if not exists public.facility_age_suitability (
  place_id uuid not null references public.places(id) on delete cascade,
  age_band text not null check (age_band in
    ('baby','toddler','preschool','elementary','junior_high','high_school','adult','senior')),
  suitability smallint not null check (suitability between 0 and 5),
  note text,
  primary key (place_id, age_band)
);

-- ---- 鉄道 (最低限の骨組み。データ投入は別途) ----
create table if not exists public.railway_lines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text,
  sort_order int not null default 100
);

create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  line_id uuid references public.railway_lines(id) on delete set null,
  latitude double precision,
  longitude double precision
);

create table if not exists public.facility_station_access (
  place_id uuid not null references public.places(id) on delete cascade,
  station_id uuid not null references public.stations(id) on delete cascade,
  distance_meters int check (distance_meters is null or distance_meters >= 0),
  walking_minutes int check (walking_minutes is null or walking_minutes >= 0),
  route_description text,
  sort_order int not null default 100,
  primary key (place_id, station_id)
);

create table if not exists public.facility_parking (
  place_id uuid primary key references public.places(id) on delete cascade,
  has_parking boolean not null default false,
  capacity int check (capacity is null or capacity >= 0),
  fee_type text check (fee_type is null or fee_type in ('free','paid','partially_free')),
  price_note text,
  height_limit_cm int,
  reservation_required boolean,
  nearby_parking_note text
);

-- ---- RLS ----
alter table public.categories enable row level security;
alter table public.facility_categories enable row level security;
alter table public.tag_groups enable row level security;
alter table public.tags enable row level security;
alter table public.facility_tags enable row level security;
alter table public.amenities enable row level security;
alter table public.facility_amenities enable row level security;
alter table public.purposes enable row level security;
alter table public.facility_purposes enable row level security;
alter table public.facility_age_suitability enable row level security;
alter table public.railway_lines enable row level security;
alter table public.stations enable row level security;
alter table public.facility_station_access enable row level security;
alter table public.facility_parking enable row level security;

-- マスタは有効行のみ公開read。書き込みは service role のみ (ポリシー無し = 拒否)
create policy "public read active categories" on public.categories for select using (is_active = true);
create policy "public read tag groups" on public.tag_groups for select using (true);
create policy "public read active tags" on public.tags for select using (is_active = true);
create policy "public read active amenities" on public.amenities for select using (is_active = true);
create policy "public read active purposes" on public.purposes for select using (is_active = true);
create policy "public read railway lines" on public.railway_lines for select using (true);
create policy "public read stations" on public.stations for select using (true);

-- 施設ひも付きは「公開施設のみ」read
create policy "public read published facility categories" on public.facility_categories for select
  using (exists (select 1 from public.places p where p.id = place_id and p.is_published));
create policy "public read published facility tags" on public.facility_tags for select
  using (exists (select 1 from public.places p where p.id = place_id and p.is_published));
create policy "public read published facility amenities" on public.facility_amenities for select
  using (exists (select 1 from public.places p where p.id = place_id and p.is_published));
create policy "public read published facility purposes" on public.facility_purposes for select
  using (exists (select 1 from public.places p where p.id = place_id and p.is_published));
create policy "public read published facility age suitability" on public.facility_age_suitability for select
  using (exists (select 1 from public.places p where p.id = place_id and p.is_published));
create policy "public read published facility station access" on public.facility_station_access for select
  using (exists (select 1 from public.places p where p.id = place_id and p.is_published));
create policy "public read published facility parking" on public.facility_parking for select
  using (exists (select 1 from public.places p where p.id = place_id and p.is_published));

-- ---- マスタ seed ----
insert into public.categories (slug, name, sort_order) values
  ('indoor-playground','室内遊び場',10),('amusement-park','遊園地',20),('theme-park','テーマパーク',30),
  ('zoo','動物園',40),('aquarium','水族館',50),('farm','牧場',60),('botanical-garden','植物園',70),
  ('campground','キャンプ場',80),('bbq','バーベキュー',90),('fishing','釣り',100),
  ('nature','自然景観',110),('fruit-picking','果物狩り',120),('strawberry-picking','いちご狩り',130),
  ('agriculture','農業体験',140),('museum','博物館',150),('science-museum','科学館',160),
  ('factory-tour','工場見学',170),('field-trip','社会見学',180),('experience','体験施設',190),
  ('athletic','アスレチック',200),('sports','スポーツ施設',210),('park','公園',220),
  ('pool','プール',230),('beach','海水浴場',240),('onsen','温泉',250),('hotel','ホテル',260),
  ('ski','スキー場',270),('skating','スケート場',280),('restaurant','レストラン',290),
  ('cafe','カフェ',300),('shopping','ショッピング',310),('michinoeki','道の駅',320),
  ('sightseeing','観光施設',330),('planetarium','プラネタリウム',340),('amusement','アミューズメント',350),
  ('kids-cafe','キッズカフェ',360),('nature-experience','自然体験',370),('activity','アクティビティ',380),
  ('other','その他',990)
on conflict (slug) do nothing;

insert into public.tag_groups (slug, name, sort_order) values
  ('scene','シーン',10),('facility','設備・条件',20),('season','季節',30),('audience','対象',40),('play','遊び方',50)
on conflict (slug) do nothing;

insert into public.tags (slug, name, group_id, sort_order, is_filterable, is_indexable)
select v.slug, v.name, g.id, v.sort_order, v.is_filterable, v.is_indexable
from (values
  ('rainy-day-ok','雨の日でもOK','scene',10,true,true),
  ('all-day','1日中遊べる','scene',20,true,true),
  ('free','無料','scene',30,true,true),
  ('hidden-gem','穴場','scene',40,true,false),
  ('same-day-reservation','当日予約可能','scene',50,true,false),
  ('no-reservation','予約不要','scene',60,true,true),
  ('free-parking','駐車場無料','facility',70,true,false),
  ('near-station','駅から近い','facility',80,true,true),
  ('stroller-ok','ベビーカーOK','facility',90,true,false),
  ('nursing-room','授乳室あり','facility',100,true,false),
  ('diaper-space','おむつ交換台あり','facility',110,true,false),
  ('food-allowed','食事持ち込みOK','facility',120,true,false),
  ('baby-friendly','赤ちゃん向け','audience',130,true,true),
  ('elementary','小学生向け','audience',140,true,true),
  ('teens','中高生向け','audience',150,true,false),
  ('adults-too','大人も楽しめる','audience',160,true,false),
  ('spring-break','春休み','season',170,true,false),
  ('summer-vacation','夏休み','season',180,true,true),
  ('winter-vacation','冬休み','season',190,true,false),
  ('golden-week','ゴールデンウィーク','season',200,true,false),
  ('river-play','川遊び','play',210,true,true),
  ('water-play','水遊び','play',220,true,true),
  ('animal-encounter','動物ふれあい','play',230,true,true),
  ('picnic','ピクニック','play',240,true,false),
  ('go-kart','ゴーカート','play',250,true,false),
  ('athletic-tag','アスレチック','play',260,true,true),
  ('rock-climbing','ロッククライミング','play',270,true,false),
  ('giant-maze','巨大迷路','play',280,true,false),
  ('trick-art','トリックアート','play',290,true,false),
  ('train-lover','電車好き','play',300,true,false),
  ('pet-friendly','ペット同伴可能','facility',310,true,true),
  ('date','デート向け','audience',320,true,true),
  ('family','家族向け','audience',330,true,true),
  ('friends','友人向け','audience',340,true,false)
) as v(slug, name, group_slug, sort_order, is_filterable, is_indexable)
join public.tag_groups g on g.slug = v.group_slug
on conflict (slug) do nothing;

-- 同義語タグの例 (canonical へ統合)
insert into public.tags (slug, name, canonical_tag_id, is_filterable, is_indexable, is_active)
select v.slug, v.name, t.id, false, false, true
from (values ('rain-ok','雨天OK','rainy-day-ok'), ('play-in-rain','雨でも遊べる','rainy-day-ok')) as v(slug, name, canonical)
join public.tags t on t.slug = v.canonical
on conflict (slug) do nothing;

insert into public.amenities (slug, name, category, sort_order) values
  ('parking','駐車場','access',10),('bicycle-parking','駐輪場','access',20),
  ('nursing-room','授乳室','baby',30),('diaper-table','おむつ交換台','baby',40),
  ('stroller-rental','ベビーカー貸出','baby',50),('stroller-ok','ベビーカー入場','baby',60),
  ('kids-toilet','キッズトイレ','baby',70),('kids-seat','子ども用便座','baby',80),
  ('hot-water','ミルク用のお湯','baby',90),('microwave','電子レンジ','baby',100),
  ('daycare','託児所','baby',110),('first-aid','救護室','safety',120),
  ('locker','コインロッカー','comfort',130),('changing-room','更衣室','comfort',140),
  ('shower','シャワー','comfort',150),('restaurant','レストラン','food',160),
  ('cafe','カフェ','food',170),('food-court','フードコート','food',180),
  ('shop','売店','food',190),('vending','自動販売機','food',200),
  ('wifi','Wi-Fi','comfort',210),('charging','充電設備','comfort',220),
  ('barrier-free','バリアフリー','accessibility',230),('wheelchair-rental','車椅子貸出','accessibility',240),
  ('multi-toilet','多目的トイレ','accessibility',250),('smoking-area','喫煙所','comfort',260),
  ('pet-allowed','ペット同伴','policy',270),('food-bring-in','飲食物持ち込み','policy',280),
  ('reentry','再入場','policy',290),('cashless','キャッシュレス決済','payment',300),
  ('credit-card','クレジットカード','payment',310),('qr-payment','QRコード決済','payment',320)
on conflict (slug) do nothing;

insert into public.purposes (slug, name, sort_order) values
  ('family-outing','家族のおでかけ',10),('play-with-kids','子どもと遊ぶ',20),('date','デート',30),
  ('with-friends','友人と遊ぶ',40),('solo','一人で楽しむ',50),('learning','学習',60),
  ('research','自由研究',70),('exercise','運動',80),('nature','自然体験',90),
  ('animals','動物とのふれあい',100),('water-play','水遊び',110),('meal','食事',120),
  ('shopping','ショッピング',130),('stay','宿泊',140),('rainy-day','雨の日',150),
  ('hot-day','暑い日',160),('cold-day','寒い日',170)
on conflict (slug) do nothing;
