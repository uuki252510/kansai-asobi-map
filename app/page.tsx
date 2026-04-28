export const dynamic = "force-dynamic"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getRecommendedPlaces } from "@/lib/places"
import PlaceCard from "@/components/PlaceCard"
import HeroSearch from "@/components/HeroSearch"

const quickConditions = [
  { label: "☔ 雨の日OK", href: "/places?rainy_day_ok=true" },
  { label: "🏠 屋内あそび", href: "/places?indoor_type=indoor" },
  { label: "💰 入場無料", href: "/places?price_type=free" },
  { label: "🚗 駐車場あり", href: "/places?has_parking=true" },
  { label: "🍼 授乳室あり", href: "/places?has_nursing_room=true" },
  { label: "👶 0〜2歳向け", href: "/places?target_age=0-2" },
  { label: "👧 3〜5歳向け", href: "/places?target_age=3-5" },
  { label: "🎒 小学生向け", href: "/places?target_age=6-12" },
]

const areas = [
  {
    label: "大阪府",
    code: "OSAKA",
    description: "都市型の大型施設や商業施設が豊富。雨の日でも行きやすい",
    href: "/places?prefecture=大阪府",
  },
  {
    label: "兵庫県",
    code: "HYOGO",
    description: "海辺も山側も。子どもの好みで選びやすいエリア",
    href: "/places?prefecture=兵庫県",
  },
  {
    label: "京都府",
    code: "KYOTO",
    description: "街歩きと自然体験をゆっくり楽しめる",
    href: "/places?prefecture=京都府",
  },
  {
    label: "奈良県",
    code: "NARA",
    description: "広い公園や自然スポットで、のびのび過ごせる",
    href: "/places?prefecture=奈良県",
  },
  {
    label: "滋賀県",
    code: "SHIGA",
    description: "琵琶湖周辺の開放的なスポットが充実",
    href: "/places?prefecture=滋賀県",
  },
  {
    label: "和歌山県",
    code: "WAKAYAMA",
    description: "海と自然を満喫できる、日帰りにちょうどいい距離感",
    href: "/places?prefecture=和歌山県",
  },
]

export default async function Home() {
  const popular = await getRecommendedPlaces().catch(() => [])

  return (
    <main className="overflow-hidden">
      {/* ヒーロー — 検索ファースト */}
      <section className="px-4 pb-8 pt-8 sm:pt-12">
        <div className="mx-auto max-w-2xl">
          <div className="glass-panel relative overflow-hidden rounded-[32px] px-6 py-8 sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(140,190,230,0.18),transparent_40%),radial-gradient(circle_at_85%_10%,rgba(255,220,100,0.15),transparent_35%)]" />
            <div className="relative text-center">
              <p className="section-kicker">関西6府県 · 子連れおでかけ専門</p>
              <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
                週末、子どもとどこ行く？
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                雨の日・無料・授乳室など、<br className="sm:hidden" />前日・当日でもサッと使えます
              </p>
              <div className="mt-6 text-left">
                <HeroSearch />
              </div>
              {/* よく使う条件チップ */}
              <div className="mt-5">
                <p className="mb-3 text-[0.68rem] font-semibold tracking-[0.22em] text-muted-foreground">
                  よく使う条件から探す
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {quickConditions.map((condition) => (
                    <Link
                      key={condition.label}
                      href={condition.href}
                      className="inline-flex items-center rounded-full border border-border/80 bg-white/80 px-4 py-2 text-sm font-medium text-foreground transition-all hover:-translate-y-px hover:border-[var(--brand-clay)]/40 hover:shadow-sm"
                    >
                      {condition.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* エリアから選ぶ */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <p className="section-kicker">エリアから探す</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            どのエリアに行く？
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <Link
                key={area.label}
                href={area.href}
                className="surface-card group relative overflow-hidden rounded-[28px] px-5 py-5 transition-all duration-200 hover:border-[var(--brand-clay)]/35 hover:shadow-[0_22px_50px_-32px_rgba(26,33,52,0.42)]"
              >
                <div className="absolute right-4 top-4 text-[0.7rem] font-semibold tracking-[0.26em] text-muted-foreground/70">
                  {area.code}
                </div>
                <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--brand-clay),transparent_75%)] opacity-80" />
                <p className="section-kicker">府県</p>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                  {area.label}
                </h3>
                <p className="mt-3 max-w-[18rem] text-sm leading-6 text-muted-foreground">
                  {area.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* おすすめスポット */}
      <section className="px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">各府県の人気スポット</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                おすすめスポット
              </h2>
            </div>
            <Link
              href="/places"
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/76 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[var(--brand-clay)]/35 hover:text-[var(--brand-clay)]"
            >
              全部見る
              <ArrowRight className="size-4" />
            </Link>
          </div>
          {popular.length === 0 ? (
            <div className="surface-card mt-6 rounded-[32px] px-6 py-16 text-center">
              <p className="text-lg font-semibold text-foreground">
                スポット情報を準備中です
              </p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                もうすぐ関西中の遊び場が登場します。お楽しみに！
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {popular.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA バナー */}
      <section className="px-4 pb-4 pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-[34px] border border-[var(--brand-ink)]/8 bg-[linear-gradient(135deg,rgba(24,28,43,0.96),rgba(51,64,92,0.94))] px-6 py-8 text-white shadow-[0_30px_80px_-42px_rgba(24,28,43,0.8)] sm:px-10 sm:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(140,190,230,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_30%)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[0.7rem] font-semibold tracking-[0.26em] text-white/60">
                  今週末の行き先、まだ決まってない？
                </p>
                <h2 className="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
                  条件を選ぶだけで、
                  <br />
                  <span className="font-heading text-[1.03em] text-[color:var(--brand-sand)]">
                    ぴったりの場所が見つかる。
                  </span>
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/72 sm:text-base">
                  雨でも晴れでも、近くでも遠くても。子どもに合った場所を、すぐ探せます。
                </p>
              </div>
              <Link
                href="/places"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[var(--brand-ink)] transition-transform duration-200 hover:-translate-y-px"
              >
                遊び場を探してみる
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
