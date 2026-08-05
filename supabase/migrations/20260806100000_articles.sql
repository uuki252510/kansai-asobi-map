-- ============================================================
-- 記事 (特集・季節のおでかけ情報・ハウツー)
-- 施設DBとひも付け、記事から施設へ・施設から記事へ回遊させる
-- ============================================================

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text,
  cover_storage_path text,
  cover_external_url text,
  article_type text not null default 'feature' check (article_type in
    ('feature', 'seasonal', 'howto', 'ranking', 'news', 'interview')),
  season text check (season is null or season in ('spring', 'summer', 'autumn', 'winter')),
  prefecture text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_featured boolean not null default false,
  published_at timestamptz,
  expires_at timestamptz,
  author_name text,
  seo_title text,
  seo_description text,
  noindex boolean not null default false,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_published_idx
  on public.articles (published_at desc) where status = 'published';
create index if not exists articles_type_idx on public.articles (article_type);

-- 記事 ⇄ 施設
create table if not exists public.article_places (
  article_id uuid not null references public.articles(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  sort_order int not null default 100,
  note text,
  primary key (article_id, place_id)
);
create index if not exists article_places_place_idx on public.article_places (place_id);

alter table public.articles enable row level security;
alter table public.article_places enable row level security;

-- 公開記事のみ read。期限切れは除外
create policy "public read published articles" on public.articles for select
  using (status = 'published' and (expires_at is null or expires_at > now()));

create policy "public read article places" on public.article_places for select
  using (exists (
    select 1 from public.articles a
    where a.id = article_id and a.status = 'published'
      and (a.expires_at is null or a.expires_at > now())
  ));
