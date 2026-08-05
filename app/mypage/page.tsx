export const revalidate = 600

import type { Metadata } from "next"
import MyPageClient from "@/components/MyPageClient"
import { getAllPlaces, type PlaceWithAvgRating } from "@/lib/places"

export const metadata: Metadata = { title: "マイページ", robots: { index: false, follow: false } }

/** クライアントへ渡す最小限のフィールドに絞る (payload削減) */
function toLightPlace(place: PlaceWithAvgRating): PlaceWithAvgRating {
  return {
    id: place.id,
    name: place.name,
    prefecture: place.prefecture,
    city: place.city,
    image_url: place.image_url,
    price_type: place.price_type,
    indoor_type: place.indoor_type,
    rainy_day_ok: place.rainy_day_ok,
    average_stay_minutes: place.average_stay_minutes,
    avg_rating: place.avg_rating,
    review_count: place.review_count,
  } as PlaceWithAvgRating
}

export default async function MyPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const all = await getAllPlaces().catch(() => [])
  const countsByPrefecture = Object.fromEntries(
    all.reduce((counts, place) => {
      counts.set(place.prefecture, (counts.get(place.prefecture) ?? 0) + 1)
      return counts
    }, new Map<string, number>()),
  )

  return (
    <main className="page-shell py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">マイページ</h1>
        <p className="mt-1 text-sm text-ink-soft">
          行きたい場所と行った記録は、この端末に保存されます。
        </p>
      </header>
      <MyPageClient
        places={all.map(toLightPlace)}
        countsByPrefecture={countsByPrefecture}
        initialTab={tab === "visited" ? "visited" : "want"}
      />
    </main>
  )
}
