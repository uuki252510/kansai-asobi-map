import { CalendarClock, Coins, Gauge, ShieldQuestion } from "lucide-react"
import type { Place } from "@/lib/supabase/database.types"

const crowdLabels: Record<string, string> = {
  quiet: "比較的ゆったり",
  normal: "通常",
  busy: "混みやすい",
  very_busy: "かなり混みやすい",
}

function priceLabel(place: Place) {
  // 無料は金額(0円)より「無料」と出したほうが伝わる
  if (place.price_type === "free") return "無料"
  if (place.price_min !== null || place.price_max !== null) {
    const minimum = place.price_min ?? 0
    if (place.price_max !== null && place.price_max !== minimum) return `${minimum.toLocaleString()}〜${place.price_max.toLocaleString()}円`
    return `${minimum.toLocaleString()}円〜`
  }
  if (place.price_note) return place.price_note
  return place.price_type === "mixed" ? "一部有料" : "料金を確認"
}

export default function PlaceDecisionBrief({ place }: { place: Place }) {
  const facts = [
    {
      code: "STAY",
      icon: CalendarClock,
      label: "滞在の目安",
      value: place.average_stay_minutes ? `約${place.average_stay_minutes}分` : "要確認",
      known: Boolean(place.average_stay_minutes),
    },
    {
      code: "PRICE",
      icon: Coins,
      label: "料金の目安",
      value: priceLabel(place),
      known: Boolean(place.price_note || place.price_type === "free" || place.price_min !== null || place.price_max !== null),
    },
    {
      code: "CROWD",
      icon: Gauge,
      label: "混みやすさ",
      value: place.crowd_level ? crowdLabels[place.crowd_level] ?? place.crowd_level : "情報収集中",
      known: Boolean(place.crowd_level),
    },
    {
      code: "BOOK",
      icon: ShieldQuestion,
      label: "予約",
      value: place.reservation_required === true ? "事前予約を確認" : place.reservation_required === false ? "予約なしでOK" : "要確認",
      known: place.reservation_required !== null,
    },
  ]

  const highlights = [
    place.rainy_day_ok ? "雨の日候補にできる" : null,
    place.has_parking ? "車で行きやすい" : null,
    place.stroller_accessible === true ? "ベビーカーで動きやすい" : null,
    place.barrier_free === true ? "バリアフリー対応" : null,
    place.has_nursing_room ? "授乳室あり" : null,
    place.meal_available === true ? "食事もできる" : null,
    place.same_day_booking === true ? "当日予約に対応" : null,
  ].filter(Boolean) as string[]

  const completenessChecks = [
    place.description,
    place.opening_hours,
    place.price_note || place.price_type === "free",
    place.target_ages.length > 0,
    place.average_stay_minutes,
    place.website_url,
    place.latitude !== null && place.longitude !== null,
    place.reservation_required !== null,
    place.crowd_level,
    place.last_verified_at,
  ]
  const completeness = completenessChecks.filter(Boolean).length

  return (
    <section className="mt-5 rounded-[24px] border border-line bg-white p-4 shadow-sm sm:p-5" aria-labelledby="decision-brief-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">まずここだけ</span>
          <h2 id="decision-brief-title" className="mt-2 text-xl font-black text-ink">行くか決める4つの情報</h2>
        </div>
        <div className="min-w-44">
          <div className="flex items-center justify-between text-[0.68rem] font-black text-ink-soft"><span>情報充実度</span><span>{completeness}/10</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface"><span className="block h-full rounded-full bg-mint" style={{ width: `${completeness * 10}%` }} /></div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map(({ code, icon: Icon, label, value, known }) => (
          <div key={code} className={`cargo-fact ${known ? "" : "is-pending"}`}>
            <div className="flex items-center justify-between gap-2"><span className="cargo-fact-code">{code}</span><Icon className="size-4 text-positive" /></div>
            <p className="mt-3 text-xs font-bold text-ink-soft">{label}</p>
            <p className="mt-1 text-base font-black text-ink">{value}</p>
          </div>
        ))}
      </div>

      {highlights.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {highlights.map((highlight) => <span key={highlight} className="pill is-selected min-h-0 px-3 py-1.5 text-xs">{highlight}</span>)}
        </div>
      )}
    </section>
  )
}
