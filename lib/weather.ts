import type { RecommendedWeather } from "@/lib/supabase/database.types"
import type { WeatherSnapshot } from "@/lib/recommendation-engine"

type OpenMeteoResponse = {
  current?: { temperature_2m?: number; weather_code?: number }
  daily?: {
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    precipitation_probability_max?: number[]
    weather_code?: number[]
  }
  hourly?: { time?: string[]; precipitation_probability?: number[] }
}

export const EMPTY_WEATHER: WeatherSnapshot = {
  available: false,
  condition: "any",
  conditionLabel: "天気情報なし",
  temperature: null,
  high: null,
  low: null,
  precipitationProbability: null,
  rainTimeLabel: null,
}

function weatherLabel(code: number | undefined): { condition: RecommendedWeather; label: string } {
  if (code === undefined) return { condition: "any", label: "天気不明" }
  if (code === 0 || code === 1) return { condition: "sunny", label: "晴れ" }
  if (code === 2 || code === 3 || code === 45 || code === 48) {
    return { condition: "cloudy", label: code >= 45 ? "霧" : "くもり" }
  }
  return { condition: "rainy", label: code >= 71 && code <= 77 ? "雪" : "雨" }
}

function rainTimeLabel(data: OpenMeteoResponse) {
  const times = data.hourly?.time ?? []
  const probabilities = data.hourly?.precipitation_probability ?? []
  const rainyHours = times
    .map((time, index) => ({ time, probability: probabilities[index] ?? 0 }))
    .filter((item) => item.probability >= 50)
  if (rainyHours.length === 0) return null
  const firstHour = new Date(rainyHours[0].time).getHours()
  const lastHour = new Date(rainyHours[rainyHours.length - 1].time).getHours() + 1
  return `${firstHour}時〜${lastHour}時ごろ`
}

/**
 * 天気を取得する。dayOffset=0 は今日 (現在の実況)、1 は明日 (日別予報)。
 * 「明日」ページで現在の実況を「予報」と言って出さないための区別。
 */
export async function getWeatherSnapshot(latitude = 34.6901, longitude = 135.1955, dayOffset: 0 | 1 = 0) {
  const query = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: "temperature_2m,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
    hourly: "precipitation_probability",
    forecast_days: String(dayOffset + 1),
    timezone: "Asia/Tokyo",
  })
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query.toString()}`, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(4500),
    })
    if (!response.ok) return EMPTY_WEATHER
    const data = (await response.json()) as OpenMeteoResponse
    // 明日は実況が存在しないので日別予報の weather_code を使う
    const code = dayOffset === 0 ? data.current?.weather_code : data.daily?.weather_code?.[dayOffset]
    const weather = weatherLabel(code)
    return {
      available: true,
      condition: weather.condition,
      conditionLabel: weather.label,
      temperature: dayOffset === 0 ? data.current?.temperature_2m ?? null : null,
      high: data.daily?.temperature_2m_max?.[dayOffset] ?? null,
      low: data.daily?.temperature_2m_min?.[dayOffset] ?? null,
      precipitationProbability: data.daily?.precipitation_probability_max?.[dayOffset] ?? null,
      rainTimeLabel: dayOffset === 0 ? rainTimeLabel(data) : null,
    } satisfies WeatherSnapshot
  } catch {
    return EMPTY_WEATHER
  }
}
