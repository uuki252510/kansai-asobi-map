/**
 * Import place photos into Supabase Storage (bucket: place-images) so that
 * /api/place-image/[id] can 302-redirect to the CDN instead of calling
 * Google Places on every request.
 *
 * Sources handled:
 *  - Google Place resource URLs (https://places.googleapis.com/v1/places/{id})
 *  - Trusted static URLs (upload.wikimedia.org, *.supabase.co)
 *
 * Dry run: node scripts/import-place-images-to-storage.mjs --limit=10
 * Apply:   node scripts/import-place-images-to-storage.mjs --apply --all
 * Refresh: node scripts/import-place-images-to-storage.mjs --apply --all --refresh
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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY
const googleApiKey = envVars.GOOGLE_MAPS_API_KEY
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Required Supabase environment variables are missing.")
  process.exit(1)
}

const argumentsSet = new Set(process.argv.slice(2))
const apply = argumentsSet.has("--apply")
const all = argumentsSet.has("--all")
const refresh = argumentsSet.has("--refresh")
const limitArgument = process.argv.find((value) => value.startsWith("--limit="))
const limit = all ? Number.POSITIVE_INFINITY : Math.max(1, Number(limitArgument?.split("=")[1] ?? 10))

const BUCKET = "place-images"

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const sleep = (milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds))

function googlePlaceId(value) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.hostname !== "places.googleapis.com") return null
    const match = url.pathname.match(/^\/v1\/places\/([A-Za-z0-9_-]+)$/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

function trustedStaticUrl(value) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") return null
    if (url.hostname === "upload.wikimedia.org" || url.hostname.endsWith(".supabase.co")) return url.toString()
    return null
  } catch {
    return null
  }
}

async function fetchGooglePhoto(placeId) {
  if (!googleApiKey) throw new Error("GOOGLE_MAPS_API_KEY missing for Google photo import")
  const details = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=ja`,
    {
      headers: {
        accept: "application/json",
        "X-Goog-Api-Key": googleApiKey,
        "X-Goog-FieldMask": "id,photos",
      },
      signal: AbortSignal.timeout(12_000),
    },
  )
  if (!details.ok) throw new Error(`Details ${details.status}`)
  const payload = await details.json()
  if (payload.id !== placeId) throw new Error("place id mismatch")

  const photo = (payload.photos ?? []).find((candidate) => {
    if (!candidate.name) return false
    if (!candidate.widthPx || !candidate.heightPx) return true
    const ratio = candidate.widthPx / candidate.heightPx
    return ratio >= 0.65 && ratio <= 2.8
  })
  if (!photo?.name || !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(photo.name)) {
    throw new Error("no usable photo")
  }

  const mediaUrl = new URL(`https://places.googleapis.com/v1/${photo.name}/media`)
  mediaUrl.searchParams.set("maxWidthPx", "1600")
  mediaUrl.searchParams.set("maxHeightPx", "1200")
  mediaUrl.searchParams.set("skipHttpRedirect", "false")
  const image = await fetch(mediaUrl, {
    headers: { accept: "image/*", "X-Goog-Api-Key": googleApiKey },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  })
  const contentType = image.headers.get("content-type") ?? ""
  if (!image.ok || !contentType.startsWith("image/")) throw new Error(`media ${image.status} ${contentType}`)
  return { buffer: Buffer.from(await image.arrayBuffer()), contentType, source: "google" }
}

async function fetchStaticImage(url) {
  const image = await fetch(url, {
    redirect: "follow",
    headers: { accept: "image/*" },
    signal: AbortSignal.timeout(15_000),
  })
  const contentType = image.headers.get("content-type") ?? ""
  if (!image.ok || !contentType.startsWith("image/")) throw new Error(`static ${image.status} ${contentType}`)
  return { buffer: Buffer.from(await image.arrayBuffer()), contentType, source: "static" }
}

function extensionFor(contentType) {
  if (contentType.includes("png")) return "png"
  if (contentType.includes("webp")) return "webp"
  if (contentType.includes("avif")) return "avif"
  return "jpg"
}

async function main() {
  const pageSize = 1000
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("places")
      .select("id,name,image_url,image_storage_path")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < pageSize) break
  }

  const targets = rows
    .filter((place) => (refresh ? true : !place.image_storage_path))
    .filter((place) => googlePlaceId(place.image_url) || trustedStaticUrl(place.image_url))
    .slice(0, limit)

  console.log(`targets: ${targets.length} (apply=${apply})`)

  let imported = 0
  let errors = 0
  for (const place of targets) {
    try {
      const placeId = googlePlaceId(place.image_url)
      const staticUrl = trustedStaticUrl(place.image_url)
      const result = placeId ? await fetchGooglePhoto(placeId) : await fetchStaticImage(staticUrl)

      const path = `${place.id}.${extensionFor(result.contentType)}`
      if (apply) {
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, result.buffer, { contentType: result.contentType, upsert: true })
        if (uploadError) throw new Error(`upload: ${uploadError.message}`)

        const { error: updateError } = await supabase
          .from("places")
          .update({
            image_storage_path: path,
            image_source: result.source,
            image_synced_at: new Date().toISOString(),
          })
          .eq("id", place.id)
        if (updateError) throw new Error(`update: ${updateError.message}`)
      }
      imported += 1
      console.log(`OK   ${place.name} -> ${path} (${result.source}, ${(result.buffer.length / 1024).toFixed(0)}KB)`)
    } catch (error) {
      errors += 1
      console.log(`FAIL ${place.name}: ${error.message}`)
    }
    await sleep(250)
  }

  console.log(`DONE: imported ${imported}, errors ${errors}${apply ? "" : " (dry run)"}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
