-- ============================================================
-- 重複統合した施設の転送先を記録する
-- ============================================================
--
-- 2026-08-06 の重複整理で 224件を archived にしたが、統合先を
-- 記録していなかったため旧URL (/places/<archived-id>) が404になっている。
-- 被リンク・ブックマーク・検索インデックスを統合先へ301で引き継ぐ。

alter table public.places
  add column if not exists merged_into_place_id uuid references public.places(id) on delete set null;

comment on column public.places.merged_into_place_id is
  '重複統合で非公開化した場合の統合先。詳細ページはここへ301する';

create index if not exists places_merged_into_idx
  on public.places (merged_into_place_id) where merged_into_place_id is not null;
