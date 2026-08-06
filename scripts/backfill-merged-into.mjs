/**
 * archived にした重複施設へ統合先 (merged_into_place_id) を記録する。
 *
 * 統合時に転送先を記録し損ねたため、判定を再現して埋める:
 *   1. merge-duplicate-places.mjs の MANUAL_GROUPS (表記違いの10組) はそのまま採用
 *   2. それ以外は「正規化した名前が一致 + 同一府県 + 250m以内 or 住所一致」の
 *      公開中施設を統合先とする (統合時と同じ判定)
 *
 * Dry run: node scripts/backfill-merged-into.mjs
 * Apply:   node scripts/backfill-merged-into.mjs --apply
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

// merge-duplicate-places.mjs の MANUAL_GROUPS から keep/drop を読み取る (二重管理を避ける)
const mergeSource = readFileSync("scripts/merge-duplicate-places.mjs", "utf8")
const manualPairs = new Map()
for (const match of mergeSource.matchAll(/keep:\s*"([0-9a-f-]{36})",\s*drop:\s*\[([^\]]+)\]/g)) {
  for (const dropId of match[2].matchAll(/"([0-9a-f-]{36})"/g)) {
    manualPairs.set(dropId[1], match[1])
  }
}
console.log(`MANUAL_GROUPS から ${manualPairs.size} 件の対応を読み取り`)

const normalizeName = (value) =>
  (value ?? "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[\s　]/g, "")
    .replace(/[・･,、。.'"’”「」【】\-ー―−~〜!！?？&＆]/g, "")
    .toLowerCase()

const distanceMeters = (a, b) => {
  if (a.latitude == null || b.latitude == null) return null
  const toRad = (d) => (d * Math.PI) / 180
  const h =
    Math.sin(toRad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(toRad(b.longitude - a.longitude) / 2) ** 2
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(h)))
}

const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("places")
    .select("id,name,prefecture,address,latitude,longitude,is_published,publication_status,merged_into_place_id")
    .range(from, from + 999)
  if (error) throw new Error(error.message)
  rows.push(...(data ?? []))
  if (!data || data.length < 1000) break
}

const archived = rows.filter((p) => p.publication_status === "archived" && !p.merged_into_place_id)
const published = rows.filter((p) => p.is_published)
const publishedByName = new Map()
for (const place of published) {
  const key = normalizeName(place.name)
  if (!publishedByName.has(key)) publishedByName.set(key, [])
  publishedByName.get(key).push(place)
}

let matched = 0
let unmatched = 0
const updates = []
const unmatchedPlaces = []
for (const place of archived) {
  let target = manualPairs.get(place.id) ?? null
  if (!target) {
    const candidates = (publishedByName.get(normalizeName(place.name)) ?? []).filter((candidate) => {
      if (candidate.prefecture !== place.prefecture) return false
      const meters = distanceMeters(place, candidate)
      const sameAddress = place.address && candidate.address &&
        normalizeName(place.address) === normalizeName(candidate.address)
      return (meters != null && meters <= 250) || sameAddress
    })
    if (candidates.length === 1) target = candidates[0].id
  }
  if (target) { matched += 1; updates.push({ id: place.id, name: place.name, target }) }
  else unmatchedPlaces.push(place)
}

// 二次パス: 同名の重複が3行以上あると、中間の行は公開中の相手を見つけられない
// (相手も archived のため)。同じ正規化名で解決済みの行から統合先を引き継ぐ。
const targetByName = new Map()
for (const update of updates) targetByName.set(normalizeName(update.name), update.target)
for (const place of unmatchedPlaces) {
  const target = targetByName.get(normalizeName(place.name))
  if (target) { matched += 1; updates.push({ id: place.id, name: place.name, target }) }
  else { unmatched += 1; console.log(`未解決: ${place.name} (${place.id})`) }
}
console.log(`対象 ${archived.length} 件 / 統合先を特定 ${matched} 件 / 未解決 ${unmatched} 件`)

if (!apply) { console.log("\n(確認モード) --apply で書き込みます"); process.exit(0) }

let done = 0
for (const update of updates) {
  const { error } = await supabase.from("places").update({ merged_into_place_id: update.target }).eq("id", update.id)
  if (error) { console.error(`FAIL ${update.id}: ${error.message}`); continue }
  done += 1
}
console.log(`${done} 件に統合先を記録しました`)
