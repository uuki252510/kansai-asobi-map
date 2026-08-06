"use client"

import Link from "next/link"
import PlaceImage from "@/components/PlaceImage"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Check,
  Clock3,
  CloudSun,
  Heart,
  Map,
  MapPin,
  RefreshCw,
  Route,
  Share2,
  Users,
  Vote,
  WalletCards,
} from "lucide-react"
import type {
  RecommendationConditions,
  RecommendationResult,
  WeatherSnapshot,
} from "@/lib/recommendation-engine"
import { conditionsToSearchParams, MOOD_LABELS } from "@/lib/recommendation-engine"
import { useFavorites } from "@/lib/useFavorites"
import { trackEvent } from "@/lib/analytics"

const roleColors = ["#2dae85", "#55a977", "#d39a4c"]

export default function RecommendationResults({
  results,
  conditions,
  weather,
}: {
  results: RecommendationResult[]
  conditions: RecommendationConditions
  weather: WeatherSnapshot
}) {
  const router = useRouter()
  const { isFavorite, toggle } = useFavorites()
  const [decidedId, setDecidedId] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)

  useEffect(() => {
    trackEvent("recommendations_viewed", { ids: results.map((result) => result.place.id), weather: weather.condition })
  }, [results, weather.condition])

  const search = conditionsToSearchParams(conditions)
  const resultIds = results.map((result) => result.place.id)

  function regenerate() {
    search.set("exclude", resultIds.join(","))
    trackEvent("recommendations_regenerated", { excluded: resultIds })
    router.push(`/recommend?${search.toString()}`)
  }

  function decide(result: RecommendationResult) {
    const key = "kyodokoiko-outing-history"
    const existing = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[]
    const record = {
      id: crypto.randomUUID(),
      placeId: result.place.id,
      placeName: result.place.name,
      imageUrl: result.place.image_url,
      prefecture: result.place.prefecture,
      city: result.place.city,
      decidedAt: new Date().toISOString(),
      score: result.score,
      role: result.role,
    }
    window.localStorage.setItem(key, JSON.stringify([record, ...existing].slice(0, 50)))
    setDecidedId(result.place.id)
    trackEvent("outing_decided", { place_id: result.place.id, score: result.score })
    window.setTimeout(() => setDecidedId(null), 4500)
  }

  async function shareResults() {
    const url = window.location.href
    const shareData = {
      title: "デカケル 今日のおすすめ3件",
      text: `今日の候補は ${results.map((item) => item.place.name).join("・")} です。`,
      url,
    }
    try {
      if (navigator.share) await navigator.share(shareData)
      else await navigator.clipboard.writeText(url)
      setSharing(true)
      trackEvent("recommendations_shared", { ids: resultIds })
      window.setTimeout(() => setSharing(false), 2200)
    } catch {
      setSharing(false)
    }
  }

  async function createVote() {
    setVoteError(null)
    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", spot_ids: resultIds, title: "週末どこに行く？" }),
      })
      if (!response.ok) throw new Error()
      const data = (await response.json()) as { url: string }
      trackEvent("vote_created", { ids: resultIds })
      router.push(data.url)
    } catch {
      setVoteError("投票DBのmigration適用後に利用できます。3件の共有は今すぐ使えます。")
    }
  }

  if (results.length === 0) {
    return (
      <main className="page-shell py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-[var(--color-border)] bg-white p-8 text-center">
          <MapPin className="mx-auto size-9 text-[var(--color-primary)]" />
          <h1 className="mt-4 text-xl font-black">条件に合う場所が見つかりませんでした</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">選んだ気分と内容が一致しない場所は表示していません。条件をひとつ広げると候補が見つかりやすくなります。</p>
          <Link href="/today" className="btn-primary mt-6">条件を変更する</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="decision-page page-shell py-7 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="decision-board-header flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-kicker">Your three routes</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.055em] sm:text-5xl">今日の候補は、この{results.length}つ。</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)]">1番は条件との相性がもっとも高い候補です。移動・料金・過ごし方を横に見比べて決められます。</p>
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-black text-[var(--color-primary-dark)]"><Check className="size-4" />選んだ気分と内容が一致する場所だけを表示</p>
          </div>
          <div className="decision-filters flex max-w-xl flex-wrap gap-2">
            <span className="decision-count"><strong>{results.length}</strong><small>choices</small></span>
            {conditions.moods.map((mood) => <span key={mood} className="chip is-green">{MOOD_LABELS[mood]}</span>)}
            <span className="chip"><Users className="size-3" />{conditions.companion === "family" ? "家族" : "おでかけ"}</span>
            <span className="chip"><WalletCards className="size-3" />{conditions.budgetMax === null ? "予算指定なし" : `${conditions.budgetMax.toLocaleString()}円以内`}</span>
            <span className="chip"><Route className="size-3" />{conditions.travelMinutes === null ? "移動時間指定なし" : `${conditions.travelMinutes}分以内`}</span>
            <span className="chip"><CloudSun className="size-3" />{weather.conditionLabel}</span>
          </div>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          {results.map((result, index) => {
            const favorite = isFavorite(result.place.id)
            return (
              <article key={result.place.id} className="recommendation-card" style={{ animationDelay: `${index * 90}ms` }}>
                <div className="role-ribbon" style={{ background: roleColors[index] }}><span>{index + 1}</span>{result.role}</div>
                <button
                  type="button"
                  onClick={() => {
                    toggle(result.place.id)
                    if (!favorite) trackEvent("favorite_added", { place_id: result.place.id, source: "recommendation" })
                  }}
                  className="icon-button absolute right-3 top-3 z-[3] !border-white/70 !bg-white/90"
                  aria-label={favorite ? "お気に入りを解除" : "お気に入りに追加"}
                >
                  <Heart className={`size-4 transition-transform ${favorite ? "scale-110 fill-[var(--color-coral)] text-[var(--color-coral)]" : ""}`} />
                </button>
                <div className="aspect-[1.5/1] bg-[#edf1ee]">
                  <PlaceImage place={result.place} alt={result.place.name} className="spot-photo" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[0.65rem] font-bold text-[var(--color-text-secondary)]">{result.place.prefecture}・{result.place.city}</p>
                      <h2 className="mt-1.5 text-lg font-black leading-7 tracking-[-0.03em]">{result.place.name}</h2>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[0.6rem] font-bold text-[var(--color-text-secondary)]">今日の相性</p>
                      <p className="score-number mt-0.5 text-3xl font-black text-[var(--color-primary-dark)]">{result.score}<span className="ml-1 text-[0.62rem] tracking-normal text-[var(--color-text-secondary)]">/100</span></p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {result.matchedMoods.slice(0, 2).map((mood) => <span key={mood} className="chip is-green">{MOOD_LABELS[mood]}</span>)}
                    <span className="chip">{result.place.indoor_type === "indoor" ? "屋内" : result.place.indoor_type === "outdoor" ? "屋外" : "屋内外"}</span>
                    {result.place.rainy_day_ok && <span className="chip">雨の日OK</span>}
                    <span className="chip">{result.place.price_type === "free" ? "無料" : result.place.price_note ?? "料金要確認"}</span>
                  </div>

                  <p className="decision-reason mt-4 min-h-[6rem] rounded-xl p-3 text-xs font-medium leading-6">{result.reason}</p>

                  <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--color-border)] border-y border-[var(--color-border)] py-3 text-center">
                    <Meta Icon={Clock3} label={result.travelMinutes !== null ? `約${result.travelMinutes}分` : "要確認"} sublabel="移動" />
                    <Meta Icon={MapPin} label={result.distanceKm !== null ? `${result.distanceKm.toFixed(1)}km` : result.place.prefecture} sublabel="距離" />
                    <Meta Icon={WalletCards} label={result.place.price_type === "free" ? "無料" : "要確認"} sublabel="料金" />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link href={`/places/${result.place.id}`} className="btn-secondary">詳細を見る</Link>
                    <button type="button" onClick={() => decide(result)} className="btn-primary !min-h-11 !px-4 !text-xs">ここに決める<Check className="size-4" /></button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <div className="decision-actions mt-8 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={regenerate} className="pill"><RefreshCw className="size-4" />もう一度選ぶ</button>
          <Link href="/today" className="pill">条件を変更する</Link>
          <Link href={`/map?recommended=${resultIds.join(",")}`} className="pill"><Map className="size-4" />地図で見る</Link>
          <button type="button" onClick={shareResults} className="pill"><Share2 className="size-4" />{sharing ? "共有しました" : `${results.length}件を共有する`}</button>
          <button type="button" onClick={createVote} className="pill"><Vote className="size-4" />みんなで投票する</button>
        </div>
        {voteError && <p role="alert" className="mt-3 text-center text-xs font-semibold text-[#9c3d2e]">{voteError}</p>}
      </div>

      {decidedId && (
        <div className="fixed inset-x-4 bottom-24 z-[80] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-[var(--color-text)] px-4 py-3 text-white shadow-2xl md:bottom-8">
          <span className="flex size-9 items-center justify-center rounded-full bg-[var(--color-primary)]"><Check className="size-5" /></span>
          <div className="flex-1"><p className="text-sm font-black">今日の行き先に決めました！</p><p className="mt-0.5 text-[0.68rem] text-white/70">おでかけ記録に保存しました</p></div>
          <Link href="/history" className="text-xs font-black text-[#9fe1c6]">記録を見る<ArrowRight className="ml-1 inline size-3" /></Link>
        </div>
      )}
    </main>
  )
}

function Meta({ Icon, label, sublabel }: { Icon: typeof Clock3; label: string; sublabel: string }) {
  return (
    <div className="px-1"><Icon className="mx-auto size-4 text-[var(--color-primary)]" /><p className="mt-1 text-[0.7rem] font-black">{label}</p><p className="mt-0.5 text-[0.58rem] font-semibold text-[var(--color-text-secondary)]">{sublabel}</p></div>
  )
}
