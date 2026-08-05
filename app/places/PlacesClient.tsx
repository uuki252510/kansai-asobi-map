"use client"

import Link from "next/link"
import { ChevronDown, Heart, Locate, Search, SearchX, SlidersHorizontal, X } from "lucide-react"
import { useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import PlaceCard from "@/components/PlaceCard"
import FilterSheet from "@/components/FilterSheet"
import type { Category, Tag } from "@/lib/facility-types"
import { WALK_DISTANCE_STEPS } from "@/lib/station-data"
import type { StationOption } from "@/lib/station-scope"
import { calcDistance, PREFECTURES, type PlaceWithAvgRating } from "@/lib/places"
import { useFavorites } from "@/lib/useFavorites"
import {
  applySpotFilters,
  countActiveFilters,
  filtersFromParams,
  filtersToParams,
  type SpotFilterState,
} from "@/lib/spot-filters"

interface Props {
  initialPlaces: PlaceWithAvgRating[]
  initialParams: Record<string, string | undefined>
  basePath?: string
  /** カテゴリー/タグは URL スコープ (サーバー側で適用済み・SEOリンクとして表示) */
  categories?: Category[]
  tags?: Tag[]
  activeCategorySlug?: string | null
  activeTagSlug?: string | null
  /** 駅からの絞り込み (サーバー側で適用済み) */
  stations?: StationOption[]
  activeStation?: StationOption | null
  activeWalk?: number
}

const prefectureShort: Record<string, string> = {
  大阪府: "大阪",
  兵庫県: "兵庫",
  京都府: "京都",
  奈良県: "奈良",
  滋賀県: "滋賀",
  和歌山県: "和歌山",
}

const quickChips = [
  { key: "rainy_day_ok", label: "雨の日OK" },
  { key: "priceType:free", label: "無料" },
  { key: "indoorType:indoor", label: "屋内" },
  { key: "has_parking", label: "駐車場" },
  { key: "has_nursing_room", label: "授乳室" },
  { key: "has_diaper_space", label: "おむつ替え" },
] as const

const sortLabels: Record<string, string> = {
  newest: "新着順",
  distance: "近い順",
  rating: "口コミ順",
}

export default function PlacesClient({
  initialPlaces,
  initialParams,
  basePath = "/places",
  categories = [],
  tags = [],
  activeCategorySlug = null,
  activeTagSlug = null,
  stations = [],
  activeStation = null,
  activeWalk = 800,
}: Props) {
  const router = useRouter()

  /** スコープ (カテゴリ/タグ/駅) を切り替えるURLを作る。他の条件は維持する */
  function scopeHref(next: { category?: string | null; tag?: string | null; station?: string | null; walk?: number }) {
    const params = new URLSearchParams()
    const category = next.category !== undefined ? next.category : activeCategorySlug
    const tag = next.tag !== undefined ? next.tag : activeTagSlug
    const station = next.station !== undefined ? next.station : activeStation?.id ?? null
    const walk = next.walk ?? activeWalk
    if (category) params.set("category", category)
    if (tag) params.set("tag", tag)
    if (station) {
      params.set("station", station)
      params.set("walk", String(walk))
    }
    if (initialParams.search) params.set("search", initialParams.search)
    const query = params.toString()
    return query ? `${basePath}?${query}` : basePath
  }

  const activeCategory = categories.find((entry) => entry.slug === activeCategorySlug) ?? null
  const activeTag = tags.find((entry) => entry.slug === activeTagSlug) ?? null

  const [search, setSearch] = useState(initialParams.search ?? "")
  const [filters, setFilters] = useState<SpotFilterState>(() => filtersFromParams(initialParams))
  const [sort, setSort] = useState(initialParams.sort ?? "newest")
  const [userLat, setUserLat] = useState<number | null>(initialParams.lat ? Number.parseFloat(initialParams.lat) : null)
  const [userLng, setUserLng] = useState<number | null>(initialParams.lng ? Number.parseFloat(initialParams.lng) : null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [favOnly, setFavOnly] = useState(false)
  const [visibleCount, setVisibleCount] = useState(36)
  const { isFavorite, count: favCount } = useFavorites()

  const activeCount = countActiveFilters(filters)

  /** URLを共有可能に保つ (サーバー再レンダーは発生させない) */
  function syncUrl(nextFilters: SpotFilterState, nextSort = sort) {
    const extra: Record<string, string> = {}
    if (search.trim()) extra.search = search.trim()
    if (nextSort && nextSort !== "newest") extra.sort = nextSort
    if (userLat !== null && userLng !== null) {
      extra.lat = String(userLat)
      extra.lng = String(userLng)
    }
    const params = filtersToParams(nextFilters, extra)
    const query = params.toString()
    window.history.replaceState(null, "", query ? `${basePath}?${query}` : basePath)
  }

  function applyFilters(next: SpotFilterState) {
    setFilters(next)
    setVisibleCount(36)
    syncUrl(next)
  }

  function toggleQuickChip(key: (typeof quickChips)[number]["key"]) {
    const next = { ...filters }
    if (key === "priceType:free") next.priceType = next.priceType === "free" ? "" : "free"
    else if (key === "indoorType:indoor") next.indoorType = next.indoorType === "indoor" ? "" : "indoor"
    else next[key] = !next[key]
    applyFilters(next)
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault()
    // 検索はサーバー側 ilike が担当なのでフルナビゲーション
    const params = filtersToParams(filters, search.trim() ? { search: search.trim() } : {})
    const query = params.toString()
    router.push(query ? `${basePath}?${query}` : basePath)
  }

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setGeoError("このブラウザは位置情報に対応していません")
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLat(position.coords.latitude)
        setUserLng(position.coords.longitude)
        setSort("distance")
        setGeoLoading(false)
      },
      () => {
        setGeoLoading(false)
        setGeoError("位置情報の取得に失敗しました")
      },
      { timeout: 8000 },
    )
  }

  const results = useMemo(() => {
    let source = applySpotFilters(initialPlaces, filters)
    if (favOnly) source = source.filter((place) => isFavorite(place.id))

    const withDistance = source.map((place) => ({
      ...place,
      distanceKm:
        userLat !== null && userLng !== null && place.latitude !== null && place.longitude !== null
          ? calcDistance(userLat, userLng, place.latitude, place.longitude)
          : undefined,
    }))

    if (sort === "distance" && userLat !== null && userLng !== null) {
      return withDistance.sort(
        (left, right) => (left.distanceKm ?? Number.MAX_SAFE_INTEGER) - (right.distanceKm ?? Number.MAX_SAFE_INTEGER),
      )
    }
    if (sort === "rating") {
      return withDistance.sort((left, right) => (right.avg_rating ?? 0) - (left.avg_rating ?? 0))
    }
    return withDistance
  }, [initialPlaces, filters, favOnly, isFavorite, sort, userLat, userLng])

  function isQuickChipActive(key: (typeof quickChips)[number]["key"]) {
    if (key === "priceType:free") return filters.priceType === "free"
    if (key === "indoorType:indoor") return filters.indoorType === "indoor"
    return filters[key]
  }

  return (
    <div className="page-shell py-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
            {activeStation
              ? `${activeStation.name}駅から徒歩${Math.ceil(activeWalk / 80)}分以内`
              : activeCategory
                ? `関西の${activeCategory.name}`
                : activeTag
                  ? activeTag.name
                  : "関西のおでかけスポット"}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            <span className="font-bold text-ink">{results.length}</span> 件 · {sortLabels[sort] ?? "新着順"}
          </p>
        </div>
        {(activeCategory || activeTag) && (
          <div className="flex flex-wrap gap-2">
            {activeCategory && (
              <Link href={scopeHref({ category: null })} className="pill is-active">
                {activeCategory.name}
                <X className="size-3.5" aria-hidden />
                <span className="sr-only">カテゴリー絞り込みを解除</span>
              </Link>
            )}
            {activeTag && (
              <Link href={scopeHref({ tag: null })} className="pill is-active">
                {activeTag.name}
                <X className="size-3.5" aria-hidden />
                <span className="sr-only">タグ絞り込みを解除</span>
              </Link>
            )}
          </div>
        )}
      </header>

      {/* sticky 検索列 */}
      <div className="sticky top-0 z-40 -mx-4 mt-4 bg-canvas/95 px-4 py-3 backdrop-blur-sm sm:-mx-8 sm:px-8">
        <form onSubmit={handleSearchSubmit} role="search" className="flex items-center gap-2">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="スポット名・市区町村で検索"
              enterKeyHint="search"
              aria-label="スポットを検索"
              className="h-12 w-full rounded-full border border-line bg-surface pl-11 pr-4 text-sm font-bold text-ink outline-none placeholder:font-normal placeholder:text-ink-faint focus:border-ink-faint"
            />
          </label>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={`pill !min-h-12${activeCount > 0 ? " is-active" : ""}`}
            aria-expanded={sheetOpen}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            絞り込み
            {activeCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[0.68rem] font-black text-white">
                {activeCount}
              </span>
            )}
          </button>
          <div className="relative hidden sm:block">
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value)
                syncUrl(filters, event.target.value)
              }}
              aria-label="並び順"
              className="h-12 appearance-none rounded-full border border-line bg-surface px-4 pr-9 text-sm font-bold text-ink outline-none"
            >
              <option value="newest">新着順</option>
              {userLat !== null && userLng !== null && <option value="distance">近い順</option>}
              <option value="rating">口コミ順</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          </div>
        </form>

        {/* クイックチップ */}
        <div className="scrollbar-hide -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-0.5">
          <button
            type="button"
            onClick={handleGeolocate}
            disabled={geoLoading}
            className={`pill${userLat !== null ? " is-active" : ""}`}
          >
            <Locate className={`size-4 ${geoLoading ? "animate-spin" : ""}`} aria-hidden />
            {geoLoading ? "取得中…" : "近くで探す"}
          </button>
          {quickChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className={`pill${isQuickChipActive(chip.key) ? " is-active" : ""}`}
              aria-pressed={isQuickChipActive(chip.key)}
              onClick={() => toggleQuickChip(chip.key)}
            >
              {chip.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFavOnly((current) => !current)}
            className={`pill${favOnly ? " is-active" : ""}`}
            aria-pressed={favOnly}
          >
            <Heart className={`size-4${favOnly ? " fill-current" : ""}`} aria-hidden />
            お気に入り{favCount > 0 ? ` (${favCount})` : ""}
          </button>
        </div>

        {/* 府県チップ */}
        <div className="scrollbar-hide -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-0.5">
          <button
            type="button"
            className={`pill${filters.prefecture === "" ? " is-active" : ""}`}
            onClick={() => applyFilters({ ...filters, prefecture: "" })}
          >
            関西すべて
          </button>
          {PREFECTURES.map((prefecture) => (
            <button
              key={prefecture}
              type="button"
              className={`pill${filters.prefecture === prefecture ? " is-active" : ""}`}
              onClick={() => applyFilters({ ...filters, prefecture: filters.prefecture === prefecture ? "" : prefecture })}
            >
              {prefectureShort[prefecture]}
            </button>
          ))}
        </div>

        {/* 駅からさがす (関西は電車移動が主。駅×徒歩分で絞る) */}
        {stations.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={activeStation?.id ?? ""}
              aria-label="最寄り駅で絞り込む"
              className="h-10 max-w-48 rounded-full border border-line bg-surface px-4 text-sm font-bold text-ink outline-none"
              onChange={(event) => router.push(scopeHref({ station: event.target.value || null }))}
            >
              <option value="">駅から探す</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}駅{station.lineName ? `（${station.lineName}）` : ""}
                </option>
              ))}
            </select>
            {activeStation && (
              <>
                {WALK_DISTANCE_STEPS.map((meters) => (
                  <Link
                    key={meters}
                    href={scopeHref({ walk: meters })}
                    aria-current={activeWalk === meters ? "page" : undefined}
                    className={`pill${activeWalk === meters ? " is-active" : ""}`}
                  >
                    徒歩{Math.ceil(meters / 80)}分以内
                  </Link>
                ))}
                <Link href={scopeHref({ station: null })} className="pill is-active">
                  {activeStation.name}駅
                  <X className="size-3.5" aria-hidden />
                  <span className="sr-only">駅の絞り込みを解除</span>
                </Link>
              </>
            )}
          </div>
        )}

        {/* カテゴリーチップ (SEOリンク・サーバー側スコープ) */}
        {categories.length > 0 && (
          <div className="scrollbar-hide -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-0.5">
            <Link
              href={scopeHref({ category: null })}
              className={`pill${!activeCategorySlug ? " is-active" : ""}`}
            >
              ジャンル問わず
            </Link>
            {categories.slice(0, 24).map((category) => (
              <Link
                key={category.slug}
                href={scopeHref({ category: activeCategorySlug === category.slug ? null : category.slug })}
                aria-current={activeCategorySlug === category.slug ? "page" : undefined}
                className={`pill${activeCategorySlug === category.slug ? " is-active" : ""}`}
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}

        {geoError && (
          <p role="alert" className="mt-2 text-xs font-bold text-destructive">{geoError}</p>
        )}
      </div>

      {results.length === 0 ? (
        <div className="card-v2 mt-10 px-6 py-16 text-center">
          <div className="mx-auto flex max-w-md flex-col items-center">
            <SearchX className="mb-5 size-10 text-ink-faint" aria-hidden />
            <p className="text-lg font-black text-ink">ぴったりの場所が見つかりませんでした</p>
            <p className="mt-2 text-sm leading-7 text-ink-soft">
              条件をひとつ外すと見つかることが多いです。
            </p>
            <button
              type="button"
              className="btn-secondary mt-5"
              onClick={() => {
                setFavOnly(false)
                applyFilters(filtersFromParams({}))
              }}
            >
              条件をすべてリセット
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {results.slice(0, visibleCount).map((place) => (
            <PlaceCard key={place.id} place={place} distanceKm={place.distanceKm} />
          ))}
        </div>
      )}

      {results.length > visibleCount && (
        <div className="mt-10 flex justify-center">
          <button type="button" className="btn-secondary px-8" onClick={() => setVisibleCount((count) => count + 36)}>
            さらに表示（残り {results.length - visibleCount} 件）
          </button>
        </div>
      )}

      <FilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        value={filters}
        onApply={applyFilters}
        places={favOnly ? initialPlaces.filter((place) => isFavorite(place.id)) : initialPlaces}
      />
    </div>
  )
}
