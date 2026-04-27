/**
 * CSV import script for kansai-asobi-map.
 * Run: node scripts/import-csv.mjs
 *
 * CSV quirk: target_ages and tags are unquoted multi-value fields.
 * We detect price_type (free|paid|low|mixed) to find the split point.
 */

import { readFileSync } from "fs"
import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.mjs"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local manually (no dotenv dep needed)
const envPath = resolve(__dirname, "../.env.local")
const envVars = {}
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.+)$/)
  if (m) envVars[m[1]] = m[2].trim()
}

const SUPABASE_URL = envVars["NEXT_PUBLIC_SUPABASE_URL"]
const SERVICE_ROLE_KEY = envVars["SUPABASE_SERVICE_ROLE_KEY"]

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const PRICE_TYPES = new Set(["free", "paid", "low", "mixed"])

function parseBool(v) {
  return v === "true"
}

function parseTargetAges(parts) {
  return parts.map((a) => (a === "elementary" ? "6-12" : a))
}

function mapPriceType(v) {
  if (v === "low") return "mixed"
  if (PRICE_TYPES.has(v)) return v
  return "free"
}

/**
 * Each CSV row has an irregular number of columns because target_ages and
 * tags are stored as unquoted comma-separated values inside the row.
 *
 * Fixed prefix (cols 0-6):  name, prefecture, city, address, lat, lng, indoor_type
 * Variable:                 target_ages... (until price_type keyword)
 * Fixed after price_type:   price_type, rainy_day_ok, has_parking, has_nursing_room,
 *                           has_diaper_space, opening_hours, closed_days,
 *                           official_url, google_map_url, image_url, description
 * Variable:                 tags... (until last col)
 * Last col:                 source_url
 */
function parseRow(parts) {
  // Find price_type index (search forward from col 7)
  let ptIdx = -1
  for (let i = 7; i < parts.length; i++) {
    if (PRICE_TYPES.has(parts[i])) {
      ptIdx = i
      break
    }
  }
  if (ptIdx === -1) return null

  const targetAgesRaw = parts.slice(7, ptIdx)
  const priceType = mapPriceType(parts[ptIdx])

  const base = ptIdx + 1
  const rainyDayOk = parseBool(parts[base])
  const hasParking = parseBool(parts[base + 1])
  const hasNursingRoom = parseBool(parts[base + 2])
  const hasDiaperSpace = parseBool(parts[base + 3])
  const openingHours = parts[base + 4] || null
  // closed_days is base+5 (not in schema — skip)
  const officialUrl = parts[base + 6] || null
  const googleMapUrl = parts[base + 7] || null
  const imageUrl = parts[base + 8] || null
  const description = parts[base + 9] || null
  // tags: base+10 to last-1; source_url: last (not in schema — skip)

  return {
    name: parts[0],
    prefecture: parts[1],
    city: parts[2],
    address: parts[3],
    latitude: parseFloat(parts[4]) || null,
    longitude: parseFloat(parts[5]) || null,
    indoor_type: parts[6],
    target_ages: parseTargetAges(targetAgesRaw),
    price_type: priceType,
    rainy_day_ok: rainyDayOk,
    has_parking: hasParking,
    has_nursing_room: hasNursingRoom,
    has_diaper_space: hasDiaperSpace,
    opening_hours: openingHours,
    image_url: imageUrl || null,
    google_map_url: googleMapUrl || null,
    description,
    is_published: true,
  }
}

function parseCsv(filePath) {
  const rows = readFileSync(filePath, "utf8").split("\n")
  const records = []
  for (let i = 1; i < rows.length; i++) {
    const line = rows[i].trim()
    if (!line) continue
    const parts = line.split(",")
    const record = parseRow(parts)
    if (record) records.push(record)
    else console.warn(`  [skip] row ${i + 1}: could not find price_type`)
  }
  return records
}

async function importFile(label, filePath) {
  console.log(`\nImporting ${label}...`)
  const records = parseCsv(filePath)
  console.log(`  Parsed ${records.length} records`)

  // Upsert in batches of 20
  let inserted = 0
  for (let i = 0; i < records.length; i += 20) {
    const batch = records.slice(i, i + 20)
    const { error } = await supabase.from("places").insert(batch)
    if (error) {
      console.error(`  ERROR at batch ${i / 20 + 1}:`, error.message)
    } else {
      inserted += batch.length
      console.log(`  ${inserted}/${records.length} done`)
    }
  }
  return inserted
}

const parks = resolve(__dirname, "kansai_parks.csv")
const spots = resolve(__dirname, "kansai_kids_spots.csv")

const t1 = await importFile("kansai_parks.csv", parks)
const t2 = await importFile("kansai_kids_spots.csv", spots)

console.log(`\nDone. Total inserted: ${t1 + t2}`)
