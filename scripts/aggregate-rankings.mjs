/**
 * facility_interactions を日次集計して facility_metrics_daily に書き出す。
 * cron等で毎日回す想定。何度流しても同じ結果になる (upsert)。
 *
 * 確認: npx tsx scripts/aggregate-rankings.mjs --days=7
 * 実行: npx tsx scripts/aggregate-rankings.mjs --days=7 --apply
 */

import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const envVars = {}
for (const line of readFileSync(resolve(scriptDirectory, "../.env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (match) envVars[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "")
}

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const apply = process.argv.includes("--apply")
const daysArg = process.argv.find((value) => value.startsWith("--days="))
const days = Math.max(1, Number(daysArg?.split("=")[1] ?? 7))

/** ランキングの重み。予約/チケットの意思ほど重く見る */
const WEIGHTS = {
  detail_view: 1,
  map_click: 2,
  website_click: 3,
  phone_click: 4,
  save: 6,
  review: 8,
  reservation_click: 10,
  ticket_click: 10,
}

const COLUMN_BY_TYPE = {
  detail_view: "detail_views",
  save: "saves",
  review: "reviews",
  ticket_click: "ticket_clicks",
  reservation_click: "reservation_clicks",
  map_click: "map_clicks",
  website_click: "website_clicks",
}

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10)
}

async function main() {
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("facility_interactions")
      .select("place_id,interaction_type,session_id,created_at")
      .gte("created_at", since)
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  console.log(`直近${days}日の行動ログ: ${rows.length} 件`)

  if (rows.length === 0) {
    console.log("集計対象がありません。行動ログが溜まってから再実行してください。")
    return
  }

  // 同一セッション×施設×種別×日は1回として数える (連投を弾く)
  const seen = new Set()
  const buckets = new Map()

  for (const row of rows) {
    const day = dateKey(row.created_at)
    const dedupeKey = `${day}|${row.session_id ?? "anon"}|${row.place_id}|${row.interaction_type}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    const bucketKey = `${row.place_id}|${day}`
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, {
        place_id: row.place_id,
        date: day,
        detail_views: 0, saves: 0, reviews: 0,
        ticket_clicks: 0, reservation_clicks: 0, map_clicks: 0, website_clicks: 0,
        score: 0,
      })
    }
    const bucket = buckets.get(bucketKey)
    const column = COLUMN_BY_TYPE[row.interaction_type]
    if (column) bucket[column] += 1
    bucket.score += WEIGHTS[row.interaction_type] ?? 1
  }

  const metrics = [...buckets.values()]
  console.log(`集計結果: ${metrics.length} 行 (重複除去後の有効ログ ${seen.size} 件)`)
  for (const metric of metrics.slice(0, 10)) {
    console.log(`  ${metric.date} ${metric.place_id.slice(0, 8)} score=${metric.score} views=${metric.detail_views} saves=${metric.saves}`)
  }

  if (!apply) {
    console.log("\n(確認モード) --apply で書き込みます")
    return
  }

  for (let index = 0; index < metrics.length; index += 500) {
    const chunk = metrics.slice(index, index + 500)
    const { error } = await supabase
      .from("facility_metrics_daily")
      .upsert(chunk, { onConflict: "place_id,date" })
    if (error) throw new Error(`facility_metrics_daily: ${error.message}`)
  }
  console.log(`\nDONE: ${metrics.length} 行を書き込みました`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
