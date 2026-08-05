/**
 * Store stable Google Place resource URLs instead of expiring photo URLs.
 * Candidates are verified by name, address, and coordinate distance.
 *
 * Dry run: node scripts/sync-google-place-images.mjs --limit=20
 * Apply:   node scripts/sync-google-place-images.mjs --apply --all
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
if (!supabaseUrl || !serviceRoleKey || !googleApiKey) {
  console.error("Required Supabase or Google environment variables are missing.")
  process.exit(1)
}

const argumentsSet = new Set(process.argv.slice(2))
const apply = argumentsSet.has("--apply")
const all = argumentsSet.has("--all")
const limitArgument = process.argv.find((value) => value.startsWith("--limit="))
const offsetArgument = process.argv.find((value) => value.startsWith("--offset="))
const limit = all ? Number.POSITIVE_INFINITY : Math.max(1, Number(limitArgument?.split("=")[1] ?? 20))
const offset = Math.max(0, Number(offsetArgument?.split("=")[1] ?? 0))

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const sleep = (milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds))

function normalize(value = "") {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/株式会社|有限会社|一般社団法人|公益財団法人|財団法人/g, "")
    .replace(/[\s・･\-‐‑–—ー「」『』【】\[\]、。，．\/]/g, "")
}

function bigrams(value) {
  if (value.length < 2) return value ? [value] : []
  return Array.from({ length: value.length - 1 }, (_, index) => value.slice(index, index + 2))
}

function diceSimilarity(left, right) {
  if (!left || !right) return 0
  if (left === right) return 1
  const leftPairs = bigrams(left)
  const rightPairs = bigrams(right)
  const rightCounts = new Map()
  for (const pair of rightPairs) rightCounts.set(pair, (rightCounts.get(pair) ?? 0) + 1)
  let overlap = 0
  for (const pair of leftPairs) {
    const count = rightCounts.get(pair) ?? 0
    if (count > 0) {
      overlap += 1
      rightCounts.set(pair, count - 1)
    }
  }
  return (2 * overlap) / (leftPairs.length + rightPairs.length)
}

function nameSimilarity(placeName, candidateName) {
  const place = normalize(placeName)
  const candidate = normalize(candidateName)
  if (!place || !candidate) return 0
  if (place === candidate) return 1
  const shorter = place.length <= candidate.length ? place : candidate
  const longer = place.length > candidate.length ? place : candidate
  const containment = longer.includes(shorter) && shorter.length >= 3
    ? 0.72 + Math.min(0.18, (shorter.length / longer.length) * 0.18)
    : 0
  return Math.max(containment, diceSimilarity(place, candidate))
}

function hasCoordinate(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))
}

function haversineKm(left, right) {
  if (!Number.isFinite(left?.latitude) || !Number.isFinite(left?.longitude)) return null
  if (!Number.isFinite(right?.latitude) || !Number.isFinite(right?.longitude)) return null
  const radians = (degrees) => degrees * Math.PI / 180
  const latitudeDelta = radians(right.latitude - left.latitude)
  const longitudeDelta = radians(right.longitude - left.longitude)
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(left.latitude)) * Math.cos(radians(right.latitude))
    * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function distancePoints(distanceKm) {
  if (distanceKm === null) return 0
  if (distanceKm <= 0.25) return 24
  if (distanceKm <= 0.75) return 20
  if (distanceKm <= 2) return 15
  if (distanceKm <= 5) return 8
  if (distanceKm <= 12) return 1
  return -35
}

function assessCandidate(place, candidate) {
  const candidateName = candidate.displayName?.text ?? ""
  const candidateAddress = candidate.formattedAddress ?? ""
  const normalizedAddress = normalize(candidateAddress)
  const nameScore = nameSimilarity(place.name, candidateName)
  const prefectureMatch = Boolean(normalize(place.prefecture) && normalizedAddress.includes(normalize(place.prefecture)))
  const cityMatch = Boolean(normalize(place.city) && normalizedAddress.includes(normalize(place.city)))
  const distanceKm = haversineKm(
    { latitude: Number(place.latitude), longitude: Number(place.longitude) },
    candidate.location,
  )
  const score = nameScore * 65
    + (prefectureMatch ? 12 : -30)
    + (cityMatch ? 8 : 0)
    + distancePoints(distanceKm)
  const hasPhoto = Array.isArray(candidate.photos) && candidate.photos.length > 0
  const closeCoordinateMatch = distanceKm !== null && distanceKm <= 0.8 && nameScore >= 0.32
  const strongNameMatch = nameScore >= 0.72 && (distanceKm === null || distanceKm <= 12 || cityMatch)
  const balancedMatch = nameScore >= 0.48 && cityMatch && distanceKm !== null && distanceKm <= 4
  const accepted = Boolean(
    candidate.id
      && hasPhoto
      && prefectureMatch
      && distanceKm !== null
      && distanceKm <= 20
      && score >= 66
      && (strongNameMatch || balancedMatch || closeCoordinateMatch),
  )

  return { candidate, candidateName, distanceKm, score, accepted }
}

async function searchGooglePlace(place) {
  const body = {
    textQuery: [place.name, place.address].filter(Boolean).join(" "),
    languageCode: "ja",
    regionCode: "JP",
    pageSize: 5,
  }
  if (hasCoordinate(place.latitude) && hasCoordinate(place.longitude)) {
    body.locationBias = {
      circle: {
        center: { latitude: Number(place.latitude), longitude: Number(place.longitude) },
        radius: 5000,
      },
    }
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": googleApiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.photos",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) {
    const details = (await response.text()).slice(0, 240)
    throw new Error(`Google Places ${response.status}: ${details}`)
  }

  const payload = await response.json()
  const assessed = (payload.places ?? [])
    .map((candidate) => assessCandidate(place, candidate))
    .sort((left, right) => right.score - left.score)
  const winner = assessed[0] ?? null
  const runnerUp = assessed[1] ?? null
  if (!winner?.accepted) return { winner, accepted: false, reason: "low confidence" }
  if (runnerUp?.accepted && winner.candidate.id !== runnerUp.candidate.id && winner.score - runnerUp.score < 4) {
    return { winner, accepted: false, reason: "ambiguous" }
  }
  return { winner, accepted: true, reason: "matched" }
}

function placeResourceUrl(placeId) {
  return `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`
}

function displayDistance(distanceKm) {
  return distanceKm === null ? "unknown distance" : `${distanceKm.toFixed(2)}km`
}

async function main() {
  const { data, error } = await supabase
    .from("places")
    .select("id,name,address,city,prefecture,latitude,longitude,image_url")
    .eq("is_published", true)
    .order("created_at", { ascending: true })
  if (error) throw new Error(`Supabase: ${error.message}`)

  const targets = (data ?? [])
    .filter((place) => !place.image_url?.startsWith("https://places.googleapis.com/v1/places/"))
    .slice(offset, Number.isFinite(limit) ? offset + limit : undefined)
  console.log(`${apply ? "APPLY" : "DRY RUN"}: ${targets.length} records (offset ${offset})`)

  let matched = 0
  let updated = 0
  let rejected = 0
  let errors = 0
  for (let index = 0; index < targets.length; index += 1) {
    const place = targets[index]
    try {
      const result = await searchGooglePlace(place)
      const best = result.winner
      if (!result.accepted || !best) {
        console.log(`[${index + 1}/${targets.length}] SKIP ${place.name} - ${result.reason}${best ? ` / ${best.candidateName} / ${displayDistance(best.distanceKm)} / ${best.score.toFixed(1)}` : ""}`)
        rejected += 1
      } else {
        matched += 1
        console.log(`[${index + 1}/${targets.length}] MATCH ${place.name} -> ${best.candidateName} / ${displayDistance(best.distanceKm)} / ${best.score.toFixed(1)}`)
        if (apply) {
          const { error: updateError } = await supabase
            .from("places")
            .update({ image_url: placeResourceUrl(best.candidate.id) })
            .eq("id", place.id)
          if (updateError) throw new Error(`Update failed: ${updateError.message}`)
          updated += 1
        }
      }
    } catch (error) {
      errors += 1
      console.log(`[${index + 1}/${targets.length}] ERROR ${place.name} - ${error instanceof Error ? error.message : String(error)}`)
    }
    await sleep(120)
  }

  console.log(`DONE: matched ${matched}, updated ${updated}, skipped ${rejected}, errors ${errors}`)
  if (!apply) console.log("No data changed. Add --apply to persist verified Place IDs.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
