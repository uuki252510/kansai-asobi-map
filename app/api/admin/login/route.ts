import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { checkRateLimit, clientKey } from '@/lib/rate-limit'

const COOKIE = 'admin_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7日

/** 長さが違っても所要時間が変わらない比較 */
function safeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  if (bufferA.length !== bufferB.length) return false
  return timingSafeEqual(bufferA, bufferB)
}

export async function POST(req: NextRequest) {
  // 共有パスワード1本なので、総当たりだけは必ず止める
  const limit = checkRateLimit(clientKey(req, 'admin-login'), 5, 15 * 60_000)
  if (!limit.ok) {
    return NextResponse.json({ error: '試行回数が多すぎます。しばらく待ってください' }, { status: 429 })
  }

  let password: unknown
  try {
    ;({ password } = await req.json())
  } catch {
    return NextResponse.json({ error: 'リクエストが正しくありません' }, { status: 400 })
  }

  const expected = process.env.ADMIN_PASSWORD
  if (typeof password !== 'string' || !expected || !safeEquals(password, expected)) {
    return NextResponse.json({ error: 'パスワードが違います' }, { status: 401 })
  }

  const token = process.env.ADMIN_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'サーバー設定エラー' }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
  return res
}
