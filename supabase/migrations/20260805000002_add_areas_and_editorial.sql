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
