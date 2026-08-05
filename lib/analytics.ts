"use client"

export type AnalyticsEvent =
  | "recommendation_started"
  | "recommendation_conditions_completed"
  | "recommendations_viewed"
  | "recommendations_regenerated"
  | "spot_detail_viewed"
  | "favorite_added"
  | "outing_decided"
  | "map_opened"
  | "map_marker_click"
  | "recommendations_shared"
  | "vote_created"
  | "outing_record_created"

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
  }
}

const SESSION_KEY = "kyodokoiko-session-id"

function sessionId() {
  const existing = window.localStorage.getItem(SESSION_KEY)
  if (existing) return existing
  const value = crypto.randomUUID()
  window.localStorage.setItem(SESSION_KEY, value)
  return value
}

function send(url: string, payload: unknown) {
  const body = JSON.stringify(payload)
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }))
    return
  }
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  })
}

export function trackEvent(eventName: AnalyticsEvent, metadata: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return
  const session = sessionId()
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({ event: eventName, ...metadata })

  send("/api/analytics", { event_name: eventName, session_id: session, metadata })
}

/**
 * 施設単位の行動ログ (ランキングの元データ)。
 * trackEvent とは別テーブルで、施設ごとに集計しやすい形で残す。
 */
export type InteractionType =
  | "detail_view"
  | "save"
  | "review"
  | "ticket_click"
  | "reservation_click"
  | "map_click"
  | "phone_click"
  | "website_click"

export function trackInteraction(placeId: string, interactionType: InteractionType) {
  if (typeof window === "undefined" || !placeId) return
  send("/api/interactions", {
    place_id: placeId,
    interaction_type: interactionType,
    session_id: sessionId(),
  })
}
