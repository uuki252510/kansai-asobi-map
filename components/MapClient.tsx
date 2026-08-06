"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import type { LayerGroup, Map as LeafletMap } from "leaflet"
import { Bike, Car, Check, ExternalLink, Heart, List, LocateFixed, Map as MapIcon, PersonStanding, TrainFront } from "lucide-react"
import type { PlaceWithAvgRating } from "@/lib/places"
import { trackEvent } from "@/lib/analytics"
import { useSpotTracking } from "@/lib/useSpotTracking"

type Filter = "all" | "recommended" | "indoor" | "rainy" | "free" | "want" | "visited"
type Transport = "driving" | "transit" | "walking" | "bicycling"
type MobileView = "map" | "list"

const transportOptions = [
  ["driving", "車", Car],
  ["transit", "電車", TrainFront],
  ["walking", "徒歩", PersonStanding],
  ["bicycling", "自転車", Bike],
] as const

function pinLabel(place: PlaceWithAvgRating): string {
  if (place.price_type === "free") return "無料"
  if (place.price_min !== null) return place.price_min === 0 ? "無料" : `¥${place.price_min.toLocaleString("ja-JP")}〜`
  return place.name.length > 6 ? `${place.name.slice(0, 6)}…` : place.name
}

export default function MapClient({
  places,
  recommendedIds,
}: {
  places: PlaceWithAvgRating[]
  recommendedIds: string[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layerRef = useRef<LayerGroup | null>(null)
  const leafletRef = useRef<typeof import("leaflet") | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [filter, setFilter] = useState<Filter>(recommendedIds.length ? "recommended" : "all")
  const [transport, setTransport] = useState<Transport>("driving")
  const [selectedId, setSelectedId] = useState<string | null>(recommendedIds[0] ?? null)
  const [geoMessage, setGeoMessage] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<MobileView>("map")
  const { isWant, isVisited, wantCount, visitedCount, ready } = useSpotTracking()

  const filterLabels: Array<[Filter, string]> = [
    ["all", "すべて"],
    ...(recommendedIds.length ? ([["recommended", "おすすめ3件"]] as Array<[Filter, string]>) : []),
    ["want", `行きたい${ready && wantCount > 0 ? ` ${wantCount}` : ""}`],
    ["visited", `行った${ready && visitedCount > 0 ? ` ${visitedCount}` : ""}`],
    ["indoor", "屋内"],
    ["rainy", "雨の日OK"],
    ["free", "無料"],
  ]

  const filtered = useMemo(() => {
    return places.filter((place) => {
      if (!place.latitude || !place.longitude) return false
      if (filter === "recommended") return recommendedIds.includes(place.id)
      if (filter === "want") return isWant(place.id)
      if (filter === "visited") return isVisited(place.id)
      if (filter === "indoor") return place.indoor_type === "indoor" || place.indoor_type === "both"
      if (filter === "rainy") return place.rainy_day_ok
      if (filter === "free") return place.price_type === "free"
      return true
    })
  }, [filter, places, recommendedIds, isWant, isVisited])

  const selected = filtered.find((place) => place.id === selectedId) ?? filtered[0] ?? null

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return
      leafletRef.current = L
      const map = L.map(containerRef.current, { zoomControl: false }).setView([34.69, 135.5], 8)
      L.control.zoom({ position: "bottomright" }).addTo(map)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)
      mapRef.current = map
      layerRef.current = L.layerGroup().addTo(map)
      setMapReady(true)
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      layerRef.current = null
      leafletRef.current = null
    }
  }, [])

  useEffect(() => {
    const L = leafletRef.current
    const layer = layerRef.current
    const map = mapRef.current
    if (!mapReady || !L || !layer || !map) return

    layer.clearLayers()
    const bounds: Array<[number, number]> = []
    filtered.forEach((place, index) => {
      const lat = Number(place.latitude)
      const lng = Number(place.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
      const rank = recommendedIds.indexOf(place.id)
      const active = place.id === selected?.id
      const visited = isVisited(place.id)
      const want = isWant(place.id)

      // ピル型HTMLピン (Airbnb型): 価格/名前を直接表示
      const stateClass = active ? " is-active" : rank >= 0 ? " is-recommended" : visited ? " is-visited" : want ? " is-want" : ""
      const label = rank >= 0 ? `${rank + 1}. ${pinLabel(place)}` : pinLabel(place)
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: "map-pill-pin-wrap",
          html: `<span class="map-pill-pin${stateClass}">${label}</span>`,
          iconSize: undefined,
        }),
      }).addTo(layer)
      marker.on("click", () => {
        setSelectedId(place.id)
        trackEvent("map_marker_click", { place_id: place.id, position: index + 1 })
      })
      bounds.push([lat, lng])
    })
    if (bounds.length > 0) map.fitBounds(bounds, { padding: [42, 42], maxZoom: 13 })
  }, [filtered, mapReady, recommendedIds, selected?.id, isVisited, isWant])

  // モバイルのリスト⇄マップ切替後、leafletにサイズ再計算させる
  useEffect(() => {
    if (mobileView === "map") {
      window.setTimeout(() => mapRef.current?.invalidateSize(), 50)
    }
  }, [mobileView])

  const locate = () => {
    if (!navigator.geolocation) {
      setGeoMessage("この端末では現在地を取得できません。")
      return
    }
    setGeoMessage("現在地を確認しています…")
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const L = leafletRef.current
        const map = mapRef.current
        if (!L || !map) return
        L.circleMarker([coords.latitude, coords.longitude], {
          radius: 8,
          color: "#ffffff",
          weight: 3,
          fillColor: "#3b83aa",
          fillOpacity: 1,
        }).addTo(map).bindTooltip("現在地").openTooltip()
        map.setView([coords.latitude, coords.longitude], 12)
        setGeoMessage("現在地を地図に表示しました。")
      },
      () => setGeoMessage("現在地を取得できませんでした。地域から探すこともできます。"),
      { timeout: 8000 },
    )
  }

  const externalMapUrl = selected
    ? `https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}&travelmode=${transport}`
    : "https://www.google.com/maps"

  return (
    <main className="page-shell py-5 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-ink sm:text-2xl">マップからさがす</h1>
          <p className="mt-1 text-xs text-ink-soft">ピンをタップすると詳細カードが開きます。</p>
        </div>
        <button type="button" onClick={locate} className="btn-secondary !min-h-10 text-xs">
          <LocateFixed className="size-4" aria-hidden />現在地を表示
        </button>
      </div>

      <div className="scrollbar-hide -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-0.5" aria-label="地図の絞り込み">
        {filterLabels.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`pill${filter === value ? " is-active" : ""}`}
          >
            {value === "want" && <Heart className="size-3.5" aria-hidden />}
            {value === "visited" && <Check className="size-3.5" aria-hidden />}
            {label}
          </button>
        ))}
      </div>
      {geoMessage && <p className="mb-3 text-sm text-ink-soft" role="status">{geoMessage}</p>}

      <section className="card-v2 grid overflow-hidden lg:grid-cols-[minmax(0,1fr)_380px]">
        <div
          ref={containerRef}
          className={`h-[58vh] min-h-[440px] w-full bg-canvas ${mobileView === "list" ? "hidden lg:block" : ""}`}
          aria-label="関西の遊び場マップ"
        />
        <aside
          className={`max-h-[58vh] min-h-[440px] overflow-y-auto border-t border-line p-4 lg:block lg:border-l lg:border-t-0 ${mobileView === "map" ? "hidden" : ""}`}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-black text-ink">{filter === "recommended" ? "今日のおすすめ" : "表示中のスポット"}</h2>
            <span className="text-xs font-bold text-ink-soft">{filtered.length}件</span>
          </div>
          <div className="space-y-2">
            {filtered.slice(0, 30).map((place) => {
              const active = place.id === selected?.id
              const rank = recommendedIds.indexOf(place.id)
              return (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(place.id)
                    setMobileView("map")
                    mapRef.current?.setView([Number(place.latitude), Number(place.longitude)], 13)
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition-colors duration-150 active:scale-[0.99] ${active ? "border-accent bg-accent-soft" : "border-line hover:border-ink-faint"}`}
                >
                  <div className="flex items-start gap-3">
                    {rank >= 0 && <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-black text-white">{rank + 1}</span>}
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">
                        {isVisited(place.id) && <Check className="mr-1 inline size-3.5 text-positive" aria-label="行った" />}
                        {isWant(place.id) && !isVisited(place.id) && <Heart className="mr-1 inline size-3.5 fill-accent text-accent-strong" aria-label="行きたい" />}
                        {place.name}
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">{place.prefecture} {place.city}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>
      </section>

      {/* モバイル: リスト⇄マップ セグメントトグル */}
      <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 lg:hidden">
        <div className="flex overflow-hidden rounded-full bg-ink shadow-[var(--shadow-overlay)]">
          <button
            type="button"
            onClick={() => setMobileView("map")}
            aria-pressed={mobileView === "map"}
            className={`inline-flex min-h-11 items-center gap-1.5 px-5 text-sm font-black transition-colors duration-150 ${mobileView === "map" ? "bg-accent text-white" : "text-white/80"}`}
          >
            <MapIcon className="size-4" aria-hidden />マップ
          </button>
          <button
            type="button"
            onClick={() => setMobileView("list")}
            aria-pressed={mobileView === "list"}
            className={`inline-flex min-h-11 items-center gap-1.5 px-5 text-sm font-black transition-colors duration-150 ${mobileView === "list" ? "bg-accent text-white" : "text-white/80"}`}
          >
            <List className="size-4" aria-hidden />リスト
          </button>
        </div>
      </div>

      {selected && (
        <section className="card-v2 sticky bottom-[76px] z-20 mx-auto mt-4 max-w-4xl p-4 shadow-[var(--shadow-overlay)] sm:bottom-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-accent-strong">選択中</p>
              <h2 className="mt-1 font-black text-ink">{selected.name}</h2>
              <p className="mt-1 text-xs text-ink-soft">{selected.prefecture} {selected.city}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {transportOptions.map(([value, label, Icon]) => (
                <button key={value} type="button" onClick={() => setTransport(value)} aria-pressed={transport === value} className={`pill !min-h-9 !px-3 !text-xs${transport === value ? " is-active" : ""}`}>
                  <Icon className="size-4" aria-hidden />{label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Link href={`/places/${selected.id}`} className="btn-secondary !min-h-11 text-xs">詳細を見る</Link>
              <a href={externalMapUrl} target="_blank" rel="noopener noreferrer" className="btn-primary !min-h-11 !px-4 text-xs">経路を開く<ExternalLink className="size-4" aria-hidden /></a>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
