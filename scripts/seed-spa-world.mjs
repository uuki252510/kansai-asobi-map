/**
 * スパワールド世界の大温泉を新規登録する (関西定番なのに未登録だった)。
 * 写真は既存の find-and-import-photos.mjs が後段で取り込む。
 *
 * Dry run: node scripts/seed-spa-world.mjs
 * Apply:   node scripts/seed-spa-world.mjs --apply
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

const PLACE = {
  name: "スパワールド世界の大温泉",
  description:
    "通天閣のすぐそばにある大型温泉テーマパーク。世界の温泉を再現した浴場ゾーンと屋内プール・スライダーを備え、雨の日でも一日楽しめる。",
  prefecture: "大阪府",
  city: "大阪市浪速区",
  address: "大阪府大阪市浪速区恵美須東3-4-24",
  latitude: 34.6513,
  longitude: 135.5057,
  price_type: "paid",
  price_note: "入館料は日程により異なります。公式サイトをご確認ください。",
  rainy_day_ok: true,
  website_url: "https://www.spaworld.co.jp/",
  google_map_url:
    "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("スパワールド世界の大温泉"),
  average_stay_minutes: 300,
  is_published: true,
}

// 重複防止
const { data: existing } = await supabase.from("places").select("id,name").ilike("name", "%スパワールド%")
if (existing && existing.length > 0) {
  console.log("既に登録済み:", existing.map((p) => `${p.name} (${p.id})`).join(", "))
  process.exit(0)
}

// indoor_type / target_ages は既存レコードの値の流儀に合わせる
const { data: sample, error: sampleError } = await supabase
  .from("places")
  .select("indoor_type,target_ages")
  .eq("name", "海遊館")
  .eq("is_published", true)
  .limit(1)
  .single()
if (sampleError) throw new Error(sampleError.message)
PLACE.indoor_type = sample.indoor_type
PLACE.target_ages = sample.target_ages

console.log(JSON.stringify(PLACE, null, 2))
if (!apply) {
  console.log("\n(確認モード) --apply で登録します")
  process.exit(0)
}

const { data, error } = await supabase.from("places").insert(PLACE).select("id,name").single()
if (error) throw new Error(error.message)
console.log(`登録しました: ${data.name} (${data.id})`)
