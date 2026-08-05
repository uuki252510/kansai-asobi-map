/**
 * places の what_is_it / why_go を既存フィールドから一括バックフィルする。
 * 手動編集済み (非null) の行はスキップ。
 * 前提: migration 20260805000002 適用済み。
 *
 * Dry run: node scripts/generate-editorial.mjs --limit=10
 * Apply:   node scripts/generate-editorial.mjs --apply --all
 */

import { readFileSync } from "fs"
import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.cjs"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const envVars = {}
for (const line of readFileSync(resolve(scriptDirectory, "../.env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (match) envVars[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "")
}

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const argumentsSet = new Set(process.argv.slice(2))
const apply = argumentsSet.has("--apply")
const all = argumentsSet.has("--all")
const limitArgument = process.argv.find((value) => value.startsWith("--limit="))
const limit = all ? Number.POSITIVE_INFINITY : Math.max(1, Number(limitArgument?.split("=")[1] ?? 10))

const indoorSentence = {
  indoor: "屋内で天気を気にせず遊べます。",
  outdoor: "屋外で開放的に過ごせます。",
  both: "屋内・屋外の両方で楽しめます。",
}

function whatIsIt(place) {
  if (place.description?.trim()) {
    const first = place.description.trim().split(/(?<=。)/)[0]
    return first.length > 10 ? first : place.description.trim().slice(0, 120)
  }
  return `${place.prefecture}${place.city}にあるおでかけスポットです。`
}

function whyGo(place) {
  const sentences = []
  sentences.push(indoorSentence[place.indoor_type] ?? "")
  if (place.price_type === "free") sentences.push("入場無料で気軽に立ち寄れます。")
  else if (place.price_note) sentences.push(`料金は「${place.price_note}」と案内されています。`)
  if (place.rainy_day_ok) sentences.push("雨の日でも楽しめるのが強みです。")
  if (place.average_stay_minutes) sentences.push(`平均滞在時間は約${place.average_stay_minutes}分が目安です。`)
  if ((place.target_ages ?? []).length > 0) sentences.push("子ども連れの利用実績が登録されています。")
  return sentences.filter(Boolean).slice(0, 4).join("")
}

async function main() {
  const pageSize = 1000
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("places")
      .select("id,name,description,prefecture,city,indoor_type,price_type,price_note,rainy_day_ok,average_stay_minutes,target_ages,what_is_it,why_go")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < pageSize) break
  }

  const targets = rows.filter((place) => !place.what_is_it || !place.why_go).slice(0, limit)
  console.log(`targets: ${targets.length} / ${rows.length} (apply=${apply})`)

  let updated = 0
  for (const place of targets) {
    const patch = {}
    if (!place.what_is_it) patch.what_is_it = whatIsIt(place)
    if (!place.why_go) patch.why_go = whyGo(place)
    if (apply) {
      const { error } = await supabase.from("places").update(patch).eq("id", place.id)
      if (error) {
        console.log(`FAIL ${place.name}: ${error.message}`)
        continue
      }
    }
    updated += 1
    console.log(`OK   ${place.name}\n     どんなとこ？ ${patch.what_is_it ?? "(既存)"}\n     なんで行くん？ ${patch.why_go ?? "(既存)"}`)
  }

  console.log(`DONE: ${updated} rows${apply ? " updated" : " (dry run)"}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
