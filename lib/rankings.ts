import { supabase } from "@/lib/supabase/client"
import type { PlaceWithAvgRating } from "@/lib/places"

/**
 * 人気ランキング。
 * facility_interactions (行動ログ) が溜まればそれを主信号に使い、
 * まだ無い間は「口コミ・評価・情報の充実度」を代理指標にする。
 * どちらの場合も同じ rankingScore で説明可能なスコアにする。
 */

export type RankingWindow = "week" | "month" | "all"

const WINDOW_DAYS: Record<RankingWindow, number | null> = { week: 7, month: 30, all: null }

/** 行動ログの重み。「行きたい保存」と「予約/チケットクリック」を最重視する */
const INTERACTION_WEIGHTS: Record<string, number> = {
  detail_view: 1,
  map_click: 2,
  website_click: 3,
  phone_click: 4,
  save: 6,
  review: 8,
  reservation_click: 10,
  ticket_click: 10,
}

export function rankingScore(place: PlaceWithAvgRating, interactionScore = 0): number {
  let score = interactionScore
  score += place.review_count * 6
  score += (place.avg_rating ?? 0) * 4
  // 情報が充実しているものを上に (写真・説明・座標)
  if (place.image_url) score += 5
  if (place.description && place.description.length > 60) score += 3
  if (place.latitude !== null && place.longitude !== null) score += 2
  return score
}

/**
 * 期間内の行動ログを施設ごとに集計する。
 * 1) 日次集計済みの facility_metrics_daily があればそれを使う (バッチ結果・軽い)
 * 2) 無ければ生ログを読む
 * 3) それも無ければ空Map (呼び出し側は代理指標にフォールバック)
 */
async function interactionScores(window: RankingWindow): Promise<Map<string, number>> {
  const scores = new Map<string, number>()

  // --- 1) 集計済みメトリクス ---
  try {
    let query = supabase
      .from("facility_metrics_daily" as never)
      .select("place_id,score")
      .limit(10_000)
    const days = WINDOW_DAYS[window]
    if (days !== null) {
      query = query.gte("date", new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10))
    }
    const { data, error } = await query
    if (!error && data && data.length > 0) {
      for (const row of data as unknown as Array<{ place_id: string; score: number | string }>) {
        scores.set(row.place_id, (scores.get(row.place_id) ?? 0) + Number(row.score))
      }
      return scores
    }
  } catch {
    // 次の経路へ
  }

  // --- 2) 生ログ ---
  try {
    let query = supabase
      .from("facility_interactions" as never)
      .select("place_id,interaction_type,session_id")
      .limit(20_000)
    const days = WINDOW_DAYS[window]
    if (days !== null) {
      query = query.gte("created_at", new Date(Date.now() - days * 86_400_000).toISOString())
    }
    const { data, error } = await query
    if (error || !data) return scores

    // 同一セッションの同一施設・同一種別は1回だけ数える (連続アクセス対策)
    const seen = new Set<string>()
    for (const row of data as unknown as Array<{ place_id: string; interaction_type: string; session_id: string | null }>) {
      const dedupeKey = `${row.session_id ?? "anon"}:${row.place_id}:${row.interaction_type}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      const weight = INTERACTION_WEIGHTS[row.interaction_type] ?? 1
      scores.set(row.place_id, (scores.get(row.place_id) ?? 0) + weight)
    }
  } catch {
    return scores
  }
  return scores
}

export interface RankedPlace {
  place: PlaceWithAvgRating
  rank: number
  score: number
}

export async function getRanking(
  places: PlaceWithAvgRating[],
  { window = "month", limit = 12, filter }: { window?: RankingWindow; limit?: number; filter?: (place: PlaceWithAvgRating) => boolean } = {},
): Promise<RankedPlace[]> {
  const scores = await interactionScores(window)
  const source = filter ? places.filter(filter) : places
  return source
    .map((place) => ({ place, score: rankingScore(place, scores.get(place.id) ?? 0) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
}

/** ランキングの根拠が行動ログか代理指標かを示す (公開画面での表記に使う) */
export async function rankingBasis(window: RankingWindow = "month"): Promise<"interactions" | "proxy"> {
  const scores = await interactionScores(window)
  return scores.size >= 20 ? "interactions" : "proxy"
}
