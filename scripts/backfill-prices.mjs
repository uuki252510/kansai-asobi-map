/**
 * 料金の構造化。既にあるデータから確定できる分だけを埋める。
 *
 * 1. price_type = 'free'  → price_min / price_max を 0 にする（無料は事実として確定）
 * 2. 説明文に明示された金額 → price_min にその最小額を入れる
 *
 * 有料でも金額の記載がない施設は NULL のままにする。
 * 相場や類似施設からの推定はしない（詳細ページは「料金を確認」と出し、
 * 公式サイトへ誘導する）。
 *
 * Dry run: node scripts/backfill-prices.mjs
 * Apply:   node scripts/backfill-prices.mjs --apply
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

const toHalfWidth = (value) =>
  value.replace(/[０-９，]/g, (c) => (c === "，" ? "," : String.fromCharCode(c.charCodeAt(0) - 0xfee0)))

/**
 * 「大人1,800円」のような明示された金額だけを拾う。
 * 「約」「〜程度」のような曖昧な表現や、円以外の数字は対象外。
 */
function extractAmounts(text) {
  if (!text) return []
  const normalized = toHalfWidth(text)
  const amounts = []
  for (const match of normalized.matchAll(/(\d[\d,]*)\s*円/g)) {
    // 「1000円分のクーポン」など金額でない用例を避ける
    const after = normalized.slice(match.index + match[0].length, match.index + match[0].length + 2)
    if (/^分/.test(after)) continue
    const value = Number(match[1].replace(/,/g, ""))
    if (Number.isFinite(value) && value > 0 && value <= 100000) amounts.push(value)
  }
  return amounts
}

const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("places")
    .select("id,name,price_type,price_min,price_max,price_note,description,what_is_it,why_go,recommended_points,precautions")
    .eq("is_published", true)
    .range(from, from + 999)
  if (error) throw new Error(error.message)
  rows.push(...(data ?? []))
  if (!data || data.length < 1000) break
}

const freeUpdates = []
const amountUpdates = []

for (const place of rows) {
  if (place.price_type === "free") {
    if (place.price_min !== 0 || place.price_max !== 0) {
      freeUpdates.push({ id: place.id, name: place.name })
    }
    continue
  }
  if (place.price_min !== null) continue

  const text = [place.price_note, place.description, place.what_is_it, place.why_go, place.recommended_points, place.precautions]
    .filter(Boolean)
    .join(" ")
  const amounts = extractAmounts(text)
  if (amounts.length === 0) continue
  amountUpdates.push({
    id: place.id,
    name: place.name,
    min: Math.min(...amounts),
    max: Math.max(...amounts),
    amounts,
  })
}

console.log(`公開スポット ${rows.length} 件`)
console.log(`無料として 0 円を入れる: ${freeUpdates.length} 件`)
console.log(`説明文から金額を取り出せる: ${amountUpdates.length} 件`)
amountUpdates.forEach((u) => console.log(`   ${u.name}: ${u.min}〜${u.max}円 (${u.amounts.join(", ")})`))

const stillUnknown = rows.filter(
  (p) => p.price_type !== "free" && p.price_min === null && !amountUpdates.some((u) => u.id === p.id),
)
console.log(`金額が不明なまま（推測しない）: ${stillUnknown.length} 件`)

if (!apply) {
  console.log("\n(確認モード) --apply で更新します")
} else {
  let updated = 0
  let failed = 0
  for (let i = 0; i < freeUpdates.length; i += 50) {
    const chunk = freeUpdates.slice(i, i + 50).map((u) => u.id)
    const { error } = await supabase.from("places").update({ price_min: 0, price_max: 0 }).in("id", chunk)
    if (error) { console.error(`FAIL 無料: ${error.message}`); failed += chunk.length; continue }
    updated += chunk.length
  }
  for (const update of amountUpdates) {
    const { error } = await supabase
      .from("places")
      .update({ price_min: update.min, price_max: update.max === update.min ? null : update.max })
      .eq("id", update.id)
    if (error) { console.error(`FAIL ${update.name}: ${error.message}`); failed += 1; continue }
    updated += 1
  }
  console.log(`\n${updated} 件を更新しました${failed > 0 ? ` / ${failed} 件失敗` : ""}`)
  if (failed > 0) process.exitCode = 1
}
