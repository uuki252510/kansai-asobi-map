"use client"

import Link from "next/link"
import { Heart, Star } from "lucide-react"
import PlaceImage from "@/components/PlaceImage"
import { trackEvent, trackInteraction } from "@/lib/analytics"
import type { PlaceWithAvgRating } from "@/lib/places"
import { useFavorites } from "@/lib/useFavorites"

const priceLabels = { free: "無料", paid: "有料", mixed: "一部有料" } as const

/**
 * バッジは最大2個。優先順: 雨の日OK → 無料 → 屋内
 */
function photoBadges(place: PlaceWithAvgRating): Array<{ label: string; positive?: boolean }> {
  const badges: Array<{ label: string; positive?: boolean }> = []
  if (place.rainy_day_ok) badges.push({ label: "雨の日OK", positive: true })
  if (place.price_type === "free") badges.push({ label: "無料" })
  if (place.indoor_type === "indoor") badges.push({ label: "屋内" })
  return badges.slice(0, 2)
}

export default function PlaceCard({ place, distanceKm }: { place: PlaceWithAvgRating; distanceKm?: number }) {
  const { isFavorite, toggle } = useFavorites()
  const favorite = isFavorite(place.id)
  const badges = photoBadges(place)

  const meta: string[] = []
  if (distanceKm !== undefined) meta.push(`${distanceKm.toFixed(1)}km`)
  if (place.average_stay_minutes) meta.push(`約${place.average_stay_minutes}分`)
  meta.push(priceLabels[place.price_type])

  return (
    <article className="group relative h-full">
      <Link href={`/places/${place.id}`} className="block h-full">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
          <PlaceImage
            place={place}
            alt={place.name}
            className="size-full object-cover transition-transform duration-[250ms] ease-out group-hover:scale-[1.03]"
          />
          {badges.length > 0 && (
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              {badges.map((badge) => (
                <span key={badge.label} className={`badge-photo${badge.positive ? " is-positive" : ""}`}>
                  {badge.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 pt-3">
          <p className="text-[11px] font-bold tracking-[0.1em] text-ink-faint">
            {place.city || place.prefecture}
          </p>
          <h3 className="font-display line-clamp-2 text-[0.9375rem] font-extrabold leading-snug text-ink">{place.name}</h3>
          <p className="flex items-center gap-1 text-xs font-bold text-ink-soft">
            {place.avg_rating !== null && place.review_count > 0 && (
              <>
                <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
                <span className="text-ink">{place.avg_rating.toFixed(1)}</span>
                <span>({place.review_count})</span>
                <span aria-hidden>·</span>
              </>
            )}
            {meta.map((item, index) => (
              <span key={item + index} className="flex items-center gap-1">
                {index > 0 && <span aria-hidden>·</span>}
                {item}
              </span>
            ))}
          </p>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => {
          if (!favorite) {
            trackEvent("favorite_added", { place_id: place.id, source: "spot_card" })
            trackInteraction(place.id, "save")
          }
          toggle(place.id)
        }}
        className={`heart-button absolute right-3 top-3 z-10${favorite ? " is-active" : ""}`}
        aria-label={favorite ? "お気に入りを解除" : "お気に入りに追加"}
        aria-pressed={favorite}
      >
        <Heart className="size-5" strokeWidth={2} />
      </button>
    </article>
  )
}
