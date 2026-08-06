"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import ArticleList from "@/components/ArticleList"
import CountUp from "@/components/CountUp"
import EventCard from "@/components/EventCard"
import Reveal from "@/components/Reveal"
import SearchBar from "@/components/SearchBar"
import SpotCarousel from "@/components/SpotCarousel"
import TimeChips from "@/components/TimeChips"
import WeatherSummary from "@/components/WeatherSummary"
import { trackEvent } from "@/lib/analytics"
import type { Article } from "@/lib/articles"
import type { PublicEvent } from "@/lib/events"
import type { PlaceWithAvgRating } from "@/lib/places"

export interface HomeRow {
  key: string
  title: string
  href?: string
  places: PlaceWithAvgRating[]
  ranked?: boolean
}

const areas = [
  { slug: "osaka", prefecture: "大阪府", label: "大阪" },
  { slug: "hyogo", prefecture: "兵庫県", label: "兵庫" },
  { slug: "kyoto", prefecture: "京都府", label: "京都" },
  { slug: "nara", prefecture: "奈良県", label: "奈良" },
  { slug: "shiga", prefecture: "滋賀県", label: "滋賀" },
  { slug: "wakayama", prefecture: "和歌山県", label: "和歌山" },
]

const popularAreas = [
  { slug: "umeda", label: "梅田" },
  { slug: "namba", label: "なんば" },
  { slug: "sannomiya", label: "三宮" },
  { slug: "kyoto-city", label: "京都市内" },
  { slug: "nara-park", label: "奈良公園" },
  { slug: "osaka-bay", label: "ベイエリア" },
]

export default function HomeExperience({
  spots,
  totalSpotCount,
  countsByPrefecture,
  rainyCount,
  freeCount,
  weatherCondition = "sunny",
  weatherLabel = null,
  rows = [],
  articles = [],
  weekendEvents = [],
}: {
  spots: PlaceWithAvgRating[]
  totalSpotCount: number
  countsByPrefecture: Record<string, number>
  rainyCount: number
  freeCount: number
  weatherCondition?: "sunny" | "cloudy" | "rainy" | "any"
  weatherLabel?: string | null
  /** ランキング・季節・テーマ別の横スクロール行 */
  rows?: HomeRow[]
  articles?: Article[]
  weekendEvents?: PublicEvent[]
}) {
  const router = useRouter()
  const [locating, setLocating] = useState(false)

  const searchExamples = spots.slice(0, 8).map((spot) => `${spot.name} / ${spot.city}`)

  function findNearby() {
    trackEvent("map_opened", { source: "home_value_props" })
    if (!navigator.geolocation) {
      router.push("/spots")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const params = new URLSearchParams({
          sort: "distance",
          lat: String(coords.latitude),
          lng: String(coords.longitude),
        })
        router.push(`/spots?${params.toString()}`)
      },
      () => {
        setLocating(false)
        router.push("/spots")
      },
      { timeout: 8000 },
    )
  }

  return (
    <div className="page-shell flex flex-col gap-12 py-6 sm:py-10">
      {/* 第一画面: 天気連動ヒーロー (Signature) — 今日の空が背景になる */}
      <section
        className={`sky-hero is-${weatherCondition === "any" ? "sunny" : weatherCondition} -mx-4 -mt-6 px-4 pb-8 pt-10 sm:-mx-8 sm:rounded-b-[40px] sm:px-8 sm:pt-14`}
      >
        <span className="sky-cloud left-0 top-8 h-10 w-28" aria-hidden />
        <span className="sky-cloud is-far left-0 top-24 h-8 w-20" aria-hidden />

        {/* 晴れ: 回転する太陽レイ / 雨: 落ちる雨粒 (モーショングラフィック) */}
        {weatherCondition !== "rainy" && (
          <svg className="sun-motif size-24 sm:size-32" viewBox="0 0 100 100" aria-hidden>
            <g className="sun-rays" stroke="#FFC212" strokeWidth="4" strokeLinecap="round" opacity="0.75">
              {Array.from({ length: 8 }, (_, index) => {
                const angle = (index * Math.PI) / 4
                return (
                  <line
                    key={index}
                    x1={50 + Math.cos(angle) * 30}
                    y1={50 + Math.sin(angle) * 30}
                    x2={50 + Math.cos(angle) * 42}
                    y2={50 + Math.sin(angle) * 42}
                  />
                )
              })}
            </g>
            <circle cx="50" cy="50" r="20" fill="#FFD54F" />
          </svg>
        )}
        {weatherCondition === "rainy" &&
          [12, 28, 46, 63, 78, 90].map((left, index) => (
            <span
              key={left}
              className="rain-drop"
              style={{ left: `${left}%`, animationDelay: `${index * 0.28}s` }}
              aria-hidden
            />
          ))}

        <div className="hero-enter relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-[clamp(1.875rem,5vw,2.75rem)] font-black leading-tight tracking-tight text-ink">
              今日、関西の
              <br className="sm:hidden" />
              どこ行く？
            </h1>
            {weatherLabel ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-4 py-2 text-xs font-black text-ink backdrop-blur-sm">
                {weatherLabel}
              </span>
            ) : (
              <WeatherSummary compact />
            )}
          </div>
          <p className="mt-2 text-sm font-bold leading-7 text-ink-soft">
            {weatherCondition === "rainy" ? (
              <>雨の日でも大丈夫。屋内スポット<CountUp value={rainyCount} className="mx-0.5 text-base text-ink" />件から選べます。</>
            ) : (
              <><CountUp value={totalSpotCount} className="mx-0.5 text-base text-ink" />件のスポットから、天気と気分に合う行き先を。</>
            )}
          </p>

          <div className="mt-6">
            <SearchBar examples={searchExamples} />
          </div>

          <div className="mt-4">
            <TimeChips />
          </div>
        </div>

        {/* 波ディバイダ (ゆるやかに流れる) */}
        <div className="absolute inset-x-0 bottom-0 h-[18px] overflow-hidden" aria-hidden>
          <svg className="wave-flow h-[18px]" viewBox="0 0 1200 18" preserveAspectRatio="none">
            <path
              d="M0 12 Q75 2 150 10 T300 10 T450 10 T600 10 T750 10 T900 10 T1050 10 T1200 10 V18 H0 Z"
              fill="var(--canvas)"
            />
          </svg>
        </div>
      </section>

      <section className="-mt-6">
        {/* 条件から入る: 件数そのものを視覚の主役にする (装飾アイコンを置かない) */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Reveal delay={0}>
            <Link href="/spots?rainy_day_ok=true" className="data-tile h-full">
              <span className="data-tile__label">雨の日OK</span>
              <span className="data-tile__value">
                <CountUp value={rainyCount} />
                <span className="data-tile__unit">件</span>
              </span>
            </Link>
          </Reveal>
          <Reveal delay={70}>
            <Link href="/spots?price_type=free" className="data-tile h-full">
              <span className="data-tile__label">無料で遊べる</span>
              <span className="data-tile__value">
                <CountUp value={freeCount} />
                <span className="data-tile__unit">件</span>
              </span>
            </Link>
          </Reveal>
          <Reveal delay={140}>
            <Link href="/areas" className="data-tile h-full">
              <span className="data-tile__label">エリア</span>
              <span className="data-tile__value">
                19
                <span className="data-tile__unit">か所</span>
              </span>
            </Link>
          </Reveal>
          <Reveal delay={210}>
            <Link href="/spots" className="data-tile h-full">
              <span className="data-tile__label">掲載スポット</span>
              <span className="data-tile__value">
                <CountUp value={totalSpotCount} />
                <span className="data-tile__unit">件</span>
              </span>
            </Link>
          </Reveal>
        </div>

        {/* 行動は「カード」でなく本物のボタンとして立てる */}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/today"
            className="btn-primary flex-1 sm:flex-none sm:px-9"
            onClick={() => trackEvent("recommendation_started", { source: "home_cta" })}
          >
            今日どこ行く？を決める
          </Link>
          <button type="button" onClick={findNearby} disabled={locating} className="btn-secondary flex-1 sm:flex-none sm:px-7">
            {locating ? "現在地を取得中…" : "現在地から近い順"}
          </button>
        </div>
      </section>

      {/* エリアハブ */}
      <Reveal as="section">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-black text-ink sm:text-xl">エリアからさがす</h2>
          <Link href="/areas" className="text-sm font-bold text-accent-strong">
            すべてのエリア →
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {areas.map((area) => (
            <Link
              key={area.slug}
              href={`/areas/${area.slug}`}
              className="card-v2 px-4 py-3 transition-transform duration-150 active:scale-[0.98]"
            >
              <p className="text-sm font-black text-ink">{area.label}</p>
              <p className="mt-0.5 text-xs font-bold text-ink-soft">{countsByPrefecture[area.prefecture] ?? 0}件</p>
            </Link>
          ))}
        </div>
        <div className="scrollbar-hide -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {popularAreas.map((area) => (
            <Link key={area.slug} href={`/areas/${area.slug}`} className="pill">
              {area.label}
            </Link>
          ))}
        </div>
      </Reveal>

      {/* 今週末のイベント (夏祭り・花火・商業施設の催し) */}
      {weekendEvents.length > 0 && (
        <Reveal as="section">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-lg font-black tracking-tight text-ink sm:text-xl">今週末のイベント</h2>
            <Link href="/events" className="text-sm font-bold text-accent-strong">
              イベント一覧 →
            </Link>
          </div>
          <div className="scrollbar-hide -mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:-mx-8 sm:px-8">
            {weekendEvents.map((event) => (
              <EventCard key={event.id} event={event} compact />
            ))}
          </div>
        </Reveal>
      )}

      {/* ランキング・季節・テーマ別の横スクロール行 */}
      {rows.map((row) => (
        <Reveal key={row.key}>
          <SpotCarousel title={row.title} href={row.href} places={row.places} ranked={row.ranked} />
        </Reveal>
      ))}

      {/* 記事・特集 */}
      {articles.length > 0 && (
        <Reveal>
          <ArticleList title="おでかけの読みもの" articles={articles} variant="grid" />
        </Reveal>
      )}

      {/* マップ導線: 等高線テクスチャで「地図」を装飾でなく背景で語る */}
      <Reveal as="section">
        <Link
          href="/map"
          className="topo-texture relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--sky-cloudy-from)] to-[var(--accent-soft)] p-7 transition-transform duration-150 active:scale-[0.99]"
          onClick={() => trackEvent("map_opened", { source: "home_banner" })}
        >
          <div className="relative">
            <h2 className="text-xl font-black text-ink sm:text-2xl">距離で選ぶ</h2>
            <p className="mt-1.5 max-w-md text-sm leading-6 text-ink-soft">
              いまいる場所からどれくらいか。地図で見ると、行ける場所が絞れます。
            </p>
          </div>
          <span className="btn-secondary relative">マップを開く</span>
        </Link>
      </Reveal>
    </div>
  )
}
