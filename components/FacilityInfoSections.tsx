import { AlertTriangle, BadgePercent, CalendarDays, Clock3, Ticket as TicketIcon, TrainFront } from "lucide-react"
import { getFacilityDetails } from "@/lib/facilities"
import { freshnessStatus, FRESHNESS_LABELS, priceSummary, tierLabel, todayBusinessStatus } from "@/lib/facility-derive"
import { DAY_LABELS } from "@/lib/facility-types"
import type { Place } from "@/lib/supabase/database.types"

/**
 * 施設詳細ページの拡張セクション (営業状況/営業時間/料金/クーポン/チケット/イベント/お知らせ)。
 * データが無いセクションは描画しない (不自然な空欄を出さない)。
 * migration未適用環境では getFacilityDetails が空を返し、何も描画されない。
 */
export default async function FacilityInfoSections({ place }: { place: Place }) {
  const details = await getFacilityDetails(place.id)
  const status = todayBusinessStatus(details.businessHours, details.businessExceptions)
  const prices = priceSummary(details.pricePlans, new Date().toISOString().slice(0, 10))
  const freshness = freshnessStatus(place.last_verified_at)

  const hasAnything =
    details.businessHours.length > 0 ||
    details.pricePlans.length > 0 ||
    details.coupons.length > 0 ||
    details.tickets.length > 0 ||
    details.events.length > 0 ||
    details.news.length > 0 ||
    details.stations.length > 0

  if (!hasAnything && !place.is_temporarily_closed) return null

  const stateStyles: Record<string, string> = {
    open: "bg-positive-soft text-positive",
    closing_soon: "bg-caution-soft text-caution",
    closed_now: "bg-muted text-ink-soft",
    closed_today: "bg-caution-soft text-caution",
    unknown: "bg-muted text-ink-soft",
  }

  return (
    <>
      {/* 臨時休業・重要お知らせ */}
      {(place.is_temporarily_closed || details.news.some((entry) => entry.is_important)) && (
        <section className="rounded-2xl bg-caution-soft p-4">
          <p className="flex items-center gap-2 text-sm font-black text-caution">
            <AlertTriangle className="size-4" aria-hidden />
            {place.is_temporarily_closed ? "現在、臨時休業中です。おでかけ前に公式情報をご確認ください。" : details.news.find((entry) => entry.is_important)?.title}
          </p>
        </section>
      )}

      {/* 営業時間 */}
      {details.businessHours.length > 0 && (
        <section className="card-v2 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-black text-ink">
              <Clock3 className="size-5 text-accent-strong" aria-hidden />営業時間
            </h2>
            <span className={`rounded-full px-3 py-1.5 text-xs font-black ${stateStyles[status.state]}`}>
              {status.label}
            </span>
          </div>
          <table className="mt-4 w-full text-sm">
            <tbody className="divide-y divide-line">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                const rows = details.businessHours.filter((hour) => hour.day_of_week === day)
                if (rows.length === 0) return null
                const isToday = new Date().getDay() === day
                return (
                  <tr key={day} className={isToday ? "bg-accent-soft/40" : undefined}>
                    <th scope="row" className="w-16 py-2 text-left font-bold text-ink-soft">
                      {DAY_LABELS[day]}{isToday && <span className="ml-1 text-[0.625rem] text-accent-strong">今日</span>}
                    </th>
                    <td className="py-2 font-bold text-ink">
                      {rows.some((row) => row.is_closed)
                        ? "定休日"
                        : rows.flatMap((row) => row.slots).map((slot) => `${slot.opening_time.slice(0, 5)}〜${slot.closing_time.slice(0, 5)}`).join(" / ")}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {details.businessExceptions.length > 0 && (
            <div className="mt-3 rounded-xl bg-canvas p-3 text-xs leading-6 text-ink-soft">
              <p className="font-black text-ink">直近の臨時営業・休業</p>
              {details.businessExceptions.slice(0, 5).map((exception) => (
                <p key={exception.id}>
                  {exception.date}:{" "}
                  {exception.exception_type === "temporary_closure" ? "臨時休業" :
                   exception.exception_type === "maintenance" ? "メンテナンス休業" :
                   exception.exception_type === "year_end" ? "年末年始休業" :
                   exception.opening_time && exception.closing_time
                     ? `${exception.opening_time.slice(0, 5)}〜${exception.closing_time.slice(0, 5)} 営業`
                     : "特別営業"}
                  {exception.reason ? `（${exception.reason}）` : ""}
                </p>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 最寄り駅 (関西は私鉄網が濃く、車を持たない世帯の判断材料になる) */}
      {details.stations.length > 0 && (
        <section className="card-v2 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-black text-ink">
            <TrainFront className="size-5 text-accent-strong" aria-hidden />電車でのアクセス
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {details.stations.map((access, index) => (
              <li key={access.station?.id ?? index} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3">
                <span className="text-sm font-black text-ink">{access.station?.name}駅</span>
                {access.station?.line && (
                  <span className="text-xs text-ink-soft">{access.station.line.name}</span>
                )}
                <span className="ml-auto text-sm font-bold text-ink">
                  {access.walking_minutes !== null && `徒歩約${access.walking_minutes}分`}
                  {access.distance_meters !== null && (
                    <span className="ml-2 text-xs font-normal text-ink-soft">
                      （約{access.distance_meters.toLocaleString("ja-JP")}m）
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 料金 */}
      {details.pricePlans.length > 0 && (
        <section className="card-v2 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-ink">料金</h2>
            {prices.label && <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-black text-accent-strong">{prices.label}</span>}
          </div>
          <div className="mt-4 space-y-4">
            {details.pricePlans.map((plan) => (
              <div key={plan.id}>
                <p className="text-sm font-black text-ink">
                  {plan.plan_name}
                  {plan.day_type === "weekday" && <span className="ml-2 text-xs font-bold text-ink-soft">平日</span>}
                  {plan.day_type === "holiday" && <span className="ml-2 text-xs font-bold text-ink-soft">土日祝</span>}
                </p>
                <dl className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                  {plan.tiers.map((tier) => (
                    <div key={tier.id} className="flex justify-between border-b border-line py-1.5">
                      <dt className="text-ink-soft">{tierLabel(tier.tier)}</dt>
                      <dd className="font-black text-ink">{tier.is_free || tier.price === 0 ? "無料" : `${tier.price.toLocaleString("ja-JP")}円`}</dd>
                    </div>
                  ))}
                </dl>
                {plan.note && <p className="mt-1 text-xs text-ink-soft">{plan.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* クーポン・チケット */}
      {(details.coupons.length > 0 || details.tickets.length > 0) && (
        <section className="card-v2 p-5 sm:p-6">
          <h2 className="text-lg font-black text-ink">クーポン・チケット</h2>
          <div className="mt-3 space-y-3">
            {details.coupons.map((coupon) => (
              <div key={coupon.id} className="rounded-xl border-2 border-dashed border-accent bg-accent-soft/50 p-4">
                <p className="flex items-center gap-2 text-sm font-black text-accent-strong">
                  <BadgePercent className="size-4" aria-hidden />{coupon.name}
                </p>
                {coupon.description && <p className="mt-1 text-xs leading-6 text-ink-soft">{coupon.description}</p>}
                {coupon.display_code && (
                  <p className="mt-2 inline-block rounded-lg bg-surface px-3 py-1.5 font-mono text-sm font-black text-ink">{coupon.display_code}</p>
                )}
                {coupon.valid_until && <p className="mt-1 text-xs text-ink-faint">有効期限: {coupon.valid_until}</p>}
              </div>
            ))}
            {details.tickets.map((ticket) => (
              <a key={ticket.id} href={ticket.external_ticket_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-line p-4 transition-colors hover:border-accent">
                <span>
                  <span className="flex items-center gap-2 text-sm font-black text-ink">
                    <TicketIcon className="size-4 text-accent-strong" aria-hidden />{ticket.name}
                  </span>
                  {ticket.provider_name && <span className="mt-0.5 block text-xs text-ink-soft">{ticket.provider_name}</span>}
                </span>
                <span className="shrink-0 text-right">
                  {ticket.sale_price !== null && (
                    <span className="block text-base font-black text-accent-strong">{ticket.sale_price.toLocaleString("ja-JP")}円</span>
                  )}
                  {ticket.regular_price !== null && ticket.sale_price !== null && ticket.regular_price > ticket.sale_price && (
                    <span className="block text-xs text-ink-faint line-through">{ticket.regular_price.toLocaleString("ja-JP")}円</span>
                  )}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* イベント */}
      {details.events.length > 0 && (
        <section className="card-v2 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-black text-ink">
            <CalendarDays className="size-5 text-accent-strong" aria-hidden />開催予定のイベント
          </h2>
          <div className="mt-3 space-y-3">
            {details.events.map((event) => (
              <div key={event.id} className="rounded-xl border border-line p-4">
                <p className="text-sm font-black text-ink">{event.name}</p>
                <p className="mt-1 text-xs font-bold text-ink-soft">
                  {new Date(event.start_at).toLocaleDateString("ja-JP")} 〜 {new Date(event.end_at).toLocaleDateString("ja-JP")}
                  {event.reservation_required && " · 要予約"}
                </p>
                {event.summary && <p className="mt-1 text-xs leading-6 text-ink-soft">{event.summary}</p>}
                {event.official_url && (
                  <a href={event.official_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-black text-accent-strong">
                    イベント詳細 →
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* お知らせ */}
      {details.news.length > 0 && (
        <section className="card-v2 p-5 sm:p-6">
          <h2 className="text-lg font-black text-ink">施設からのお知らせ</h2>
          <div className="mt-3 divide-y divide-line">
            {details.news.map((entry) => (
              <div key={entry.id} className="py-3">
                <p className="text-xs font-bold text-ink-faint">{new Date(entry.published_at).toLocaleDateString("ja-JP")}</p>
                <p className="mt-0.5 text-sm font-black text-ink">{entry.title}</p>
                {entry.summary && <p className="mt-1 text-xs leading-6 text-ink-soft">{entry.summary}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 情報鮮度 */}
      {place.last_verified_at && (
        <p className="text-xs text-ink-soft">
          情報確認日: {new Date(place.last_verified_at).toLocaleDateString("ja-JP")}
          <span className={`ml-2 rounded-full px-2 py-0.5 font-bold ${freshness === "fresh" ? "bg-positive-soft text-positive" : "bg-caution-soft text-caution"}`}>
            {FRESHNESS_LABELS[freshness]}
          </span>
          <span className="ml-2">最新情報は公式サイトをご確認ください。</span>
        </p>
      )}
    </>
  )
}
