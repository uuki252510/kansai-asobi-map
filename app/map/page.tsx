export const revalidate = 600

import type { Metadata } from "next"
import MapClient from "@/components/MapClient"
import { getAllPlaces } from "@/lib/places"

export const metadata: Metadata = {
  title: "マップで探す",
  description: "関西の遊び場を地図から検索。現在地、雨の日、屋内、無料などの条件で絞り込めます。",
  alternates: { canonical: "/map" },
}

export default async function MapPage({ searchParams }: { searchParams: Promise<{ recommended?: string }> }) {
  const params = await searchParams
  const places = await getAllPlaces().catch(() => [])
  const recommendedIds = params.recommended?.split(",").filter(Boolean).slice(0, 5) ?? []
  return <MapClient places={places} recommendedIds={recommendedIds} />
}
