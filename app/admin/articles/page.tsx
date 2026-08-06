export const dynamic = "force-dynamic"

import Link from "next/link"
import { requireAdmin } from "@/lib/admin-guard"
import { Plus } from "lucide-react"
import { ARTICLE_TYPE_LABELS, type ArticleType } from "@/lib/articles"
import { createServiceRoleClient } from "@/lib/supabase/service"

interface ArticleRow {
  id: string
  slug: string
  title: string
  article_type: ArticleType
  status: string
  is_featured: boolean
  published_at: string | null
  updated_at: string
}

const STATUS_STYLES: Record<string, string> = {
  published: "bg-positive-soft text-positive",
  draft: "bg-muted text-ink-soft",
  archived: "bg-caution-soft text-caution",
}
const STATUS_LABELS: Record<string, string> = { published: "公開中", draft: "下書き", archived: "アーカイブ" }

export default async function AdminArticlesPage() {
  await requireAdmin()
  let articles: ArticleRow[] = []
  let loadError: string | null = null
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from("articles" as never)
      .select("id,slug,title,article_type,status,is_featured,published_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(200)
    if (error) loadError = error.message
    else articles = (data ?? []) as unknown as ArticleRow[]
  } catch (error) {
    loadError = error instanceof Error ? error.message : "unknown"
  }

  return (
    <main className="page-shell py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-wide text-ink-soft">CONTENT</p>
          <h1 className="mt-1 font-display text-2xl font-black text-ink">記事・特集</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin" className="btn-secondary">施設管理へ</Link>
          <Link href="/admin/articles/new" className="btn-primary">
            <Plus className="size-4" aria-hidden />新しい記事
          </Link>
        </div>
      </div>

      {loadError && (
        <p className="mb-4 rounded-xl bg-caution-soft px-4 py-3 text-sm font-bold text-caution">
          読み込みに失敗しました: {loadError}
        </p>
      )}

      {articles.length === 0 ? (
        <div className="card-v2 px-6 py-14 text-center">
          <p className="text-base font-black text-ink">まだ記事がありません</p>
          <p className="mt-2 text-sm text-ink-soft">季節のおでかけ情報や特集を書くと、トップと記事一覧に並びます。</p>
          <Link href="/admin/articles/new" className="btn-primary mt-5">最初の記事を書く</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/admin/articles/${article.id}`}
              className="card-v2 flex flex-wrap items-center gap-3 p-4 transition-transform duration-150 active:scale-[0.995]"
            >
              <span className={`rounded-full px-2.5 py-1 text-xs font-black ${STATUS_STYLES[article.status] ?? STATUS_STYLES.draft}`}>
                {STATUS_LABELS[article.status] ?? article.status}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-ink">
                  {article.is_featured && <span className="mr-1.5 text-accent-strong">★</span>}
                  {article.title}
                </span>
                <span className="mt-0.5 block truncate text-xs text-ink-soft">
                  {ARTICLE_TYPE_LABELS[article.article_type] ?? article.article_type} · /articles/{article.slug}
                  {article.published_at && ` · ${new Date(article.published_at).toLocaleDateString("ja-JP")}`}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
