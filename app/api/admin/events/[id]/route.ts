import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { verifyAdminRequest } from "@/lib/admin-auth"
import { validateEvent } from "@/lib/event-payload"
import { createServiceRoleClient } from "@/lib/supabase/service"

const UUID_PATTERN = /^[0-9a-f-]{36}$/i

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminRequest(request)) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  const supabase = createServiceRoleClient()
  const result = (await supabase.from("events" as never).select("*").eq("id", id).single()) as unknown as {
    data: Record<string, unknown> | null
    error: { message: string } | null
  }
  if (result.error || !result.data) return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 })

  const row = result.data
  return NextResponse.json({
    event: {
      ...row,
      start_at: row.start_at ? String(row.start_at).slice(0, 16) : "",
      end_at: row.end_at ? String(row.end_at).slice(0, 16) : "",
    },
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
  const parsed = validateEvent(raw)
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { start_at: startAt, end_at: endAt, status, ...rest } = parsed.payload

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("events" as never)
    .update({
      ...rest,
      status,
      start_at: `${startAt}:00`,
      end_at: `${endAt}:00`,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id)
    .select("slug")
    .single()

  if (error || !data) {
    const duplicate = error?.code === "23505"
    return NextResponse.json(
      { error: duplicate ? "そのURLスラッグは既に使われています" : `保存に失敗しました: ${error?.message}` },
      { status: duplicate ? 409 : 500 },
    )
  }

  revalidatePath("/events")
  revalidatePath(`/events/${(data as unknown as { slug: string | null }).slug ?? id}`)
  revalidatePath("/")
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminRequest(request)) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { error } = await supabase.from("events" as never).delete().eq("id", id)
  if (error) return NextResponse.json({ error: `削除に失敗しました: ${error.message}` }, { status: 500 })

  revalidatePath("/events")
  revalidatePath("/")
  return NextResponse.json({ ok: true })
}
