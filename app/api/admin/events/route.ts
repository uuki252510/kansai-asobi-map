import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { verifyAdminRequest } from "@/lib/admin-auth"
import { validateEvent } from "@/lib/event-payload"
import { createServiceRoleClient } from "@/lib/supabase/service"

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("events" as never)
    .select("id,slug,name,event_category,status,start_at,end_at,prefecture,venue_name,is_featured")
    .order("start_at", { ascending: false })
    .limit(300)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data ?? [] })
}

export async function POST(request: Request) {
  if (!verifyAdminRequest(request)) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "JSONが正しくありません" }, { status: 400 })
  }
  const parsed = validateEvent(raw)
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { start_at: startAt, end_at: endAt, status, ...rest } = parsed.payload

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("events" as never)
    .insert({
      ...rest,
      status,
      start_at: `${startAt}:00+09:00`,
      end_at: `${endAt}:00+09:00`,
      published_at: status === "published" ? new Date().toISOString() : null,
    } as never)
    .select("id,slug")
    .single()

  if (error || !data) {
    const duplicate = error?.code === "23505"
    return NextResponse.json(
      { error: duplicate ? "そのURLスラッグは既に使われています" : `作成に失敗しました: ${error?.message}` },
      { status: duplicate ? 409 : 500 },
    )
  }

  revalidatePath("/events")
  revalidatePath("/")
  return NextResponse.json({ event: data }, { status: 201 })
}
