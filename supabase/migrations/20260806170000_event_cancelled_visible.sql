-- ============================================================
-- 中止になったイベントを公開側から読めるようにする
-- ============================================================
--
-- 花火大会は荒天中止が普通に起きる。中止時にページごと消す (404) と、
-- 行く予定だった人に「中止になった」ことを伝えられない。
-- cancelled は詳細ページで「中止」と明示して表示し続ける
-- (一覧には出さない。それはアプリ側のクエリで制御する)。

drop policy if exists "public read published events" on public.events;
create policy "public read published events" on public.events for select
  using (status in ('published', 'cancelled'));
