import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { verifyAdminRequest } from '@/lib/admin-auth'
import { parsePlacePayload } from '@/lib/admin-place-payload'
import { createServiceRoleClient } from '@/lib/supabase/service'

const UUID_PATTERN = /^[0-9a-f-]{36}$/i

function revalidatePlacePages(id: string) {
  revalidateTag('places', 'max')
  revalidatePath('/places')
  revalidatePath(`/places/${id}`)
  revalidatePath('/')
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSONが正しくありません' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // is_published のみのトグル更新を軽量サポート
  if (
    typeof raw === 'object' && raw !== null &&
    Object.keys(raw).length === 1 &&
    typeof (raw as { is_published?: unknown }).is_published === 'boolean'
  ) {
    const { data, error } = await supabase
      .from('places')
      .update({ is_published: (raw as { is_published: boolean }).is_published })
      .eq('id', id)
      .select()
      .single()
    if (error || !data) {
      return NextResponse.json({ error: `更新に失敗しました: ${error?.message ?? 'unknown'}` }, { status: 500 })
    }
    revalidatePlacePages(id)
    return NextResponse.json({ place: data })
  }

  const parsed = parsePlacePayload(raw)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data, error } = await supabase.from('places').update(parsed.payload).eq('id', id).select().single()
  if (error || !data) {
    return NextResponse.json({ error: `更新に失敗しました: ${error?.message ?? 'unknown'}` }, { status: 500 })
  }

  revalidatePlacePages(id)
  return NextResponse.json({ place: data })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('places').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: `削除に失敗しました: ${error.message}` }, { status: 500 })
  }

  revalidatePlacePages(id)
  return NextResponse.json({ ok: true })
}
