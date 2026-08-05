import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { verifyAdminRequest } from '@/lib/admin-auth'
import { parsePlacePayload } from '@/lib/admin-place-payload'
import { createServiceRoleClient } from '@/lib/supabase/service'

export async function POST(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSONが正しくありません' }, { status: 400 })
  }

  const parsed = parsePlacePayload(raw)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.from('places').insert(parsed.payload).select().single()
  if (error || !data) {
    return NextResponse.json({ error: `登録に失敗しました: ${error?.message ?? 'unknown'}` }, { status: 500 })
  }

  revalidateTag('places', 'max')
  revalidatePath('/places')
  revalidatePath('/')
  return NextResponse.json({ place: data }, { status: 201 })
}
