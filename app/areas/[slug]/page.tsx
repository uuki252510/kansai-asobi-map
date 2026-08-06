export const revalidate = 3600

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import PlaceCard from "@/components/PlaceCard"
import { AREAS, getAreaBySlug, getChildAreas, getPlacesForArea, getSiblingAreas } from "@/lib/areas"
import { getAllPlaces } from "@/lib/places"
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/structured-data"

export function generateStaticParams() {
  return AREAS.map((area) => ({ slug: area.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const area = getAreaBySlug(slug)
  if (!area) return {}
  return {
    title: `${area.name}のおでかけスポット`,
    description: `${area.description} 雨の日OK・無料・駐車場ありの条件でも探せます。`,
    alternates: { canonical: `/areas/${area.slug}` },
  }
}

const conditionLinks = [
  { label: "雨の日OK", query: "rainy_day_ok=true" },
  { label: "無料", query: "price_type=free" },
  { label: "屋内", query: "indoor_type=indoor" },
  { label: "駐車場あり", query: "has_parking=true" },
]

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const area = getAreaBySlug(slug)
  if (!area) notFound()

  const allPlaces = await getAllPlaces().catch(() => [])
  const areaPlaces = getPlacesForArea(area, allPlaces).sort((left, right) => {
    const leftScore = left.review_count * 2 + (left.avg_rating ?? 0) + (left.image_url ? 2 : 0)
    const rightScore = right.review_count * 2 + (right.avg_rating ?? 0) + (right.image_url ? 2 : 0)
    return rightScore - leftScore
  })

  const children = getChildAreas(area.slug)
  const siblings = getSiblingAreas(area)
  const relatedAreas = children.length > 0 ? children : siblings
  const featured = areaPlaces.slice(0, 12)

  const breadcrumb = breadcrumbJsonLd([
    { name: "ホーム", path: "/" },
    { name: "エリア", path: "/areas" },
    { name: area.name, path: `/areas/${area.slug}` },
  ])
  const itemList = itemListJsonLd(`${area.name}のおでかけスポット`, featured)

  const spotsBaseQuery = `prefecture=${encodeURIComponent(area.prefecture)}`

  return (
    <main className="page-shell py-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "<") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList).replace(/</g, "<") }} />

      <nav aria-label="パンくず" className="text-xs font-bold text-ink-soft">
        <Link href="/" className="hover:text-ink">ホーム</Link>
        <span className="mx-1.5" aria-hidden>/</span>
        <Link href="/areas" className="hover:text-ink">エリア</Link>
        <span className="mx-1.5" aria-hidden>/</span>
        <span className="text-ink">{area.name}</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
          {area.name}のおでかけスポット
          <span className="ml-2 text-base font-bold text-ink-soft">{areaPlaces.length}件</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">{area.description}</p>
      </header>

      <div className="scrollbar-hide -mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-0.5">
        {conditionLinks.map((condition) => (
          <Link key={condition.query} href={`/spots?${spotsBaseQuery}&${condition.query}`} className="pill">
            {condition.label}
          </Link>
        ))}
        <Link href={`/spots?${spotsBaseQuery}`} className="pill">
          すべての条件で探す
        </Link>
      </div>

      {featured.length === 0 ? (
        <p className="card-v2 mt-8 px-6 py-12 text-center text-sm text-ink-soft">
          このエリアのスポットは準備中です。
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      )}

      {areaPlaces.length > featured.length && (
        <div className="mt-8 flex justify-center">
          <Link href={`/spots?${spotsBaseQuery}`} className="btn-secondary px-8">
            {area.name}の全{areaPlaces.length}件を見る
          </Link>
        </div>
      )}

      {relatedAreas.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-black text-ink">{children.length > 0 ? `${area.name}の人気エリア` : "近くのエリア"}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {relatedAreas.map((related) => (
              <Link key={related.slug} href={`/areas/${related.slug}`} className="pill">
                {related.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
