-- places_with_rating は p.* をビュー作成時点の列で固定してしまうため、
-- places に後から追加された列 (average_stay_minutes 等) が見えない。
-- 列が増えたら作り直す必要がある。ビューは実データを持たないので安全。

drop view if exists public.places_with_rating;

create view public.places_with_rating
with (security_invoker = true) as
select
  p.*,
  avg(r.rating)::numeric(3, 2) as avg_rating,
  count(r.id)::int as review_count
from public.places p
left join public.reviews r on r.place_id = p.id
group by p.id;

grant select on public.places_with_rating to anon, authenticated;
