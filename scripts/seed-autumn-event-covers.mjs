/**
 * 秋イベント12件のカバー画像を設定する。
 *
 * 方針 (実イベントの写真は権利上使えないため、正直に会場・イメージで埋める):
 *   1. 施設リンクがあるイベント → その施設の Storage 写真をそのまま参照
 *      (同じ place-images バケットなのでパス共有で足りる)
 *   2. 花火系 → 夏の花火大会で取り込み済みの PD/CC0 イメージ写真 (stock-*) を再利用
 *   3. 祭り・寺社系 → 会場 (神社・会館・博物館) の写真を Google Places から取り込み、
 *      stock-venue-* のパスで保存する。stock- プレフィックスにより UI が
 *      「写真はイメージ」を表示する。
 *
 * Dry run: node scripts/seed-autumn-event-covers.mjs
 * Apply:   node scripts/seed-autumn-event-covers.mjs --apply
 */

import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"

const env = {}
for (const line of readFileSync("./.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "")
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const googleApiKey = env.GOOGLE_MAPS_API_KEY
const apply = process.argv.includes("--apply")
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** 施設写真をそのまま使うイベント */
const FROM_PLACE = [
  "usj-halloween-horror-nights-2026",
  "uzumasa-yokai-matsuri-2026",
  "sakana-japan-fes-banpaku-2026",
  "banpaku-nominoichi-2026",
]

/** 夏花火の stock 写真を使い回すイベント */
const FIREWORKS = [
  "naniwa-yodogawa-hanabi-2026",
  "osaka-geijutsu-hanabi-2026",
  "banpaku-yozora-art-2026",
]

/** 会場写真を Google から取り込むイベント (query + 住所トークン) */
const VENUES = [
  { slug: "kishiwada-danjiri-sep-2026", query: "岸和田だんじり会館", token: "岸和田市", path: "event-covers/stock-venue-kishiwada-danjiri.jpg" },
  { slug: "nada-kenka-matsuri-2026", query: "松原八幡神社 姫路市", token: "姫路市", path: "event-covers/stock-venue-matsubara-hachiman.jpg" },
  { slug: "jidai-matsuri-2026", query: "平安神宮 京都市", token: "左京区", path: "event-covers/stock-venue-heian-jingu.jpg" },
  { slug: "toji-koyo-lightup-2026", query: "東寺 京都市", token: "南区", path: "event-covers/stock-venue-toji.jpg" },
  { slug: "shosoin-exhibition-2026", query: "奈良国立博物館", token: "奈良市", path: "event-covers/stock-venue-nara-hakubutsukan.jpg" },
]

// 1) 施設写真の参照
for (const slug of FROM_PLACE) {
  const { data: event } = await supabase.from("events").select("id,name,place_id,cover_storage_path").eq("slug", slug).single()
  if (!event) { console.log(`SKIP ${slug}: イベントなし`); continue }
  if (event.cover_storage_path) { console.log(`SKIP ${slug}: 設定済み`); continue }
  const { data: place } = await supabase.from("places").select("image_storage_path,name").eq("id", event.place_id).single()
  if (!place?.image_storage_path) { console.log(`SKIP ${slug}: 施設写真なし`); continue }
  console.log(`会場写真 ${event.name} ← ${place.name}`)
  if (apply) await supabase.from("events").update({ cover_storage_path: place.image_storage_path }).eq("id", event.id)
}

// 2) 花火 stock の再利用 (夏イベントで取り込み済みのものを回す)
const { data: stockEvents } = await supabase
  .from("events")
  .select("cover_storage_path")
  .like("cover_storage_path", "event-covers/stock-%")
  .not("cover_storage_path", "is", null)
const stockPaths = [...new Set((stockEvents ?? []).map((e) => e.cover_storage_path))]
if (stockPaths.length === 0) console.log("WARN: stock 花火写真が見つかりません")
for (const [index, slug] of FIREWORKS.entries()) {
  const { data: event } = await supabase.from("events").select("id,name,cover_storage_path").eq("slug", slug).single()
  if (!event || event.cover_storage_path) { console.log(`SKIP ${slug}`); continue }
  const path = stockPaths[index % stockPaths.length]
  if (!path) continue
  console.log(`花火stock ${event.name} ← ${path}`)
  if (apply) await supabase.from("events").update({ cover_storage_path: path }).eq("id", event.id)
}

// 3) 会場写真の取り込み
async function fetchVenuePhoto(query, token) {
  const search = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": googleApiKey,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.photos",
    },
    body: JSON.stringify({ textQuery: query, languageCode: "ja", regionCode: "JP", pageSize: 1 }),
    signal: AbortSignal.timeout(12_000),
  })
  if (!search.ok) throw new Error(`searchText ${search.status}`)
  const candidate = (await search.json()).places?.[0]
  if (!candidate) throw new Error("検索ヒットなし")
  const address = candidate.formattedAddress ?? ""
  if (!address.includes(token)) throw new Error(`住所不一致: ${address.slice(0, 40)}`)
  const photo = (candidate.photos ?? []).find((entry) => {
    if (!entry.name) return false
    if (!entry.widthPx || !entry.heightPx) return true
    const ratio = entry.widthPx / entry.heightPx
    return ratio >= 0.65 && ratio <= 2.8
  })
  if (!photo?.name) throw new Error("使える写真なし")
  const mediaUrl = new URL(`https://places.googleapis.com/v1/${photo.name}/media`)
  mediaUrl.searchParams.set("maxWidthPx", "1600")
  mediaUrl.searchParams.set("maxHeightPx", "1200")
  const image = await fetch(mediaUrl, {
    headers: { accept: "image/*", "X-Goog-Api-Key": googleApiKey },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  })
  const contentType = image.headers.get("content-type") ?? ""
  if (!image.ok || !contentType.startsWith("image/")) throw new Error(`media ${image.status}`)
  return { buffer: Buffer.from(await image.arrayBuffer()), contentType, matchedName: candidate.displayName?.text }
}

for (const venue of VENUES) {
  const { data: event } = await supabase.from("events").select("id,name,cover_storage_path").eq("slug", venue.slug).single()
  if (!event) { console.log(`SKIP ${venue.slug}: イベントなし`); continue }
  if (event.cover_storage_path) { console.log(`SKIP ${venue.slug}: 設定済み`); continue }
  try {
    if (!apply) {
      console.log(`会場取込予定 ${event.name} ← ${venue.query}`)
      continue
    }
    await wait(300)
    const photo = await fetchVenuePhoto(venue.query, venue.token)
    const { error: uploadError } = await supabase.storage
      .from("place-images")
      .upload(venue.path, photo.buffer, { contentType: photo.contentType, upsert: true })
    if (uploadError) throw new Error(uploadError.message)
    const { error: updateError } = await supabase.from("events").update({ cover_storage_path: venue.path }).eq("id", event.id)
    if (updateError) throw new Error(updateError.message)
    console.log(`会場取込 ${event.name} ← ${photo.matchedName} (${Math.round(photo.buffer.length / 1024)}KB)`)
  } catch (error) {
    console.log(`FAIL ${venue.slug}: ${error.message}`)
  }
}

console.log(`\nDONE${apply ? "" : " (dry run)"}`)
