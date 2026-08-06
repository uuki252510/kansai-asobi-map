import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { checkRateLimit, clientKey } from "@/lib/rate-limit"

const allowedEvents = new Set([
  "recommendation_started",
  "recommendation_conditions_completed",
  "recommendations_viewed",
  "recommendations_regenerated",
  "spot_detail_viewed",
  "favorite_added",
  "outing_decided",
  "map_opened",
  "map_marker_click",
  "recommendations_shared",
  "vote_created",
  "outing_record_created",
])

export async function POST(request: Request) {
  const limit = checkRateLimit(clientKey(request, "analytics"), 60, 60_000)
  if (!limit.ok) return NextResponse.json({ error: "too many requests" }, { status: 429 })
  try {
    const payload = (await request.json()) as {
      event_name?: string
      session_id?: string
      metadata?: Record<string, unknown>
    }
    if (!payload.event_name || !allowedEvents.has(payload.event_name)) {
      return NextResponse.json({ error: "unsupported event" }, { status: 400 })
    }
    if (!payload.session_id || payload.session_id.length > 100) {
      return NextResponse.json({ error: "invalid session" }, { status: 400 })
    }
    const serializedMetadata = JSON.stringify(payload.metadata ?? {})
    if (serializedMetadata.length > 8_000) {
      return NextResponse.json({ error: "metadata is too large" }, { status: 413 })
    }

    const supabase = createServerClient()
    const { error } = await supabase.from("recommendation_logs").insert({
      event_name: payload.event_name,
      session_id: payload.session_id,
      conditions: {},
      result_place_ids: [],
      metadata: payload.metadata ?? {},
      user_id: null,
      weather_snapshot: null,
    })

    return NextResponse.json({ accepted: !error }, { status: 202 })
  } catch {
    return NextResponse.json({ accepted: false }, { status: 202 })
  }
}
