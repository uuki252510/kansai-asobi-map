import { NextResponse } from "next/server"
import { checkRateLimit, clientKey } from "@/lib/rate-limit"
import { createServerClient } from "@/lib/supabase/server"

/**
 * 情報修正リクエストの受付 (公開・匿名可)。
 * 承認された内容でも自動で本番データは書き換えず、管理者確認後に反映する。
 */

const UUID_PATTERN = /^[0-9a-f-]{36}$/i
const CORRECTION_TYPES = new Set([
  "hours",
  "price",
  "closure",
  "address",
  "contact",
  "facility_info",
  "other",
])

export async function POST(request: Request) {
  const limit = checkRateLimit(clientKey(request, "corrections"), 5, 60 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: "送信が集中しています。しばらく時間をおいてお試しください。" },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    )
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "JSONが正しくありません" }, { status: 400 })
  }

  const input = raw as Record<string, unknown>
  const placeId = typeof input.place_id === "string" ? input.place_id : ""
  const correctionType = typeof input.correction_type === "string" ? input.correction_type : ""
  const proposedValue = typeof input.proposed_value === "string" ? input.proposed_value.trim() : ""

  if (!UUID_PATTERN.test(placeId)) return NextResponse.json({ error: "施設IDが不正です" }, { status: 400 })
  if (!CORRECTION_TYPES.has(correctionType)) return NextResponse.json({ error: "修正の種類を選んでください" }, { status: 400 })
  if (proposedValue.length < 5) return NextResponse.json({ error: "正しい情報を5文字以上でご記入ください" }, { status: 400 })
  if (proposedValue.length > 2000) return NextResponse.json({ error: "内容が長すぎます" }, { status: 400 })

  const email = typeof input.reporter_email === "string" ? input.reporter_email.trim() : ""
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "メールアドレスの形式が正しくありません" }, { status: 400 })
  }
  const evidenceUrl = typeof input.evidence_url === "string" ? input.evidence_url.trim() : ""
  if (evidenceUrl && !/^https?:\/\//.test(evidenceUrl)) {
    return NextResponse.json({ error: "参考URLは http(s) から始めてください" }, { status: 400 })
  }

  try {
    const supabase = createServerClient()
    const { error } = await supabase.from("facility_correction_requests" as never).insert({
      place_id: placeId,
      reporter_name: typeof input.reporter_name === "string" ? input.reporter_name.slice(0, 60) : null,
      reporter_email: email || null,
      correction_type: correctionType,
      current_value: typeof input.current_value === "string" ? input.current_value.slice(0, 2000) : null,
      proposed_value: proposedValue,
      reason: typeof input.reason === "string" ? input.reason.slice(0, 1000) : null,
      evidence_url: evidenceUrl || null,
      status: "pending",
    } as never)
    if (error) throw error
  } catch {
    return NextResponse.json({ error: "受け付けに失敗しました。時間をおいてお試しください。" }, { status: 503 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
