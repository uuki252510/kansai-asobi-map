-- ============================================================
-- デカケル: 未適用migrationの結合SQL
-- Supabase Dashboard → SQL Editor に貼り付けて実行してください。
-- 全て追加型 (IF NOT EXISTS / on conflict do nothing) で冪等です。
-- 生成日: 2026-08-05
-- ============================================================

-- >>>>>> 20260805000000_add_place_image_storage.sql >>>>>>
-- Store imported photos in Supabase Storage so the image API can serve
-- a CDN redirect instead of calling Google Places on every request.

alter table public.places
  add column if not exists image_storage_path text,
  add column if not exists image_source text,
  add column if not exists image_synced_at timestamptz;

-- Public bucket for place photos (read-only for anon via public URL)
insert into storage.buckets (id, name, public)
values ('place-images', 'place-images', true)
on conflict (id) do nothing;

-- >>>>>> 20260805000001_add_places_with_rating_view.sql >>>>>>
-- Aggregate ratings in the database instead of fanning out reviews(rating)
-- rows to the app on every list query.
-- security_invoker keeps the caller's RLS (anon sees published places only).

create or replace view public.places_with_rating
with (security_invoker = true) as
select
  p.*,
  avg(r.rating)::numeric(3, 2) as avg_rating,
  count(r.id)::int as review_count
from public.places p
left join public.reviews r on r.place_id = p.id
group by p.id;

grant select on public.places_with_rating to anon, authenticated;

-- >>>>>> 20260805000002_add_areas_and_editorial.sql >>>>>>
-- Area hub pages (/areas/[slug]) + editorial two-block columns for spot detail.

-- 1) エリアハブ
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null check (kind in ('prefecture', 'city', 'station', 'landmark')),
  prefecture text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_km double precision not null default 3,
  description text,
  parent_slug text,
  sort_order int not null default 100,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.place_areas (
  area_id uuid references public.areas(id) on delete cascade,
  place_id uuid references public.places(id) on delete cascade,
  is_excluded boolean not null default false,
  primary key (area_id, place_id)
);

alter table public.areas enable row level security;
alter table public.place_areas enable row level security;

create policy "public can read published areas"
  on public.areas for select
  using (is_published = true);

create policy "public can read place areas"
  on public.place_areas for select
  using (true);

-- 2) 詳細ページ2ブロック (どんなとこ？ / なんで行くん？)
alter table public.places
  add column if not exists what_is_it text,
  add column if not exists why_go text;

-- 3) エリアseed (府県6 + 主要エリア)
insert into public.areas (slug, name, kind, prefecture, center_lat, center_lng, radius_km, parent_slug, sort_order, description) values
  ('osaka', '大阪府', 'prefecture', '大阪府', 34.6863, 135.5200, 60, null, 10, '大阪府全域のおでかけスポット。都心の屋内施設から郊外の大型公園まで。'),
  ('hyogo', '兵庫県', 'prefecture', '兵庫県', 34.6913, 135.1830, 80, null, 20, '神戸・阪神間から姫路、淡路、但馬まで。海も山も楽しめる兵庫県のスポット。'),
  ('kyoto', '京都府', 'prefecture', '京都府', 35.0116, 135.7681, 60, null, 30, '歴史とあそびが同居する京都府。市内の定番から海の京都まで。'),
  ('nara', '奈良県', 'prefecture', '奈良県', 34.6851, 135.8050, 50, null, 40, '奈良公園の鹿だけじゃない。大自然と歴史遺産の奈良県のスポット。'),
  ('shiga', '滋賀県', 'prefecture', '滋賀県', 35.0045, 135.8686, 50, null, 50, '琵琶湖を中心に、水遊びもアウトドアも充実の滋賀県のスポット。'),
  ('wakayama', '和歌山県', 'prefecture', '和歌山県', 34.2260, 135.1675, 80, null, 60, 'アドベンチャーワールドから白浜の海まで。和歌山県のおでかけスポット。'),
  ('umeda', '梅田・大阪駅', 'station', '大阪府', 34.7025, 135.4959, 2.5, 'osaka', 110, '梅田・大阪駅周辺。雨の日も安心の屋内スポットが集まる関西最大のターミナル。'),
  ('namba', 'なんば・心斎橋', 'station', '大阪府', 34.6666, 135.5010, 2.5, 'osaka', 120, 'なんば・心斎橋エリア。食べ歩きもエンタメも楽しめるミナミの中心。'),
  ('tennoji', '天王寺・阿倍野', 'station', '大阪府', 34.6462, 135.5134, 2.5, 'osaka', 130, '天王寺動物園やハルカスなど、家族で1日遊べる天王寺・阿倍野エリア。'),
  ('osaka-bay', '大阪ベイエリア', 'landmark', '大阪府', 34.6545, 135.4290, 5, 'osaka', 140, '海遊館やUSJを擁する大阪ベイエリア。1日たっぷり遊べる大型スポット揃い。'),
  ('banpaku', '万博記念公園周辺', 'landmark', '大阪府', 34.8051, 135.5323, 4, 'osaka', 150, '万博記念公園とエキスポシティ。緑と遊びがそろう北大阪の定番。'),
  ('sannomiya', '三宮・元町', 'station', '兵庫県', 34.6946, 135.1980, 2.5, 'hyogo', 210, '三宮・元町エリア。港町神戸の中心で、動物園も科学館も徒歩圏。'),
  ('kobe-rokko', '六甲山・摩耶山', 'landmark', '兵庫県', 34.7780, 135.2320, 5, 'hyogo', 220, '六甲山・摩耶山エリア。アスレチックや牧場、夜景まで山の遊びが凝縮。'),
  ('himeji', '姫路', 'city', '兵庫県', 34.8151, 134.6854, 8, 'hyogo', 230, '姫路城だけじゃない。水族館も動物園もそろう姫路エリア。'),
  ('kyoto-city', '京都市内', 'city', '京都府', 35.0116, 135.7681, 8, 'kyoto', 310, '京都市内の定番スポット。水族館・鉄道博物館・寺社めぐりまで。'),
  ('arashiyama', '嵐山・嵯峨野', 'landmark', '京都府', 35.0094, 135.6668, 3, 'kyoto', 320, '嵐山・嵯峨野エリア。竹林とトロッコ、川遊びの自然派エリア。'),
  ('nara-park', '奈良公園周辺', 'landmark', '奈良県', 34.6851, 135.8430, 3, 'nara', 410, '奈良公園と周辺エリア。鹿と大仏、ミュージアムが徒歩圏に。'),
  ('biwako', '琵琶湖周辺', 'landmark', '滋賀県', 35.2500, 136.0800, 25, 'shiga', 510, '琵琶湖周辺の水遊び・アウトドアスポット。夏のおでかけの定番。'),
  ('shirahama', '白浜', 'landmark', '和歌山県', 33.6789, 135.3480, 6, 'wakayama', 610, 'アドベンチャーワールドと白良浜。関西屈指のファミリーリゾート白浜。')
on conflict (slug) do nothing;

-- >>>>>> 20260805100000_facility_masters.sql >>>>>>
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

-- >>>>>> 20260805100001_facility_operations.sql >>>>>>
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

-- >>>>>> 20260805100002_facility_engagement.sql >>>>>>
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

