"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { ArrowRight, MapPin, RefreshCw } from "lucide-react"
import PlaceCard from "./PlaceCard"
import type { PlaceWithAvgRating } from "@/lib/places"
import type { NearbyPlace } from "@/app/api/places/nearby/route"

type Mode = "popular" | "nearby" | "loading"

interface Props {
  initialPlaces: PlaceWithAvgRating[]
}

// カード幅 + gap (px)。CSS と合わせる
const CARD_W = 276   // 260 card + 16 gap
const SPEED = 40     // px/秒

export default function PopularCarousel({ initialPlaces }: Props) {
  const [places, setPlaces] = useState<(PlaceWithAvgRating & { distanceKm?: number })[]>(initialPlaces)
  const [mode, setMode] = useState<Mode>("popular")
  const [geoError, setGeoError] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  // アニメーション時間: カード枚数 × カード幅 / 速度
  const duration = (places.length * CARD_W) / SPEED

  // --- GPS ---
  const fetchNearby = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("お使いのブラウザは位置情報に対応していません")
      return
    }
    setMode("loading")
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/places/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&limit=6`
          )
          if (!res.ok) throw new Error()
          const data: NearbyPlace[] = await res.json()
          if (data.length === 0) {
            setGeoError("近くのスポットが見つかりませんでした")
            setMode("popular")
            return
          }
          setPlaces(data)
          setMode("nearby")
        } catch {
          setGeoError("現在地の取得に失敗しました")
          setMode("popular")
        }
      },
      () => {
        setGeoError("位置情報の許可が必要です")
        setMode("popular")
      },
      { timeout: 8000 }
    )
  }, [])

  // 許可済みなら自動で近い順
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((result) => {
        if (result.state === "granted") fetchNearby()
        result.onchange = () => {
          if (result.state === "granted") fetchNearby()
          else { setMode("popular"); setPlaces(initialPlaces) }
        }
      })
      .catch(() => {})
  }, [fetchNearby, initialPlaces])

  const kicker = mode === "nearby" ? "現在地から近い順" : "みんなが行っている"
  const title  = mode === "nearby" ? "近くの遊び場"     : "人気の遊び場"

  // カードを2セット複製してシームレスループ
  const doubled = [...places, ...places]

  return (
    <section className="py-10">
      {/* ヘッダー */}
      <div className="px-4 mb-5">
        <div className="mx-auto max-w-6xl flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">{kicker}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchNearby}
              disabled={mode === "loading"}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-white/80 px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-[var(--brand-clay)]/40 hover:shadow-sm disabled:opacity-50"
            >
              {mode === "loading" ? (
                <><RefreshCw className="size-3.5 animate-spin" />取得中…</>
              ) : (
                <><MapPin className="size-3.5" />{mode === "nearby" ? "現在地を更新" : "現在地から探す"}</>
              )}
            </button>
            <Link
              href="/places"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-white/76 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[var(--brand-clay)]/35 hover:text-[var(--brand-clay)]"
            >
              全部見る <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
        {geoError && <p className="mt-2 text-xs text-orange-600 mx-auto max-w-6xl">{geoError}</p>}
      </div>

      {/* マーキー本体 */}
      <div
        className="overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div
          ref={trackRef}
          className="flex gap-4 w-max pl-4"
          style={{
            animation: `marquee ${duration}s linear infinite`,
            animationPlayState: paused ? "paused" : "running",
            willChange: "transform",
          }}
        >
          {doubled.map((place, i) => (
            <div
              key={`${place.id}-${i}`}
              className="flex-shrink-0 w-[260px] sm:w-[280px]"
            >
              <PlaceCard place={place} distanceKm={place.distanceKm} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
