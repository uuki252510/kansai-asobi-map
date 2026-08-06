import Link from "next/link"
import EventCover from "@/components/EventCover"
import { jstParts } from "@/lib/jst"
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
  const start = jstParts(new Date(event.start_at))
  const isOngoing = new Date(event.start_at) <= new Date() && new Date(event.end_at) >= new Date()
  const periodLabel = eventPeriodLabel(event)
  const badgeDate = `${start.month}/${start.day}`
  // その大会の実写真ではなく、PD/CC0のイメージ写真 (scripts/fetch-event-covers.mjs)
  const isStockPhoto = Boolean(event.cover_storage_path?.startsWith("event-covers/stock-"))

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
            alt={isStockPhoto ? "花火のイメージ写真" : ""}
            width={640}
            height={480}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-[250ms] ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <EventCover event={event} />
        )}
        {isOngoing && <span className="badge-photo is-positive absolute left-2 top-2">開催中</span>}
        {!isOngoing && event.is_free && <span className="badge-photo absolute left-2 top-2">入場無料</span>}
        {/* 免責は alt が担うので、視覚バッジは読み上げから外す (リンク名の先頭を汚さない) */}
        {cover && isStockPhoto && (
          <span aria-hidden className="absolute bottom-2 right-2 rounded-[2px] bg-black/65 px-2 py-0.5 text-[11px] font-bold text-white">
            写真はイメージ
          </span>
        )}
      </div>

      <p className="mt-2 border-t border-line pt-2 text-[11px] font-bold tracking-[0.08em] text-accent-strong">
        {/* カバーが日付を大きく出しているときだけ、同じ日付を繰り返さない */}
        {!(cover === null && !event.highlight_value && periodLabel === badgeDate) && periodLabel}
        {event.event_category && (
          <span className="ml-1.5 font-bold text-ink-soft">{EVENT_CATEGORY_LABELS[event.event_category]}</span>
        )}
      </p>
      <h3 className="font-display mt-1 line-clamp-2 text-[0.9375rem] font-extrabold leading-snug text-ink">{event.name}</h3>
      {(event.venue_name || event.city) && (
        <p className="mt-0.5 truncate text-xs text-ink-soft">{event.venue_name ?? `${event.prefecture ?? ""}${event.city ?? ""}`}</p>
      )}
      {price && <p className="mt-1 text-xs font-bold text-ink">{price}</p>}
    </Link>
  )
}
