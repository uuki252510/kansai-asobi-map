export const dynamic = 'force-dynamic'

import { notFound } from "next/navigation"
import Link from "next/link"
import { getPlaceById, getPlaces } from "@/lib/places"
import ReviewForm from "./ReviewForm"
import ShareButtons from "./ShareButtons"
import FavoriteButton from "./FavoriteButton"
import PlaceCard from "@/components/PlaceCard"
import { Badge } from "@/components/ui/badge"

interface Props {
  params: Promise<{ id: string }>
}

const indoorLabels: Record<string, string> = {
  indoor: "屋内",
  outdoor: "屋外",
  both: "屋内外",
}
const priceLabels: Record<string, string> = {
  free: "無料",
  paid: "有料",
  mixed: "一部有料",
}
const ageLabels: Record<string, string> = {
  "0-2": "0〜2歳",
  "3-5": "3〜5歳",
  "6-12": "小学生(6〜12歳)",
}

export default async function PlaceDetailPage({ params }: Props) {
  const { id } = await params
  const place = await getPlaceById(id)

  if (!place) notFound()

  const avgRating =
    place.reviews.length
      ? place.reviews.reduce((s, r) => s + r.rating, 0) / place.reviews.length
      : null

  const nearby = await getPlaces({ prefecture: place.prefecture })
    .then(ps => ps.filter(p => p.id !== place.id).slice(0, 3))
    .catch(() => [])

  const googleMapUrl =
    place.google_map_url ??
    `https://maps.google.com/?q=${encodeURIComponent(place.address)}`

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-28">
      {/* Back */}
      <Link href="/places" className="text-sm text-primary hover:underline flex items-center gap-1 mb-5">
        ← 遊び場一覧に戻る
      </Link>

      {/* Hero image */}
      <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden bg-muted mb-6 shadow-sm">
        {place.image_url ? (
          <img
            src={place.image_url}
            alt={place.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl">🌳</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-4 left-4 flex gap-2 flex-wrap">
          <span className="bg-white/90 text-xs font-bold px-3 py-1 rounded-full">
            {indoorLabels[place.indoor_type]}
          </span>
          {place.rainy_day_ok && (
            <span className="bg-blue-500/90 text-white text-xs font-bold px-3 py-1 rounded-full">
              ☔ 雨の日OK
            </span>
          )}
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            place.price_type === "free"
              ? "bg-green-500/90 text-white"
              : "bg-white/90 text-gray-700"
          }`}>
            {priceLabels[place.price_type]}
          </span>
        </div>
      </div>

      {/* Title + rating */}
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-foreground mb-1">{place.name}</h1>
        <p className="text-muted-foreground text-sm">
          📍 {place.prefecture} {place.city}
        </p>
        {avgRating !== null && (
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map(n => (
              <span key={n} className={n <= Math.round(avgRating) ? "text-yellow-400" : "text-gray-200"}>★</span>
            ))}
            <span className="text-sm font-bold ml-1">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({place.reviews.length}件の口コミ)</span>
          </div>
        )}
      </div>

      {/* 判断サマリー — 「今日行けるか」をタイトル直下で即判断 */}
      <div className="flex flex-wrap gap-2 mb-5">
        <SummaryBadge
          label={priceLabels[place.price_type] + (place.price_note ? `（${place.price_note}）` : "")}
          className={place.price_type === "free" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"}
        />
        <SummaryBadge label={`🕐 ${place.opening_hours ?? "営業時間要確認"}`}
          className={place.opening_hours ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-orange-50 text-orange-700 border-orange-200"}
        />
        {place.target_ages.length > 0 && (
          <SummaryBadge
            label={`👧 ${place.target_ages.map(a => ageLabels[a] ?? a).join("・")}`}
            className="bg-purple-50 text-purple-700 border-purple-200"
          />
        )}
        {place.rainy_day_ok && <SummaryBadge label="☔ 雨の日OK" className="bg-blue-50 text-blue-700 border-blue-200" />}
        {place.has_parking && <SummaryBadge label="🚗 駐車場あり" className="bg-gray-50 text-gray-700 border-gray-200" />}
        {place.has_nursing_room && <SummaryBadge label="🍼 授乳室あり" className="bg-pink-50 text-pink-700 border-pink-200" />}
        {place.has_diaper_space && <SummaryBadge label="👶 おむつ替え" className="bg-pink-50 text-pink-700 border-pink-200" />}
      </div>

      {/* Description */}
      {place.description && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-6 bg-muted rounded-xl p-4">
          {place.description}
        </p>
      )}

      {/* Info grid */}
      <div className="bg-white border border-border rounded-2xl divide-y divide-border mb-6 shadow-sm">
        <InfoRow icon="🏠" label="屋内/屋外" value={indoorLabels[place.indoor_type]} />
        <InfoRow icon="💰" label="料金" value={priceLabels[place.price_type] + (place.price_note ? `（${place.price_note}）` : "")} />
        <InfoRow icon="🕐" label="営業時間" value={place.opening_hours ?? "要確認"} />
        <InfoRow icon="📍" label="住所" value={place.address} />
        <InfoRow
          icon="👶"
          label="対象年齢"
          value={place.target_ages.map(a => ageLabels[a] ?? a).join("・") || "全年齢"}
        />
      </div>

      {/* Facilities badges */}
      <div className="flex flex-wrap gap-2 mb-6">
        {place.has_parking && <FeatureBadge icon="🚗" label="駐車場あり" />}
        {place.has_nursing_room && <FeatureBadge icon="🍼" label="授乳室あり" />}
        {place.has_diaper_space && <FeatureBadge icon="👶" label="おむつ替えスペース" />}
        {place.rainy_day_ok && <FeatureBadge icon="☔" label="雨の日OK" />}
      </div>

      {/* Favorite + Links */}
      <div className="flex flex-col gap-3 mb-8">
        <FavoriteButton placeId={place.id} />
        {place.website_url && (
          <a
            href={place.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[var(--brand-ink)] text-white font-bold py-3 rounded-full hover:opacity-90 transition-opacity shadow-sm"
          >
            <span>🌐</span>
            公式サイトを見る
          </a>
        )}
        <a
          href={googleMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-white border-2 border-primary text-primary font-bold py-3 rounded-full hover:bg-primary hover:text-white transition-colors shadow-sm"
        >
          <span>🗺️</span>
          Google マップで開く
        </a>
      </div>

      {/* Share */}
      <ShareButtons
        name={place.name}
        url={`https://kansai.asobi.nexia-llc.jp/places/${place.id}`}
      />

      {/* Reviews */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-foreground mb-4">
          口コミ
          {place.reviews.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-2">{place.reviews.length}件</span>
          )}
        </h2>
        {place.reviews.length === 0 ? (
          <p className="text-muted-foreground text-sm bg-muted rounded-xl p-5 text-center">
            まだ口コミがありません。行ったことがある方、ぜひ最初の一件を！
          </p>
        ) : (
          <div className="space-y-3">
            {place.reviews.map(r => (
              <div key={r.id} className="bg-white border border-border rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n} className={n <= r.rating ? "text-yellow-400" : "text-gray-200"}>★</span>
                    ))}
                  </div>
                  <span className="text-sm font-medium text-foreground">{r.user_name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(r.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                {(r.child_age || r.visited_at) && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {r.child_age && (
                      <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-[0.7rem] font-medium text-purple-700">
                        👶 {r.child_age}
                      </span>
                    )}
                    {r.visited_at && (
                      <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-[0.7rem] font-medium text-sky-700">
                        📅 {r.visited_at}
                      </span>
                    )}
                  </div>
                )}
                {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                {r.image_url && (
                  <img
                    src={r.image_url}
                    alt="口コミ画像"
                    className="mt-2 w-full max-w-xs rounded-xl object-cover border border-border"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-base font-bold text-foreground mb-3">次に行くママへ、ひと言残しませんか？</h3>
          <ReviewForm placeId={place.id} />
        </div>
      </section>

      {/* Nearby places */}
      {nearby.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">
            {place.prefecture}のほかの遊び場
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {nearby.map(p => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </div>
        </section>
      )}

      {/* 下部固定CTA — スクロール後も「行く」行動につながるバー */}
      <div className="fixed bottom-0 inset-x-0 z-50 border-t border-border/80 bg-white/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl gap-3">
          <a
            href={googleMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-primary py-3 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-white"
          >
            🗺️ 地図で開く
          </a>
          {place.website_url ? (
            <a
              href={place.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--brand-ink)] py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              🌐 公式サイト
            </a>
          ) : (
            <FavoriteButton placeId={place.id} />
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

function FeatureBadge({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 bg-secondary text-secondary-foreground text-xs font-medium px-3 py-1.5 rounded-full border border-border">
      {icon} {label}
    </span>
  )
}

function SummaryBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${className ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
      {label}
    </span>
  )
}
