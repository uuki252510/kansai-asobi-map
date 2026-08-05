export const revalidate = 3600

import type { Metadata } from "next"
import Link from "next/link"
import { MapPin } from "lucide-react"
import { AREAS } from "@/lib/areas"
import { getAllPlaces } from "@/lib/places"
import { getPlacesForArea } from "@/lib/areas"

export const metadata: Metadata = {
  title: "エリアからさがす",
  description: "梅田・なんば・三宮・京都市内・奈良公園など、関西の主要エリアからおでかけスポットを探せます。",
  alternates: { canonical: "/areas" },
}

export default async function AreasPage() {
  const allPlaces = await getAllPlaces().catch(() => [])
  const prefectures = AREAS.filter((area) => area.kind === "prefecture")
  const spots = AREAS.filter((area) => area.kind !== "prefecture")

  return (
    <main className="page-shell py-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">エリアからさがす</h1>
        <p className="mt-2 text-sm leading-7 text-ink-soft">
          行き先の目星がついているなら、エリアから。主要ターミナルや観光地の周辺スポットをまとめています。
        </p>
      </header>

      <h2 className="mt-8 text-lg font-black text-ink">府県から</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {prefectures.map((area) => {
          const count = getPlacesForArea(area, allPlaces).length
          return (
            <Link key={area.slug} href={`/areas/${area.slug}`} className="card-v2 group flex items-center justify-between gap-2 px-5 py-4 transition-transform duration-150 active:scale-[0.98]">
              <div>
                <p className="text-base font-black text-ink">{area.name}</p>
                <p className="mt-0.5 text-xs font-bold text-ink-soft">{count}件のスポット</p>
              </div>
              <MapPin className="size-5 text-accent" aria-hidden />
            </Link>
          )
        })}
      </div>

      <h2 className="mt-10 text-lg font-black text-ink">人気エリアから</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {spots.map((area) => {
          const count = getPlacesForArea(area, allPlaces).length
          return (
            <Link key={area.slug} href={`/areas/${area.slug}`} className="card-v2 group px-5 py-4 transition-transform duration-150 active:scale-[0.98]">
              <p className="text-base font-black text-ink">{area.name}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-soft">{area.description}</p>
              <p className="mt-2 text-xs font-black text-accent">{count}件のスポット →</p>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
