import type { PlaceWithAvgRating } from "@/lib/places"
import type { WeatherSnapshot } from "@/lib/recommendation-engine"

export type TimeframeSlug = "today" | "tomorrow" | "weekend" | "this-month"

export interface TimeframeDefinition {
  slug: TimeframeSlug
  label: string
  title: string
  description: string
}

export const TIMEFRAMES: TimeframeDefinition[] = [
  { slug: "today", label: "今日行ける", title: "今日行ける関西のおでかけスポット", description: "今日の天気を踏まえて、いまから行ける関西のスポットを提案します。" },
  { slug: "tomorrow", label: "明日", title: "明日行きたい関西のおでかけスポット", description: "明日の予定づくりに。天気予報と合わせて関西のスポットを選べます。" },
  { slug: "weekend", label: "今週末", title: "今週末の関西おでかけスポット", description: "土日のおでかけ先を先取り。今週末に行きたい関西のスポットを集めました。" },
  { slug: "this-month", label: "今月", title: "今月行きたい関西のおでかけスポット", description: "季節を感じるスポットから定番まで。今月の関西のおでかけ候補です。" },
]

export function getTimeframe(slug: string): TimeframeDefinition | null {
  return TIMEFRAMES.find((timeframe) => timeframe.slug === slug) ?? null
}

/**
 * タイムフレームの対象日 (天気予報の参照日)。weekend は直近の土曜。
 */
export function targetDateFor(slug: TimeframeSlug, now = new Date()): Date {
  const date = new Date(now)
  if (slug === "tomorrow") date.setDate(date.getDate() + 1)
  if (slug === "weekend") {
    const day = date.getDay()
    const daysUntilSaturday = day === 6 ? 0 : (6 - day + 7) % 7
    date.setDate(date.getDate() + daysUntilSaturday)
  }
  return date
}

/**
 * 天気連動の並べ替え。雨なら屋内・雨OKを最上位、晴れなら屋外を優先。
 * ベーススコアは口コミ数 + 評価 + 写真有無。
 */
export function rankPlacesForWeather(
  places: PlaceWithAvgRating[],
  weather: WeatherSnapshot | null,
): PlaceWithAvgRating[] {
  const scored = places.map((place) => {
    let score = place.review_count * 2 + (place.avg_rating ?? 0) * 2
    if (place.image_url) score += 3
    if (weather?.available) {
      if (weather.condition === "rainy") {
        if (place.rainy_day_ok) score += 20
        else if (place.indoor_type === "indoor") score += 14
        else if (place.indoor_type === "both") score += 6
        else score -= 10
      } else if (weather.condition === "sunny") {
        if (place.indoor_type === "outdoor") score += 8
        else if (place.indoor_type === "both") score += 5
      }
    }
    return { place, score }
  })
  return scored.sort((left, right) => right.score - left.score).map((entry) => entry.place)
}
