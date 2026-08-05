import { supabase } from "@/lib/supabase/client"
import { storagePublicUrl } from "@/lib/media-validation"

/**
 * 記事 (特集・季節のおでかけ情報)。
 * テーブル未適用の環境では空配列を返し、公開画面を壊さない。
 */

export type ArticleType = "feature" | "seasonal" | "howto" | "ranking" | "news" | "interview"

export interface Article {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body: string | null
  cover_storage_path: string | null
  cover_external_url: string | null
  article_type: ArticleType
  season: string | null
  prefecture: string | null
  published_at: string | null
  is_featured: boolean
  author_name: string | null
  seo_title: string | null
  seo_description: string | null
  noindex: boolean
}

export const ARTICLE_TYPE_LABELS: Record<ArticleType, string> = {
  feature: "特集",
  seasonal: "季節のおでかけ",
  howto: "おでかけのコツ",
  ranking: "ランキング",
  news: "ニュース",
  interview: "インタビュー",
}

const COLUMNS =
  "id,slug,title,excerpt,body,cover_storage_path,cover_external_url,article_type,season,prefecture,published_at,is_featured,author_name,seo_title,seo_description,noindex"

export function articleCoverUrl(article: Pick<Article, "cover_storage_path" | "cover_external_url">): string | null {
  if (article.cover_storage_path) return storagePublicUrl(article.cover_storage_path)
  return article.cover_external_url
}

async function safe<T>(run: () => PromiseLike<{ data: T | null; error: unknown }>, fallback: T): Promise<T> {
  try {
    const { data, error } = await run()
    if (error) return fallback
    return data ?? fallback
  } catch {
    return fallback
  }
}

export async function getPublishedArticles(limit = 12, type?: ArticleType): Promise<Article[]> {
  return safe<Article[]>(
    () => {
      let query = supabase
        .from("articles" as never)
        .select(COLUMNS)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(limit)
      if (type) query = query.eq("article_type", type)
      return query.then((result) => ({ data: result.data as unknown as Article[], error: result.error }))
    },
    [],
  )
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  return safe<Article | null>(
    () =>
      supabase
        .from("articles" as never)
        .select(COLUMNS)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle()
        .then((result) => ({ data: result.data as unknown as Article | null, error: result.error })),
    null,
  )
}

export async function getArticleTags(articleId: string): Promise<Array<{ id: string; slug: string; name: string }>> {
  return safe<Array<{ id: string; slug: string; name: string }>>(
    () =>
      supabase
        .from("article_tags" as never)
        .select("tag:tags(id,slug,name)")
        .eq("article_id", articleId)
        .then((result) => ({
          data: ((result.data ?? []) as Array<{ tag: { id: string; slug: string; name: string } | null }>)
            .map((row) => row.tag)
            .filter((tag): tag is { id: string; slug: string; name: string } => Boolean(tag)),
          error: result.error,
        })),
    [],
  )
}

/** 同じタグ or 同じ記事タイプの記事を関連として返す */
export async function getRelatedArticles(article: Article, limit = 4): Promise<Article[]> {
  const tags = await getArticleTags(article.id)
  if (tags.length > 0) {
    const ids = await safe<string[]>(
      () =>
        supabase
          .from("article_tags" as never)
          .select("article_id")
          .in("tag_id", tags.map((tag) => tag.id))
          .neq("article_id", article.id)
          .limit(30)
          .then((result) => ({
            data: [...new Set(((result.data ?? []) as Array<{ article_id: string }>).map((row) => row.article_id))],
            error: result.error,
          })),
      [],
    )
    if (ids.length > 0) {
      const related = await safe<Article[]>(
        () =>
          supabase
            .from("articles" as never)
            .select(COLUMNS)
            .in("id", ids.slice(0, limit))
            .eq("status", "published")
            .then((result) => ({ data: result.data as unknown as Article[], error: result.error })),
        [],
      )
      if (related.length > 0) return related
    }
  }
  // タグが無ければ同じタイプの新着で埋める
  const sameType = await getPublishedArticles(limit + 1, article.article_type)
  return sameType.filter((entry) => entry.id !== article.id).slice(0, limit)
}

export async function getArticlePlaceIds(articleId: string): Promise<string[]> {
  return safe<string[]>(
    () =>
      supabase
        .from("article_places" as never)
        .select("place_id,sort_order")
        .eq("article_id", articleId)
        .order("sort_order")
        .then((result) => ({
          data: ((result.data ?? []) as Array<{ place_id: string }>).map((row) => row.place_id),
          error: result.error,
        })),
    [],
  )
}

/** ある施設を紹介している記事 (詳細ページからの回遊) */
export async function getArticlesForPlace(placeId: string, limit = 4): Promise<Article[]> {
  const ids = await safe<string[]>(
    () =>
      supabase
        .from("article_places" as never)
        .select("article_id")
        .eq("place_id", placeId)
        .limit(limit)
        .then((result) => ({
          data: ((result.data ?? []) as Array<{ article_id: string }>).map((row) => row.article_id),
          error: result.error,
        })),
    [],
  )
  if (ids.length === 0) return []
  return safe<Article[]>(
    () =>
      supabase
        .from("articles" as never)
        .select(COLUMNS)
        .in("id", ids)
        .eq("status", "published")
        .then((result) => ({ data: result.data as unknown as Article[], error: result.error })),
    [],
  )
}
