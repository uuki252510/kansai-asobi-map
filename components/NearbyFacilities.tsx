import Link from "next/link"
import { Footprints, Car } from "lucide-react"
import PlaceImage from "@/components/PlaceImage"
import { calcDistance, getAllPlaces, type PlaceWithAvgRating } from "@/lib/places"
import type { Place } from "@/lib/supabase/database.types"

/**
 * 周辺施設。緯度経度から距離順に取得し、徒歩/車の目安を添える。
 * 座標が無い施設は同じ府県の候補にフォールバックする。
 */
const RADIUS_STEPS = [0.5, 1, 3, 5, 10] as const

function walkingMinutes(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / 4.5) * 60))
}

function drivingMinutes(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / 28) * 60) + 3)
}

function priceLabel(place: PlaceWithAvgRating): string {
  if (place.price_type === "free") return "無料"
  if (place.price_min) return `${place.price_min.toLocaleString("ja-JP")}円〜`
  return "有料"
}

export default async function NearbyFacilities({ place }: { place: Place }) {
  const all = await getAllPlaces().catch(() => [])
  const others = all.filter((candidate) => candidate.id !== place.id)

  let nearby: Array<PlaceWithAvgRating & { distanceKm: number | null }> = []
  let radiusLabel = ""

  if (place.latitude !== null && place.longitude !== null) {
    const withDistance = others
      .filter((candidate) => candidate.latitude !== null && candidate.longitude !== null)
      .map((candidate) => ({
        ...candidate,
        distanceKm: calcDistance(place.latitude!, place.longitude!, candidate.latitude!, candidate.longitude!),
      }))
      .sort((left, right) => left.distanceKm - right.distanceKm)

    // 半径を段階的に広げ、最初に3件以上見つかった段階を採用する
    for (const radius of RADIUS_STEPS) {
      const within = withDistance.filter((candidate) => candidate.distanceKm <= radius)
      if (within.length >= 3 || radius === RADIUS_STEPS[RADIUS_STEPS.length - 1]) {
        nearby = within.slice(0, 6)
        radiusLabel = radius < 1 ? `${radius * 1000}m以内` : `${radius}km以内`
        break
      }
    }
  }

  if (nearby.length === 0) {
    nearby = others
      .filter((candidate) => candidate.prefecture === place.prefecture)
      .slice(0, 3)
      .map((candidate) => ({ ...candidate, distanceKm: null }))
    radiusLabel = place.prefecture
  }

  if (nearby.length === 0) return null

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-ink">周辺のスポット</h2>
          <p className="mt-1 text-xs font-bold text-ink-soft">{radiusLabel}・近い順</p>
        </div>
        <Link href={`/spots?prefecture=${encodeURIComponent(place.prefecture)}`} className="text-sm font-bold text-accent">
          一覧を見る →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {nearby.map((candidate) => (
          <Link
            key={candidate.id}
            href={`/places/${candidate.id}`}
            className="card-v2 flex gap-3 p-3 transition-transform duration-150 active:scale-[0.99]"
          >
            <span className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
              <PlaceImage place={candidate} alt="" className="size-full object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black text-ink">{candidate.name}</span>
              <span className="mt-0.5 block text-xs text-ink-soft">{candidate.city}</span>
              {candidate.distanceKm !== null && (
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.6875rem] font-bold text-ink-soft">
                  <span className="text-ink">
                    {candidate.distanceKm < 1
                      ? `${Math.round(candidate.distanceKm * 1000)}m`
                      : `${candidate.distanceKm.toFixed(1)}km`}
                  </span>
                  {candidate.distanceKm <= 2 && (
                    <span className="inline-flex items-center gap-0.5">
                      <Footprints className="size-3" aria-hidden />徒歩{walkingMinutes(candidate.distanceKm)}分
                    </span>
                  )}
                  <span className="inline-flex items-center gap-0.5">
                    <Car className="size-3" aria-hidden />車{drivingMinutes(candidate.distanceKm)}分
                  </span>
                </span>
              )}
              <span className="mt-1 block text-[0.6875rem] font-bold text-ink-soft">{priceLabel(candidate)}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
