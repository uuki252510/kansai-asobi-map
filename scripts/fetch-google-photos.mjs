/**
 * Google Places API を使って places テーブルの image_url を実写真で更新する
 * Run: node scripts/fetch-google-photos.mjs
 *
 * 対象: image_url が NULL または Unsplash プレースホルダーのレコード
 * レート: 200ms/件（Places API 制限対策）
 */

import { readFileSync } from "fs"
import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.cjs"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))

// .env.local を手動読み込み
const envPath = resolve(__dirname, "../.env.local")
const envVars = {}
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.+)$/)
  if (m) envVars[m[1]] = m[2].trim()
}

const SUPABASE_URL = envVars["NEXT_PUBLIC_SUPABASE_URL"]
const SERVICE_ROLE_KEY = envVars["SUPABASE_SERVICE_ROLE_KEY"]
const GOOGLE_API_KEY = envVars["GOOGLE_MAPS_API_KEY"]

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}
if (!GOOGLE_API_KEY) {
  console.error("Missing GOOGLE_MAPS_API_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Unsplash プレースホルダー URL パターン
const isPlaceholder = (url) =>
  !url || url.includes("unsplash.com")

async function fetchGooglePhoto(name, address, prefecture) {
  // Places API (New) - Text Search
  const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask": "places.name,places.photos",
    },
    body: JSON.stringify({
      textQuery: `${name} ${prefecture}`,
      languageCode: "ja",
      maxResultCount: 1,
    }),
  })

  const searchData = await searchRes.json()
  if (!searchData.places?.length) return null

  const place = searchData.places[0]
  const photos = place.photos
  if (!photos?.length) return null

  // 写真取得 (mediaItems endpoint)
  const photoName = photos[0].name
  const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&skipHttpRedirect=false&key=${GOOGLE_API_KEY}`

  // リダイレクト先の実 URL を取得
  const photoRes = await fetch(photoUrl, { redirect: "manual" })
  if (photoRes.status === 302 || photoRes.status === 301) {
    return photoRes.headers.get("location")
  }
  // リダイレクトなしで画像が返る場合はそのまま URL を使用
  if (photoRes.ok) return photoUrl

  return null
}

async function main() {
  // 対象レコード取得（画像なし or Unsplash プレースホルダー）
  const { data: places, error } = await supabase
    .from("places")
    .select("id, name, address, prefecture")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Supabase fetch error:", error.message)
    process.exit(1)
  }

  // image_url も取得
  const { data: allPlaces } = await supabase
    .from("places")
    .select("id, name, address, prefecture, image_url")
    .order("created_at", { ascending: true })

  const targets = allPlaces.filter((p) => isPlaceholder(p.image_url))
  console.log(`対象: ${targets.length} 件 / 全 ${allPlaces.length} 件`)

  let updated = 0
  let failed = 0

  for (let i = 0; i < targets.length; i++) {
    const place = targets[i]
    process.stdout.write(`[${i + 1}/${targets.length}] ${place.name} ... `)

    try {
      const photoUrl = await fetchGooglePhoto(place.name, place.address, place.prefecture)

      if (photoUrl) {
        await supabase
          .from("places")
          .update({ image_url: photoUrl })
          .eq("id", place.id)
        console.log("✓")
        updated++
      } else {
        console.log("写真なし（スキップ）")
        failed++
      }
    } catch (e) {
      console.log(`エラー: ${e.message}`)
      failed++
    }

    await sleep(200) // レート制限対策
  }

  console.log(`\n完了: 更新 ${updated} 件 / スキップ ${failed} 件`)
}

main()
