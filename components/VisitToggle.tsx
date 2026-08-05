"use client"

import { Check } from "lucide-react"
import { useSpotTracking } from "@/lib/useSpotTracking"

/**
 * 「行った」トグル。詳細ページ・マイページで使用。
 */
export default function VisitToggle({ placeId, className = "" }: { placeId: string; className?: string }) {
  const { isVisited, toggleVisited, ready } = useSpotTracking()
  const visited = ready && isVisited(placeId)

  return (
    <button
      type="button"
      onClick={() => toggleVisited(placeId)}
      aria-pressed={visited}
      className={`${visited ? "bg-positive text-white" : "border border-line bg-surface text-ink"} inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-black transition-all duration-150 active:scale-[0.97] ${className}`}
    >
      <Check className={`size-4 transition-transform duration-200 ${visited ? "scale-100" : "scale-75 opacity-40"}`} aria-hidden />
      {visited ? "行った！" : "行った？"}
    </button>
  )
}
