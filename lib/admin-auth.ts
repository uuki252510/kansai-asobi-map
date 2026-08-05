export const ADMIN_COOKIE = 'admin_session'

/**
 * admin_session Cookie の値が ADMIN_TOKEN と一致するか検証する。
 * proxy.ts (画面ガード) と /api/admin/* (書き込みガード) の両方で使う。
 */
export function isValidAdminToken(token: string | undefined | null): boolean {
  const expected = process.env.ADMIN_TOKEN
  if (!expected || !token) return false
  return token === expected
}

export function verifyAdminRequest(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`))
  const token = match?.slice(ADMIN_COOKIE.length + 1)
  return isValidAdminToken(token ? decodeURIComponent(token) : null)
}
