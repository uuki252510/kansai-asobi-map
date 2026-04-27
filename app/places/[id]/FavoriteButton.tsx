"use client"

import { Heart } from "lucide-react"
import { useFavorites } from "@/lib/useFavorites"

export default function FavoriteButton({ placeId }: { placeId: string }) {
  const { isFavorite, toggle } = useFavorites()
  const active = isFavorite(placeId)

  return (
    <button
      type="button"
      onClick={() => toggle(placeId)}
      className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors ${
        active
          ? "border-red-200 bg-red-50 text-red-500"
          : "border-border/80 bg-white text-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-500"
      }`}
    >
      <Heart className={`size-4 ${active ? "fill-red-500" : ""}`} />
      {active ? "お気に入り済み" : "お気に入りに追加"}
    </button>
  )
}
