import { NextResponse } from "next/server"
import { verifyAdminRequest } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/service"

/** タグ候補 (記事・施設で共通の語彙) */
export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("tags" as never)
    .select("id,slug,name")
    .eq("is_active", true)
    .is("canonical_tag_id", null)
    .order("sort_order")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tags: data ?? [] })
}
