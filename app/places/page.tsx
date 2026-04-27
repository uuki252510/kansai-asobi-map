export const dynamic = 'force-dynamic'

import { getPlaces, PREFECTURES, type PlaceFilters } from "@/lib/places"
import PlacesClient from "./PlacesClient"

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

  const filters: PlaceFilters = {
    prefecture: params.prefecture,
    indoor_type: params.indoor_type,
    target_age: params.target_age,
    price_type: params.price_type,
    has_parking: params.has_parking === "true",
    has_nursing_room: params.has_nursing_room === "true",
    has_diaper_space: params.has_diaper_space === "true",
    rainy_day_ok: params.rainy_day_ok === "true",
    search: params.search,
  }

  const places = await getPlaces(filters).catch(() => [])

  const paramsRecord: Record<string, string | undefined> = {
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
