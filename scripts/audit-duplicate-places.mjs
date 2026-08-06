/**
 * 施設の重複レコードを洗い出す。
 *
 * 判定は2段階:
 *   1. 正規化した施設名が一致
 *   2. 同一府県、かつ座標が近い(既定250m以内) または 正規化住所が一致
 * 名前だけが同じ別施設(「中央公園」など)を巻き込まないための条件。
 *
 * 各グループで「残す側」を、参照数 → 情報の充実度 → 作成日の古さ の順で決める。
 *
 * Run: node scripts/audit-duplicate-places.mjs [--json]
 */

import { readFileSync } from "fs"
import { pathToFileURL } from "url"
import { createClient } from "@supabase/supabase-js"

// 定数は merge-duplicate-places.mjs からも読む。import しただけで
// 監査が走らないよう、実行部は下の isMain ガードの中に置く。
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

const env = {}
for (const line of readFileSync("./.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "")
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const NEAR_METERS = 250

/** 表記ゆれを吸収する。全角英数→半角、カッコ書き除去、記号と空白除去。 */
function normalizeName(value) {
  return (value ?? "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[\s　]/g, "")
    .replace(/[・･,、。.'"’”「」【】\-ー―−~〜!！?？&＆]/g, "")
    .toLowerCase()
}

function normalizeAddress(value) {
  return normalizeName(value).replace(/[0-9]+/g, (n) => String(Number(n)))
}

function distanceMeters(a, b) {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return null
  const toRad = (d) => (d * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

/** 埋まっている項目数。どちらを残すかの判断材料にする。 */
function richness(place) {
  const fields = [
    "description", "address", "website_url", "image_url", "image_storage_path",
    "phone_number", "opening_hours", "price_note", "what_is_it", "why_go",
    "catchphrase", "recommended_points", "price_min", "average_stay_minutes",
  ]
  let score = fields.reduce((n, key) => n + (place[key] ? 1 : 0), 0)
  if (Array.isArray(place.target_ages) && place.target_ages.length > 0) score += 1
  return score
}

async function fetchAll(table, columns) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return rows
}

/** 参照テーブルは未適用のこともあるので、失敗しても0件として続行する。 */
async function countByPlace(table, column = "place_id") {
  const counts = new Map()
  try {
    const rows = await fetchAll(table, column)
    for (const row of rows) counts.set(row[column], (counts.get(row[column]) ?? 0) + 1)
  } catch {
    return { counts, available: false }
  }
  return { counts, available: true }
}

/**
 * 失うと取り返しがつかない参照。人が入力したものと、行動ログ。
 * 統合時は残す側へ付け替える必要がある。
 * outing_history / share_group_spots / votes は on delete restrict なので
 * 付け替えないと物理削除できない。
 */
export const HARD_REFERENCES = [
  "reviews", "article_places", "outing_history", "share_group_spots", "votes",
  "facility_interactions", "facility_metrics_daily", "facility_media", "facility_news",
  "facility_correction_requests", "facility_revisions", "coupons", "tickets", "events",
  "facility_business_hours", "facility_business_exceptions", "facility_price_plans",
  "facility_parking",
]

/**
 * 自動生成した参照。消しても作り直せる。
 * カテゴリ/タグ/設備/年齢は classify-facilities.mjs、
 * 駅アクセスは seed-stations.mjs が座標から再計算する。
 */
export const SOFT_REFERENCES = [
  "facility_categories", "facility_tags", "facility_amenities",
  "facility_purposes", "facility_age_suitability", "place_areas",
  "facility_station_access",
]

const REFERENCES = [...HARD_REFERENCES, ...SOFT_REFERENCES].map((t) => [t, "place_id"])

if (!isMain) {
  // 定数だけ使いたい呼び出し元のために、ここで終わる
} else {

// 統合済み(archived)は対象外。--include-archived で過去分も見られる
const includeArchived = process.argv.includes("--include-archived")
const allRows = await fetchAll(
  "places",
  "id,name,address,prefecture,city,latitude,longitude,is_published,publication_status,created_at,description,website_url,image_url,image_storage_path,phone_number,opening_hours,price_note,what_is_it,why_go,catchphrase,recommended_points,price_min,average_stay_minutes,target_ages",
)
const places = includeArchived ? allRows : allRows.filter((p) => p.publication_status !== "archived")

const refCounts = new Map()
const unavailable = []
for (const [table, column] of REFERENCES) {
  const { counts, available } = await countByPlace(table, column)
  if (!available) { unavailable.push(table); continue }
  for (const [placeId, n] of counts) {
    const current = refCounts.get(placeId) ?? {}
    current[table] = n
    refCounts.set(placeId, current)
  }
}

const sumRefs = (id, tables) =>
  tables.reduce((n, table) => n + ((refCounts.get(id) ?? {})[table] ?? 0), 0)
const hardRefs = (id) => sumRefs(id, HARD_REFERENCES)
const totalRefs = (id) => sumRefs(id, [...HARD_REFERENCES, ...SOFT_REFERENCES])

// 名前でまとめてから、位置か住所が一致するものだけを重複と見なす
const byName = new Map()
for (const place of places) {
  const key = normalizeName(place.name)
  if (!key) continue
  if (!byName.has(key)) byName.set(key, [])
  byName.get(key).push(place)
}

const groups = []
for (const [, candidates] of byName) {
  if (candidates.length < 2) continue
  const remaining = [...candidates]
  while (remaining.length > 0) {
    const head = remaining.shift()
    const cluster = [head]
    for (let i = remaining.length - 1; i >= 0; i -= 1) {
      const other = remaining[i]
      if (other.prefecture !== head.prefecture) continue
      const meters = distanceMeters(head, other)
      const sameAddress = head.address && other.address &&
        normalizeAddress(head.address) === normalizeAddress(other.address)
      if ((meters != null && meters <= NEAR_METERS) || sameAddress) {
        cluster.push(other)
        remaining.splice(i, 1)
      }
    }
    if (cluster.length > 1) groups.push(cluster)
  }
}

// 残す側: 失えない参照が多い → 情報が充実 → 公開中 → 作成が古い。
// 自動生成の参照(SOFT)は両者ほぼ同数になるため判定に使わない。
for (const cluster of groups) {
  cluster.sort((a, b) =>
    hardRefs(b.id) - hardRefs(a.id) ||
    richness(b) - richness(a) ||
    Number(b.is_published) - Number(a.is_published) ||
    new Date(a.created_at) - new Date(b.created_at),
  )
}
groups.sort((a, b) => a[0].name.localeCompare(b[0].name, "ja"))

/**
 * 表記違いの重複を拾う二段目。名前が完全一致しないので自動統合はせず、
 * 目視確認用に一覧するだけにする（別施設を巻き込む危険があるため）。
 */
function nameSimilarity(a, b) {
  const grams = (s) => new Set(Array.from({ length: Math.max(s.length - 1, 0) }, (_, i) => s.slice(i, i + 2)))
  const ga = grams(a)
  const gb = grams(b)
  if (ga.size === 0 || gb.size === 0) return a === b ? 1 : 0
  let shared = 0
  for (const g of ga) if (gb.has(g)) shared += 1
  return (2 * shared) / (ga.size + gb.size)
}

const alreadyGrouped = new Set(groups.flat().map((p) => p.id))
const fuzzy = []
const sorted = [...places].filter((p) => !alreadyGrouped.has(p.id))
  .sort((a, b) => (a.latitude ?? 0) - (b.latitude ?? 0))
for (let i = 0; i < sorted.length; i += 1) {
  for (let j = i + 1; j < sorted.length; j += 1) {
    const a = sorted[i]
    const b = sorted[j]
    if (a.latitude == null || b.latitude == null) break
    if (b.latitude - a.latitude > 0.002) break // 約220m。緯度順なのでこれ以上は離れる一方
    if (a.prefecture !== b.prefecture) continue
    const meters = distanceMeters(a, b)
    if (meters == null || meters > 150) continue
    const score = nameSimilarity(normalizeName(a.name), normalizeName(b.name))
    if (score < 0.45) continue
    fuzzy.push({ a, b, meters, score })
  }
}
fuzzy.sort((x, y) => y.score - x.score)

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(
    groups.map((cluster) => ({
      keep: cluster[0].id,
      drop: cluster.slice(1).map((p) => p.id),
      name: cluster[0].name,
    })),
    null, 2,
  ))
} else {
  if (unavailable.length > 0) console.log(`(未作成のため参照数を数えられないテーブル: ${unavailable.join(", ")})\n`)
  console.log(`重複グループ ${groups.length} 件 / 施設 ${places.length} 件\n`)
  for (const cluster of groups) {
    console.log(`■ ${cluster[0].name}`)
    cluster.forEach((place, index) => {
      const refs = refCounts.get(place.id) ?? {}
      const detail = Object.entries(refs).map(([t, n]) => `${t}:${n}`).join(" ") || "参照なし"
      const meters = index === 0 ? "" : ` ${distanceMeters(cluster[0], place) ?? "?"}m`
      console.log(`  ${index === 0 ? "残す" : "統合"} ${place.id}${meters}`)
      console.log(`       ${place.prefecture}${place.city ?? ""} ${place.address ?? "住所なし"}`)
      console.log(`       ${place.is_published ? "公開" : "非公開"} 充実度${richness(place)} 要付替${hardRefs(place.id)} 計${totalRefs(place.id)} (${detail})`)
    })
    console.log("")
  }
  const dropped = groups.flatMap((g) => g.slice(1))
  console.log(`統合対象 ${dropped.length} 件 / 残す ${groups.length} 件`)
  console.log(`うち付け替えが必要（人の入力・行動ログを持つ）: ${dropped.filter((p) => hardRefs(p.id) > 0).length} 件`)
  const table = {}
  for (const place of dropped) {
    for (const [name, n] of Object.entries(refCounts.get(place.id) ?? {})) {
      if (HARD_REFERENCES.includes(name)) table[name] = (table[name] ?? 0) + n
    }
  }
  console.log(`付け替える行の内訳: ${Object.entries(table).map(([t, n]) => `${t} ${n}`).join(" / ") || "なし"}`)

  console.log(`\n--- 表記違いの重複候補 ${fuzzy.length} 組（自動統合の対象外・要目視） ---`)
  for (const { a, b, meters, score } of fuzzy) {
    console.log(`類似${score.toFixed(2)} ${meters}m  ${a.prefecture}${a.city ?? ""}`)
    console.log(`   ${a.id}  ${a.name}`)
    console.log(`   ${b.id}  ${b.name}`)
  }
}

}
