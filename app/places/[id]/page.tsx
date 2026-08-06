export const revalidate = 3600

import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  Accessibility,
  ArrowLeft,
  Baby,
  BadgeJapaneseYen,
  CalendarClock,
  Car,
  Clock3,
  ExternalLink,
  House,
  MapPin,
  Navigation,
  PawPrint,
  Star,
  Umbrella,
  Utensils,
} from "lucide-react"
import FavoriteButton from "./FavoriteButton"
import ReviewForm from "./ReviewForm"
import ShareButtons from "./ShareButtons"
import CorrectionRequestForm from "@/components/CorrectionRequestForm"
import ExternalLinksModule from "@/components/ExternalLinksModule"
import FacilityInfoSections from "@/components/FacilityInfoSections"
import NearbyFacilities from "@/components/NearbyFacilities"
import PlaceDecisionBrief from "@/components/PlaceDecisionBrief"
import { PlaceEnrichmentSection, PlaceEnrichmentSkeleton } from "@/components/PlaceEnrichmentSection"
import PlaceImage from "@/components/PlaceImage"
import SpotDetailTracker from "@/components/SpotDetailTracker"
import VisitToggle from "@/components/VisitToggle"
import { whatIsIt, whyGo } from "@/lib/place-editorial"
import { getPlaceById } from "@/lib/places"
import { breadcrumbJsonLd, touristAttractionJsonLd } from "@/lib/structured-data"

interface Props {
  params: Promise<{ id: string }>
}

const indoorLabels = { indoor: "屋内", outdoor: "屋外", both: "屋内外" } as const
const priceLabels = { free: "無料", paid: "有料", mixed: "一部有料" } as const
const ageLabels: Record<string, string> = { "0-2": "0〜2歳", "3-5": "3〜5歳", "6-12": "小学生" }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const place = await getPlaceById(id)
  if (!place) return {}
  const description = place.description ?? `${place.prefecture}${place.city}にある「${place.name}」の料金、営業時間、設備、口コミを確認できます。`
  const imageUrl = `/api/place-image/${place.id}`
  return {
    title: place.name,
    description,
    alternates: { canonical: `/places/${id}` },
    openGraph: {
      type: "article",
      title: `${place.name}｜デカケル`,
      description,
      url: `/places/${id}`,
      images: [{ url: imageUrl, alt: place.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${place.name}｜デカケル`,
      description,
      images: [imageUrl],
    },
  }
}

export default async function PlaceDetailPage({ params }: Props) {
  const { id } = await params
  const place = await getPlaceById(id)
  if (!place) notFound()

  const averageRating = place.reviews.length
    ? place.reviews.reduce((sum, review) => sum + review.rating, 0) / place.reviews.length
    : null
  const mapUrl = place.google_map_url ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`
  const canonicalUrl = `https://kansai.asobi.nexia-llc.jp/places/${place.id}`
  const mapEmbed = place.latitude !== null && place.longitude !== null
    ? createMapEmbed(place.latitude, place.longitude)
    : null
  const jsonLd = touristAttractionJsonLd({ ...place, avg_rating: averageRating, review_count: place.reviews.length })
  const breadcrumb = breadcrumbJsonLd([
    { name: "ホーム", path: "/" },
    { name: "スポット一覧", path: "/spots" },
    { name: place.name, path: `/places/${place.id}` },
  ])

  const facilityItems = [
    place.has_parking && [Car, "駐車場あり"],
    place.has_nursing_room && [Baby, "授乳室あり"],
    place.has_diaper_space && [Baby, "おむつ替え"],
    place.rainy_day_ok && [Umbrella, "雨の日OK"],
    place.stroller_accessible === true && [Baby, "ベビーカー可"],
    place.barrier_free === true && [Accessibility, "バリアフリー"],
    place.pet_friendly === true && [PawPrint, "ペット同伴可"],
    place.meal_available === true && [Utensils, "食事あり"],
  ].filter(Boolean) as Array<[typeof Car, string]>

  return (
    <main className="place-detail page-shell pb-36 pt-5 md:pb-28 md:pt-8">
      <SpotDetailTracker placeId={place.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />

      <Link href="/spots" className="back-link mb-5 inline-flex items-center gap-2 text-sm font-bold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" />スポット一覧に戻る
      </Link>

      <section className="place-hero grid overflow-hidden rounded-[1.6rem] lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
        <div className="relative min-h-[300px] bg-surface sm:min-h-[420px]">
          <PlaceImage place={place} alt={place.name} className="absolute inset-0 size-full object-cover" loading="eager" />
        </div>
        <div className="place-hero-copy flex flex-col justify-between p-5 sm:p-8">
          <div>
            <p className="mb-4 text-[0.62rem] font-black tracking-[0.16em] text-[var(--color-primary-dark)]">WEEKEND FIELD NOTE</p>
            <div className="flex flex-wrap gap-2">
              <span className="pill"><House className="size-4" />{indoorLabels[place.indoor_type]}</span>
              <span className="pill"><BadgeJapaneseYen className="size-4" />{priceLabels[place.price_type]}</span>
              {place.rainy_day_ok && <span className="pill"><Umbrella className="size-4" />雨の日OK</span>}
            </div>
            <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">{place.name}</h1>
            <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft"><MapPin className="size-4 text-accent-strong" />{place.prefecture} {place.city}</p>
            {averageRating !== null && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="flex gap-0.5" aria-label={`5点中${averageRating.toFixed(1)}点`}>
                  {[1, 2, 3, 4, 5].map((value) => <Star key={value} className={`size-4 ${value <= Math.round(averageRating) ? "fill-amber-400 text-amber-400" : "text-line"}`} />)}
                </span>
                <strong className="text-ink">{averageRating.toFixed(1)}</strong>
                <span className="text-ink-soft">口コミ {place.reviews.length}件</span>
              </div>
            )}
          </div>
          <div className="mt-7 flex flex-wrap gap-2"><FavoriteButton placeId={place.id} /><ShareButtons name={place.name} url={canonicalUrl} compact /></div>
        </div>
      </section>

      <PlaceDecisionBrief place={place} />

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-7">
          {/* Time Out型 2ブロック: 意思決定に必要な問いをそのまま見出しに */}
          <section className="card-v2 p-5 sm:p-6">
            <h2 className="text-lg font-black text-ink">どんなとこ？</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-8 text-ink-soft">{whatIsIt(place)}</p>
            <h2 className="mt-6 text-lg font-black text-ink">なんで行くん？</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-8 text-ink-soft">{whyGo(place)}</p>
            {place.description && place.description.length > 140 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-bold text-accent-strong">くわしい紹介を読む</summary>
                <p className="mt-3 whitespace-pre-line text-sm leading-8 text-ink-soft">{place.description}</p>
              </details>
            )}
          </section>

          {/* 営業状況・営業時間・料金・クーポン・チケット・イベント・お知らせ */}
          <Suspense fallback={null}>
            <FacilityInfoSections place={place} />
          </Suspense>

          <Suspense fallback={<PlaceEnrichmentSkeleton />}>
            <PlaceEnrichmentSection place={place} />
          </Suspense>

          <section className="rounded-[24px] border border-line bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black text-ink">行く前に確認</h2>
            <dl className="mt-4 divide-y divide-line">
              <InfoRow icon={MapPin} label="住所" value={place.address} />
              <InfoRow icon={Clock3} label="営業時間" value={place.opening_hours ?? "要確認"} caution={!place.opening_hours} />
              <InfoRow icon={BadgeJapaneseYen} label="料金" value={`${priceLabels[place.price_type]}${place.price_note ? `（${place.price_note}）` : ""}`} />
              <InfoRow icon={Baby} label="対象年齢" value={place.target_ages.length ? place.target_ages.map((age) => ageLabels[age] ?? age).join("・") : "要確認"} caution={!place.target_ages.length} />
              <InfoRow icon={CalendarClock} label="平均滞在時間" value={place.average_stay_minutes ? `約${place.average_stay_minutes}分` : "要確認"} caution={!place.average_stay_minutes} />
            </dl>
            {place.last_verified_at && <p className="mt-4 text-xs text-ink-soft">情報確認日: {new Date(place.last_verified_at).toLocaleDateString("ja-JP")}</p>}
          </section>

          {facilityItems.length > 0 && (
            <section className="rounded-[24px] border border-line bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-black text-ink">設備・対応</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {facilityItems.map(([Icon, label]) => <div key={label} className="flex items-center gap-2 rounded-2xl bg-mint-soft px-3 py-3 text-sm font-bold text-positive"><Icon className="size-5" />{label}</div>)}
              </div>
            </section>
          )}

          <section className="rounded-[24px] border border-line bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-black text-ink">口コミ</h2><p className="mt-1 text-sm text-ink-soft">実際に訪れた人の記録です。</p></div><span className="text-sm font-bold text-ink-soft">{place.reviews.length}件</span></div>
            {place.reviews.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-surface px-4 py-5 text-center text-sm text-ink-soft">まだ口コミがありません。最初の記録を残してみませんか。</p>
            ) : (
              <div className="mt-4 space-y-3">
                {place.reviews.map((review) => (
                  <article key={review.id} className="rounded-2xl border border-line p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex">{[1, 2, 3, 4, 5].map((value) => <Star key={value} className={`size-4 ${value <= review.rating ? "fill-amber-400 text-amber-400" : "text-line"}`} />)}</span>
                      <strong className="text-sm text-ink">{review.user_name}</strong>
                      <time className="ml-auto text-xs text-ink-soft">{new Date(review.created_at).toLocaleDateString("ja-JP")}</time>
                    </div>
                    {(review.child_age || review.visited_at) && <p className="mt-2 text-xs text-ink-soft">{[review.child_age, review.visited_at].filter(Boolean).join(" · ")}</p>}
                    {review.comment && <p className="mt-3 text-sm leading-7 text-ink-soft">{review.comment}</p>}
                    {review.image_url && <img src={review.image_url} alt="口コミに投稿された写真" width={960} height={640} loading="lazy" decoding="async" className="mt-3 max-h-72 w-full rounded-xl object-cover" />}
                  </article>
                ))}
              </div>
            )}
            <div className="mt-6"><h3 className="mb-3 font-bold text-ink">訪れたときの様子を残す</h3><ReviewForm placeId={place.id} /></div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card-v2 overflow-hidden">
            {mapEmbed ? <iframe title={`${place.name}周辺の地図`} src={mapEmbed} className="h-56 w-full border-0" loading="lazy" /> : <div className="grid h-48 place-items-center bg-canvas text-sm text-ink-soft">地図座標は要確認です</div>}
            <div className="p-4"><p className="text-sm font-bold text-ink">{place.address}</p><a href={mapUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-3 w-full">経路を開く<Navigation className="size-4" /></a></div>
          </section>
          <ExternalLinksModule place={place} />
        </aside>
      </div>

      <Suspense fallback={null}>
        <NearbyFacilities place={place} />
      </Suspense>

      <div className="mt-10 border-t border-line pt-5">
        <CorrectionRequestForm placeId={place.id} />
      </div>

      <div className="place-sticky-action fixed inset-x-0 bottom-[68px] z-30 px-4 py-3 backdrop-blur md:bottom-0">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {/* 375px でラベル付き3ボタンは収まらないため、モバイルはアイコンのみにする */}
          <div className="sm:hidden flex items-center gap-3">
            <FavoriteButton placeId={place.id} compact />
            <VisitToggle placeId={place.id} compact />
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <FavoriteButton placeId={place.id} />
            <VisitToggle placeId={place.id} />
          </div>
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 whitespace-nowrap">ここに行く<Navigation className="size-4" /></a>
        </div>
      </div>
    </main>
  )
}

function InfoRow({ icon: Icon, label, value, caution = false }: { icon: typeof MapPin; label: string; value: string; caution?: boolean }) {
  return <div className="grid grid-cols-[24px_100px_1fr] gap-3 py-4"><Icon className="mt-0.5 size-5 text-positive" /><dt className="text-sm font-bold text-ink-soft">{label}</dt><dd className={`text-sm font-semibold ${caution ? "text-amber-700" : "text-ink"}`}>{value}</dd></div>
}

function createMapEmbed(latitude: number, longitude: number) {
  const offset = 0.018
  const bbox = [longitude - offset, latitude - offset / 2, longitude + offset, latitude + offset / 2].join("%2C")
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`
}
