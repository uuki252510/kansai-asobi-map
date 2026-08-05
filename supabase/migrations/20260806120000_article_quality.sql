-- ============================================================
-- 記事の実用化: タグ・更新日の明示・本文内スポット参照
-- ============================================================

-- 記事タグ (施設と同じ tags 語彙を共有する: 雨の日OK / 夏休み など)
create table if not exists public.article_tags (
  article_id uuid not null references public.articles(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (article_id, tag_id)
);
create index if not exists article_tags_tag_idx on public.article_tags (tag_id);

alter table public.articles
  -- 一覧で「更新しました」を出すため、本文更新日を明示的に持つ
  add column if not exists content_updated_at timestamptz,
  -- 読了目安(分)。null なら本文から自動算出する
  add column if not exists reading_minutes int check (reading_minutes is null or reading_minutes > 0);

alter table public.article_tags enable row level security;

create policy "public read article tags" on public.article_tags for select
  using (exists (
    select 1 from public.articles a
    where a.id = article_id and a.status = 'published'
      and (a.expires_at is null or a.expires_at > now())
  ));
