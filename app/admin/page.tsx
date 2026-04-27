export const dynamic = 'force-dynamic'

import { createServerClient } from "@/lib/supabase/server"
import AdminClient from "./AdminClient"
import type { Place } from "@/lib/supabase/database.types"

export default async function AdminPage() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("places")
    .select("*")
    .order("created_at", { ascending: false })

  const places: Place[] = error ? [] : (data ?? [])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">管理画面</h1>
          <p className="text-sm text-muted-foreground mt-1">遊び場の登録・編集・削除ができます</p>
        </div>
      </div>
      <AdminClient initialPlaces={places} />
    </div>
  )
}
