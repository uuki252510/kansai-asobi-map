import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { verifyAdminRequest } from "@/lib/admin-auth"
import { validateArticle } from "@/lib/article-payload"
import { createServiceRoleClient } from "@/lib/supabase/service"

const UUID_PATTERN = /^[0-9a-f-]{36}$/i

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminRequest(request)) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  const supabase = createServiceRoleClient()
  const [article, links, tagLinks] = await Promise.all([
    supabase.from("articles" as never).select("*").eq("id", id).single() as unknown as Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>,
    supabase.from("article_places" as never).select("place_id,sort_order").eq("article_id", id).order("sort_order"),
    supabase.from("article_tags" as never).select("tag_id").eq("article_id", id),
  ])
  if (article.error || !article.data) return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 })

  const row = article.data
  return NextResponse.json({
    article: { ...row, published_at: row.published_at ? String(row.published_at).slice(0, 16) : null },
    place_ids: ((links.data ?? []) as Array<{ place_id: string }>).map((entry) => entry.place_id),
    tag_ids: ((tagLinks.data ?? []) as Array<{ tag_id: string }>).map((entry) => entry.tag_id),
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminRequest(request)) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 })

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
    .update({
      ...fields,
      published_at: publishedAt ? `${publishedAt}:00` : null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id)
    .select("slug")
    .single()

  if (error || !data) {
    const duplicate = error?.code === "23505"
    return NextResponse.json(
      { error: duplicate ? "そのURLスラッグは既に使われています" : `保存に失敗しました: ${error?.message}` },
      { status: duplicate ? 409 : 500 },
    )
  }

  // 紹介スポット・タグは置き換え
  await supabase.from("article_places" as never).delete().eq("article_id", id)
  if (placeIds.length > 0) {
    await supabase.from("article_places" as never).insert(
      placeIds.map((placeId, index) => ({ article_id: id, place_id: placeId, sort_order: index })) as never,
    )
  }
  await supabase.from("article_tags" as never).delete().eq("article_id", id)
  if (tagIds.length > 0) {
    await supabase.from("article_tags" as never).insert(
      tagIds.map((tagId) => ({ article_id: id, tag_id: tagId })) as never,
    )
  }

  revalidatePath("/articles")
  revalidatePath(`/articles/${(data as unknown as { slug: string }).slug}`)
  revalidatePath("/")
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminRequest(request)) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { error } = await supabase.from("articles" as never).delete().eq("id", id)
  if (error) return NextResponse.json({ error: `削除に失敗しました: ${error.message}` }, { status: 500 })

  revalidatePath("/articles")
  revalidatePath("/")
  return NextResponse.json({ ok: true })
}
