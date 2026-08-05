# きょうどこいこ？

「関西遊びマップ」の既存スポットデータを活かし、現在地・天気・同行者・気分・予算から、今日行きやすい候補を3件に絞って提案するNext.jsアプリです。

## 主な機能

- `/` — 気分と簡易条件から提案を始めるホーム
- `/today` — 同行者、予算、移動時間、滞在時間、屋内外、設備などをタップで指定
- `/recommend` — 王道・穴場・冒険の3案、推薦理由、比較、再提案
- `/map` — Leaflet + OpenStreetMapによる地図、条件フィルター、カード連動、経路リンク
- `/places/[id]` — 実データの写真・設備・料金・営業時間・地図・口コミ・共有
- `/favorites`, `/history`, `/mypage` — ゲスト状態でも使える端末内の保存・記録
- `/vote/[id]` — 候補共有と匿名投票。Supabase Realtime Broadcastとポーリングを併用
- `/admin` — 既存スポット項目に加えて、推薦タグ、スコア、季節、天気、設備を編集
- OGP、canonical、JSON-LD、`sitemap.xml`、`robots.txt`、Web App Manifest

既存の `/places` と `/places/[id]` は維持しています。新しい `/spots` は一覧の互換入口で、`/spots/[id]` は既存詳細URLへ恒久リダイレクトします。

## 技術構成

- Next.js 16.2 / React 19 / TypeScript / Tailwind CSS 4
- Supabase Database, Storage, Realtime Broadcast
- Leaflet 1.9 / OpenStreetMap
- Open-Meteo（天気。取得失敗時は推測せずフォールバック表示）
- Lucide React

推薦ロジックは [`lib/recommendation-engine.ts`](./lib/recommendation-engine.ts) に副作用のないルールベース関数として分離しています。WebとiPhoneアプリで同じ条件・重みを共有しやすい構造です。

## セットアップ

Node.js 20以降を推奨します。

```bash
npm install
```

`.env.local` に以下を設定します。

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD
ADMIN_TOKEN=YOUR_RANDOM_SESSION_TOKEN
```

`SUPABASE_SERVICE_ROLE_KEY` は投票API、分析イベント、データ移行スクリプトなどサーバー専用です。クライアントへ公開しないでください。

開発サーバー:

```bash
npm run dev
```

本番ビルド確認:

```bash
npm run build
npm run start
```

## データベース変更

新規変更は [`supabase/migrations/20260718015926_add_recommendation_schema.sql`](./supabase/migrations/20260718015926_add_recommendation_schema.sql) に集約しています。既存 `places` と既存URLを維持した追加型のmigrationです。

追加内容:

- `places` の推薦タグ、天気・季節・時間帯、滞在時間、スコア、料金幅、設備、確認日時
- `recommendation_logs`
- `outing_history`, `outing_photos`
- `family_members`, `user_preferences`
- `share_groups`, `share_group_spots`, `votes`
- `weather_cache`
- RLS、権限、検索・所有者向けインデックス、`updated_at`トリガー

Supabase CLIを利用できる環境では、プロジェクトをリンクしてから適用します。

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

CLIを使わない場合は、Supabase DashboardのSQL Editorでmigrationを内容確認後に実行してください。本番では先にバックアップを取得し、ステージングで確認してください。

既存DBに新カラムが未適用でも、公開画面は [`lib/places.ts`](./lib/places.ts) で不足値を安全に正規化します。ただし投票、分析保存、共有履歴などの新テーブル機能にはmigration適用が必要です。

## 推薦ロジック

推薦はAIの推測ではなく、次の実データと入力条件を点数化します。

- 現在地からの概算距離と移動時間
- 同行者、気分、屋内外、雨の日、予算、年齢、滞在時間、設備
- 天気APIの値
- 管理画面で確認済みの推薦タグとスコア
- 口コミ数・評価は「王道」、少ない口コミや静かさは「穴場」の補助信号

営業時間や混雑など未確認情報は「営業中」と断定せず「要確認」と表示します。

## ゲスト保存とiPhone共有

現在のWebは既存認証仕様を壊さないため、お気に入りと簡易おでかけ履歴を `localStorage` に保存します。migrationでは `auth.users` を所有者とする `outing_history`, `family_members`, `user_preferences` を用意しており、iPhone側で同じSupabase Authを使えば同期機能へ拡張できます。

匿名投票は公開トークンを持つサーバーAPIだけがサービスロールで書き込みます。DBへの匿名直接書き込みはRLSで許可していません。

## 運用上の注意

- 写真は `places.image_url` を最優先し、取得不能な場合は関連性を確認したWikipedia代表画像とWikimedia Commonsの自由ライセンス写真をオンデマンド補完します。
- Wikimedia由来の詳細ギャラリーには撮影者・ライセンス・元ファイルへのリンクを表示します。関連する公開写真が見つからない場所では、実在写真を捏造せずブランドの地図画像を表示します。
- 外部情報は1週間キャッシュします。公開APIが一時的に利用できない場合でも、既存データとフォールバック画像で画面は表示されます。
- OpenStreetMapタイルの帰属表示は削除しないでください。
- 天気はOpen-Meteoから取得します。取得できない場合は推測値を表示しません。
- 管理画面は既存の環境変数ベース認証を維持しています。公開運用ではSupabase Authなどへの置換を推奨します。
- 依存関係インストール時点でnpm auditは11件（low 1 / moderate 6 / high 4）を報告しました。破壊的更新を避けるため自動修正は実行していません。

## 検証

```bash
npm run build
```

最終の画面比較と確認結果は [`design-qa.md`](./design-qa.md) に記録します。
