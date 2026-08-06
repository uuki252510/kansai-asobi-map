"use client"

import Link from "next/link"
import { useRef } from "react"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import PlaceImage from "@/components/PlaceImage"
import type { PlaceWithAvgRating } from "@/lib/places"

/**
 * テーマ別の横スクロールカルーセル (アソビュー型)。
 * カードは「写真 → 名前 → エリア → 評価 → 価格」の順で、
 * データが無い項目は行ごと出さない (空欄を作らない)。
 */

function priceLabel(place: PlaceWithAvgRating): string | null {
  if (place.price_type === "free") return "無料"
  if (place.price_min !== null) return place.price_min === 0 ? "無料" : `¥${place.price_min.toLocaleString("ja-JP")}〜`
  if (place.price_note) return place.price_note.length > 14 ? `${place.price_note.slice(0, 14)}…` : place.price_note
  if (place.price_type === "mixed") return "一部有料"
  return null
}

function badge(place: PlaceWithAvgRating): { label: string; tone: "positive" | "plain" } | null {
  if (place.rainy_day_ok) return { label: "雨の日OK", tone: "positive" }
  if (place.price_type === "free") return { label: "無料", tone: "plain" }
  return null
}

export default function SpotCarousel({
  title,
  href,
  places,
  ranked = false,
}: {
  title: string
  href?: string
  places: PlaceWithAvgRating[]
  /** true なら 1,2,3… の順位バッジを出す */
  ranked?: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)

  if (places.length === 0) return null

  function scrollByCards(direction: -1 | 1) {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction * Math.round(track.clientWidth * 0.85), behavior: "smooth" })
  }

  return (
    <section>
      <div className="section-rule flex items-end justify-between gap-3">
        <h2 className="font-display text-[1.0625rem] font-extrabold tracking-[0.02em] text-ink sm:text-xl">{title}</h2>
        <div className="flex items-center gap-2">
          {href && (
            <Link href={href} className="text-sm font-bold text-accent-strong">
              もっと見る →
            </Link>
          )}
          <div className="hidden gap-1 sm:flex">
            <button type="button" onClick={() => scrollByCards(-1)} aria-label={`${title}を前へ`} className="grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-soft transition-colors hover:border-ink-faint hover:text-ink">
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button type="button" onClick={() => scrollByCards(1)} aria-label={`${title}を次へ`} className="grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-soft transition-colors hover:border-ink-faint hover:text-ink">
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={trackRef}
        className="scrollbar-hide -mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:-mx-8 sm:px-8"
      >
        {places.map((place, index) => {
          const price = priceLabel(place)
          const mark = badge(place)
          const hasRating = place.avg_rating !== null && place.review_count > 0
          return (
            <Link
              key={place.id}
              href={`/places/${place.id}`}
              className="group w-[164px] shrink-0 snap-start sm:w-[196px]"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                <PlaceImage
                  place={place}
                  alt={place.name}
                  className="size-full object-cover transition-transform duration-[250ms] ease-out group-hover:scale-[1.04]"
                />
                {ranked && <span className={`rank-badge${index < 3 ? " is-top" : ""}`}>{index + 1}</span>}
                {mark && !ranked && (
                  <span className={`badge-photo absolute left-2 top-2${mark.tone === "positive" ? " is-positive" : ""}`}>
                    {mark.label}
                  </span>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-black leading-snug text-ink">{place.name}</p>
              <p className="mt-0.5 truncate text-xs text-ink-soft">{place.city || place.prefecture}</p>
              {hasRating && (
                <p className="mt-1 flex items-center gap-1 text-xs font-bold">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
                  <span className="text-ink">{place.avg_rating!.toFixed(1)}</span>
                  <span className="text-ink-soft">({place.review_count})</span>
                </p>
              )}
              {price && (
                <p className="mt-1 font-display text-base font-black text-accent-strong">{price}</p>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
