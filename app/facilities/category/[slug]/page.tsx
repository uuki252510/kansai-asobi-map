export const revalidate = 3600

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import PlaceCard from "@/components/PlaceCard"
import { getCategories, getCategoryBySlug, getPlaceIdsForCategory } from "@/lib/facilities"
import { getAllPlaces } from "@/lib/places"
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/structured-data"

/**
 * カテゴリー別SEOページ。掲載5件未満は noindex (薄いページをインデックスさせない)。
 */

const INDEX_THRESHOLD = 5

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) return {}
  const placeIds = await getPlaceIdsForCategory(category.id)
  return {
    title: category.seo_title ?? `関西の${category.name}`,
    description:
      category.seo_description ??
      `関西 (大阪・兵庫・京都・奈良・滋賀・和歌山) の${category.name}を${placeIds.length}件掲載。料金・営業時間・雨の日OKの条件でも探せます。`,
    alternates: { canonical: `/facilities/category/${category.slug}` },
    robots: placeIds.length < INDEX_THRESHOLD ? { index: false, follow: true } : undefined,
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const [placeIds, allPlaces, allCategories] = await Promise.all([
    getPlaceIdsForCategory(category.id),
    getAllPlaces().catch(() => []),
    getCategories(),
  ])
  const idSet = new Set(placeIds)
  const places = allPlaces.filter((place) => idSet.has(place.id))

  return (
    <main className="page-shell py-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: "ホーム", path: "/" },
        { name: "カテゴリー", path: "/spots" },
        { name: category.name, path: `/facilities/category/${category.slug}` },
      ])) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd(`関西の${category.name}`, places.slice(0, 24))) }} />

      <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
        関西の{category.name}
        <span className="ml-2 text-base font-bold text-ink-soft">{places.length}件</span>
      </h1>
      {category.description && <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">{category.description}</p>}

      {places.length === 0 ? (
        <div className="card-v2 mt-8 px-6 py-14 text-center">
          <p className="text-base font-black text-ink">このカテゴリーのスポットは準備中です</p>
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
        <h2 className="text-lg font-black text-ink">ほかのカテゴリー</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {allCategories.filter((entry) => entry.slug !== category.slug).slice(0, 16).map((entry) => (
            <Link key={entry.slug} href={`/facilities/category/${entry.slug}`} className="pill">
              {entry.name}
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
