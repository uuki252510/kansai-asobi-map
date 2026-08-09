/**
 * データ監査 (2026-08 Google Places 全件照合) の後始末。
 *
 * 写真なし公開施設のうち、実在確認できた7件 (KEEP_NAMES) 以外を
 * 非公開化する。名前が捏造・別施設・重複だったもの (照合ログは
 * scripts/find-and-import-photos.mjs の dry run)。物理削除はしない。
 *
 * 指していた実在スポットが特定できたものは merged_into_place_id で
 * 正しい行へリダイレクトする (place_redirects ビュー経由で 308)。
 *
 * Dry run: node scripts/cleanup-unverified-places.mjs
 * Apply:   node scripts/cleanup-unverified-places.mjs --apply
 */

import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"

const env = {}
for (const line of readFileSync("./.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "")
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const apply = process.argv.includes("--apply")

/** Google照合で名前+住所が一致した実在施設 (写真が無いだけ)。残す */
const KEEP_NAMES = new Set([
  "奈良市子育て支援センター あすなろ",
  "橿原市子育て支援センター",
  "大和郡山市子育て支援センター",
  "神戸市立東灘区子育て支援センター",
  "大阪市立鶴見区子育て支援センター",
  "神戸市立垂水区子育て支援センター",
  "吹田市立千里山図書館 こどもコーナー",
])

/** 旧 (捏造名) → 実在スポット名。非公開化と同時にリダイレクトを張る */
const REDIRECTS = {
  "明日香村飛鳥歴史公園": "国営飛鳥歴史公園",
  "白髭神社 琵琶湖の鳥居（フォトスポット）": "白鬚神社",
  "城崎温泉 円山川公苑（子連れ旅行）": "兵庫県立円山川公苑",
  "甲子園球場 ライトスタンド見学（子連れ野球観戦）": "阪神甲子園球場",
  "大阪市立なみはやドーム（八尾市）": "東和薬品RACTABドーム（大阪府立門真スポーツセンター）",
  "勝浦の海 那智勝浦 砂浜": "那智海水浴場（ブルービーチ那智）",
  "草津市立プール（クレフィール湖東）": "インフロニア草津アクアティクスセンター",
  "奈良市立鴻ノ池陸上競技場 温水プール": "ロート奈良鴻ノ池パーク（奈良市鴻ノ池運動公園）",
  "SENNAN LONG PARK": "泉南りんくう公園",
  "南紀白浜アドベンチャーワールド付近 海水浴場": "白浜海水浴場（白良浜）",
  "チキンラーメンファクトリー（カップヌードルミュージアム内）": "カップヌードルミュージアム 大阪池田",
  "鶴見緑地公園 冒険の丘": "花博記念公園鶴見緑地",
  "鶴見緑地公園 花の万博跡地": "花博記念公園鶴見緑地",
}

// 対象: 公開中・写真なし (Storage も URL も無い)・KEEP 以外
const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("places")
    .select("id,name")
    .eq("is_published", true)
    .is("image_storage_path", null)
    .is("image_url", null)
    .range(from, from + 999)
  if (error) throw new Error(error.message)
  rows.push(...(data ?? []))
  if (!data || data.length < 1000) break
}
const targets = rows.filter((place) => !KEEP_NAMES.has(place.name))
console.log(`写真なし公開 ${rows.length} 件 / 非公開化対象 ${targets.length} 件 / 残す ${rows.length - targets.length} 件 (apply=${apply})`)

// リダイレクト先の解決 (公開中の行を選ぶ)
const redirectTargets = new Map()
for (const targetName of new Set(Object.values(REDIRECTS))) {
  const { data, error } = await supabase
    .from("places")
    .select("id,name")
    .eq("name", targetName)
    .eq("is_published", true)
    .limit(1)
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    console.error(`中止: リダイレクト先が見つかりません: ${targetName}`)
    process.exit(1)
  }
  redirectTargets.set(targetName, data[0].id)
}

let redirectCount = 0
for (const place of targets) {
  const to = REDIRECTS[place.name]
  if (to) { redirectCount += 1; console.log(`  redirect: ${place.name} → ${to}`) }
}
console.log(`リダイレクト設定 ${redirectCount} 件`)

if (!apply) { console.log("\n(確認モード) --apply で実行します"); process.exit(0) }

let archived = 0
for (const place of targets) {
  const patch = { is_published: false, publication_status: "archived" }
  const to = REDIRECTS[place.name]
  if (to) patch.merged_into_place_id = redirectTargets.get(to)
  const { error } = await supabase.from("places").update(patch).eq("id", place.id)
  if (error) { console.error(`FAIL ${place.name}: ${error.message}`); continue }
  archived += 1
}
console.log(`\n${archived} 件を非公開化しました (物理削除なし)`)
