import { NextResponse } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"
import { verifyAdminRequest } from "@/lib/admin-auth"
import { validateOffers } from "@/lib/facility-offers-payload"
import { createServiceRoleClient } from "@/lib/supabase/service"

const UUID_PATTERN = /^[0-9a-f-]{36}$/i

/** ISO文字列 → datetime-local ("2026-08-05T10:00") */
function toLocalInput(value: string | null): string {
  if (!value) return ""
  return value.slice(0, 16)
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminRequest(request)) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  const supabase = createServiceRoleClient()
  const [events, coupons, tickets] = await Promise.all([
    supabase.from("events" as never).select("*").eq("place_id", id).order("start_at"),
    supabase.from("coupons" as never).select("*").eq("place_id", id).order("created_at"),
    supabase.from("tickets" as never).select("*").eq("place_id", id).order("created_at"),
  ])

  return NextResponse.json({
    events: (events.data ?? []).map((event) => {
      const row = event as Record<string, unknown>
      return { ...row, start_at: toLocalInput(row.start_at as string), end_at: toLocalInput(row.end_at as string) }
    }),
    coupons: coupons.data ?? [],
    tickets: tickets.data ?? [],
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminRequest(request)) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "JSONが正しくありません" }, { status: 400 })
  }
  const parsed = validateOffers(raw)
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { events, coupons, tickets } = parsed.payload

  const supabase = createServiceRoleClient()
  await supabase.from("audit_logs" as never).insert({
    table_name: "places:offers",
    record_id: id,
    action: "update",
    new_data: parsed.payload as never,
    actor: "admin",
    ip_address: request.headers.get("x-forwarded-for") ?? null,
    user_agent: request.headers.get("user-agent") ?? null,
  } as never)

  try {
    await supabase.from("events" as never).delete().eq("place_id", id)
    if (events.length > 0) {
      const { error } = await supabase.from("events" as never).insert(
        events.map((event) => ({
          place_id: id,
          name: event.name,
          summary: event.summary,
          // datetime-local はローカル時刻。タイムゾーン表記を付けずDB側の解釈に委ねる
          start_at: `${event.start_at}:00`,
          end_at: `${event.end_at}:00`,
          child_price: event.child_price,
          adult_price: event.adult_price,
          reservation_required: event.reservation_required,
          official_url: event.official_url,
          status: event.status,
          published_at: event.status === "published" ? new Date().toISOString() : null,
        })) as never,
      )
      if (error) throw new Error(`events: ${error.message}`)
    }

    await supabase.from("coupons" as never).delete().eq("place_id", id)
    if (coupons.length > 0) {
      const { error } = await supabase.from("coupons" as never).insert(
        coupons.map((coupon) => ({ place_id: id, ...coupon })) as never,
      )
      if (error) throw new Error(`coupons: ${error.message}`)
    }

    await supabase.from("tickets" as never).delete().eq("place_id", id)
    if (tickets.length > 0) {
      const { error } = await supabase.from("tickets" as never).insert(
        tickets.map((ticket) => ({ place_id: id, ...ticket })) as never,
      )
      if (error) throw new Error(`tickets: ${error.message}`)
    }
  } catch (error) {
    return NextResponse.json(
      { error: `保存に失敗しました: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 500 },
    )
  }

  revalidateTag("places", "max")
  revalidatePath(`/places/${id}`)
  return NextResponse.json({ ok: true })
}
