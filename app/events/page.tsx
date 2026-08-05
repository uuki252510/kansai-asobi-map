export const revalidate = 900

import type { Metadata } from "next"
import Link from "next/link"
import EventCard from "@/components/EventCard"
import { EVENT_CATEGORY_LABELS, getPublishedEvents, type EventCategory } from "@/lib/events"
import { PREFECTURES } from "@/lib/places"

type SearchParams = Promise<{ category?: string; prefecture?: string }>

const CATEGORY_KEYS = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { category, prefecture } = await searchParams
  const categoryLabel = category && CATEGORY_KEYS.includes(category as EventCategory)
    ? EVENT_CATEGORY_LABELS[category as EventCategory]
    : null
  const title = categoryLabel
    ? `関西の${categoryLabel}${prefecture ? `（${prefecture}）` : ""}`
    : "関西のおでかけイベント"
  return {
    title,
    description: "関西の夏祭り・花火大会・商業施設のイベント情報。開催日・場所・料金をまとめて確認できます。",
    alternates: { canonical: "/events" },
    // 条件つきURLは重複を避けるため noindex
    robots: category || prefecture ? { index: false, follow: true } : undefined,
  }
}

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const { category, prefecture } = await searchParams
  const activeCategory = category && CATEGORY_KEYS.includes(category as EventCategory) ? (category as EventCategory) : undefined
  const activePrefecture = prefecture && (PREFECTURES as readonly string[]).includes(prefecture) ? prefecture : undefined

  const events = await getPublishedEvents({ category: activeCategory, prefecture: activePrefecture, limit: 80 })

  const buildHref = (next: { category?: string; prefecture?: string }) => {
    const params = new URLSearchParams()
    const nextCategory = next.category !== undefined ? next.category : activeCategory
    const nextPrefecture = next.prefecture !== undefined ? next.prefecture : activePrefecture
    if (nextCategory) params.set("category", nextCategory)
    if (nextPrefecture) params.set("prefecture", nextPrefecture)
    const query = params.toString()
    return query ? `/events?${query}` : "/events"
  }

  return (
    <main className="page-shell py-6 sm:py-10">
      <h1 className="font-display text-2xl font-black tracking-tight text-ink sm:text-3xl">
        関西のおでかけイベント
        <span className="ml-2 text-base font-bold text-ink-soft">{events.length}件</span>
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">
        夏祭り・花火大会から、商業施設の催しまで。開催中とこれからの予定をまとめています。
      </p>

      <div className="scrollbar-hide -mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-0.5">
        <Link href={buildHref({ category: "" })} className={`pill${!activeCategory ? " is-active" : ""}`}>
          すべて
        </Link>
        {CATEGORY_KEYS.map((key) => (
          <Link
            key={key}
            href={buildHref({ category: activeCategory === key ? "" : key })}
            className={`pill${activeCategory === key ? " is-active" : ""}`}
          >
            {EVENT_CATEGORY_LABELS[key]}
          </Link>
        ))}
      </div>

      <div className="scrollbar-hide -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-0.5">
        <Link href={buildHref({ prefecture: "" })} className={`pill${!activePrefecture ? " is-active" : ""}`}>
          関西すべて
        </Link>
        {PREFECTURES.map((name) => (
          <Link
            key={name}
            href={buildHref({ prefecture: activePrefecture === name ? "" : name })}
            className={`pill${activePrefecture === name ? " is-active" : ""}`}
          >
            {name.replace(/[都道府県]$/, "")}
          </Link>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="card-v2 mt-8 px-6 py-14 text-center">
          <p className="text-base font-black text-ink">条件に合うイベントがありません</p>
          <p className="mt-2 text-sm text-ink-soft">条件を外すか、スポットから探してみてください。</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/events" className="btn-secondary">条件をリセット</Link>
            <Link href="/spots" className="btn-primary">スポットをさがす</Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </main>
  )
}
