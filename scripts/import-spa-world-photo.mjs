/**
 * スパワールドの写真だけを取り込む一回きりのスクリプト。
 *
 * Google 上の正式名が「SPAWORLD HOTEL&RESORT」(英字) のため、
 * find-and-import-photos.mjs の名前類似ゲートに弾かれる。ゲートを
 * 緩めると誤マッチが増えるので、この1件は住所 (恵美須東) の一致を
 * 人間が確認済みの前提で個別に取り込む。
 *
 * Apply: node scripts/import-spa-world-photo.mjs --apply
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

const { data: place, error } = await supabase
  .from("places")
  .select("id,name,city,image_storage_path")
  .eq("name", "スパワールド世界の大温泉")
  .eq("is_published", true)
  .single()
if (error) throw new Error(error.message)
if (place.image_storage_path) {
  console.log("既に写真あり:", place.image_storage_path)
  process.exit(0)
}

const search = await fetch("https://places.googleapis.com/v1/places:searchText", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "X-Goog-Api-Key": googleApiKey,
    "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.photos",
  },
  body: JSON.stringify({ textQuery: "スパワールド世界の大温泉 大阪市浪速区", languageCode: "ja", regionCode: "JP", pageSize: 1 }),
  signal: AbortSignal.timeout(12_000),
})
if (!search.ok) throw new Error(`searchText ${search.status}`)
const candidate = (await search.json()).places?.[0]
if (!candidate) throw new Error("検索ヒットなし")
const address = candidate.formattedAddress ?? ""
console.log(`マッチ: ${candidate.displayName?.text} / ${address}`)
// 恵美須東の実住所であることだけは機械でも確認する
if (!address.includes("恵美須東")) throw new Error("住所不一致のため中止: " + address)

const photo = (candidate.photos ?? []).find((entry) => {
  if (!entry.name) return false
  if (!entry.widthPx || !entry.heightPx) return true
  const ratio = entry.widthPx / entry.heightPx
  return ratio >= 0.65 && ratio <= 2.8
})
if (!photo?.name) throw new Error("使える写真なし")
if (!apply) {
  console.log("(確認モード) --apply で取り込みます")
  process.exit(0)
}

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
const buffer = Buffer.from(await image.arrayBuffer())

const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg"
const path = `${place.id}.${ext}`
const { error: uploadError } = await supabase.storage
  .from("place-images")
  .upload(path, buffer, { contentType, upsert: true })
if (uploadError) throw new Error(`upload: ${uploadError.message}`)
const { error: updateError } = await supabase
  .from("places")
  .update({ image_storage_path: path, image_source: "google", image_synced_at: new Date().toISOString() })
  .eq("id", place.id)
if (updateError) throw new Error(`update: ${updateError.message}`)
console.log(`OK ${place.name} (${Math.round(buffer.length / 1024)}KB)`)
