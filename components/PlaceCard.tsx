"use client"

import Link from "next/link"
import { Heart, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { PlaceWithAvgRating } from "@/lib/places"
import { useFavorites } from "@/lib/useFavorites"

interface Props {
  place: PlaceWithAvgRating
  distanceKm?: number
}

const indoorLabels: Record<string, string> = {
  indoor: "屋内",
  outdoor: "屋外",
  both: "屋内外",
}

const priceLabels: Record<string, { label: string; className: string }> = {
  free: {
    label: "無料",
    className: "bg-[#f3ebda] text-foreground",
  },
  paid: {
    label: "有料",
    className: "bg-[#e8edf6] text-foreground",
  },
  mixed: {
    label: "一部有料",
    className: "bg-[#f3e8e1] text-foreground",
  },
}

export default function PlaceCard({ place, distanceKm }: Props) {
  const { isFavorite, toggle } = useFavorites()
  const price =
    priceLabels[place.price_type] ??
    {
      label: "料金未設定",
      className: "bg-muted text-foreground",
    }

  const metaTags = [
    place.has_parking ? "駐車場あり" : null,
    place.has_nursing_room ? "授乳室あり" : null,
    place.has_diaper_space ? "おむつ替えあり" : null,
    place.target_ages.includes("0-2") ? "0〜2歳向け" : null,
    place.target_ages.includes("6-12") ? "小学生向け" : null,
  ].filter(Boolean) as string[]

  return (
    <Link href={`/places/${place.id}`} className="group block">
      <article className="surface-card overflow-hidden rounded-[30px] transition-all duration-300 group-hover:border-[var(--brand-clay)]/28 group-hover:shadow-[0_28px_60px_-38px_rgba(24,28,43,0.45)]">
        <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(135deg,rgba(223,213,196,0.88),rgba(210,221,236,0.82))]">
          {place.image_url ? (
            <img
              src={place.image_url}
              alt={place.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full border border-white/35" />
              <div className="absolute left-6 top-6 h-14 w-14 rounded-[24px] border border-white/40 bg-white/32 backdrop-blur-sm" />
              <p className="relative text-[0.72rem] font-medium tracking-widest text-foreground/50">画像準備中</p>
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,39,0.02),rgba(17,24,39,0.18))]" />

          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/82 px-3 py-1 text-[0.72rem] font-medium text-foreground shadow-sm backdrop-blur-sm">
              {indoorLabels[place.indoor_type] ?? "施設情報"}
            </span>
            {place.rainy_day_ok && (
              <span className="rounded-full bg-[var(--brand-ink)]/88 px-3 py-1 text-[0.72rem] font-medium text-white shadow-sm backdrop-blur-sm">
                雨の日OK
              </span>
            )}
          </div>

          <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[0.72rem] font-semibold shadow-sm backdrop-blur-sm ${price.className}`}
            >
              {price.label}
            </span>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); toggle(place.id) }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/82 shadow-sm backdrop-blur-sm transition-transform duration-150 hover:scale-110"
              aria-label={isFavorite(place.id) ? "お気に入りを解除" : "お気に入りに追加"}
            >
              <Heart
                className={`size-4 transition-colors ${isFavorite(place.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
              />
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                {place.prefecture} / {place.city}
              </p>
              <h3 className="mt-2 text-lg leading-7 font-semibold tracking-tight text-foreground">
                {place.name}
              </h3>
            </div>

            {place.avg_rating !== null && place.review_count > 0 && (
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/86 px-2.5 py-1 text-sm font-semibold text-foreground shadow-sm">
                <Star className="size-3.5 fill-current text-[var(--brand-clay)]" />
                <span>{place.avg_rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{place.review_count > 0 ? `${place.review_count}件の口コミあり` : "口コミ募集中"}</span>
            {distanceKm !== undefined && (
              <>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span>{distanceKm.toFixed(1)}km圏内</span>
              </>
            )}
          </div>

          {metaTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {metaTags.slice(0, 4).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="rounded-full border-border/80 bg-white/76 px-2.5 py-1 text-[0.72rem] font-medium text-foreground"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}
