export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import RecommendationResults from "@/components/RecommendationResults"
import { getAllPlaces } from "@/lib/places"
import { conditionsFromSearchParams, recommendPlaces } from "@/lib/recommendation-engine"
import { getWeatherSnapshot } from "@/lib/weather"

export const metadata: Metadata = {
  title: "今日のおすすめ3件",
  description: "現在地・天気・気分・予算に合う関西のおでかけ先を、3件だけ提案します。",
  robots: { index: false, follow: true },
}

type Params = Record<string, string | string[] | undefined>

export default async function RecommendPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value)
    else if (value?.[0]) params.set(key, value[0])
  }

  const conditions = conditionsFromSearchParams(params)
  const [allPlaces, weather] = await Promise.all([
    getAllPlaces().catch(() => []),
    getWeatherSnapshot(conditions.latitude ?? 34.6901, conditions.longitude ?? 135.1955),
  ])
  const excluded = new Set(params.get("exclude")?.split(",").filter(Boolean) ?? [])
  const candidates = allPlaces.filter((place) => !excluded.has(place.id))
  const withPhotos = candidates.filter((place) => place.image_url)
  const source = withPhotos.length >= 3 ? withPhotos : candidates
  const results = recommendPlaces(source, conditions, weather)

  return <RecommendationResults results={results} conditions={conditions} weather={weather} />
}
