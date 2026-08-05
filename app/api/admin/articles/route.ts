import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { verifyAdminRequest } from "@/lib/admin-auth"
import { validateArticle } from "@/lib/article-payload"
import { createServiceRoleClient } from "@/lib/supabase/service"

/** 記事の一覧取得 / 新規作成 */

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("articles" as never)
    .select("id,slug,title,article_type,status,is_featured,published_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ articles: data ?? [] })
}

export async function POST(request: Request) {
  if (!verifyAdminRequest(request)) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "JSONが正しくありません" }, { status: 400 })
  }
  const parsed = validateArticle(raw)
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { place_ids: placeIds, tag_ids: tagIds, published_at: publishedAt, ...fields } = parsed.payload

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("articles" as never)
    .insert({ ...fields, published_at: publishedAt ? `${publishedAt}:00` : null } as never)
    .select("id,slug")
    .single()

  if (error || !data) {
    const duplicate = error?.code === "23505"
    return NextResponse.json(
      { error: duplicate ? "そのURLスラッグは既に使われています" : `作成に失敗しました: ${error?.message}` },
      { status: duplicate ? 409 : 500 },
    )
  }

  const created = data as unknown as { id: string; slug: string }
  if (placeIds.length > 0) {
    await supabase.from("article_places" as never).insert(
      placeIds.map((placeId, index) => ({ article_id: created.id, place_id: placeId, sort_order: index })) as never,
    )
  }
  if (tagIds.length > 0) {
    await supabase.from("article_tags" as never).insert(
      tagIds.map((tagId) => ({ article_id: created.id, tag_id: tagId })) as never,
    )
  }

  revalidatePath("/articles")
  revalidatePath("/")
  return NextResponse.json({ article: created }, { status: 201 })
}
