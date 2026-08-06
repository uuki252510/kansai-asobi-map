import type { MetadataRoute } from "next"
import { AREAS } from "@/lib/areas"
import { getPublishedArticles } from "@/lib/articles"
import { getPublishedEvents } from "@/lib/events"
import { getCategories, getPlaceIdsForCategory, getTags } from "@/lib/facilities"
import { getPublishedPlaceIndex } from "@/lib/places"
import { TIMEFRAMES } from "@/lib/timeframe"

const origin = "https://kansai.asobi.nexia-llc.jp"

// 新しい施設・記事・イベントがデプロイ無しで載るように定期再生成する
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [places, articles, categories, tags, events] = await Promise.all([
    getPublishedPlaceIndex().catch(() => []),
    getPublishedArticles(500).catch(() => []),
    getCategories().catch(() => []),
    getTags().catch(() => []),
    getPublishedEvents({ limit: 500 }).catch(() => []),
  ])
  // カテゴリページは5件未満だと noindex なので sitemap からも除く
  const categoryCounts = await Promise.all(
    categories.map(async (category) => ({ category, count: (await getPlaceIdsForCategory(category.id).catch(() => [])).length })),
  )
  const indexableCategories = categoryCounts.filter((entry) => entry.count >= 5).map((entry) => entry.category)
  return [
    { url: origin, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${origin}/spots`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${origin}/today`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${origin}/map`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${origin}/areas`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    // 時間軸ハブ (Time Out型)
    ...TIMEFRAMES.map((timeframe) => ({
      url: `${origin}/when/${timeframe.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    // エリアハブ (SEO資産の核)
    ...AREAS.map((area) => ({
      url: `${origin}/areas/${area.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${origin}/articles`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${origin}/events`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${origin}/ranking`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    // 開催中・開催予定のイベント (終了済みは載せない)
    ...events.map((event) => ({
      url: `${origin}/events/${event.slug ?? event.id}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    // 記事
    ...articles.map((article) => ({
      url: `${origin}/articles/${article.slug}`,
      lastModified: article.published_at ? new Date(article.published_at) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // カテゴリー/タグのSEOページ (タグは indexable のみ)
    ...indexableCategories.map((category) => ({
      url: `${origin}/facilities/category/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...tags
      .filter((tag) => tag.is_indexable)
      .map((tag) => ({
        url: `${origin}/facilities/tag/${tag.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ...places.map((place) => ({
      url: `${origin}/places/${place.id}`,
      lastModified: new Date(place.updated_at ?? place.created_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ]
}
