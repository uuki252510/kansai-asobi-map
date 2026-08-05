-- ============================================================
-- イベントの拡張: 夏祭り・花火大会・商業施設のイベントを
-- 施設に属さない単独イベントとしても扱えるようにする
-- ============================================================

alter table public.events
  add column if not exists event_category text check (event_category is null or event_category in (
    'festival',      -- 夏祭り・盆踊り
    'fireworks',     -- 花火大会
    'market',        -- マルシェ・縁日・フリマ
    'workshop',      -- 体験・ワークショップ
    'sale',          -- セール・キャンペーン
    'seasonal',      -- 季節の催し (イルミネーション等)
    'exhibition',    -- 展示・企画展
    'stage',         -- ステージ・ショー
    'sports',        -- スポーツ・大会
    'other'
  )),
  add column if not exists prefecture text,
  add column if not exists city text,
  add column if not exists cover_storage_path text,
  add column if not exists cover_external_url text,
  add column if not exists is_free boolean not null default false,
  add column if not exists is_featured boolean not null default false,
  add column if not exists access_note text,
  add column if not exists rain_policy text;

create index if not exists events_category_idx on public.events (event_category) where status = 'published';
create index if not exists events_prefecture_idx on public.events (prefecture) where status = 'published';

-- slug は既に unique 制約付き。公開ページ用に必須化はせず、
-- 無い場合はアプリ側で id にフォールバックする。
