export const dynamic = 'force-dynamic'

import { createServerClient } from "@/lib/supabase/server"
import AdminClient from "./AdminClient"
import type { Place } from "@/lib/supabase/database.types"
import { normalizePlace } from "@/lib/places"

async function LogoutButton() {
  return (
    <form action="/api/admin/logout" method="POST">
      <button
        type="submit"
        className="btn-secondary"
        formAction="/api/admin/logout"
      >
        ログアウト
      </button>
    </form>
  )
}

export default async function AdminPage() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("places")
    .select("*")
    .order("created_at", { ascending: false })

  const places: Place[] = error ? [] : (data ?? []).map(normalizePlace)

  return (
    <main className="admin-page page-shell py-8 sm:py-12">
      <div className="utility-hero mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">Content operations</p><h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-foreground">管理画面</h1>
          <p className="mt-2 text-sm text-muted-foreground">遊び場の登録・編集・公開状態を管理します。</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/admin/events" className="btn-secondary">イベント</a>
          <a href="/admin/articles" className="btn-secondary">記事・特集</a>
          <LogoutButton />
        </div>
      </div>
      <AdminClient initialPlaces={places} />
    </main>
  )
}
