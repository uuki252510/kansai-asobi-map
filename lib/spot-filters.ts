import type { CompanionType } from "@/lib/supabase/database.types"
import type { PlaceWithAvgRating } from "@/lib/places"

/**
 * 一覧のクライアントサイド絞り込み。
 * サーバは search (ilike) のみ担当し、それ以外はこの関数で即時適用する。
 * FilterSheet の「この条件で N件を見る」動的カウントも同じ関数を通す。
 */
export interface SpotFilterState {
  prefecture: string
  indoorType: string
  priceType: string
  targetAge: string
  companion: string
  rainy_day_ok: boolean
  has_parking: boolean
  has_nursing_room: boolean
  has_diaper_space: boolean
}

export const EMPTY_FILTERS: SpotFilterState = {
  prefecture: "",
  indoorType: "",
  priceType: "",
  targetAge: "",
  companion: "",
  rainy_day_ok: false,
  has_parking: false,
  has_nursing_room: false,
  has_diaper_space: false,
}

export const COMPANION_OPTIONS: Array<{ value: CompanionType | ""; label: string }> = [
  { value: "", label: "誰とでも" },
  { value: "family", label: "家族" },
  { value: "children", label: "子ども連れ" },
  { value: "couple", label: "カップル" },
  { value: "friends", label: "友だち" },
  { value: "solo", label: "ひとりで" },
  { value: "multigenerational", label: "三世代" },
]

export function filtersFromParams(params: Record<string, string | undefined>): SpotFilterState {
  return {
    prefecture: params.prefecture ?? "",
    indoorType: params.indoor_type ?? "",
    priceType: params.price_type ?? "",
    targetAge: params.target_age ?? "",
    companion: params.companion ?? "",
    rainy_day_ok: params.rainy_day_ok === "true",
    has_parking: params.has_parking === "true",
    has_nursing_room: params.has_nursing_room === "true",
    has_diaper_space: params.has_diaper_space === "true",
  }
}

export function filtersToParams(filters: SpotFilterState, extra: Record<string, string> = {}): URLSearchParams {
  const params = new URLSearchParams()
  if (extra.search) params.set("search", extra.search)
  if (filters.prefecture) params.set("prefecture", filters.prefecture)
  if (filters.indoorType) params.set("indoor_type", filters.indoorType)
  if (filters.priceType) params.set("price_type", filters.priceType)
  if (filters.targetAge) params.set("target_age", filters.targetAge)
  if (filters.companion) params.set("companion", filters.companion)
  if (filters.rainy_day_ok) params.set("rainy_day_ok", "true")
  if (filters.has_parking) params.set("has_parking", "true")
  if (filters.has_nursing_room) params.set("has_nursing_room", "true")
  if (filters.has_diaper_space) params.set("has_diaper_space", "true")
  for (const [key, value] of Object.entries(extra)) {
    if (key !== "search" && value) params.set(key, value)
  }
  return params
}

export function countActiveFilters(filters: SpotFilterState): number {
  let count = 0
  if (filters.prefecture) count += 1
  if (filters.indoorType) count += 1
  if (filters.priceType) count += 1
  if (filters.targetAge) count += 1
  if (filters.companion) count += 1
  if (filters.rainy_day_ok) count += 1
  if (filters.has_parking) count += 1
  if (filters.has_nursing_room) count += 1
  if (filters.has_diaper_space) count += 1
  return count
}

export function applySpotFilters(places: PlaceWithAvgRating[], filters: SpotFilterState): PlaceWithAvgRating[] {
  return places.filter((place) => {
    if (filters.prefecture && place.prefecture !== filters.prefecture) return false
    if (filters.indoorType && place.indoor_type !== filters.indoorType) return false
    if (filters.priceType && place.price_type !== filters.priceType) return false
    if (filters.targetAge && !place.target_ages.includes(filters.targetAge as (typeof place.target_ages)[number])) return false
    if (filters.companion) {
      const companions = place.companion_types ?? []
      // companion_types 未登録 (空配列) は「誰でも歓迎」とみなす
      if (companions.length > 0 && !companions.includes(filters.companion as CompanionType)) return false
    }
    if (filters.rainy_day_ok && !place.rainy_day_ok) return false
    if (filters.has_parking && !place.has_parking) return false
    if (filters.has_nursing_room && !place.has_nursing_room) return false
    if (filters.has_diaper_space && !place.has_diaper_space) return false
    return true
  })
}
