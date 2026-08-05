export const revalidate = 900

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import ArticleBody from "@/components/ArticleBody"
import ArticleList from "@/components/ArticleList"
import PlaceCard from "@/components/PlaceCard"
import {
  ARTICLE_TYPE_LABELS,
  articleCoverUrl,
  getArticleBySlug,
  getArticlePlaceIds,
  getArticleTags,
  getRelatedArticles,
} from "@/lib/articles"
import { extractSpotIds, extractToc, readingMinutes } from "@/lib/article-body"
import { getPlacesByIds } from "@/lib/places"
import { breadcrumbJsonLd } from "@/lib/structured-data"

const SITE_URL = "https://kansai.asobi.nexia-llc.jp"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) return {}
  const description = article.seo_description ?? article.excerpt ?? undefined
  const cover = articleCoverUrl(article)
  return {
    title: article.seo_title ?? article.title,
    description,
    alternates: { canonical: `/articles/${article.slug}` },
    robots: article.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      title: article.title,
      description,
      url: `/articles/${article.slug}`,
      images: cover ? [{ url: cover, alt: article.title }] : undefined,
    },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) notFound()

  const body = article.body ?? ""
  // 本文に埋め込まれたスポット + 末尾に並べる関連スポットをまとめて取得
  const inlineSpotIds = extractSpotIds(body)
  const [listedIds, tags, related] = await Promise.all([
    getArticlePlaceIds(article.id),
    getArticleTags(article.id),
    getRelatedArticles(article, 4),
  ])
  const allIds = [...new Set([...inlineSpotIds, ...listedIds])]
  const places = allIds.length > 0 ? await getPlacesByIds(allIds).catch(() => []) : []
  const placeMap = new Map(places.map((place) => [place.id, place]))
  // 本文に出したスポットを末尾で重複させない
  const listedOnly = listedIds.filter((id) => !inlineSpotIds.includes(id)).map((id) => placeMap.get(id)).filter(Boolean)

  const toc = extractToc(body)
  const minutes = readingMinutes(body)
  const cover = articleCoverUrl(article)
  const publishedLabel = article.published_at ? new Date(article.published_at).toLocaleDateString("ja-JP") : null

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt ?? undefined,
    image: cover ?? undefined,
    datePublished: article.published_at ?? undefined,
    author: article.author_name
      ? { "@type": "Person", name: article.author_name }
      : { "@type": "Organization", name: "デカケル編集部" },
    publisher: { "@type": "Organization", name: "デカケル" },
    mainEntityOfPage: `${SITE_URL}/articles/${article.slug}`,
  }
  const breadcrumb = breadcrumbJsonLd([
    { name: "ホーム", path: "/" },
    { name: "記事・特集", path: "/articles" },
    { name: article.title, path: `/articles/${article.slug}` },
  ])

  return (
    <main className="page-shell py-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />

      <nav aria-label="パンくず" className="text-xs font-bold text-ink-soft">
        <Link href="/" className="hover:text-ink">ホーム</Link>
        <span className="mx-1.5" aria-hidden>/</span>
        <Link href="/articles" className="hover:text-ink">記事・特集</Link>
      </nav>

      <article className="mx-auto mt-4 max-w-3xl">
        <p className="text-xs font-black text-accent">{ARTICLE_TYPE_LABELS[article.article_type]}</p>
        <h1 className="mt-1.5 font-display text-2xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
          {article.title}
        </h1>

        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-ink-soft">
          {publishedLabel && <span>{publishedLabel}</span>}
          {article.author_name && <span>{article.author_name}</span>}
          {body.length > 0 && <span>約{minutes}分で読めます</span>}
          {places.length > 0 && <span>スポット{places.length}件</span>}
        </p>

        {cover && (
          <div className="mt-5 aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt={article.title} width={1200} height={675} className="size-full object-cover" />
          </div>
        )}

        {article.excerpt && (
          <p className="mt-5 rounded-2xl bg-accent-soft px-5 py-4 text-sm font-bold leading-7 text-ink">
            {article.excerpt}
          </p>
        )}

        {/* 目次: 長文でも迷子にならないように (見出し3つ以上のときだけ) */}
        {toc.length >= 3 && (
          <nav aria-label="目次" className="mt-6 rounded-2xl border border-line bg-surface p-5">
            <p className="font-display text-sm font-black text-ink">目次</p>
            <ol className="mt-2 space-y-1.5 text-sm">
              {toc.map((entry, index) => (
                <li key={entry.id} className={entry.level === 3 ? "pl-4" : undefined}>
                  <a href={`#${entry.id}`} className="text-ink-soft hover:text-accent-strong">
                    <span className="mr-2 font-bold tabular-nums text-ink-faint">{index + 1}</span>
                    {entry.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {body && <div className="mt-6"><ArticleBody body={body} places={placeMap} /></div>}

        {tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link key={tag.id} href={`/facilities/tag/${tag.slug}`} className="pill !min-h-9 !text-xs">
                {tag.name}
              </Link>
            ))}
          </div>
        )}
      </article>

      {listedOnly.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-black text-ink">この記事で紹介したスポット</h2>
          <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {listedOnly.map((place) => place && <PlaceCard key={place.id} place={place} />)}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <div className="mt-12">
          <ArticleList title="あわせて読みたい" articles={related} variant="grid" />
        </div>
      )}

      <div className="mt-12 flex justify-center">
        <Link href="/articles" className="btn-secondary px-8">ほかの記事を読む</Link>
      </div>
    </main>
  )
}
