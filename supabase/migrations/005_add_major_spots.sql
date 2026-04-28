-- USJ・主要テーマパーク追加
insert into places (name, description, prefecture, city, address, latitude, longitude, indoor_type, target_ages, price_type, price_note, has_parking, has_nursing_room, has_diaper_space, rainy_day_ok, opening_hours, google_map_url, website_url, is_published) values
(
  'ユニバーサル・スタジオ・ジャパン（USJ）',
  '世界的なテーマパーク。ハリーポッター・ミニオンなど子どもから大人まで楽しめるアトラクションが充実。年齢・身長制限があるものも多いが、小さな子ども向けエリア「ユニバーサル・ワンダーランド」も人気。',
  '大阪府', '大阪市此花区', '大阪府大阪市此花区桜島2-1-33',
  34.6654, 135.4323,
  'both', ARRAY['0-2','3-5','6-12'], 'paid', '大人・子ども共に7,400円〜（日付・チケット種別により異なる）',
  true, true, true, true,
  '営業時間は日によって異なる（公式サイト要確認）',
  'https://maps.app.goo.gl/usj',
  'https://www.usj.co.jp/',
  true
),
(
  'レゴランド・ディスカバリー・センター大阪',
  'LEGOの世界観に浸れる屋内施設。ミニランドや4Dシネマ、LEGOで遊べるコーナーが充実。雨の日でも安心。',
  '大阪府', '大阪市此花区', '大阪府大阪市此花区桜島1-1-77 EXPOCITY内',
  34.8019, 135.5393,
  'indoor', ARRAY['3-5','6-12'], 'paid', '大人2,200円、子ども2,800円程度（時期により変動）',
  true, true, true, true,
  '10:00〜19:00（最終入場18:00）',
  'https://maps.app.goo.gl/legoland-osaka',
  'https://www.legolanddiscoverycenter.com/osaka/',
  true
);
