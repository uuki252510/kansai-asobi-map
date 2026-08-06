import type { Place } from "@/lib/supabase/database.types"

/**
 * 外部導線比較モジュール (Google Things to do型の非商用版)。
 * 「どこで何を確認するか」を目的ラベル付きの行で並べる。
 */
export default function ExternalLinksModule({ place }: { place: Place }) {
  const mapUrl =
    place.google_map_url ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`

  const rows = [
    { href: mapUrl, title: "Googleマップ", purpose: "経路・営業時間・混雑を確認" },
    place.website_url
      ? { href: place.website_url, title: "公式サイト", purpose: "料金・イベント・休業日の最新情報" }
      : null,
    place.latitude !== null && place.longitude !== null
      ? {
          href: `https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=16/${place.latitude}/${place.longitude}`,
          title: "OpenStreetMap",
          purpose: "周辺の様子を地図で確認",
        }
      : null,
  ].filter(Boolean) as Array<{ href: string; title: string; purpose: string }>

  return (
    <section className="card-v2 p-5 sm:p-6">
      <h2 className="text-lg font-black text-ink">出発前にチェック</h2>
      <div className="mt-3 divide-y divide-line">
        {rows.map((row) => (
          <a
            key={row.title}
            href={row.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-baseline gap-3 py-3.5 transition-colors duration-150 hover:bg-canvas"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-ink group-hover:text-accent-strong">{row.title}</span>
              <span className="mt-0.5 block text-xs text-ink-soft">{row.purpose}</span>
            </span>
            <span className="shrink-0 text-sm font-black text-ink-faint transition-transform duration-150 group-hover:translate-x-1 group-hover:text-accent-strong" aria-hidden>
              ↗
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}
