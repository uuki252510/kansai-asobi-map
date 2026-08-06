"use client"

import Link from "next/link"
import { useState } from "react"
import { Check, Heart } from "lucide-react"
import PlaceCard from "@/components/PlaceCard"
import KansaiProgress from "@/components/KansaiProgress"
import { useSpotTracking } from "@/lib/useSpotTracking"
import type { PlaceWithAvgRating } from "@/lib/places"

type Tab = "want" | "visited"

export default function MyPageClient({
  places,
  countsByPrefecture,
  initialTab = "want",
}: {
  places: PlaceWithAvgRating[]
  countsByPrefecture: Record<string, number>
  initialTab?: Tab
}) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const { wantIds, visitedIds, wantCount, visitedCount, toggleVisited, isVisited, ready } = useSpotTracking()

  const placeMap = new Map(places.map((place) => [place.id, place]))
  const placePrefectures = Object.fromEntries(places.map((place) => [place.id, place.prefecture]))

  const activeIds = tab === "want" ? [...wantIds] : [...visitedIds.keys()]
  const activePlaces = activeIds
    .map((id) => placeMap.get(id))
    .filter((place): place is PlaceWithAvgRating => Boolean(place))

  return (
    <div className="flex flex-col gap-6">
      <KansaiProgress countsByPrefecture={countsByPrefecture} placePrefectures={placePrefectures} />

      <div role="tablist" aria-label="行きたい・行った" className="flex gap-2">
        <button
          role="tab"
          aria-selected={tab === "want"}
          className={`pill flex-1 sm:flex-none sm:px-8${tab === "want" ? " is-active" : ""}`}
          onClick={() => setTab("want")}
        >
          <Heart className="size-4" aria-hidden />
          行きたい{ready ? ` (${wantCount})` : ""}
        </button>
        <button
          role="tab"
          aria-selected={tab === "visited"}
          className={`pill flex-1 sm:flex-none sm:px-8${tab === "visited" ? " is-active" : ""}`}
          onClick={() => setTab("visited")}
        >
          <Check className="size-4" aria-hidden />
          行った{ready ? ` (${visitedCount})` : ""}
        </button>
      </div>

      {activePlaces.length === 0 ? (
        <div className="card-v2 px-6 py-14 text-center">
          <p className="text-base font-black text-ink">
            {tab === "want" ? "まだ「行きたい」がありません" : "まだ「行った」記録がありません"}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {tab === "want"
              ? "スポットカードの ♡ を押すと、ここに集まります。"
              : "行ったスポットの詳細ページで「行った？」を押すと記録できます。"}
          </p>
          <Link href="/spots" className="btn-primary mt-5">
            スポットをさがす
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {activePlaces.map((place) => (
            <div key={place.id} className="relative">
              <PlaceCard place={place} />
              {tab === "want" && (
                <button
                  type="button"
                  onClick={() => toggleVisited(place.id)}
                  className={`mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-[2px] px-4 text-xs font-black transition-all duration-150 active:scale-[0.97] ${
                    isVisited(place.id) ? "bg-positive text-white" : "border border-line bg-surface text-ink-soft"
                  }`}
                >
                  <Check className="size-3.5" aria-hidden />
                  {isVisited(place.id) ? "行った！" : "行ったら記録"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/today" className="data-tile">
          <span className="data-tile__label">条件からおすすめ3件を提案</span>
          <span className="mt-1.5 block font-display text-lg font-black text-ink">今日どこ行く？診断</span>
        </Link>
        <Link href="/map" className="data-tile">
          <span className="data-tile__label">行きたい・行ったを地図で確認</span>
          <span className="mt-1.5 block font-display text-lg font-black text-ink">マップで見る</span>
        </Link>
      </div>
    </div>
  )
}
