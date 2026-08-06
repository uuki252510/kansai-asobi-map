-- ============================================================
-- イベントの「見出しになる数字」を構造化して持つ
-- ============================================================
--
-- 花火大会の打ち上げ数、夏祭りの出店数のような、そのイベントを
-- 一目で表す値。写真が用意できないイベントのカバーで主役にする。
-- 出典の表記をそのまま入れられるよう text にする
-- (「約1万2000発」「8シリーズ」のように数値化できない書き方があるため)。

alter table public.events
  add column if not exists highlight_label text,
  add column if not exists highlight_value text;

comment on column public.events.highlight_label is '数字の意味 (例: 打ち上げ数)';
comment on column public.events.highlight_value is '出典の表記のまま (例: 約1万2000発)';
