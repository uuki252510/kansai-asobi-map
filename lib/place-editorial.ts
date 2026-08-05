import { inferMoodTags, MOOD_LABELS } from "@/lib/recommendation-engine"
import type { Place } from "@/lib/supabase/database.types"

/**
 * 詳細ページ2ブロック (Time Out型):
 *   どんなとこ？ = what_is_it ?? description冒頭
 *   なんで行くん？ = why_go ?? 既存データからの合成
 * カラム (migration 20260805000002) 未適用でも必ず両ブロックが埋まる。
 */
type EditorialPlace = Place & { what_is_it?: string | null; why_go?: string | null }

const indoorLabels = { indoor: "屋内で天気を気にせず遊べます。", outdoor: "屋外で開放的に過ごせます。", both: "屋内・屋外の両方で楽しめます。" } as const

export function whatIsIt(place: EditorialPlace): string {
  if (place.what_is_it?.trim()) return place.what_is_it.trim()
  if (place.description?.trim()) {
    const first = place.description.trim().split(/(?<=。)/)[0]
    return first.length > 10 ? first : place.description.trim().slice(0, 120)
  }
  return `${place.prefecture}${place.city}にあるおでかけスポットです。`
}

export function whyGo(place: EditorialPlace): string {
  if (place.why_go?.trim()) return place.why_go.trim()

  const sentences: string[] = []
  const moods = inferMoodTags(place)
  if (moods.length > 0) {
    const labels = moods.slice(0, 3).map((mood) => `「${MOOD_LABELS[mood]}」`).join("や")
    sentences.push(`${labels}の気分にこたえてくれるスポットです。`)
  }
  sentences.push(indoorLabels[place.indoor_type])
  if (place.price_type === "free") sentences.push("入場無料で気軽に立ち寄れます。")
  else if (place.price_note) sentences.push(`料金は「${place.price_note}」と案内されています。`)
  if (place.rainy_day_ok) sentences.push("雨の日でも楽しめるのが強みです。")
  if (place.average_stay_minutes) sentences.push(`平均滞在時間は約${place.average_stay_minutes}分が目安です。`)
  if (place.target_ages.length > 0) sentences.push("子ども連れの利用実績が登録されています。")

  return sentences.slice(0, 4).join("")
}
