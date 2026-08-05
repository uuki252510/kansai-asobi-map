import { NextResponse } from "next/server"
import { checkRateLimit, clientKey } from "@/lib/rate-limit"
import { createServerClient } from "@/lib/supabase/server"

/**
 * 行動ログの記録 (ランキングの元データ)。
 * 匿名で受けるので、レート制限 + 種別ホワイトリストで守る。
 * sendBeacon から呼ばれるため、失敗しても常に軽い応答を返す。
 */

const UUID_PATTERN = /^[0-9a-f-]{36}$/i
const TYPES = new Set([
  "detail_view",
  "save",
  "review",
  "ticket_click",
  "reservation_click",
  "map_click",
  "phone_click",
  "website_click",
])

export async function POST(request: Request) {
  // 1分30件まで。通常の閲覧では到達しないが、スクリプトの連投は弾く
  const limit = checkRateLimit(clientKey(request, "interactions"), 30, 60_000)
  if (!limit.ok) return NextResponse.json({ accepted: false }, { status: 429 })

  try {
    const payload = (await request.json()) as {
      place_id?: string
      interaction_type?: string
      session_id?: string
    }
    if (!payload.place_id || !UUID_PATTERN.test(payload.place_id)) {
      return NextResponse.json({ accepted: false }, { status: 400 })
    }
    if (!payload.interaction_type || !TYPES.has(payload.interaction_type)) {
      return NextResponse.json({ accepted: false }, { status: 400 })
    }

    const supabase = createServerClient()
    await supabase.from("facility_interactions" as never).insert({
      place_id: payload.place_id,
      interaction_type: payload.interaction_type,
      session_id: payload.session_id?.slice(0, 100) ?? null,
    } as never)
  } catch {
    // 計測失敗でユーザー体験を壊さない
    return NextResponse.json({ accepted: false }, { status: 202 })
  }

  return NextResponse.json({ accepted: true }, { status: 202 })
}
