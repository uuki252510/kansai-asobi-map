-- Sample places data (30 spots across Kansai 6 prefectures)
-- ※ これはサンプルデータです。実在施設名を使用している場合でも、住所・営業時間等は仮のデータが含まれます。

insert into places (name, description, prefecture, city, address, latitude, longitude, indoor_type, target_ages, price_type, price_note, has_parking, has_nursing_room, has_diaper_space, rainy_day_ok, opening_hours, image_url, google_map_url) values

-- 大阪府 5件
(
  'サンプル遊び場 大阪01（キッズパーク型）',
  '広々とした屋内キッズパーク。大型アスレチックやボールプールが充実。雨の日でも安心して楽しめます。',
  '大阪府', '大阪市中央区', '大阪府大阪市中央区XX-XX-XX（サンプル）',
  34.6937, 135.5022,
  'indoor', ARRAY['0-2','3-5','6-12'], 'paid', '大人500円、子ども800円（サンプル料金）',
  true, true, true, true,
  '10:00〜18:00（サンプル）',
  'https://images.unsplash.com/photo-1575783970733-1aaedde1db74?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=大阪市中央区'
),
(
  'サンプル公園 大阪02（大型複合遊具）',
  '大型複合遊具が充実した広い公園。シャボン玉広場や砂場も人気。',
  '大阪府', '吹田市', '大阪府吹田市XX-XX（サンプル）',
  34.7649, 135.5158,
  'outdoor', ARRAY['3-5','6-12'], 'free', null,
  true, false, true, false,
  '常時開放（サンプル）',
  'https://images.unsplash.com/photo-1544487519-b3d3c0a7c597?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=吹田市'
),
(
  'サンプル科学館 大阪03',
  '子ども向けサイエンス体験施設。プラネタリウムや実験コーナーで学びながら遊べます。',
  '大阪府', '大阪市港区', '大阪府大阪市港区XX-XX-XX（サンプル）',
  34.6546, 135.4348,
  'indoor', ARRAY['3-5','6-12'], 'paid', '大人600円、子ども300円（サンプル）',
  true, true, true, true,
  '9:30〜17:00（サンプル）',
  'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=大阪市港区'
),
(
  'サンプル農園 大阪04（いちご狩り）',
  '季節のフルーツ狩りが楽しめる農園。収穫体験や動物ふれあいコーナーも人気。',
  '大阪府', '河内長野市', '大阪府河内長野市XX-XX（サンプル）',
  34.4576, 135.5625,
  'outdoor', ARRAY['0-2','3-5','6-12'], 'paid', '大人1,500円〜（サンプル）',
  true, true, false, false,
  '9:00〜16:00（サンプル・季節営業）',
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=河内長野市'
),
(
  'サンプルプール 大阪05（屋内温水）',
  '年中利用できる屋内温水プール。キッズゾーンや浅いプールもあり赤ちゃんも安心。',
  '大阪府', '豊中市', '大阪府豊中市XX-XX（サンプル）',
  34.7817, 135.4699,
  'indoor', ARRAY['0-2','3-5','6-12'], 'paid', '大人400円、子ども100円（サンプル）',
  true, true, true, true,
  '9:00〜21:00（サンプル）',
  'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=豊中市'
),

-- 兵庫県 5件
(
  'サンプル遊び場 兵庫01（キッズランド）',
  '神戸港を望む複合施設内の屋内遊び場。乗り物系アトラクションが人気。',
  '兵庫県', '神戸市中央区', '兵庫県神戸市中央区XX-XX-XX（サンプル）',
  34.6951, 135.1956,
  'indoor', ARRAY['0-2','3-5','6-12'], 'paid', '大人無料、子ども700円（サンプル）',
  true, true, true, true,
  '10:00〜18:00（サンプル）',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=神戸市中央区'
),
(
  'サンプル牧場 兵庫02',
  '広大な敷地の牧場。乳搾り体験や動物ふれあい、バーベキューも楽しめます。',
  '兵庫県', '三田市', '兵庫県三田市XX-XX（サンプル）',
  34.8933, 135.2224,
  'outdoor', ARRAY['0-2','3-5','6-12'], 'paid', '入場料大人600円（サンプル）',
  true, true, true, false,
  '9:30〜17:00（サンプル）',
  'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=三田市'
),
(
  'サンプル公園 兵庫03（海浜公園）',
  '海岸沿いに広がる公園。砂遊び・水遊びができ、夏は特に人気。',
  '兵庫県', '明石市', '兵庫県明石市XX-XX（サンプル）',
  34.6455, 134.9980,
  'outdoor', ARRAY['3-5','6-12'], 'free', null,
  true, false, false, false,
  '常時開放（サンプル）',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=明石市'
),
(
  'サンプル屋内遊園地 兵庫04',
  'ショッピングモール内のキッズゾーン。悪天候でも楽しめる小さな乗り物と遊具が揃う。',
  '兵庫県', '姫路市', '兵庫県姫路市XX-XX-XX（サンプル）',
  34.8394, 134.6939,
  'indoor', ARRAY['0-2','3-5'], 'paid', '100円〜500円（乗り物ごと）（サンプル）',
  true, true, true, true,
  '10:00〜20:00（サンプル）',
  'https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=姫路市'
),
(
  'サンプル自然体験 兵庫05',
  '里山の自然の中での体験学習施設。木工や野菜収穫、ハイキングが楽しめます。',
  '兵庫県', '丹波篠山市', '兵庫県丹波篠山市XX-XX（サンプル）',
  35.0779, 135.2191,
  'both', ARRAY['3-5','6-12'], 'paid', '体験メニューにより異なる（サンプル）',
  true, true, false, false,
  '9:00〜17:00（サンプル）',
  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=丹波篠山市'
),

-- 京都府 5件
(
  'サンプル公園 京都01（梅小路型）',
  '広い芝生と大型遊具が特徴の都市公園。蒸気機関車展示スペースも子どもに人気。',
  '京都府', '京都市下京区', '京都府京都市下京区XX-XX（サンプル）',
  34.9897, 135.7473,
  'outdoor', ARRAY['0-2','3-5','6-12'], 'free', null,
  true, true, true, false,
  '常時開放（サンプル）',
  'https://images.unsplash.com/photo-1588392382834-a891154bca4d?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=京都市下京区'
),
(
  'サンプル動物園 京都02',
  '市内にある動物園。子ども向けふれあいコーナーや遊具広場も充実。',
  '京都府', '京都市左京区', '京都府京都市左京区XX-XX-XX（サンプル）',
  35.0127, 135.7753,
  'both', ARRAY['0-2','3-5','6-12'], 'paid', '大人600円、子ども無料（サンプル）',
  true, true, true, true,
  '9:00〜17:00（火曜休）（サンプル）',
  'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=京都市左京区'
),
(
  'サンプル子ども館 京都03',
  '0〜12歳向けの室内遊び場。ままごとコーナーや積み木ゾーン、読み聞かせコーナーあり。',
  '京都府', '京都市伏見区', '京都府京都市伏見区XX-XX（サンプル）',
  34.9317, 135.7546,
  'indoor', ARRAY['0-2','3-5'], 'free', null,
  false, true, true, true,
  '9:30〜17:00（月曜休）（サンプル）',
  'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=京都市伏見区'
),
(
  'サンプル川遊び 京都04',
  '清流沿いの河原で水遊びが楽しめる。夏の人気スポット。',
  '京都府', '南丹市', '京都府南丹市XX-XX（サンプル）',
  35.1098, 135.4562,
  'outdoor', ARRAY['3-5','6-12'], 'free', null,
  true, false, false, false,
  '常時開放（サンプル・夏季）',
  'https://images.unsplash.com/photo-1472745433479-4556f22e32c2?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=南丹市'
),
(
  'サンプル体験農場 京都05',
  '農業体験ができる施設。野菜の収穫体験やお米づくりを通して食育を学べます。',
  '京都府', '亀岡市', '京都府亀岡市XX-XX（サンプル）',
  35.0088, 135.5785,
  'outdoor', ARRAY['3-5','6-12'], 'paid', '体験メニューにより異なる（サンプル）',
  true, false, false, false,
  '9:00〜16:00（サンプル・要予約）',
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=亀岡市'
),

-- 奈良県 5件
(
  'サンプル公園 奈良01（鹿と触れ合い）',
  '世界遺産の公園で鹿と触れ合える。広い芝生でのびのびと遊べます。',
  '奈良県', '奈良市', '奈良県奈良市XX-XX（サンプル）',
  34.6832, 135.8399,
  'outdoor', ARRAY['0-2','3-5','6-12'], 'free', null,
  true, true, false, false,
  '常時開放（サンプル）',
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=奈良市'
),
(
  'サンプルキャンプ場 奈良02',
  '自然の中でのキャンプ・BBQ体験。デイキャンプも可能で子ども連れに人気。',
  '奈良県', '吉野郡天川村', '奈良県吉野郡天川村XX-XX（サンプル）',
  34.2609, 135.9070,
  'outdoor', ARRAY['3-5','6-12'], 'paid', 'サイト利用料2,000円〜（サンプル）',
  true, false, false, false,
  '通年（要予約）（サンプル）',
  'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=天川村'
),
(
  'サンプル室内広場 奈良03',
  '雨の日も安心の室内遊び広場。乳幼児から小学生まで遊べるゾーン分けあり。',
  '奈良県', '橿原市', '奈良県橿原市XX-XX-XX（サンプル）',
  34.5028, 135.7954,
  'indoor', ARRAY['0-2','3-5','6-12'], 'free', null,
  true, true, true, true,
  '9:00〜17:00（サンプル）',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=橿原市'
),
(
  'サンプルわんぱく広場 奈良04',
  '広大な敷地の自然公園。ターザンロープや砦型遊具が人気の冒険広場。',
  '奈良県', '大和郡山市', '奈良県大和郡山市XX-XX（サンプル）',
  34.6455, 135.7895,
  'outdoor', ARRAY['3-5','6-12'], 'free', null,
  true, false, true, false,
  '常時開放（サンプル）',
  'https://images.unsplash.com/photo-1544487519-b3d3c0a7c597?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=大和郡山市'
),
(
  'サンプル文化施設 奈良05（体験型）',
  '奈良の歴史・文化を体験しながら学べる施設。勾玉づくりや写経など子どもでも楽しめる体験あり。',
  '奈良県', '桜井市', '奈良県桜井市XX-XX-XX（サンプル）',
  34.5104, 135.8462,
  'indoor', ARRAY['6-12'], 'paid', '体験内容により異なる（サンプル）',
  true, true, false, true,
  '9:00〜17:00（月曜休）（サンプル）',
  'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=桜井市'
),

-- 滋賀県 5件
(
  'サンプル湖岸公園 滋賀01',
  '琵琶湖湖岸に広がる公園。芝生広場や水遊び場があり家族連れに大人気。',
  '滋賀県', '守山市', '滋賀県守山市XX-XX（サンプル）',
  35.0428, 135.9830,
  'outdoor', ARRAY['0-2','3-5','6-12'], 'free', null,
  true, true, true, false,
  '常時開放（サンプル）',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=守山市'
),
(
  'サンプル科学館 滋賀02',
  '科学と環境をテーマにした体験型施設。プラネタリウムや実験ショーが充実。',
  '滋賀県', '草津市', '滋賀県草津市XX-XX-XX（サンプル）',
  35.0175, 135.9587,
  'indoor', ARRAY['3-5','6-12'], 'paid', '大人700円、子ども350円（サンプル）',
  true, true, true, true,
  '9:30〜17:30（月曜休）（サンプル）',
  'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=草津市'
),
(
  'サンプル公園 滋賀03（大型遊具）',
  '滋賀最大級の大型複合遊具がある公園。子どもたちが何時間でも遊べます。',
  '滋賀県', '大津市', '滋賀県大津市XX-XX（サンプル）',
  35.0116, 135.8686,
  'outdoor', ARRAY['3-5','6-12'], 'free', null,
  true, false, false, false,
  '常時開放（サンプル）',
  'https://images.unsplash.com/photo-1544487519-b3d3c0a7c597?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=大津市'
),
(
  'サンプルこども農園 滋賀04',
  '農業体験と収穫の喜びが体感できる農園。田植え・稲刈りのイベントも開催。',
  '滋賀県', '東近江市', '滋賀県東近江市XX-XX（サンプル）',
  35.1148, 136.1945,
  'outdoor', ARRAY['3-5','6-12'], 'paid', '体験料1,000円〜（サンプル）',
  true, false, false, false,
  '9:00〜17:00（要予約）（サンプル）',
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=東近江市'
),
(
  'サンプル室内遊び場 滋賀05',
  'ショッピングモール内キッズゾーン。授乳室・おむつ替えスペースが充実で赤ちゃん連れも安心。',
  '滋賀県', '彦根市', '滋賀県彦根市XX-XX-XX（サンプル）',
  35.2762, 136.2611,
  'indoor', ARRAY['0-2','3-5'], 'paid', '60分500円〜（サンプル）',
  true, true, true, true,
  '10:00〜20:00（サンプル）',
  'https://images.unsplash.com/photo-1575783970733-1aaedde1db74?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=彦根市'
),

-- 和歌山県 5件
(
  'サンプル水族館 和歌山01',
  '黒潮の生き物に出会える水族館。イルカショーや大型水槽が子どもに大人気。',
  '和歌山県', '白浜町', '和歌山県西牟婁郡白浜町XX-XX（サンプル）',
  33.6840, 135.3601,
  'indoor', ARRAY['0-2','3-5','6-12'], 'paid', '大人2,000円、子ども1,000円（サンプル）',
  true, true, true, true,
  '9:00〜17:00（サンプル）',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=白浜町'
),
(
  'サンプルビーチ 和歌山02',
  '遠浅の砂浜ビーチ。夏には海水浴客で賑わう。シャワーや更衣室完備。',
  '和歌山県', '和歌山市', '和歌山県和歌山市XX-XX（サンプル）',
  34.2304, 135.1709,
  'outdoor', ARRAY['3-5','6-12'], 'free', '駐車場有料（サンプル）',
  true, true, true, false,
  '常時開放（海水浴シーズン）（サンプル）',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=和歌山市'
),
(
  'サンプル冒険の国 和歌山03',
  '山の中の自然体験施設。ツリーハウスやジップラインなど冒険心をくすぐるアクティビティ。',
  '和歌山県', '田辺市', '和歌山県田辺市XX-XX（サンプル）',
  33.7323, 135.3737,
  'outdoor', ARRAY['6-12'], 'paid', '1日パス大人2,500円、子ども1,500円（サンプル）',
  true, false, false, false,
  '9:00〜17:00（サンプル）',
  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=田辺市'
),
(
  'サンプルフルーツ狩り 和歌山04',
  '和歌山名産のみかん・梅など季節の果物狩りが楽しめる農園。直売所も充実。',
  '和歌山県', '有田市', '和歌山県有田市XX-XX（サンプル）',
  34.0614, 135.1458,
  'outdoor', ARRAY['0-2','3-5','6-12'], 'paid', '500円〜（サンプル・時期により変動）',
  true, false, false, false,
  '9:00〜16:00（サンプル・季節営業）',
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=有田市'
),
(
  'サンプル公園 和歌山05（芝生広場）',
  '広大な芝生広場とスポーツ施設が揃う公園。ピクニックや凧揚げが楽しめます。',
  '和歌山県', '橋本市', '和歌山県橋本市XX-XX（サンプル）',
  34.3109, 135.6071,
  'outdoor', ARRAY['0-2','3-5','6-12'], 'free', null,
  true, true, true, false,
  '常時開放（サンプル）',
  'https://images.unsplash.com/photo-1588392382834-a891154bca4d?w=800&h=600&fit=crop',
  'https://maps.google.com/?q=橋本市'
);

-- Sample reviews
insert into reviews (place_id, rating, comment, user_name)
select id, 5, '子どもが大喜びでした！また来たいです。', 'ママA'
from places where name like '%大阪01%';

insert into reviews (place_id, rating, comment, user_name)
select id, 4, '広くて清潔。授乳室もあって助かりました。', 'パパB'
from places where name like '%大阪01%';

insert into reviews (place_id, rating, comment, user_name)
select id, 5, '雨の日でも思いっきり遊べて最高でした。', 'ママC'
from places where name like '%兵庫01%';

insert into reviews (place_id, rating, comment, user_name)
select id, 4, '鹿と触れ合えて子どもが感動していました。', 'パパD'
from places where name like '%奈良01%';
