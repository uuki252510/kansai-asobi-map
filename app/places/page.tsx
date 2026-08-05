export const dynamic = 'force-dynamic'

import type { Metadata } from "next"
import { getAllPlaces, getPlaces } from "@/lib/places"
import PlacesClient from "./PlacesClient"

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const params = await searchParams
  return {
    title: "関西のおでかけスポット一覧",
    description: "大阪・兵庫・京都・奈良・滋賀・和歌山のおでかけスポットを、雨の日、無料、屋内、駐車場などの条件で探せます。",
    alternates: { canonical: "/places" },
    // 検索結果URLはインデックスさせない
    robots: params.search ? { index: false, follow: true } : undefined,
  }
}

interface SearchParams {
  prefecture?: string
  indoor_type?: string
  target_age?: string
  price_type?: string
  has_parking?: string
  has_nursing_room?: string
  has_diaper_space?: string
  rainy_day_ok?: string
  search?: string
  sort?: string
  lat?: string
  lng?: string
}

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  // サーバーは search (ilike) のみ担当。他の条件は PlacesClient が
  // クライアント側で即時適用する (FilterSheet の動的件数と共有)。
  const places = params.search
    ? await getPlaces({ search: params.search }).catch(() => [])
    : await getAllPlaces().catch(() => [])

  const paramsRecord: Record<string, string | undefined> = {
    companion: (params as Record<string, string | undefined>).companion,
    prefecture: params.prefecture,
    indoor_type: params.indoor_type,
    target_age: params.target_age,
    price_type: params.price_type,
    has_parking: params.has_parking,
    has_nursing_room: params.has_nursing_room,
    has_diaper_space: params.has_diaper_space,
    rainy_day_ok: params.rainy_day_ok,
    search: params.search,
    sort: params.sort,
    lat: params.lat,
    lng: params.lng,
  }

  return (
    <PlacesClient
      initialPlaces={places}
      initialParams={paramsRecord}
    />
  )
}
