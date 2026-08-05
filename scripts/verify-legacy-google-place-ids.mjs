/** Verify Place IDs embedded in legacy Google photo URLs before reusing them. */

import { readFileSync } from "fs"
import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.cjs"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const directory = dirname(fileURLToPath(import.meta.url))
const environment = {}
for (const line of readFileSync(resolve(directory, "../.env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (match) environment[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "")
}

const googleApiKey = environment.GOOGLE_MAPS_API_KEY
const supabase = createClient(
  environment.NEXT_PUBLIC_SUPABASE_URL,
  environment.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)
const apply = process.argv.includes("--apply")

function normalize(value = "") {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[\s・･\-‐‑–—ー「」『』【】\[\]、。，．\/]/g, "")
}

function bigrams(value) {
  if (value.length < 2) return value ? [value] : []
  return Array.from({ length: value.length - 1 }, (_, index) => value.slice(index, index + 2))
}

function similarity(leftValue, rightValue) {
  const left = normalize(leftValue)
  const right = normalize(rightValue)
  if (!left || !right) return 0
  if (left === right) return 1
  const shorter = left.length <= right.length ? left : right
  const longer = left.length > right.length ? left : right
  const containment = longer.includes(shorter) && shorter.length >= 3
    ? 0.72 + Math.min(0.18, (shorter.length / longer.length) * 0.18)
    : 0
  const rightCounts = new Map()
  const leftPairs = bigrams(left)
  const rightPairs = bigrams(right)
  for (const pair of rightPairs) rightCounts.set(pair, (rightCounts.get(pair) ?? 0) + 1)
  let overlap = 0
  for (const pair of leftPairs) {
    const count = rightCounts.get(pair) ?? 0
    if (count > 0) {
      overlap += 1
      rightCounts.set(pair, count - 1)
    }
  }
  return Math.max(containment, (2 * overlap) / (leftPairs.length + rightPairs.length))
}

function distanceKm(place, candidate) {
  const latitude = Number(place.latitude)
  const longitude = Number(place.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (!Number.isFinite(candidate?.latitude) || !Number.isFinite(candidate?.longitude)) return null
  const radians = (degrees) => degrees * Math.PI / 180
  const latitudeDelta = radians(candidate.latitude - latitude)
  const longitudeDelta = radians(candidate.longitude - longitude)
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(latitude)) * Math.cos(radians(candidate.latitude))
    * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function embeddedPlaceId(value) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.hostname !== "places.googleapis.com") return null
    return url.pathname.match(/^\/v1\/places\/([A-Za-z0-9_-]+)\/photos\//)?.[1] ?? null
  } catch {
    return null
  }
}

async function getDetails(placeId) {
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=ja`, {
    headers: {
      accept: "application/json",
      "X-Goog-Api-Key": googleApiKey,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location,photos",
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`Google Places ${response.status}`)
  return response.json()
}

function assess(place, details) {
  const nameScore = similarity(place.name, details.displayName?.text ?? "")
  const address = normalize(details.formattedAddress ?? "")
  const prefectureMatch = address.includes(normalize(place.prefecture))
  const cityMatch = address.includes(normalize(place.city))
  const distance = distanceKm(place, details.location)
  const accepted = Boolean(
    details.id
      && details.photos?.length
      && prefectureMatch
      && (
        (nameScore >= 0.75 && cityMatch)
        || (nameScore >= 0.55 && distance !== null && distance <= 3)
        || (nameScore >= 0.35 && distance !== null && distance <= 0.5)
      ),
  )
  return { accepted, nameScore, distance, name: details.displayName?.text ?? "" }
}

const { data, error } = await supabase
  .from("places")
  .select("id,name,city,prefecture,latitude,longitude,image_url")
  .eq("is_published", true)
if (error) throw new Error(error.message)

const targets = data.filter((place) => embeddedPlaceId(place.image_url))
console.log(`${apply ? "APPLY" : "DRY RUN"}: ${targets.length} legacy Place ID URLs`)

let verified = 0
let rejected = 0
let failed = 0
for (let index = 0; index < targets.length; index += 1) {
  const place = targets[index]
  const placeId = embeddedPlaceId(place.image_url)
  try {
    const details = await getDetails(placeId)
    const result = assess(place, details)
    const distanceLabel = result.distance === null ? "unknown" : `${result.distance.toFixed(2)}km`
    if (!result.accepted) {
      rejected += 1
      console.log(`[${index + 1}/${targets.length}] SKIP ${place.name} -> ${result.name} / ${distanceLabel} / ${result.nameScore.toFixed(2)}`)
      continue
    }
    verified += 1
    console.log(`[${index + 1}/${targets.length}] MATCH ${place.name} -> ${result.name} / ${distanceLabel}`)
    if (apply) {
      const { error: updateError } = await supabase
        .from("places")
        .update({ image_url: `https://places.googleapis.com/v1/places/${placeId}` })
        .eq("id", place.id)
      if (updateError) throw new Error(updateError.message)
    }
  } catch (targetError) {
    failed += 1
    console.log(`[${index + 1}/${targets.length}] ERROR ${place.name}: ${targetError instanceof Error ? targetError.message : targetError}`)
  }
}

console.log(`DONE: verified ${verified}, skipped ${rejected}, errors ${failed}`)
if (!apply) console.log("No data changed.")
