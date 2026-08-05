export const dynamic = "force-dynamic"

import Link from "next/link"
import ArticleForm from "../ArticleForm"

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <main className="page-shell py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-black text-ink">記事を編集</h1>
        <Link href="/admin/articles" className="btn-secondary">記事一覧へ</Link>
      </div>
      <ArticleForm articleId={id} />
    </main>
  )
}
