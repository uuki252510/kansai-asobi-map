import Link from "next/link"
import PlaceImage from "@/components/PlaceImage"
import { getCategoriesForPlace, getPlaceIdsForCategory } from "@/lib/facilities"
import { getAllPlaces, placePhotoRank } from "@/lib/places"
import type { Place } from "@/lib/supabase/database.types"

/**
 * 同じジャンルの施設。周辺 (距離軸) と対になる回遊ブロックで、
 * カテゴリの正規ページ (/facilities/category/[slug]) への導線を兼ねる。
 */
export default async function SameGenreFacilities({ place }: { place: Place }) {
  const categories = await getCategoriesForPlace(place.id)
  const category = categories[0]
  if (!category) return null

  const [idList, all] = await Promise.all([
    getPlaceIdsForCategory(category.id),
    getAllPlaces().catch(() => []),
  ])
  const ids = new Set(idList)
  const siblings = all
    .filter((candidate) => candidate.id !== place.id && ids.has(candidate.id))
    .sort(
      (a, b) =>
        placePhotoRank(b) - placePhotoRank(a) ||
        Number(b.is_featured ?? false) - Number(a.is_featured ?? false) ||
        b.review_count - a.review_count,
    )
    .slice(0, 6)
  if (siblings.length < 3) return null

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-ink">同じジャンルのスポット</h2>
          <p className="mt-1 text-xs font-bold text-ink-soft">{category.name}</p>
        </div>
        <Link href={`/facilities/category/${category.slug}`} className="text-sm font-bold text-accent-strong">
          {category.name}をすべて見る →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {siblings.map((candidate) => (
          <Link
            key={candidate.id}
            href={`/places/${candidate.id}`}
            className="card-v2 flex gap-3 p-3 transition-transform duration-150 active:scale-[0.99]"
          >
            <span className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
              <PlaceImage place={candidate} alt="" className="size-full object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black text-ink">{candidate.name}</span>
              <span className="mt-0.5 block text-xs text-ink-soft">
                {candidate.prefecture.replace("府", "").replace("県", "")}・{candidate.city}
              </span>
              {candidate.average_stay_minutes ? (
                <span className="mt-1 block text-[0.6875rem] font-bold text-ink-soft">
                  滞在目安 約{candidate.average_stay_minutes >= 60 ? `${Math.round((candidate.average_stay_minutes / 60) * 10) / 10}時間` : `${candidate.average_stay_minutes}分`}
                </span>
              ) : null}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
