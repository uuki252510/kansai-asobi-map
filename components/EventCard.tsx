import Link from "next/link"
import {
  eventCoverUrl,
  eventHref,
  eventPeriodLabel,
  eventPriceLabel,
  EVENT_CATEGORY_LABELS,
  type PublicEvent,
} from "@/lib/events"

/**
 * イベントカード。開催期間を最初に出す (イベントは「いつ」が最重要)。
 * 写真が無いイベントも多いので、無い場合は日付タイルで代替する。
 */
export default function EventCard({ event, compact = false }: { event: PublicEvent; compact?: boolean }) {
  const cover = eventCoverUrl(event)
  const price = eventPriceLabel(event)
  const start = new Date(event.start_at)
  const isOngoing = new Date(event.start_at) <= new Date() && new Date(event.end_at) >= new Date()

  return (
    <Link
      href={eventHref(event)}
      className={`group block ${compact ? "w-[164px] shrink-0 snap-start sm:w-[196px]" : ""}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-accent-soft">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            width={640}
            height={480}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-[250ms] ease-out group-hover:scale-[1.04]"
          />
        ) : (
          // 写真が無いときは日付を大きく見せる
          <div className="grid size-full place-items-center text-center">
            <div>
              <p className="font-display text-3xl font-black leading-none text-accent-strong">
                {start.getMonth() + 1}<span className="text-lg">/</span>{start.getDate()}
              </p>
              <p className="mt-1 text-xs font-bold text-ink-soft">
                {["日", "月", "火", "水", "木", "金", "土"][start.getDay()]}曜
              </p>
            </div>
          </div>
        )}
        {isOngoing && <span className="badge-photo is-positive absolute left-2 top-2">開催中</span>}
        {!isOngoing && event.is_free && <span className="badge-photo absolute left-2 top-2">入場無料</span>}
      </div>

      <p className="mt-2 text-xs font-black text-accent">
        {eventPeriodLabel(event)}
        {event.event_category && (
          <span className="ml-1.5 font-bold text-ink-soft">{EVENT_CATEGORY_LABELS[event.event_category]}</span>
        )}
      </p>
      <h3 className="mt-0.5 line-clamp-2 text-sm font-black leading-snug text-ink">{event.name}</h3>
      {(event.venue_name || event.city) && (
        <p className="mt-0.5 truncate text-xs text-ink-soft">{event.venue_name ?? `${event.prefecture ?? ""}${event.city ?? ""}`}</p>
      )}
      {price && <p className="mt-1 text-xs font-bold text-ink">{price}</p>}
    </Link>
  )
}
