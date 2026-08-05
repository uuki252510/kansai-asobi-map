import { Camera, ExternalLink, Images, Info, ShieldCheck } from "lucide-react"
import { getPlaceEnrichment } from "@/lib/place-enrichment"

interface PlaceIdentity {
  name: string
  city: string
  prefecture: string
}

export async function PlaceEnrichmentSection({ place }: { place: PlaceIdentity }) {
  const enrichment = await getPlaceEnrichment(place)
  if (!enrichment.wikipedia && enrichment.photos.length === 0) return null

  return (
    <section className="space-y-5 rounded-[24px] border border-line bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow"><Images className="size-3.5" />現地のイメージ</span>
          <h2 className="mt-2 text-xl font-black text-ink">写真で雰囲気をつかむ</h2>
          <p className="mt-1 text-sm text-ink-soft">公開写真から、場所の様子がわかるものを集めました。</p>
        </div>
        <span className="cargo-stock-label"><Camera className="size-3.5" />{enrichment.photos.length}枚</span>
      </div>

      {enrichment.photos.length > 0 && (
        <div className="place-photo-grid">
          {enrichment.photos.map((photo, index) => (
            <a
              key={photo.thumbnailUrl}
              href={photo.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`place-photo-tile ${index === 0 ? "is-primary" : ""}`}
              aria-label={`${photo.title}の出典をWikimedia Commonsで見る`}
            >
              <img
                src={photo.thumbnailUrl}
                alt={photo.description ?? `${place.name}の公開写真`}
                width={960}
                height={640}
                decoding="async"
                className="size-full object-cover"
                loading={index < 2 ? "eager" : "lazy"}
              />
              <span className="place-photo-credit">
                {photo.author ?? "Wikimedia contributor"} · {photo.license ?? "自由ライセンス"}
              </span>
            </a>
          ))}
        </div>
      )}

      {enrichment.wikipedia && (
        <div className="cargo-info-panel">
          <div className="flex items-start gap-3">
            <span className="cargo-info-icon"><Info className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black tracking-[0.12em] text-positive">WIKIPEDIA NOTE</p>
              <h3 className="mt-1 text-lg font-black text-ink">{enrichment.wikipedia.title}</h3>
              <p className="mt-3 text-sm leading-8 text-ink-soft">{enrichment.wikipedia.summary}</p>
              <a
                href={enrichment.wikipedia.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary mt-4"
              >
                出典ページを読む<ExternalLink className="size-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      <p className="flex items-start gap-2 text-[0.68rem] leading-5 text-ink-soft">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-positive" />
        写真はWikimedia Commonsの公開ファイルです。撮影者・ライセンスは各写真のリンク先で確認できます。営業時間や料金は変更されるため、公式サイトもあわせてご確認ください。
      </p>
    </section>
  )
}

export function PlaceEnrichmentSkeleton() {
  return (
    <section className="rounded-[24px] border border-line bg-white p-4 shadow-sm sm:p-6" aria-label="写真と追加情報を読み込み中">
      <div className="skeleton h-5 w-36" />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="skeleton col-span-2 aspect-[4/3]" />
        <div className="skeleton aspect-square" />
        <div className="skeleton aspect-square" />
      </div>
      <div className="skeleton mt-5 h-28 w-full" />
    </section>
  )
}
