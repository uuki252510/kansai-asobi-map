"use client"

import { Check } from "lucide-react"
import { useSpotTracking } from "@/lib/useSpotTracking"

/**
 * 「行った」トグル。詳細ページ・マイページで使用。
 */
export default function VisitToggle({ placeId, className = "", compact = false }: { placeId: string; className?: string; compact?: boolean }) {
  const { isVisited, toggleVisited, ready } = useSpotTracking()
  const visited = ready && isVisited(placeId)

  return (
    <button
      type="button"
      onClick={() => toggleVisited(placeId)}
      aria-pressed={visited}
      aria-label={compact ? (visited ? "行った記録を取り消す" : "行ったと記録する") : undefined}
      className={`${visited ? "bg-positive text-white" : "border border-line bg-surface text-ink"} inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full ${compact ? "w-11 px-0" : "px-5"} text-sm font-black transition-all duration-150 active:scale-[0.97] ${className}`}
    >
      <Check className={`size-4 transition-transform duration-200 ${visited ? "scale-100" : "scale-75 opacity-40"}`} aria-hidden />
      {!compact && (visited ? "行った！" : "行った？")}
    </button>
  )
}
