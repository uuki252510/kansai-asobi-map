export const revalidate = 1800

import type { Metadata } from "next"
import Link from "next/link"
import PlaceImage from "@/components/PlaceImage"
import { getCategories, getCategoryBySlug, getPlaceIdsForCategory } from "@/lib/facilities"
import { getAllPlaces, PREFECTURES } from "@/lib/places"
import { getRanking, rankingBasis, type RankingWindow } from "@/lib/rankings"
import { itemListJsonLd } from "@/lib/structured-data"

type SearchParams = Promise<{ window?: string; prefecture?: string; category?: string }>

const WINDOW_LABELS: Record<RankingWindow, string> = { week: "週間", month: "月間", all: "総合" }
const WINDOWS = Object.keys(WINDOW_LABELS) as RankingWindow[]

export const metadata: Metadata = {
  title: "関西のおでかけスポット人気ランキング",
  description: "閲覧数・保存数・口コミをもとにした、関西のおでかけスポット人気ランキング。府県別・カテゴリー別でも見られます。",
  alternates: { canonical: "/ranking" },
}

export default async function RankingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const window = (WINDOWS as string[]).includes(params.window ?? "") ? (params.window as RankingWindow) : "month"
  const prefecture = (PREFECTURES as readonly string[]).includes(params.prefecture ?? "") ? params.prefecture : undefined

  const [allPlaces, categories, category] = await Promise.all([
    getAllPlaces().catch(() => []),
    getCategories(),
    params.category ? getCategoryBySlug(params.category) : Promise.resolve(null),
  ])
  const categoryPlaceIds = category ? new Set(await getPlaceIdsForCategory(category.id)) : null

  const [ranked, basis] = await Promise.all([
    getRanking(allPlaces.filter((place) => place.image_url), {
      window,
      limit: 30,
      filter: (place) => {
        if (prefecture && place.prefecture !== prefecture) return false
        if (categoryPlaceIds && !categoryPlaceIds.has(place.id)) return false
        return true
      },
    }),
    rankingBasis(window),
  ])

  const buildHref = (next: { window?: string; prefecture?: string; category?: string }) => {
    const query = new URLSearchParams()
    const nextWindow = next.window ?? window
    const nextPrefecture = next.prefecture !== undefined ? next.prefecture : prefecture
    const nextCategory = next.category !== undefined ? next.category : category?.slug
    if (nextWindow !== "month") query.set("window", nextWindow)
    if (nextPrefecture) query.set("prefecture", nextPrefecture)
    if (nextCategory) query.set("category", nextCategory)
    const text = query.toString()
    return text ? `/ranking?${text}` : "/ranking"
  }

  const title = `${WINDOW_LABELS[window]}人気ランキング${prefecture ? `（${prefecture}）` : ""}${category ? `｜${category.name}` : ""}`

  return (
    <main className="page-shell py-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd(title, ranked.map((entry) => entry.place))).replace(/</g, "<") }}
      />

      <h1 className="font-display text-2xl font-black tracking-tight text-ink sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">
        {basis === "interactions"
          ? "詳細ページの閲覧・保存・口コミなどの反応をもとに集計しています。"
          : "口コミ・評価・情報の充実度をもとに算出しています（アクセスデータが集まり次第、実際の反応に切り替わります）。"}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {WINDOWS.map((key) => (
          <Link key={key} href={buildHref({ window: key })} className={`pill${window === key ? " is-active" : ""}`}>
            {WINDOW_LABELS[key]}
          </Link>
        ))}
      </div>

      <div className="scrollbar-hide -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-0.5">
        <Link href={buildHref({ prefecture: "" })} className={`pill${!prefecture ? " is-active" : ""}`}>関西すべて</Link>
        {PREFECTURES.map((name) => (
          <Link key={name} href={buildHref({ prefecture: prefecture === name ? "" : name })} className={`pill${prefecture === name ? " is-active" : ""}`}>
            {name.replace(/[都道府県]$/, "")}
          </Link>
        ))}
      </div>

      <div className="scrollbar-hide -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-0.5">
        <Link href={buildHref({ category: "" })} className={`pill${!category ? " is-active" : ""}`}>ジャンル問わず</Link>
        {categories.slice(0, 20).map((entry) => (
          <Link key={entry.slug} href={buildHref({ category: category?.slug === entry.slug ? "" : entry.slug })} className={`pill${category?.slug === entry.slug ? " is-active" : ""}`}>
            {entry.name}
          </Link>
        ))}
      </div>

      {ranked.length === 0 ? (
        <div className="card-v2 mt-8 px-6 py-14 text-center">
          <p className="text-base font-black text-ink">条件に合うスポットがありません</p>
          <Link href="/ranking" className="btn-secondary mt-5">条件をリセット</Link>
        </div>
      ) : (
        <ol className="mt-6 space-y-2">
          {ranked.map((entry) => (
            <li key={entry.place.id}>
              <Link
                href={`/places/${entry.place.id}`}
                className="card-v2 flex items-center gap-4 p-3 transition-transform duration-150 active:scale-[0.995]"
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-full font-display text-base font-black tabular-nums ${
                    entry.rank <= 3 ? "bg-accent text-white" : "bg-muted text-ink-soft"
                  }`}
                >
                  {entry.rank}
                </span>
                <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                  <PlaceImage place={entry.place} alt="" className="size-full object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-ink">{entry.place.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-ink-soft">
                    {entry.place.prefecture}{entry.place.city}
                    {entry.place.review_count > 0 && ` · 口コミ${entry.place.review_count}件`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </main>
  )
}
