import Link from "next/link"
import { ARTICLE_TYPE_LABELS, articleCoverUrl, type Article } from "@/lib/articles"

/**
 * 記事リスト (いこーよの注目記事欄型)。
 * サムネイル + タイトル + 2行の要約。variant で横並び/縦積みを切り替える。
 */
export default function ArticleList({
  title,
  articles,
  variant = "rows",
  href = "/articles",
}: {
  title?: string
  articles: Article[]
  variant?: "rows" | "grid"
  href?: string
}) {
  if (articles.length === 0) return null

  return (
    <section>
      {title && (
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-lg font-black tracking-tight text-ink sm:text-xl">{title}</h2>
          <Link href={href} className="text-sm font-bold text-accent">
            記事一覧 →
          </Link>
        </div>
      )}

      <div className={variant === "grid" ? "mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "mt-3 divide-y divide-line"}>
        {articles.map((article) => {
          const cover = articleCoverUrl(article)
          if (variant === "grid") {
            return (
              <Link key={article.id} href={`/articles/${article.slug}`} className="group block">
                <div className="aspect-[16/10] overflow-hidden rounded-xl bg-muted">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt=""
                      width={640}
                      height={400}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover transition-transform duration-[250ms] ease-out group-hover:scale-[1.03]"
                    />
                  )}
                </div>
                <p className="mt-2 text-xs font-black text-accent">{ARTICLE_TYPE_LABELS[article.article_type]}</p>
                <h3 className="mt-0.5 line-clamp-2 text-sm font-black leading-snug text-ink">{article.title}</h3>
                {article.excerpt && (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-soft">{article.excerpt}</p>
                )}
              </Link>
            )
          }
          return (
            <Link key={article.id} href={`/articles/${article.slug}`} className="group flex gap-3 py-3">
              <span className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" width={160} height={160} loading="lazy" decoding="async" className="size-full object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black leading-snug text-ink group-hover:text-accent-strong">
                  {article.title}
                </span>
                {article.excerpt && (
                  <span className="mt-1 block line-clamp-2 text-xs leading-5 text-ink-soft">{article.excerpt}</span>
                )}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
