export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import { getAllPlaces, getPlaces } from "@/lib/places"
import { applyScope, resolveScope } from "@/lib/facility-scope"
import { applyStationScope, getStationById, getStationsWithPlaces } from "@/lib/station-scope"
import { WALK_DISTANCE_STEPS } from "@/lib/station-data"
import PlacesClient from "@/app/places/PlacesClient"

type SearchParams = Record<string, string | string[] | undefined>

const pick = (raw: SearchParams, key: string) =>
  typeof raw[key] === "string" ? (raw[key] as string) : raw[key]?.[0]

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const raw = await searchParams
  const hasFilter = pick(raw, "search") || pick(raw, "category") || pick(raw, "tag") || pick(raw, "station")
  return {
    title: "関西のスポット一覧",
    description: "大阪・兵庫・京都・奈良・滋賀・和歌山の遊び場を、雨の日、無料、屋内、駐車場、最寄り駅などの条件で探せます。",
    alternates: { canonical: "/spots" },
    // 条件つきURLは重複コンテンツになるためインデックスさせない
    // (カテゴリ/タグの正規ページは /facilities/category|tag/[slug])
    robots: hasFilter ? { index: false, follow: true } : undefined,
  }
}

export default async function SpotsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams
  // サーバーは search (ilike) とスコープ (カテゴリ/タグ/駅) を担当。
  // 他の条件は PlacesClient がクライアント側で即時適用する
  const search = pick(raw, "search")
  const stationId = pick(raw, "station")
  const walkRaw = Number(pick(raw, "walk") ?? 800)
  const walk = (WALK_DISTANCE_STEPS as readonly number[]).includes(walkRaw) ? walkRaw : 800

  const [places, scope, station, stations] = await Promise.all([
    search ? getPlaces({ search }).catch(() => []) : getAllPlaces().catch(() => []),
    resolveScope(pick(raw, "category"), pick(raw, "tag")),
    stationId ? getStationById(stationId) : Promise.resolve(null),
    getStationsWithPlaces(),
  ])

  const scoped = await applyScope(places, scope)
  const stationScoped = await applyStationScope(scoped, station?.id, walk)
  const initialParams = Object.fromEntries(Object.keys(raw).map((key) => [key, pick(raw, key)]))

  return (
    <PlacesClient
      initialPlaces={stationScoped}
      initialParams={initialParams}
      basePath="/spots"
      categories={scope.categories}
      tags={scope.tags}
      activeCategorySlug={scope.category?.slug ?? null}
      activeTagSlug={scope.tag?.slug ?? null}
      stations={stations}
      activeStation={station}
      activeWalk={walk}
    />
  )
}
