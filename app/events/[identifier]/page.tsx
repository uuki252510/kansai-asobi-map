export const revalidate = 900

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import PlaceCard from "@/components/PlaceCard"
import {
  EVENT_CATEGORY_LABELS,
  eventCoverUrl,
  eventPriceLabel,
  getEventByIdOrSlug,
} from "@/lib/events"
import { getPlacesByIds } from "@/lib/places"
import { renderSafeMarkdown } from "@/lib/safe-markdown"
import { breadcrumbJsonLd } from "@/lib/structured-data"
import { JST_WEEKDAYS, jstDateKey, jstParts, jstSameDay } from "@/lib/jst"

const SITE_URL = "https://kansai.asobi.nexia-llc.jp"

// 日付・時刻はすべてJSTで読む。サーバーはUTCで動くため、
// Date を直読みすると日付が前日にずれ、時刻は9時間ずれる
function formatDate(value: string): string {
  const parts = jstParts(new Date(value))
  return `${parts.year}年${parts.month}月${parts.day}日(${JST_WEEKDAYS[parts.weekday]})`
}

/** 構造化データ用の YYYY-MM-DD (JST基準) */
function isoDate(value: string): string {
  return jstDateKey(new Date(value))
}

function formatDateTime(value: string): string {
  const parts = jstParts(new Date(value))
  return `${formatDate(value)} ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`
}

export async function generateMetadata({ params }: { params: Promise<{ identifier: string }> }): Promise<Metadata> {
  const { identifier } = await params
  const event = await getEventByIdOrSlug(identifier)
  if (!event) return {}
  const description =
    event.summary ??
    `${event.venue_name ?? event.prefecture ?? "関西"}で開催される「${event.name}」の開催日時・場所・料金をまとめています。`
  // イメージ写真 (stock-) はOGPに出さない。検索結果やSNSで
  // 「その大会の写真」として流通してしまうため
  const isStockPhoto = Boolean(event.cover_storage_path?.startsWith("event-covers/stock-"))
  const cover = isStockPhoto ? null : eventCoverUrl(event)
  return {
    title: event.name,
    description,
    alternates: { canonical: `/events/${event.slug ?? event.id}` },
    openGraph: {
      type: "article",
      title: `${event.name}｜デカケル`,
      description,
      url: `/events/${event.slug ?? event.id}`,
      siteName: "デカケル",
      locale: "ja_JP",
      // ページで openGraph を定義すると親の設定は丸ごと置き換わる。
      // 写真が無い(またはイメージ写真の)イベントはブランドのOG画像に落とす
      images: cover ? [{ url: cover, alt: event.name }] : [{ url: "/opengraph-image", alt: "デカケル" }],
    },
    twitter: { title: `${event.name}｜デカケル`, description },
  }
}

export default async function EventDetailPage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params
  const event = await getEventByIdOrSlug(identifier)
  if (!event) notFound()

  const relatedPlaces = event.place_id ? await getPlacesByIds([event.place_id]).catch(() => []) : []
  const cover = eventCoverUrl(event)
  const isStockPhoto = Boolean(event.cover_storage_path?.startsWith("event-covers/stock-"))
  const price = eventPriceLabel(event)
  const now = new Date()
  const ended = new Date(event.end_at) < now
  const ongoing = new Date(event.start_at) <= now && !ended
  const sameDay = jstSameDay(new Date(event.start_at), new Date(event.end_at))

  const mapUrl = event.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`
    : null

  // schema.org Event。実在しない値は出さない
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    description: event.summary ?? undefined,
    // 時刻未確認のときは日付だけ出す。schema.org は Date でも DateTime でもよい
    startDate: event.start_time_unknown ? isoDate(event.start_at) : event.start_at,
    endDate: event.start_time_unknown ? isoDate(event.end_at) : event.end_at,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    // イメージ写真は構造化データに載せない (その大会の写真ではないため)
    image: isStockPhoto ? undefined : cover ?? undefined,
    url: `${SITE_URL}/events/${event.slug ?? event.id}`,
  }
  if (event.venue_name || event.address) {
    jsonLd.location = {
      "@type": "Place",
      name: event.venue_name ?? event.address,
      address: event.address
        ? {
            "@type": "PostalAddress",
            addressRegion: event.prefecture ?? undefined,
            addressLocality: event.city ?? undefined,
            // address には「兵庫県豊岡市…」の全体が入っているので、府県・市区を取り除いた残りだけを番地に入れる
            streetAddress:
              event.address.replace(event.prefecture ?? "", "").replace(event.city ?? "", "").trim() || undefined,
            addressCountry: "JP",
          }
        : undefined,
      geo:
        event.latitude !== null && event.longitude !== null
          ? { "@type": "GeoCoordinates", latitude: event.latitude, longitude: event.longitude }
          : undefined,
    }
  }
  if (event.is_free || event.adult_price !== null || event.child_price !== null) {
    jsonLd.offers = {
      "@type": "Offer",
      price: event.is_free ? 0 : (event.adult_price ?? event.child_price ?? 0),
      priceCurrency: "JPY",
      availability: "https://schema.org/InStock",
      url: event.application_url ?? event.official_url ?? `${SITE_URL}/events/${event.slug ?? event.id}`,
    }
  }
  if (event.organizer_name) jsonLd.organizer = { "@type": "Organization", name: event.organizer_name }

  const breadcrumb = breadcrumbJsonLd([
    { name: "ホーム", path: "/" },
    { name: "イベント", path: "/events" },
    { name: event.name, path: `/events/${event.slug ?? event.id}` },
  ])

  return (
    <main className="page-shell py-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />

      <nav aria-label="パンくず" className="text-xs font-bold text-ink-soft">
        <Link href="/" className="hover:text-ink">ホーム</Link>
        <span className="mx-1.5" aria-hidden>/</span>
        <Link href="/events" className="hover:text-ink">イベント</Link>
      </nav>

      <article className="mx-auto mt-4 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          {ended && <span className="rounded-full bg-muted px-3 py-1 text-xs font-black text-ink-soft">終了しました</span>}
          {ongoing && <span className="rounded-full bg-positive-soft px-3 py-1 text-xs font-black text-positive">開催中</span>}
          {event.event_category && (
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-black text-accent-strong">
              {EVENT_CATEGORY_LABELS[event.event_category]}
            </span>
          )}
          {event.is_free && <span className="rounded-full bg-caution-soft px-3 py-1 text-xs font-black text-caution">入場無料</span>}
        </div>

        <h1 className="mt-3 font-display text-2xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
          {event.name}
        </h1>

        {cover && (
          <div className="relative mt-5 aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt={isStockPhoto ? "花火のイメージ写真" : event.name}
              width={1200}
              height={675}
              className="size-full object-cover"
            />
            {isStockPhoto && (
              <span className="absolute bottom-3 right-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold text-white/90">
                写真はイメージ
              </span>
            )}
          </div>
        )}

        {event.summary && (
          <p className="mt-5 rounded-2xl bg-accent-soft px-5 py-4 text-sm font-bold leading-7 text-ink">{event.summary}</p>
        )}

        <section className="card-v2 mt-6 p-5 sm:p-6">
          <h2 className="text-lg font-black text-ink">開催情報</h2>
          <dl className="mt-3 divide-y divide-line text-sm">
            <div className="grid grid-cols-[6rem_1fr] gap-3 py-3">
              <dt className="font-bold text-ink-soft">開催日時</dt>
              <dd className="font-bold text-ink">
                {event.start_time_unknown ? (
                  <>
                    {sameDay ? formatDate(event.start_at) : `${formatDate(event.start_at)} 〜 ${formatDate(event.end_at)}`}
                    <span className="mt-1 block text-xs font-bold text-ink-faint">
                      開催時刻は主催者の発表をご確認ください
                    </span>
                  </>
                ) : (
                  <>
                    {formatDateTime(event.start_at)}
                    <br />〜 {formatDateTime(event.end_at)}
                  </>
                )}
              </dd>
            </div>
            {(event.venue_name || event.address) && (
              <div className="grid grid-cols-[6rem_1fr] gap-3 py-3">
                <dt className="font-bold text-ink-soft">場所</dt>
                <dd className="text-ink">
                  {event.venue_name && <span className="block font-bold">{event.venue_name}</span>}
                  {event.address && <span className="block text-ink-soft">{event.address}</span>}
                </dd>
              </div>
            )}
            <div className="grid grid-cols-[6rem_1fr] gap-3 py-3">
              <dt className="font-bold text-ink-soft">料金</dt>
              <dd className="font-bold text-ink">{price ?? "要確認"}</dd>
            </div>
            {event.reservation_required !== null && (
              <div className="grid grid-cols-[6rem_1fr] gap-3 py-3">
                <dt className="font-bold text-ink-soft">予約</dt>
                <dd className="text-ink">{event.reservation_required ? "要予約" : "予約不要"}</dd>
              </div>
            )}
            {event.access_note && (
              <div className="grid grid-cols-[6rem_1fr] gap-3 py-3">
                <dt className="font-bold text-ink-soft">アクセス</dt>
                <dd className="text-ink">{event.access_note}</dd>
              </div>
            )}
            {event.rain_policy && (
              <div className="grid grid-cols-[6rem_1fr] gap-3 py-3">
                <dt className="font-bold text-ink-soft">雨天時</dt>
                <dd className="text-ink">{event.rain_policy}</dd>
              </div>
            )}
            {event.organizer_name && (
              <div className="grid grid-cols-[6rem_1fr] gap-3 py-3">
                <dt className="font-bold text-ink-soft">主催</dt>
                <dd className="text-ink">{event.organizer_name}</dd>
              </div>
            )}
          </dl>

          <div className="mt-4 flex flex-wrap gap-3">
            {event.application_url && (
              <a href={event.application_url} target="_blank" rel="noopener noreferrer" className="btn-primary">
                申し込む
              </a>
            )}
            {event.official_url && (
              <a href={event.official_url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                公式サイト
              </a>
            )}
            {mapUrl && (
              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                地図で見る
              </a>
            )}
          </div>
        </section>

        {event.description && (
          <div className="article-body mt-6" dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(event.description) }} />
        )}
      </article>

      {relatedPlaces.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-black text-ink">会場のスポット情報</h2>
          <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 flex justify-center">
        <Link href="/events" className="btn-secondary px-8">ほかのイベントを見る</Link>
      </div>
    </main>
  )
}
