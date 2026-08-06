import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-auth"

/**
 * admin ページ (Server Component) の認証ガード。
 *
 * proxy.ts のリダイレクトは UX 用の楽観チェックでしかない
 * (Next のドキュメント自身が「完全な認可には使うな」と明記している)。
 * データを service role で読む admin ページは、必ずページ本体でも
 * これを呼んで検証する。
 */
export async function requireAdmin(): Promise<void> {
  const store = await cookies()
  const token = store.get(ADMIN_COOKIE)?.value
  if (!isValidAdminToken(token ?? null)) redirect("/admin/login")
}
