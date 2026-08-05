import Link from "next/link"
import PlaceImage from "@/components/PlaceImage"
import { getFacilityDetails } from "@/lib/facilities"
import { priceSummary, todayBusinessStatus } from "@/lib/facility-derive"
import { DAY_LABELS } from "@/lib/facility-types"
import type { PlaceWithAvgRating } from "@/lib/places"

/**
 * 記事本文の中に置くスポットカード。
 * 記事を読みながら「行けるかどうか」を判断できるよう、
 * 住所・営業時間・料金・アクセスをその場に出す。
 */
export default async function ArticleSpotCard({ place }: { place: PlaceWithAvgRating }) {
  const details = await getFacilityDetails(place.id)
  const status = todayBusinessStatus(details.businessHours, details.businessExceptions)
  const prices = priceSummary(details.pricePlans, new Date().toISOString().slice(0, 10))
  const station = details.stations[0]

  // 曜日別が入っていれば代表的な営業時間を1行で出す
  const todayLine = status.todaySlots.length > 0 ? status.todaySlots.join(" / ") : null
  const weekdayLine = details.businessHours
    .filter((hour) => !hour.is_closed && hour.slots.length > 0)
    .slice(0, 1)
    .map((hour) => `${DAY_LABELS[hour.day_of_week]}曜 ${hour.slots.map((slot) => `${slot.opening_time.slice(0, 5)}〜${slot.closing_time.slice(0, 5)}`).join(" / ")}`)[0]

  const priceLine =
    prices.label ||
    (place.price_type === "free" ? "入場無料" : place.price_note ?? (place.price_type === "paid" ? "有料（要確認）" : null))

  const rows: Array<[string, string]> = [
    ["住所", place.address],
    ...(todayLine ? ([["営業時間", `本日 ${todayLine}`]] as Array<[string, string]>) : weekdayLine ? ([["営業時間", weekdayLine]] as Array<[string, string]>) : []),
    ...(priceLine ? ([["料金", priceLine]] as Array<[string, string]>) : []),
    ...(station?.station
      ? ([["アクセス", `${station.station.name}駅から徒歩約${station.walking_minutes ?? "—"}分`]] as Array<[string, string]>)
      : []),
    ...(place.average_stay_minutes ? ([["滞在目安", `約${place.average_stay_minutes}分`]] as Array<[string, string]>) : []),
  ]

  return (
    <aside className="article-spot my-8">
      <Link href={`/places/${place.id}`} className="group block">
        <div className="aspect-[16/9] overflow-hidden rounded-t-2xl bg-muted">
          <PlaceImage
            place={place}
            alt={place.name}
            className="size-full object-cover transition-transform duration-[250ms] ease-out group-hover:scale-[1.03]"
          />
        </div>
      </Link>

      <div className="rounded-b-2xl border-x border-b border-line px-5 pb-5 pt-4">
        <p className="text-xs font-bold text-ink-soft">{place.prefecture}{place.city}</p>
        <h3 className="mt-0.5 font-display text-lg font-black leading-snug text-ink">
          <Link href={`/places/${place.id}`} className="hover:text-accent-strong">{place.name}</Link>
        </h3>

        <dl className="mt-3 divide-y divide-line text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[5rem_1fr] gap-3 py-2">
              <dt className="font-bold text-ink-soft">{label}</dt>
              <dd className="text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/places/${place.id}`} className="btn-primary !min-h-10 px-5 text-sm">
            詳しく見る
          </Link>
          {place.website_url && (
            <a href={place.website_url} target="_blank" rel="noopener noreferrer" className="btn-secondary !min-h-10 text-sm">
              公式サイト
            </a>
          )}
        </div>
      </div>
    </aside>
  )
}
