import { supabase } from './supabase/client'
import type { Place, Review } from './supabase/database.types'

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

export interface PlaceWithAvgRating extends Place {
  avg_rating: number | null
  review_count: number
}

export async function getPlaces(filters: PlaceFilters = {}): Promise<PlaceWithAvgRating[]> {
  let query = supabase
    .from('places')
    .select(`
      *,
      reviews (rating)
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (filters.prefecture) {
    query = query.eq('prefecture', filters.prefecture)
  }
  if (filters.indoor_type) {
    query = query.eq('indoor_type', filters.indoor_type)
  }
  if (filters.price_type) {
    query = query.eq('price_type', filters.price_type)
  }
  if (filters.has_parking) {
    query = query.eq('has_parking', true)
  }
  if (filters.has_nursing_room) {
    query = query.eq('has_nursing_room', true)
  }
  if (filters.has_diaper_space) {
    query = query.eq('has_diaper_space', true)
  }
  if (filters.rainy_day_ok) {
    query = query.eq('rainy_day_ok', true)
  }
  if (filters.target_age) {
    query = query.contains('target_ages', [filters.target_age])
  }
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,city.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw error

  return (data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const place = row as any
    const reviews: { rating: number }[] = place.reviews ?? []
    const avg_rating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null
    return { ...(place as Place), avg_rating, review_count: reviews.length }
  })
}

export async function getPlaceById(id: string): Promise<(Place & { reviews: Review[] }) | null> {
  const { data, error } = await supabase
    .from('places')
    .select(`*, reviews(*)`)
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (error) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any as Place & { reviews: Review[] }
}

export function calcDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function getPopularPlaces(limit = 10): Promise<PlaceWithAvgRating[]> {
  const all = await getPlaces({})
  return all
    .sort((a, b) => {
      if (b.review_count !== a.review_count) return b.review_count - a.review_count
      return (b.avg_rating ?? 0) - (a.avg_rating ?? 0)
    })
    .slice(0, limit)
}

const FEATURED_NAMES: Record<string, string[]> = {
  '大阪府': ['ユニバーサル・スタジオ・ジャパン（USJ）', '海遊館', 'キッズプラザ大阪', '天王寺動物園'],
  '兵庫県': ['神戸どうぶつ王国', '六甲山アスレチックパーク GREENIA', 'ひょうごこどもの館', '姫路城'],
  '京都府': ['京都水族館', '東映太秦映画村', '梅小路公園'],
  '奈良県': ['奈良公園', 'アスレチックの森（奈良）', 'ならファミリー屋上遊園地'],
  '滋賀県': ['びわ湖こどもの国', '滋賀県立琵琶湖博物館', 'マキノ高原'],
  '和歌山県': ['アドベンチャーワールド', '串本海中公園', '和歌山城'],
}

export async function getRecommendedPlaces(): Promise<PlaceWithAvgRating[]> {
  const result: PlaceWithAvgRating[] = []

  for (const [prefecture, names] of Object.entries(FEATURED_NAMES)) {
    // 優先名称で検索（全マッチを取得して優先順にソート）
    const { data } = await supabase
      .from('places')
      .select('*, reviews(rating)')
      .eq('is_published', true)
      .eq('prefecture', prefecture)
      .in('name', names)
      .not('image_url', 'is', null)

    if (data?.length) {
      const sorted = [...data].sort((a, b) => {
        const ai = names.indexOf((a as any).name)
        const bi = names.indexOf((b as any).name)
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
      })
      const row = sorted[0] as any
      const reviews: { rating: number }[] = row.reviews ?? []
      result.push({
        ...row as Place,
        avg_rating: reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null,
        review_count: reviews.length,
      })
      continue
    }

    // フォールバック: 各県で画像あり・施設充実のスポット
    const { data: fallback } = await supabase
      .from('places')
      .select('*, reviews(rating)')
      .eq('is_published', true)
      .eq('prefecture', prefecture)
      .not('image_url', 'is', null)
      .eq('has_parking', true)
      .limit(1)

    if (fallback?.length) {
      const row = fallback[0] as any
      const reviews: { rating: number }[] = row.reviews ?? []
      result.push({
        ...row as Place,
        avg_rating: reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null,
        review_count: reviews.length,
      })
    }
  }

  return result
}

export const PREFECTURES = ['大阪府', '兵庫県', '京都府', '奈良県', '滋賀県', '和歌山県'] as const

export const CONDITION_LABELS: Record<string, string> = {
  rainy_day_ok: '雨の日OK',
  indoor: '屋内',
  free: '無料',
  has_parking: '駐車場あり',
  has_nursing_room: '授乳室あり',
  has_diaper_space: 'おむつ替えあり',
  '0-2': '0〜2歳向け',
  '6-12': '小学生向け',
}
