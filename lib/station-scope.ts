import { supabase } from "@/lib/supabase/client"
import type { PlaceWithAvgRating } from "@/lib/places"

/**
 * 駅からの絞り込み。/spots?station=<id>&walk=800 で使う。
 * 「車を持たない世帯が電車で行ける場所を探す」導線。
 */

export interface StationOption {
  id: string
  name: string
  prefecture: string | null
  lineName: string | null
}

async function safe<T>(run: () => PromiseLike<{ data: T | null; error: unknown }>, fallback: T): Promise<T> {
  try {
    const { data, error } = await run()
    if (error) return fallback
    return data ?? fallback
  } catch {
    return fallback
  }
}

/** 施設が紐付いている駅だけを返す (空振りする駅を出さない) */
export async function getStationsWithPlaces(): Promise<StationOption[]> {
  const links = await safe<Array<{ station_id: string }>>(
    () =>
      supabase
        .from("facility_station_access" as never)
        .select("station_id")
        .limit(5000)
        .then((result) => ({ data: (result.data ?? []) as Array<{ station_id: string }>, error: result.error })),
    [],
  )
  const ids = [...new Set(links.map((link) => link.station_id))]
  if (ids.length === 0) return []

  const stations = await safe<Array<{ id: string; name: string; line: { name: string } | null }>>(
    () =>
      supabase
        .from("stations" as never)
        .select("id,name,line:railway_lines(name)")
        .in("id", ids)
        .order("name")
        .then((result) => ({ data: (result.data ?? []) as never[], error: result.error })),
    [],
  )
  return stations.map((station) => ({
    id: station.id,
    name: station.name,
    prefecture: null,
    lineName: station.line?.name ?? null,
  }))
}

export async function getStationById(id: string): Promise<StationOption | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  return safe<StationOption | null>(
    () =>
      supabase
        .from("stations" as never)
        .select("id,name,line:railway_lines(name)")
        .eq("id", id)
        .maybeSingle()
        .then((result) => {
          const row = result.data as unknown as { id: string; name: string; line: { name: string } | null } | null
          return {
            data: row ? { id: row.id, name: row.name, prefecture: null, lineName: row.line?.name ?? null } : null,
            error: result.error,
          }
        }),
    null,
  )
}

/** 指定駅から walkMeters 以内の施設IDと距離 */
export async function getPlaceDistancesForStation(
  stationId: string,
  walkMeters: number,
): Promise<Map<string, number>> {
  const rows = await safe<Array<{ place_id: string; distance_meters: number | null }>>(
    () =>
      supabase
        .from("facility_station_access" as never)
        .select("place_id,distance_meters")
        .eq("station_id", stationId)
        .lte("distance_meters", walkMeters)
        .then((result) => ({ data: (result.data ?? []) as never[], error: result.error })),
    [],
  )
  return new Map(rows.map((row) => [row.place_id, row.distance_meters ?? 0]))
}

export async function applyStationScope(
  places: PlaceWithAvgRating[],
  stationId: string | undefined,
  walkMeters: number,
): Promise<PlaceWithAvgRating[]> {
  if (!stationId) return places
  const distances = await getPlaceDistancesForStation(stationId, walkMeters)
  return places
    .filter((place) => distances.has(place.id))
    .sort((left, right) => (distances.get(left.id) ?? 0) - (distances.get(right.id) ?? 0))
}
