-- ============================================================
-- 統合済み施設の転送マップを anon から読めるようにする
-- ============================================================
--
-- places の RLS は is_published = true のみ select 可のため、
-- archived 行の merged_into_place_id は anon から読めない。
-- 転送に必要な2列だけを定義者権限のビューで公開する
-- (security_invoker を付けない = RLSを通らない。列を絞っているので安全)。

drop view if exists public.place_redirects;

create view public.place_redirects as
select id, merged_into_place_id
from public.places
where publication_status = 'archived'
  and merged_into_place_id is not null;

grant select on public.place_redirects to anon, authenticated;
