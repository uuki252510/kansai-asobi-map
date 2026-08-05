/**
 * 記事の入力検証。admin フォームと API で共有する。
 */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UUID_PATTERN = /^[0-9a-f-]{36}$/i
const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

export const ARTICLE_TYPES = ["feature", "seasonal", "howto", "ranking", "news", "interview"] as const
export const ARTICLE_STATUSES = ["draft", "published", "archived"] as const
export const SEASONS = ["spring", "summer", "autumn", "winter"] as const

export interface ArticlePayload {
  slug: string
  title: string
  excerpt: string | null
  body: string | null
  cover_external_url: string | null
  article_type: (typeof ARTICLE_TYPES)[number]
  season: (typeof SEASONS)[number] | null
  prefecture: string | null
  status: (typeof ARTICLE_STATUSES)[number]
  is_featured: boolean
  published_at: string | null
  author_name: string | null
  seo_title: string | null
  seo_description: string | null
  noindex: boolean
  place_ids: string[]
  tag_ids: string[]
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

/** タイトルからslug候補を作る (和文はローマ字化せず日付ベースにフォールバック) */
export function suggestSlug(title: string): string {
  const ascii = title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
  if (ascii.length >= 3) return ascii.slice(0, 60)
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  return `article-${stamp}-${Math.random().toString(36).slice(2, 7)}`
}

export function validateArticle(raw: unknown): { payload: ArticlePayload } | { error: string } {
  if (typeof raw !== "object" || raw === null) return { error: "payload must be an object" }
  const input = raw as Record<string, unknown>

  const title = text(input.title, 160)
  if (!title) return { error: "タイトルは必須です" }

  const slug = text(input.slug, 60)?.toLowerCase() ?? ""
  if (!SLUG_PATTERN.test(slug)) {
    return { error: "URLスラッグは英小文字・数字・ハイフンのみで入力してください（例: summer-water-play）" }
  }

  const articleType = ARTICLE_TYPES.includes(input.article_type as never)
    ? (input.article_type as ArticlePayload["article_type"])
    : "feature"
  const status = ARTICLE_STATUSES.includes(input.status as never)
    ? (input.status as ArticlePayload["status"])
    : "draft"
  const season = SEASONS.includes(input.season as never) ? (input.season as ArticlePayload["season"]) : null

  const coverUrl = text(input.cover_external_url, 2000)
  if (coverUrl && !/^https?:\/\//.test(coverUrl)) {
    return { error: "カバー画像URLは http(s) から始めてください" }
  }

  const publishedAt = text(input.published_at, 20)
  if (publishedAt && !DATETIME_LOCAL_PATTERN.test(publishedAt)) {
    return { error: "公開日時の形式が不正です" }
  }
  if (status === "published" && !publishedAt) {
    return { error: "公開するには公開日時を入れてください" }
  }

  const placeIds = Array.isArray(input.place_ids)
    ? [...new Set(input.place_ids.filter((id): id is string => typeof id === "string" && UUID_PATTERN.test(id)))].slice(0, 30)
    : []
  const tagIds = Array.isArray(input.tag_ids)
    ? [...new Set(input.tag_ids.filter((id): id is string => typeof id === "string" && UUID_PATTERN.test(id)))].slice(0, 12)
    : []

  return {
    payload: {
      slug,
      title,
      excerpt: text(input.excerpt, 300),
      body: typeof input.body === "string" ? input.body.slice(0, 60_000) : null,
      cover_external_url: coverUrl,
      article_type: articleType,
      season,
      prefecture: text(input.prefecture, 20),
      status,
      is_featured: input.is_featured === true,
      published_at: publishedAt,
      author_name: text(input.author_name, 60),
      seo_title: text(input.seo_title, 160),
      seo_description: text(input.seo_description, 300),
      noindex: input.noindex === true,
      place_ids: placeIds,
      tag_ids: tagIds,
    },
  }
}
