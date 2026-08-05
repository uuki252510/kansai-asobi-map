"use client"

import { CloudRain, CloudSun, LocateFixed, Sun } from "lucide-react"
import { useEffect, useState } from "react"
import type { WeatherSnapshot } from "@/lib/recommendation-engine"

const EMPTY: WeatherSnapshot = {
  available: false,
  condition: "any",
  conditionLabel: "取得中",
  temperature: null,
  high: null,
  low: null,
  precipitationProbability: null,
  rainTimeLabel: null,
}

export default function WeatherSummary({ compact = false }: { compact?: boolean }) {
  const [weather, setWeather] = useState(EMPTY)
  const [locationLabel, setLocationLabel] = useState("兵庫県神戸市中央区")

  useEffect(() => {
    let cancelled = false
    const load = async (lat?: number, lng?: number) => {
      try {
        const query = lat !== undefined && lng !== undefined ? `?lat=${lat}&lng=${lng}` : ""
        // タイムアウトを設けて「取得中」が永続しないようにする
        const response = await fetch(`/api/weather${query}`, { signal: AbortSignal.timeout(6000) })
        const data = (await response.json()) as WeatherSnapshot
        if (!cancelled) setWeather(data.available ? data : { ...EMPTY, conditionLabel: "天気情報なし" })
      } catch {
        if (!cancelled) setWeather({ ...EMPTY, conditionLabel: "天気情報なし" })
      }
    }

    void load()
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        if (cancelled) return
        setLocationLabel("現在地周辺")
        void load(position.coords.latitude, position.coords.longitude)
      },
      () => undefined,
      { timeout: 4000, maximumAge: 30 * 60 * 1000 },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const Icon = weather.condition === "rainy" ? CloudRain : weather.condition === "cloudy" ? CloudSun : Sun

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
        <Icon className="size-4 text-[var(--color-sky-strong)]" />
        <span>{weather.available ? `${weather.conditionLabel} ${weather.temperature ?? "--"}℃` : weather.conditionLabel}</span>
      </div>
    )
  }

  return (
    <div className="weather-card" aria-live="polite">
      <div className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-[var(--color-text-secondary)]">
        <LocateFixed className="size-3.5 text-[var(--color-primary)]" />
        <span>{locationLabel}</span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Icon className="size-8 text-[var(--color-sky-strong)]" strokeWidth={1.8} />
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-[var(--color-text)]">
              {weather.temperature ?? "--"}℃
            </span>
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
              {weather.conditionLabel}
            </span>
          </div>
          <p className="mt-0.5 text-[0.66rem] text-[var(--color-text-secondary)]">
            最高 {weather.high ?? "--"}℃　最低 {weather.low ?? "--"}℃　降水 {weather.precipitationProbability ?? "--"}%
          </p>
        </div>
      </div>
    </div>
  )
}
