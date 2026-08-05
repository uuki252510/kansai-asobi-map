export const revalidate = 900

import type { Metadata } from "next"
import Link from "next/link"
import ArticleList from "@/components/ArticleList"
import { getPublishedArticles } from "@/lib/articles"

export const metadata: Metadata = {
  title: "おでかけ記事・特集",
  description: "関西のおでかけに役立つ特集記事・季節のおでかけ情報・おでかけのコツをまとめています。",
  alternates: { canonical: "/articles" },
}

export default async function ArticlesPage() {
  const articles = await getPublishedArticles(48)

  return (
    <main className="page-shell py-6 sm:py-10">
      <h1 className="font-display text-2xl font-black tracking-tight text-ink sm:text-3xl">おでかけ記事・特集</h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">
        季節ごとの遊び方、行く前に知っておきたいこと、編集部が選んだおすすめ。
      </p>

      {articles.length === 0 ? (
        <div className="card-v2 mt-8 px-6 py-14 text-center">
          <p className="text-base font-black text-ink">記事は準備中です</p>
          <p className="mt-2 text-sm text-ink-soft">まもなく公開します。まずはスポットから探してみてください。</p>
          <Link href="/spots" className="btn-primary mt-5">スポットをさがす</Link>
        </div>
      ) : (
        <div className="mt-6">
          <ArticleList articles={articles} variant="grid" />
        </div>
      )}
    </main>
  )
}
