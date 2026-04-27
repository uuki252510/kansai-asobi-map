"use client"

import { ChevronDown, Heart, ListFilter, Locate, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import PlaceCard from "@/components/PlaceCard"
import { calcDistance, PREFECTURES, type PlaceWithAvgRating } from "@/lib/places"
import { useFavorites } from "@/lib/useFavorites"

interface Props {
  initialPlaces: PlaceWithAvgRating[]
  initialParams: Record<string, string | undefined>
}

type BoolFilters = {
  rainy_day_ok: boolean
  has_parking: boolean
  has_nursing_room: boolean
  has_diaper_space: boolean
}

const prefectureShort: Record<string, string> = {
  大阪府: "大阪",
  兵庫県: "兵庫",
  京都府: "京都",
  奈良県: "奈良",
  滋賀県: "滋賀",
  和歌山県: "和歌山",
}

const filterOptions = [
  { key: "rainy_day_ok", label: "雨の日OK" },
  { key: "has_parking", label: "駐車場" },
  { key: "has_nursing_room", label: "授乳室" },
  { key: "has_diaper_space", label: "おむつ替え" },
] as const

const indoorOptions = [
  { value: "", label: "すべて" },
  { value: "indoor", label: "屋内" },
  { value: "outdoor", label: "屋外" },
  { value: "both", label: "屋内外" },
]

const priceOptions = [
  { value: "", label: "すべて" },
  { value: "free", label: "無料" },
  { value: "paid", label: "有料" },
  { value: "mixed", label: "一部有料" },
]

const ageOptions = [
  { value: "", label: "すべての年齢" },
  { value: "0-2", label: "0〜2歳" },
  { value: "3-5", label: "3〜5歳" },
  { value: "6-12", label: "小学生" },
]

const sortLabels: Record<string, string> = {
  newest: "新着順",
  distance: "近い順",
  rating: "口コミ順",
}

const labelMaps = {
  indoor: Object.fromEntries(indoorOptions.map((option) => [option.value, option.label])),
  price: Object.fromEntries(priceOptions.map((option) => [option.value, option.label])),
  age: Object.fromEntries(ageOptions.map((option) => [option.value, option.label])),
}

export default function PlacesClient({ initialPlaces, initialParams }: Props) {
  const router = useRouter()

  const [search, setSearch] = useState(initialParams.search ?? "")
  const [prefecture, setPrefecture] = useState(initialParams.prefecture ?? "")
  const [indoorType, setIndoorType] = useState(initialParams.indoor_type ?? "")
  const [priceType, setPriceType] = useState(initialParams.price_type ?? "")
  const [targetAge, setTargetAge] = useState(initialParams.target_age ?? "")
  const [boolFilters, setBoolFilters] = useState<BoolFilters>({
    rainy_day_ok: initialParams.rainy_day_ok === "true",
    has_parking: initialParams.has_parking === "true",
    has_nursing_room: initialParams.has_nursing_room === "true",
    has_diaper_space: initialParams.has_diaper_space === "true",
  })
  const [sort, setSort] = useState(initialParams.sort ?? "newest")
  const [userLat, setUserLat] = useState<number | null>(
    initialParams.lat ? Number.parseFloat(initialParams.lat) : null
  )
  const [userLng, setUserLng] = useState<number | null>(
    initialParams.lng ? Number.parseFloat(initialParams.lng) : null
  )
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [favOnly, setFavOnly] = useState(false)
  const { isFavorite, count: favCount } = useFavorites()

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setGeoError("このブラウザは位置情報に対応していません")
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setUserLat(lat)
        setUserLng(lng)
        setGeoLoading(false)
        const params = new URLSearchParams()
        params.set("sort", "distance")
        params.set("lat", String(lat))
        params.set("lng", String(lng))
        router.push(`/places?${params.toString()}`)
      },
      () => {
        setGeoLoading(false)
        setGeoError("位置情報の取得に失敗しました")
      },
      { timeout: 8000 }
    )
  }

  function pushFilters(
    nextState: Partial<{
      search: string
      prefecture: string
      indoorType: string
      priceType: string
      targetAge: string
      boolFilters: BoolFilters
      sort: string
    }> = {}
  ) {
    const resolved = {
      search,
      prefecture,
      indoorType,
      priceType,
      targetAge,
      boolFilters,
      sort,
      ...nextState,
    }

    const params = new URLSearchParams()

    if (resolved.search.trim()) params.set("search", resolved.search.trim())
    if (resolved.prefecture) params.set("prefecture", resolved.prefecture)
    if (resolved.indoorType) params.set("indoor_type", resolved.indoorType)
    if (resolved.priceType) params.set("price_type", resolved.priceType)
    if (resolved.targetAge) params.set("target_age", resolved.targetAge)
    if (resolved.boolFilters.rainy_day_ok) params.set("rainy_day_ok", "true")
    if (resolved.boolFilters.has_parking) params.set("has_parking", "true")
    if (resolved.boolFilters.has_nursing_room) params.set("has_nursing_room", "true")
    if (resolved.boolFilters.has_diaper_space) params.set("has_diaper_space", "true")
    if (resolved.sort) params.set("sort", resolved.sort)
    if (userLat !== null && userLng !== null) {
      params.set("lat", String(userLat))
      params.set("lng", String(userLng))
    }

    const query = params.toString()
    router.push(query ? `/places?${query}` : "/places")
  }

  const sortedPlaces = useMemo(() => {
    const source = favOnly ? initialPlaces.filter((p) => isFavorite(p.id)) : initialPlaces
    const withDistance = source.map((place) => ({
      ...place,
      distanceKm:
        userLat !== null &&
        userLng !== null &&
        place.latitude !== null &&
        place.longitude !== null
          ? calcDistance(userLat, userLng, place.latitude, place.longitude)
          : undefined,
    }))

    if (sort === "distance" && userLat !== null && userLng !== null) {
      return [...withDistance].sort(
        (left, right) => (left.distanceKm ?? Number.MAX_SAFE_INTEGER) - (right.distanceKm ?? Number.MAX_SAFE_INTEGER)
      )
    }

    if (sort === "rating") {
      return [...withDistance].sort(
        (left, right) => (right.avg_rating ?? 0) - (left.avg_rating ?? 0)
      )
    }

    return withDistance
  }, [initialPlaces, sort, userLat, userLng])

  const activeFilters = [
    prefecture ? prefectureShort[prefecture] ?? prefecture : null,
    indoorType ? labelMaps.indoor[indoorType] : null,
    priceType ? labelMaps.price[priceType] : null,
    targetAge ? labelMaps.age[targetAge] : null,
    ...filterOptions
      .filter((option) => boolFilters[option.key])
      .map((option) => option.label),
  ].filter(Boolean) as string[]

  const activeFilterCount = activeFilters.length

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    pushFilters()
  }

  function handlePrefectureChange(nextPrefecture: string) {
    setPrefecture(nextPrefecture)
    pushFilters({ prefecture: nextPrefecture })
  }

  function handleSortChange(nextSort: string) {
    setSort(nextSort)
    pushFilters({ sort: nextSort })
  }

  function resetFilters() {
    const clearedBoolFilters: BoolFilters = {
      rainy_day_ok: false,
      has_parking: false,
      has_nursing_room: false,
      has_diaper_space: false,
    }

    setIndoorType("")
    setPriceType("")
    setTargetAge("")
    setBoolFilters(clearedBoolFilters)
    setPrefecture("")
    setSort("newest")
    pushFilters({
      prefecture: "",
      indoorType: "",
      priceType: "",
      targetAge: "",
      boolFilters: clearedBoolFilters,
      sort: "newest",
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="glass-panel rounded-[30px] px-4 py-4 sm:px-5">
        <form
          onSubmit={handleSearchSubmit}
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
        >
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='例：「梅田 屋内」「神戸 無料」「授乳室あり」'
              className="h-[3.25rem] rounded-[18px] border-0 bg-[#f9f7f3] pl-11 pr-4 text-sm shadow-none ring-1 ring-black/4 placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-[var(--brand-clay)]/25"
            />
          </label>
          <div className="flex gap-2">
            <Button
              type="submit"
              className="h-[3.25rem] rounded-[18px] bg-[var(--brand-ink)] px-5 text-sm font-semibold text-white shadow-[0_18px_36px_-24px_rgba(24,28,43,0.85)]"
            >
              検索する
            </Button>
            <Button
              type="button"
              onClick={handleGeolocate}
              disabled={geoLoading}
              className={`h-[3.25rem] shrink-0 gap-2 rounded-[18px] border bg-white/80 px-4 text-sm font-medium shadow-none transition-colors hover:bg-white ${
                userLat !== null
                  ? "border-[var(--brand-clay)]/60 text-[var(--brand-clay)]"
                  : "border-border/80 text-foreground hover:border-[var(--brand-clay)]/40"
              }`}
            >
              <Locate className={`size-4 ${geoLoading ? "animate-spin" : ""}`} />
              {geoLoading ? "取得中..." : "近くで探す"}
            </Button>
          </div>
        </form>
        {geoError && (
          <p className="mt-2 text-xs text-red-500">{geoError}</p>
        )}

        {/* ママ向け即時条件チップ — 常時表示・ワンタップで絞り込み */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { type: "bool", key: "rainy_day_ok",     icon: "☔", label: "雨の日OK" },
              { type: "indoor", key: "indoor",          icon: "🏠", label: "屋内" },
              { type: "price",  key: "free",            icon: "💰", label: "無料" },
              { type: "bool", key: "has_parking",       icon: "🚗", label: "駐車場" },
              { type: "bool", key: "has_nursing_room",  icon: "🍼", label: "授乳室" },
              { type: "bool", key: "has_diaper_space",  icon: "👶", label: "おむつ替え" },
            ] as const
          ).map(({ type, key, icon, label }) => {
            const isActive =
              type === "bool"    ? boolFilters[key as keyof BoolFilters]
              : type === "indoor" ? indoorType === key
              :                    priceType === key

            function handleQuickFilter() {
              if (type === "bool") {
                const next = { ...boolFilters, [key]: !boolFilters[key as keyof BoolFilters] }
                setBoolFilters(next)
                pushFilters({ boolFilters: next })
              } else if (type === "indoor") {
                const next = indoorType === key ? "" : key
                setIndoorType(next)
                pushFilters({ indoorType: next })
              } else {
                const next = priceType === key ? "" : key
                setPriceType(next)
                pushFilters({ priceType: next })
              }
            }

            return (
              <button
                key={key}
                type="button"
                onClick={handleQuickFilter}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-[var(--brand-ink)] bg-[var(--brand-ink)] text-white"
                    : "border-border/80 bg-white/80 text-foreground hover:border-[var(--brand-clay)]/35"
                }`}
              >
                <span>{icon}</span>
                {label}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => handlePrefectureChange("")}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              !prefecture
                ? "border-[var(--brand-ink)] bg-[var(--brand-ink)] text-white"
                : "border-border/80 bg-white/74 text-foreground hover:border-[var(--brand-clay)]/35"
            }`}
          >
            すべて
          </button>
          {PREFECTURES.map((prefectureName) => (
            <button
              key={prefectureName}
              type="button"
              onClick={() => handlePrefectureChange(prefectureName)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                prefecture === prefectureName
                  ? "border-[var(--brand-ink)] bg-[var(--brand-ink)] text-white"
                  : "border-border/80 bg-white/74 text-foreground hover:border-[var(--brand-clay)]/35"
              }`}
            >
              {prefectureShort[prefectureName]}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setFavOnly((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              favOnly
                ? "border-red-300 bg-red-50 text-red-500"
                : "border-border/80 bg-white/74 text-foreground hover:border-red-200"
            }`}
          >
            <Heart className={`size-4 ${favOnly ? "fill-red-500" : ""}`} />
            お気に入り
            {favCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-400 px-1 text-[0.68rem] font-semibold text-white">
                {favCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilterOpen((open) => !open)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              filterOpen || activeFilterCount > 0
                ? "border-[var(--brand-ink)] bg-[#1f2a4414] text-[var(--brand-ink)]"
                : "border-border/80 bg-white/74 text-foreground hover:border-[var(--brand-clay)]/35"
            }`}
            aria-expanded={filterOpen}
          >
            <ListFilter className="size-4" />
            条件を絞り込む
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-ink)] px-1 text-[0.68rem] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="relative ml-auto min-w-[148px]">
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="h-10 w-full appearance-none rounded-full border border-border/80 bg-white/74 px-4 pr-10 text-sm font-medium text-foreground outline-none ring-0 transition-colors hover:border-[var(--brand-clay)]/35 focus:border-[var(--brand-clay)]/35"
            >
              <option value="newest">新着順</option>
              {userLat !== null && userLng !== null && (
                <option value="distance">近い順</option>
              )}
              <option value="rating">口コミ順</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {filterOpen && (
          <div className="surface-card mt-4 rounded-[28px] p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[22px] border border-border/70 bg-white/76 p-4">
                <p className="section-kicker">屋内・屋外</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {indoorOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setIndoorType(option.value)}
                      className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                        indoorType === option.value
                          ? "border-[var(--brand-ink)] bg-[var(--brand-ink)] text-white"
                          : "border-border/80 bg-background/80 text-foreground hover:border-[var(--brand-clay)]/35"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[22px] border border-border/70 bg-white/76 p-4">
                <p className="section-kicker">料金</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {priceOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPriceType(option.value)}
                      className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                        priceType === option.value
                          ? "border-[var(--brand-ink)] bg-[var(--brand-ink)] text-white"
                          : "border-border/80 bg-background/80 text-foreground hover:border-[var(--brand-clay)]/35"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[22px] border border-border/70 bg-white/76 p-4">
                <p className="section-kicker">お子さんの年齢</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ageOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTargetAge(option.value)}
                      className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                        targetAge === option.value
                          ? "border-[var(--brand-ink)] bg-[var(--brand-ink)] text-white"
                          : "border-border/80 bg-background/80 text-foreground hover:border-[var(--brand-clay)]/35"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-border/70 bg-white/76 p-4">
              <p className="section-kicker">実用条件</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() =>
                      setBoolFilters((current) => ({
                        ...current,
                        [option.key]: !current[option.key],
                      }))
                    }
                    className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                      boolFilters[option.key]
                        ? "border-[var(--brand-ink)] bg-[var(--brand-ink)] text-white"
                        : "border-border/80 bg-background/80 text-foreground hover:border-[var(--brand-clay)]/35"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={resetFilters}
                className="rounded-full px-4 text-sm"
              >
                条件をリセット
              </Button>
              <Button
                type="button"
                onClick={() => {
                  pushFilters()
                  setFilterOpen(false)
                }}
                className="rounded-full bg-[var(--brand-ink)] px-5 text-sm text-white"
              >
                この条件で表示
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="rounded-full border border-border/80 bg-white/72 px-4 py-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{sortedPlaces.length}</span>{" "}
          件の遊び場
          <span className="ml-2 text-xs">{sortLabels[sort] ?? "新着順"}</span>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((label) => (
              <Badge
                key={label}
                variant="outline"
                className="rounded-full border-border/80 bg-white/76 px-3 py-1 text-[0.72rem] font-medium text-foreground"
              >
                {label}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {sortedPlaces.length === 0 ? (
        <div className="surface-card mt-8 rounded-[32px] px-6 py-16 text-center">
          <div className="mx-auto flex max-w-md flex-col items-center">
            <div className="mb-6 text-5xl">🔍</div>
            <p className="text-lg font-semibold text-foreground">
              ぴったりの場所が見つかりませんでした
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              条件をひとつ外すと見つかることが多いです。<br />
              まずは都道府県だけで試してみてください。
            </p>
            <Button
              type="button"
              variant="ghost"
              className="mt-4 rounded-full px-4"
              onClick={resetFilters}
            >
              条件をすべてリセット
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sortedPlaces.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              distanceKm={place.distanceKm}
            />
          ))}
        </div>
      )}
    </div>
  )
}
