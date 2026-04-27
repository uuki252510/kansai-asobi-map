import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'admin_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7日

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!password || password !== process.env.ADMIN_PASSWORD) {
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
