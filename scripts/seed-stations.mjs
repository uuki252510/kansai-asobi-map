/**
 * 駅マスタを投入し、各施設と駅の距離を計算して facility_station_access を作る。
 * 施設ごとに最寄り3駅まで、1200m以内のものだけを登録する。
 *
 * Dry run: npx tsx scripts/seed-stations.mjs
 * Apply:   npx tsx scripts/seed-stations.mjs --apply
 */

import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
import { RAILWAY_LINES, STATIONS, walkMinutes } from "../lib/station-data.ts"

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
const MAX_DISTANCE_METERS = 1200
const MAX_STATIONS_PER_PLACE = 3

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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

async function main() {
  console.log(`路線 ${RAILWAY_LINES.length} / 駅 ${STATIONS.length} (apply=${apply})`)

  // --- 路線 ---
  const lineIdByName = new Map()
  for (const line of RAILWAY_LINES) {
    const existing = await supabase.from("railway_lines").select("id").eq("name", line.name).maybeSingle()
    if (existing.data?.id) {
      lineIdByName.set(line.name, existing.data.id)
      continue
    }
    if (!apply) {
      lineIdByName.set(line.name, `dry-${line.name}`)
      continue
    }
    const { data, error } = await supabase
      .from("railway_lines")
      .insert({ name: line.name, company_name: line.company })
      .select("id")
      .single()
    if (error) throw new Error(`railway_lines: ${error.message}`)
    lineIdByName.set(line.name, data.id)
  }
  console.log(`路線: ${lineIdByName.size} 件`)

  // --- 駅 ---
  const stationIdByName = new Map()
  let newStations = 0
  for (const station of STATIONS) {
    const key = `${station.name}|${station.line}`
    const existing = await supabase
      .from("stations")
      .select("id")
      .eq("name", station.name)
      .eq("line_id", lineIdByName.get(station.line) ?? null)
      .maybeSingle()
    if (existing.data?.id) {
      stationIdByName.set(key, existing.data.id)
      continue
    }
    if (!apply) {
      stationIdByName.set(key, `dry-${key}`)
      newStations += 1
      continue
    }
    const { data, error } = await supabase
      .from("stations")
      .insert({
        name: station.name,
        line_id: lineIdByName.get(station.line),
        latitude: station.latitude,
        longitude: station.longitude,
      })
      .select("id")
      .single()
    if (error) throw new Error(`stations: ${error.message}`)
    stationIdByName.set(key, data.id)
    newStations += 1
  }
  console.log(`駅: 新規 ${newStations} 件`)

  // --- 施設 × 駅 ---
  const places = await fetchAll("places", "id,name,latitude,longitude,prefecture")
  const withCoords = places.filter((place) => place.latitude !== null && place.longitude !== null)
  console.log(`座標のある施設: ${withCoords.length} / ${places.length}`)

  let links = 0
  let placesWithStation = 0
  const rows = []

  for (const place of withCoords) {
    const nearby = STATIONS
      .map((station) => ({
        station,
        meters: distanceMeters(place.latitude, place.longitude, station.latitude, station.longitude),
      }))
      .filter((entry) => entry.meters <= MAX_DISTANCE_METERS)
      .sort((left, right) => left.meters - right.meters)
      .slice(0, MAX_STATIONS_PER_PLACE)

    if (nearby.length === 0) continue
    placesWithStation += 1
    nearby.forEach((entry, index) => {
      rows.push({
        place_id: place.id,
        station_id: stationIdByName.get(`${entry.station.name}|${entry.station.line}`),
        distance_meters: Math.round(entry.meters),
        walking_minutes: walkMinutes(entry.meters),
        route_description: `${entry.station.name}駅から徒歩約${walkMinutes(entry.meters)}分`,
        sort_order: index,
      })
      links += 1
    })
    if (placesWithStation <= 10) {
      console.log(`  ${place.name}: ${nearby.map((e) => `${e.station.name}(${Math.round(e.meters)}m)`).join(", ")}`)
    }
  }

  if (apply && rows.length > 0) {
    // 既存を消してから入れ直す (再実行で重複しない)
    for (let index = 0; index < rows.length; index += 500) {
      const chunk = rows.slice(index, index + 500)
      const { error } = await supabase
        .from("facility_station_access")
        .upsert(chunk, { onConflict: "place_id,station_id" })
      if (error) throw new Error(`facility_station_access: ${error.message}`)
    }
  }

  console.log(`\nDONE: ${placesWithStation} 施設に ${links} 件の駅リンク${apply ? "" : " (dry run)"}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
