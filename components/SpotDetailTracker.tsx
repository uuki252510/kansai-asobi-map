"use client"

import { useEffect } from "react"
import { trackEvent, trackInteraction } from "@/lib/analytics"

export default function SpotDetailTracker({ placeId }: { placeId: string }) {
  useEffect(() => {
    trackEvent("spot_detail_viewed", { place_id: placeId })
    // ランキングの元データ
    trackInteraction(placeId, "detail_view")
  }, [placeId])
  return null
}
