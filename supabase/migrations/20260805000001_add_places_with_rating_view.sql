-- Aggregate ratings in the database instead of fanning out reviews(rating)
-- rows to the app on every list query.
-- security_invoker keeps the caller's RLS (anon sees published places only).

create or replace view public.places_with_rating
with (security_invoker = true) as
select
  p.*,
  avg(r.rating)::numeric(3, 2) as avg_rating,
  count(r.id)::int as review_count
from public.places p
left join public.reviews r on r.place_id = p.id
group by p.id;

grant select on public.places_with_rating to anon, authenticated;
