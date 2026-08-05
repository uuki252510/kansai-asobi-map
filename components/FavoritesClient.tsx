"use client"

import Link from "next/link"
import { Heart, MapPin } from "lucide-react"
import PlaceCard from "@/components/PlaceCard"
import type { PlaceWithAvgRating } from "@/lib/places"
import { useFavorites } from "@/lib/useFavorites"

export default function FavoritesClient({ places }: { places: PlaceWithAvgRating[] }) {
  const { isFavorite, count } = useFavorites()
  const favorites = places.filter((place) => isFavorite(place.id))
  return (
    <main className="utility-page page-shell py-8 sm:py-12">
      <div className="utility-hero flex items-end justify-between gap-4"><div><p className="section-kicker">あとで行きたい</p><h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">お気に入り</h1><p className="mt-3 text-sm text-[var(--color-text-secondary)]">保存中のスポット：{count}件</p></div><Link href="/map" className="btn-secondary"><MapPin className="size-4" />地図で探す</Link></div>
      {favorites.length === 0 ? (
        <div className="empty-state mx-auto mt-12 max-w-xl rounded-3xl p-8 text-center"><span className="empty-state-icon"><Heart className="size-6" /></span><h2 className="mt-4 text-lg font-black">お気に入りはまだありません</h2><p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">おすすめ結果やスポット詳細のハートから、気になる場所を保存できます。</p><Link href="/today" className="btn-primary mt-6">今日のおすすめを見る</Link></div>
      ) : <div className="utility-card-grid mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{favorites.map((place) => <PlaceCard key={place.id} place={place} />)}</div>}
    </main>
  )
}
