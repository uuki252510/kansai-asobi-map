/**
 * 有名スポットの滞在時間 (average_stay_minutes) を編集部目安でバックフィルする。
 *
 * ホームの「使える時間から選ぶ」は average_stay_minutes で3列に振り分けるが、
 * 全施設 null のためフォールバック表示になっていた (USJ が60-90分に出る等)。
 * 確信を持って言える定番スポットだけに目安を入れ、不明な施設は null のまま
 * 触らない (サイトの原則: 不明な情報は推測しない)。
 *
 * Dry run: node scripts/backfill-stay-minutes.mjs
 * Apply:   node scripts/backfill-stay-minutes.mjs --apply
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

// パターンは前から順に評価し、最初に当たった値を使う (具体的なものを先に)
const CURATED = [
  // 一日じっくり (>240分)
  ["ユニバーサル・スタジオ・ジャパン", 540],
  ["ネスタリゾート神戸 アスレチック", 360],
  ["ネスタリゾート神戸", 480],
  ["ニジゲンノモリ", 360],
  ["ひらかたパーク", 420],
  ["アドベンチャーワールド", 420],
  ["東条湖おもちゃ王国", 360],
  ["姫路セントラルパーク", 360],
  ["スパワールド", 300],
  ["キッザニア甲子園", 300],
  ["鈴鹿", null], // 関西外の誤登録があっても触らない
  // 半日でちょうど (91-240分)
  ["海遊館", 180],
  ["京都水族館", 150],
  ["神戸どうぶつ王国", 180],
  ["天王寺動物園", 180],
  ["奈良公園のシカ", 120],
  ["猿沢池", 60],
  ["奈良公園", 180],
  ["琵琶湖博物館", 150],
  ["京都鉄道博物館", 180],
  ["東映太秦映画村", 240],
  ["万博記念公園 自然文化園", 180],
  ["レゴランド・ディスカバリー・センター大阪", 150],
  ["アンパンマンこどもミュージアム", 180],
  ["王子動物園", 180],
  ["京都市動物園", 150],
  ["須磨シーワールド", 180],
  ["神戸どうぶつ王国", 180],
  ["ボウケンノモリ", 150],
  ["六甲山アスレチックパーク", 240],
  ["生駒山上遊園地", 240],
  ["みさき公園", 240],
  ["和歌山城", 120],
  ["白浜エネルギーランド", 180],
  ["とれとれ市場", 120],
  ["伊丹スカイパーク", 120],
  ["大阪市立科学館", 150],
  ["大阪歴史博物館", 120],
  ["兵庫県立人と自然の博物館", 150],
  ["奈良国立博物館", 120],
  // 近場でさくっと (≤90分)
  ["通天閣", 60],
  ["大阪城天守閣", 90],
  ["梅田スカイビル", 60],
  ["空中庭園", 60],
  ["京都タワー", 60],
  ["神戸ポートタワー", 60],
  ["明石市立天文科学館", 90],
  ["あべのハルカス", 60],
  ["東大寺", 90],
  ["清水寺", 90],
  ["伏見稲荷大社", 90],
]

const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("places")
    .select("id,name,average_stay_minutes")
    .eq("is_published", true)
    .range(from, from + 999)
  if (error) throw new Error(error.message)
  rows.push(...(data ?? []))
  if (!data || data.length < 1000) break
}

const updates = []
for (const place of rows) {
  if (place.average_stay_minutes !== null) continue
  // 合併参照行 (「→◯◯参照」) と「◯◯付近」の別施設は対象外
  if (place.name.includes("→") || place.name.includes("付近")) continue
  const hit = CURATED.find(([pattern]) => place.name.includes(pattern))
  if (!hit || hit[1] === null) continue
  updates.push({ id: place.id, name: place.name, minutes: hit[1] })
}

console.log(`公開 ${rows.length} 件中、設定対象 ${updates.length} 件 (apply=${apply})`)
for (const u of updates) console.log(`  ${u.minutes}分\t${u.name}`)

if (!apply) { console.log("\n(確認モード) --apply で書き込みます"); process.exit(0) }

let done = 0
for (const u of updates) {
  const { error } = await supabase.from("places").update({ average_stay_minutes: u.minutes }).eq("id", u.id)
  if (error) { console.error(`FAIL ${u.name}: ${error.message}`); continue }
  done += 1
}
console.log(`\n${done} 件を更新しました`)
