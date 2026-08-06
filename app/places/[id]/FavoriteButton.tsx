"use client"

import { Heart } from "lucide-react"
import { useFavorites } from "@/lib/useFavorites"
import { trackEvent } from "@/lib/analytics"

export default function FavoriteButton({ placeId, compact = false }: { placeId: string; compact?: boolean }) {
  const { isFavorite, toggle } = useFavorites()
  const active = isFavorite(placeId)

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => { if (!active) trackEvent("favorite_added", { place_id: placeId, source: "detail" }); toggle(placeId) }}
      aria-label={compact ? (active ? "お気に入りを解除" : "お気に入りに追加") : undefined}
      className={`flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border ${compact ? "size-11 px-0 py-0" : "px-4 py-2.5"} text-sm font-semibold shadow-sm transition-colors ${
        active
          ? "border-red-200 bg-red-50 text-red-500"
          : "border-border/80 bg-white text-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-500"
      }`}
    >
      <Heart className={`size-4 ${active ? "fill-red-500" : ""}`} aria-hidden />
      {!compact && (active ? "お気に入り済み" : "お気に入りに追加")}
    </button>
  )
}
