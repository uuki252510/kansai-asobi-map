-- kids_spotsテーブルからplacesテーブルへ変換インポート
-- 事前にsupabase_kids_spots.sqlを実行してkids_spotsテーブルを作成しておくこと

INSERT INTO places (
  name, description, prefecture, city, address,
  latitude, longitude,
  indoor_type, target_ages, price_type,
  has_parking, has_nursing_room, has_diaper_space,
  rainy_day_ok, opening_hours,
  google_map_url, website_url, is_published
)
SELECT
  name,
  description,
  COALESCE(prefecture, '大阪府') AS prefecture,
  COALESCE(city, prefecture, '不明') AS city,
  COALESCE(address, '') AS address,
  CASE WHEN latitude IS NOT NULL THEN latitude::double precision ELSE NULL END,
  CASE WHEN longitude IS NOT NULL THEN longitude::double precision ELSE NULL END,

  -- indoor_type: 英語値はそのまま、日本語は変換
  CASE
    WHEN indoor_type IN ('indoor', 'outdoor', 'both') THEN indoor_type
    WHEN indoor_type ILIKE '%indoor%' OR indoor_type = '室内' THEN 'indoor'
    WHEN indoor_type ILIKE '%outdoor%' OR indoor_type ILIKE '%屋外%' THEN 'outdoor'
    WHEN indoor_type ILIKE '%both%' OR indoor_type ILIKE '%屋内%外%' OR indoor_type ILIKE '%屋内・屋外%' THEN 'both'
    ELSE 'both'
  END AS indoor_type,

  -- target_ages: カンマ区切り文字列 → TEXT配列
  CASE
    WHEN target_ages ILIKE '%0-2%' AND target_ages ILIKE '%elementary%' THEN ARRAY['0-2','3-5','6-12']
    WHEN target_ages ILIKE '%0-2%' AND target_ages ILIKE '%3-5%' THEN ARRAY['0-2','3-5']
    WHEN target_ages ILIKE '%0-2%' THEN ARRAY['0-2']
    WHEN target_ages ILIKE '%3-5%' AND target_ages ILIKE '%elementary%' THEN ARRAY['3-5','6-12']
    WHEN target_ages ILIKE '%elementary%' THEN ARRAY['6-12']
    WHEN target_ages ILIKE '%3-5%' THEN ARRAY['3-5']
    WHEN target_ages ILIKE '%幼児%' AND target_ages ILIKE '%小学生%' THEN ARRAY['0-2','3-5','6-12']
    WHEN target_ages ILIKE '%幼児%' THEN ARRAY['0-2','3-5']
    WHEN target_ages ILIKE '%小学生%' THEN ARRAY['6-12']
    ELSE ARRAY[]::text[]
  END AS target_ages,

  COALESCE(price_type, 'free') AS price_type,

  -- TEXT → BOOLEAN 変換
  CASE WHEN has_parking = 'true' THEN true ELSE false END AS has_parking,
  CASE WHEN has_nursing_room = 'true' THEN true ELSE false END AS has_nursing_room,
  CASE WHEN has_diaper_space = 'true' THEN true ELSE false END AS has_diaper_space,

  COALESCE(rainy_day_ok, false) AS rainy_day_ok,
  opening_hours,
  google_map_url,
  official_url AS website_url,
  true AS is_published

FROM kids_spots
WHERE
  name IS NOT NULL
  AND address IS NOT NULL
  AND name NOT IN (SELECT name FROM places);  -- 重複スキップ
