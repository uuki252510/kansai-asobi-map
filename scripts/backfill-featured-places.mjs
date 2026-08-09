/**
 * 誰もが知る定番スポットに is_featured (編集部おすすめ) を立てる。
 * ホームの「使える時間から選ぶ」等で、無名施設より定番を先に出すための旗。
 * レビュー数がまだ無いサイト初期の人気順の代わり。
 *
 * Dry run: node scripts/backfill-featured-places.mjs
 * Apply:   node scripts/backfill-featured-places.mjs --apply
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

// 完全一致ではなく includes で照合する (表記ゆれ対策)。合併参照行は除外
const FEATURED = [
  "ユニバーサル・スタジオ・ジャパン",
  "ネスタリゾート神戸",
  "ニジゲンノモリ（淡路島）",
  "ひらかたパーク",
  "スパワールド",
  "アドベンチャーワールド",
  "海遊館",
  "キッザニア甲子園",
  "京都水族館",
  "神戸どうぶつ王国",
  "奈良公園",
  "天王寺動物園",
  "東映太秦映画村",
  "東条湖おもちゃ王国",
  "琵琶湖博物館",
  "京都鉄道博物館",
  "神戸須磨シーワールド",
  "王子動物園",
]

const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("places")
    .select("id,name,is_featured")
    .eq("is_published", true)
    .range(from, from + 999)
  if (error) throw new Error(error.message)
  rows.push(...(data ?? []))
  if (!data || data.length < 1000) break
}

const targets = rows.filter(
  (place) =>
    !place.is_featured &&
    !place.name.includes("→") &&
    !place.name.includes("付近") &&
    !place.name.includes("猿沢池") &&
    FEATURED.some((pattern) => place.name.includes(pattern)),
)
console.log(`対象 ${targets.length} 件 (apply=${apply})`)
for (const t of targets) console.log("  " + t.name)

if (!apply) { console.log("\n(確認モード) --apply で書き込みます"); process.exit(0) }

let done = 0
for (const t of targets) {
  const { error } = await supabase.from("places").update({ is_featured: true }).eq("id", t.id)
  if (error) { console.error(`FAIL ${t.name}: ${error.message}`); continue }
  done += 1
}
console.log(`\n${done} 件に is_featured を設定しました`)
