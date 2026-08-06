export const revalidate = 3600

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import PlaceCard from "@/components/PlaceCard"
import { getPlaceIdsForTag, getTagBySlug, getTags } from "@/lib/facilities"
import { getAllPlaces } from "@/lib/places"
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/structured-data"

/**
 * タグ別SEOページ。is_indexable=false または掲載5件未満は noindex。
 */

const INDEX_THRESHOLD = 5

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const tag = await getTagBySlug(slug)
  if (!tag) return {}
  const placeIds = await getPlaceIdsForTag(tag.id)
  const indexable = tag.is_indexable && placeIds.length >= INDEX_THRESHOLD
  return {
    title: `${tag.name}の関西おでかけスポット`,
    description: `「${tag.name}」の条件で選んだ関西のおでかけスポット${placeIds.length}件。今日行ける場所がすぐ見つかります。`,
    alternates: { canonical: `/facilities/tag/${tag.slug}` },
    robots: indexable ? undefined : { index: false, follow: true },
  }
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tag = await getTagBySlug(slug)
  if (!tag) notFound()

  const [placeIds, allPlaces, allTags] = await Promise.all([
    getPlaceIdsForTag(tag.id),
    getAllPlaces().catch(() => []),
    getTags(),
  ])
  const idSet = new Set(placeIds)
  const places = allPlaces.filter((place) => idSet.has(place.id))

  return (
    <main className="page-shell py-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: "ホーム", path: "/" },
        { name: "タグ", path: "/spots" },
        { name: tag.name, path: `/facilities/tag/${tag.slug}` },
      ])) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd(`${tag.name}の関西おでかけスポット`, places.slice(0, 24))).replace(/</g, "<") }} />

      <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
        {tag.name}
        <span className="ml-2 text-base font-bold text-ink-soft">{places.length}件</span>
      </h1>

      {places.length === 0 ? (
        <div className="card-v2 mt-8 px-6 py-14 text-center">
          <p className="text-base font-black text-ink">このタグのスポットは準備中です</p>
          <Link href="/spots" className="btn-primary mt-5">すべてのスポットをさがす</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {places.slice(0, 30).map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      )}

      <section className="mt-12">
        <h2 className="text-lg font-black text-ink">ほかのタグ</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {allTags.filter((entry) => entry.slug !== tag.slug).slice(0, 20).map((entry) => (
            <Link key={entry.slug} href={`/facilities/tag/${entry.slug}`} className="pill">
              {entry.name}
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
