import { unstable_cache } from "next/cache"
import { supabase } from "./supabase/client"
import type { IndoorType, Place, Prefecture, PriceType, Review, TargetAge } from "./supabase/database.types"

export interface PlaceFilters {
  prefecture?: string
  indoor_type?: string
  target_age?: string
  price_type?: string
  has_parking?: boolean
  has_nursing_room?: boolean
  has_diaper_space?: boolean
  rainy_day_ok?: boolean
  search?: string
}

/**
 * 写真の確実性ランク。Storage取り込み済み > 生きた外部URL > なし。
 * ポータルとして写真が無い施設を前面に出さないための共通判定。
 */
export function placePhotoRank(place: Pick<Place, "image_storage_path" | "image_url">): number {
  if (place.image_storage_path) return 2
  if (place.image_url) return 1
  return 0
}

/** 元の並びを保ちながら、写真なしを後ろへ送る安定ソート */
export function sortPhotosFirst<T extends Pick<Place, "image_storage_path" | "image_url">>(list: T[]): T[] {
  return [...list].sort((a, b) => placePhotoRank(b) - placePhotoRank(a))
}

export interface PlaceWithAvgRating extends Place {
  avg_rating: number | null
  review_count: number
}

type PlaceRecord = Partial<Place> & {
  id: string
  name: string
  created_at: string
  reviews?: { rating: number }[]
}

export function normalizePlace(row: PlaceRecord): Place {
  return {
    ...(row as Place),
    target_ages: Array.isArray(row.target_ages) ? row.target_ages : [],
    mood_tags: Array.isArray(row.mood_tags) ? row.mood_tags : [],
    companion_types: Array.isArray(row.companion_types) ? row.companion_types : [],
    recommended_weather: Array.isArray(row.recommended_weather) ? row.recommended_weather : [],
    recommended_seasons: Array.isArray(row.recommended_seasons) ? row.recommended_seasons : [],
    recommended_time_of_day: Array.isArray(row.recommended_time_of_day) ? row.recommended_time_of_day : [],
    average_stay_minutes: row.average_stay_minutes ?? null,
    activity_level: row.activity_level ?? null,
    healing_score: row.healing_score ?? null,
    child_fun_score: row.child_fun_score ?? null,
    date_score: row.date_score ?? null,
    photo_score: row.photo_score ?? null,
    rainy_day_score: row.rainy_day_score ?? null,
    crowd_level: row.crowd_level ?? null,
    price_min: row.price_min ?? null,
    price_max: row.price_max ?? null,
    recommended_age_min: row.recommended_age_min ?? null,
    recommended_age_max: row.recommended_age_max ?? null,
    reservation_required: row.reservation_required ?? null,
    same_day_booking: row.same_day_booking ?? null,
    stroller_accessible: row.stroller_accessible ?? null,
    barrier_free: row.barrier_free ?? null,
    pet_friendly: row.pet_friendly ?? null,
    meal_available: row.meal_available ?? null,
    image_storage_path: row.image_storage_path ?? null,
    last_verified_at: row.last_verified_at ?? null,
    updated_at: row.updated_at ?? row.created_at,
  }
}

function withRating(row: PlaceRecord): PlaceWithAvgRating {
  const reviews = row.reviews ?? []
  const avgRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : null
  return {
    ...normalizePlace(row),
    avg_rating: avgRating,
    review_count: reviews.length,
  }
}

const PAGE_SIZE = 1000

/**
 * Supabaseの1リクエスト1000行上限を超えても全件取れるよう .range() でページングする。
 */
async function fetchAllRows<T>(buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) break
  }
  return rows
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlacesQuery = any

/**
 * フィルタ適用を一覧・件数カウントで共有するビルダー。
 */
export function applyPlaceFilters(query: PlacesQuery, filters: PlaceFilters): PlacesQuery {
  if (filters.prefecture) query = query.eq("prefecture", filters.prefecture as Prefecture)
  if (filters.indoor_type) query = query.eq("indoor_type", filters.indoor_type as IndoorType)
  if (filters.price_type) query = query.eq("price_type", filters.price_type as PriceType)
  if (filters.has_parking) query = query.eq("has_parking", true)
  if (filters.has_nursing_room) query = query.eq("has_nursing_room", true)
  if (filters.has_diaper_space) query = query.eq("has_diaper_space", true)
  if (filters.rainy_day_ok) query = query.eq("rainy_day_ok", true)
  if (filters.target_age) query = query.contains("target_ages", [filters.target_age as TargetAge])
  if (filters.search) {
    const safeSearch = filters.search.replace(/[,%()]/g, " ").trim()
    if (safeSearch) {
      query = query.or(
        `name.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%,city.ilike.%${safeSearch}%`,
      )
    }
  }
  return query
}

type ViewRecord = PlaceRecord & { avg_rating: number | string | null; review_count: number | null }

function fromViewRow(row: ViewRecord): PlaceWithAvgRating {
  return {
    ...normalizePlace(row),
    avg_rating: row.avg_rating === null ? null : Number(row.avg_rating),
    review_count: row.review_count ?? 0,
  }
}

/**
 * places_with_rating view から取得。view未適用環境では旧join経路にフォールバック。
 */
export async function getPlaces(filters: PlaceFilters = {}): Promise<PlaceWithAvgRating[]> {
  try {
    const rows = await fetchAllRows<ViewRecord>((from, to) =>
      applyPlaceFilters(
        supabase
          .from("places_with_rating" as "places")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false }).order("id"),
        filters,
      ).range(from, to),
    )
    return sortPhotosFirst(rows.map(fromViewRow))
  } catch {
    const rows = await fetchAllRows<PlaceRecord>((from, to) =>
      applyPlaceFilters(
        supabase
          .from("places")
          .select("*, reviews(rating)")
          .eq("is_published", true)
          .order("created_at", { ascending: false }).order("id"),
        filters,
      ).range(from, to),
    )
    return sortPhotosFirst(rows.map((row) => withRating(row)))
  }
}

export async function getPlacesByIds(ids: string[]): Promise<PlaceWithAvgRating[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from("places")
    .select("*, reviews(rating)")
    .eq("is_published", true)
    .in("id", ids)

  if (error) throw error
  const order = new Map(ids.map((id, index) => [id, index]))
  return (data ?? [])
    .map((row) => withRating(row as unknown as PlaceRecord))
    .sort((left, right) => (order.get(left.id) ?? 999) - (order.get(right.id) ?? 999))
}

/**
 * 重複統合で非公開化した施設の統合先を返す。
 * 旧URLを404にせず、統合先へ301するために使う。
 */
export async function getMergedTarget(id: string): Promise<string | null> {
  try {
    // places の RLS は公開行のみ select 可のため、専用ビュー経由で読む
    const { data } = await supabase
      .from("place_redirects" as never)
      .select("merged_into_place_id")
      .eq("id", id)
      .maybeSingle()
    return (data as { merged_into_place_id: string | null } | null)?.merged_into_place_id ?? null
  } catch {
    return null
  }
}

export async function getPlaceById(id: string): Promise<(Place & { reviews: Review[] }) | null> {
  const { data, error } = await supabase
    .from("places")
    .select("*, reviews(*)")
    .eq("id", id)
    .eq("is_published", true)
    .single()

  if (error || !data) return null
  const record = data as unknown as PlaceRecord & { reviews?: Review[] }
  return {
    ...normalizePlace(record),
    reviews: record.reviews ?? [],
  }
}

/**
 * フィルタなし全件のサーバーキャッシュ版。/recommend /map /when など
 * 全件を必要とするページはこれを共有する (5分ごとに再検証、adminの
 * revalidateTag("places") で即時更新)。
 */
export const getAllPlaces = unstable_cache(
  () => getPlaces({}),
  ["all-places"],
  { revalidate: 300, tags: ["places"] },
)

export async function getPublishedPlaceIndex() {
  try {
    return await fetchAllRows<{ id: string; created_at: string; updated_at: string | null }>((from, to) =>
      supabase
        .from("places")
        .select("id, created_at, updated_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false }).order("id")
        .range(from, to),
    )
  } catch {
    return []
  }
}

export function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radius = 6371
  const latitudeDelta = ((lat2 - lat1) * Math.PI) / 180
  const longitudeDelta = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(longitudeDelta / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function getPopularPlaces(limit = 10): Promise<PlaceWithAvgRating[]> {
  const all = await getAllPlaces()
  return all
    .sort((left, right) => {
      if (right.review_count !== left.review_count) return right.review_count - left.review_count
      return (right.avg_rating ?? 0) - (left.avg_rating ?? 0)
    })
    .slice(0, limit)
}

const FEATURED_NAMES: Record<string, string[]> = {
  大阪府: ["ユニバーサル・スタジオ・ジャパン（USJ）", "海遊館", "キッズプラザ大阪", "天王寺動物園"],
  兵庫県: ["神戸どうぶつ王国", "六甲山アスレチックパーク GREENIA", "ひょうごこどもの館", "姫路城"],
  京都府: ["京都水族館", "東映太秦映画村", "梅小路公園"],
  奈良県: ["奈良公園", "アスレチックの森（奈良）", "ならファミリー屋上遊園地"],
  滋賀県: ["びわ湖こどもの国", "滋賀県立琵琶湖博物館", "マキノ高原"],
  和歌山県: ["アドベンチャーワールド", "串本海中公園", "和歌山城"],
}

export async function getRecommendedPlaces(): Promise<PlaceWithAvgRating[]> {
  const result: PlaceWithAvgRating[] = []

  for (const [prefecture, names] of Object.entries(FEATURED_NAMES)) {
    const { data } = await supabase
      .from("places")
      .select("*, reviews(rating)")
      .eq("is_published", true)
      .eq("prefecture", prefecture as Prefecture)
      .in("name", names)
      .or("image_storage_path.not.is.null,image_url.not.is.null")

    if (data?.length) {
      const sorted = [...data].sort((left, right) => {
        const leftIndex = names.indexOf((left as PlaceRecord).name)
        const rightIndex = names.indexOf((right as PlaceRecord).name)
        return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex)
      })
      result.push(withRating(sorted[0] as unknown as PlaceRecord))
      continue
    }

    const { data: fallback } = await supabase
      .from("places")
      .select("*, reviews(rating)")
      .eq("is_published", true)
      .eq("prefecture", prefecture as Prefecture)
      .or("image_storage_path.not.is.null,image_url.not.is.null")
      .eq("has_parking", true)
      .limit(1)

    if (fallback?.length) result.push(withRating(fallback[0] as unknown as PlaceRecord))
  }

  return result
}

export const PREFECTURES = ["大阪府", "兵庫県", "京都府", "奈良県", "滋賀県", "和歌山県"] as const

export const AREA_SLUGS: Record<string, (typeof PREFECTURES)[number]> = {
  osaka: "大阪府",
  hyogo: "兵庫県",
  kyoto: "京都府",
  nara: "奈良県",
  shiga: "滋賀県",
  wakayama: "和歌山県",
}

export const CONDITION_LABELS: Record<string, string> = {
  rainy_day_ok: "雨の日OK",
  indoor: "屋内",
  free: "無料",
  has_parking: "駐車場あり",
  has_nursing_room: "授乳室あり",
  has_diaper_space: "おむつ替えあり",
  "0-2": "0〜2歳向け",
  "6-12": "小学生向け",
}
