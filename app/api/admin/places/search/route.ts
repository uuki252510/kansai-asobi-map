import { NextResponse } from "next/server"
import { verifyAdminRequest } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/service"

/**
 * 施設の簡易検索 (記事の紹介スポット選択用)。
 * 静的セグメントなので [id] ルートより優先して解決される。
 */
export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })

  const url = new URL(request.url)
  const query = (url.searchParams.get("q") ?? "").trim()
  const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean)

  const supabase = createServiceRoleClient()
  let request$ = supabase.from("places").select("id,name,prefecture,city").limit(20)

  if (ids.length > 0) {
    request$ = supabase.from("places").select("id,name,prefecture,city").in("id", ids.slice(0, 30))
  } else if (query) {
    const safe = query.replace(/[,%()]/g, " ").trim()
    if (!safe) return NextResponse.json({ places: [] })
    request$ = request$.or(`name.ilike.%${safe}%,city.ilike.%${safe}%`)
  } else {
    return NextResponse.json({ places: [] })
  }

  const { data, error } = await request$
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ places: data ?? [] })
}
