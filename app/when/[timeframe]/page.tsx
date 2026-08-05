export const revalidate = 1800

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CloudRain, Sun, Cloud } from "lucide-react"
import PlaceCard from "@/components/PlaceCard"
import TimeChips from "@/components/TimeChips"
import { getAllPlaces } from "@/lib/places"
import { getWeatherSnapshot } from "@/lib/weather"
import { getTimeframe, rankPlacesForWeather, TIMEFRAMES, type TimeframeSlug } from "@/lib/timeframe"

export function generateStaticParams() {
  return TIMEFRAMES.map((timeframe) => ({ timeframe: timeframe.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ timeframe: string }> }): Promise<Metadata> {
  const { timeframe: slug } = await params
  const timeframe = getTimeframe(slug)
  if (!timeframe) return {}
  return {
    title: timeframe.title,
    description: timeframe.description,
    alternates: { canonical: `/when/${timeframe.slug}` },
  }
}

const weatherIcons = { rainy: CloudRain, sunny: Sun, cloudy: Cloud, any: Cloud } as const

export default async function TimeframePage({ params }: { params: Promise<{ timeframe: string }> }) {
  const { timeframe: slug } = await params
  const timeframe = getTimeframe(slug)
  if (!timeframe) notFound()

  const [allPlaces, weather] = await Promise.all([
    getAllPlaces().catch(() => []),
    // today/tomorrow は天気連動。weekend/this-month は現況を参考表示に留める
    getWeatherSnapshot().catch(() => null),
  ])

  const weatherAware = slug === "today" || slug === "tomorrow"
  const ranked = rankPlacesForWeather(allPlaces, weatherAware ? weather : null)
  const isRainy = weatherAware && weather?.available && weather.condition === "rainy"
  const WeatherIcon = weatherIcons[weather?.condition ?? "any"]

  return (
    <main className="page-shell py-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">{timeframe.title}</h1>
        <p className="mt-2 text-sm leading-7 text-ink-soft">{timeframe.description}</p>
        {weatherAware && weather?.available && (
          <p className={`mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${isRainy ? "bg-caution-soft text-caution" : "bg-positive-soft text-positive"}`}>
            <WeatherIcon className="size-4" aria-hidden />
            {isRainy
              ? `${weather.conditionLabel}の予報 — 屋内・雨OKスポットを優先しています`
              : `${weather.conditionLabel} — 屋外スポットも楽しめます`}
            {weather.temperature !== null && ` / ${Math.round(weather.temperature)}℃`}
          </p>
        )}
      </header>

      <div className="mt-5">
        <TimeChips active={slug as TimeframeSlug} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {ranked.slice(0, 24).map((place) => (
          <PlaceCard key={place.id} place={place} />
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <Link href="/spots" className="btn-secondary px-8">
          すべてのスポットから探す
        </Link>
      </div>
    </main>
  )
}
