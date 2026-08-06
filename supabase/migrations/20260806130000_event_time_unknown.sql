-- ============================================================
-- 開始時刻が未確認のイベントを、時刻を捏造せずに掲載できるようにする
-- ============================================================
--
-- 花火大会や夏祭りは日程だけ先に発表され、開始時刻が後から出ることが多い。
-- start_at は not null なので、時刻不明のときは 00:00 を入れるしかないが、
-- そのまま表示すると「0:00開始」という誤情報になる。
-- このフラグが立っているイベントは、日付だけを出して時刻は出さない。

alter table public.events
  add column if not exists start_time_unknown boolean not null default false;

comment on column public.events.start_time_unknown is
  '開始時刻が未確認。true のとき画面は日付のみ表示し、時刻は出さない';
