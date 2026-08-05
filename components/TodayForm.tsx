"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ArrowLeft,
  Bike,
  Car,
  Check,
  LocateFixed,
  PersonStanding,
  TrainFront,
  Users,
} from "lucide-react"
import type { CompanionType, MoodTag } from "@/lib/supabase/database.types"
import {
  conditionsToSearchParams,
  type RecommendationConditions,
  type StayChoice,
  type TransportMode,
} from "@/lib/recommendation-engine"
import { trackEvent } from "@/lib/analytics"

const companionOptions: Array<[CompanionType, string]> = [
  ["solo", "一人"], ["couple", "カップル"], ["friends", "友達"],
  ["family", "家族"], ["children", "子ども"], ["multigenerational", "三世代"],
]
const moodOptions: Array<[MoodTag, string]> = [
  ["relax", "のんびり"], ["active", "アクティブ"], ["healing", "癒やされたい"],
  ["food", "おいしいもの"], ["shopping", "買い物"], ["photo", "写真"],
  ["kids", "子どもを遊ばせたい"], ["discovery", "新しい体験"], ["rain", "雨でも楽しみたい"],
]
const budgetOptions: Array<[number | null, string]> = [
  [0, "無料"], [1000, "1人1,000円以内"], [3000, "1人3,000円以内"], [5000, "1人5,000円以内"], [null, "指定なし"],
]
const travelOptions: Array<[number | null, string]> = [
  [15, "15分以内"], [30, "30分以内"], [60, "60分以内"], [90, "90分以内"], [null, "指定なし"],
]
const stayOptions: Array<[StayChoice, string]> = [
  ["hour", "1時間"], ["half-day", "半日"], ["day", "1日"], ["evening", "夕方から"], ["night", "夜だけ"],
]
const transportOptions: Array<[TransportMode, string, typeof Car]> = [
  ["car", "車", Car], ["train", "電車", TrainFront], ["walk", "徒歩", PersonStanding], ["bicycle", "自転車", Bike],
]
const detailOptions: Array<[string, string]> = [
  ["indoor", "屋内"], ["outdoor", "屋外"], ["parking", "駐車場"], ["rainy", "雨天対応"],
  ["stroller", "ベビーカー"], ["nursing", "授乳室"], ["diaper", "おむつ交換台"], ["barrierFree", "バリアフリー"],
  ["pet", "ペット同伴"], ["free", "無料"], ["noReservation", "予約不要"], ["sameDay", "当日予約可能"],
  ["meal", "食事あり"], ["quiet", "混雑を避けたい"],
]

export default function TodayForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [locationStatus, setLocationStatus] = useState("現在地は結果表示時に確認します")
  const [conditions, setConditions] = useState<RecommendationConditions>({
    companion: "family",
    moods: ["kids"],
    budgetMax: 3000,
    travelMinutes: 30,
    stay: "half-day",
    transport: "car",
    details: [],
    latitude: null,
    longitude: null,
  })

  useEffect(() => {
    trackEvent("recommendation_started", { source: "today" })
  }, [])

  function toggleMood(value: MoodTag) {
    setConditions((current) => {
      const moods = current.moods.includes(value)
        ? current.moods.filter((item) => item !== value)
        : [...current.moods, value]
      return { ...current, moods: moods.length > 0 ? moods : [value] }
    })
  }

  function toggleDetail(value: string) {
    setConditions((current) => ({
      ...current,
      details: current.details.includes(value)
        ? current.details.filter((item) => item !== value)
        : [...current.details, value],
    }))
  }

  function finish(next: RecommendationConditions) {
    trackEvent("recommendation_conditions_completed", {
      companion: next.companion,
      mood_count: next.moods.length,
      detail_count: next.details.length,
      has_location: next.latitude !== null,
    })
    router.push(`/recommend?${conditionsToSearchParams(next).toString()}`)
  }

  function submit() {
    setSubmitting(true)
    if (!navigator.geolocation) {
      finish(conditions)
      return
    }
    setLocationStatus("現在地を確認しています…")
    let settled = false
    const fallback = window.setTimeout(() => {
      if (settled) return
      settled = true
      setLocationStatus("現在地なしで提案します")
      finish(conditions)
    }, 3500)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (settled) return
        settled = true
        clearTimeout(fallback)
        finish({ ...conditions, latitude: position.coords.latitude, longitude: position.coords.longitude })
      },
      () => {
        if (settled) return
        settled = true
        clearTimeout(fallback)
        setLocationStatus("位置情報を使わずに提案します")
        finish(conditions)
      },
      { timeout: 3000, maximumAge: 30 * 60 * 1000 },
    )
  }

  return (
    <main className="today-form-page page-shell py-7 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Make today's plan</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.055em] sm:text-5xl">今日の行き先を、3ステップで。</h1>
            <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">最初から選択済みなので、そのまま進んでも大丈夫です。約30秒で完了します。</p>
          </div>
          <div className="today-progress" aria-label={`3ステップ中${step}ステップ目`}>
            <div className="flex items-center justify-between gap-4 text-xs font-black">
              <span>STEP {step} / 3</span>
              <span>{Math.round((step / 3) * 100)}%</span>
            </div>
            <div className="today-progress-track" aria-hidden="true">
              <span style={{ width: `${(step / 3) * 100}%` }} />
            </div>
          </div>
        </div>

        <div id="today-form" className="mt-7" aria-live="polite">
          {step === 1 && (
            <div className="grid gap-4">
              <div className="today-step-intro">
                <span>01</span>
                <div><p>まずは、今日のメンバーと気分</p><small>気分は複数選べます</small></div>
              </div>
              <OptionSection number="01" title="誰と行きますか？">
                {companionOptions.map(([value, label]) => <Option key={value} selected={conditions.companion === value} onClick={() => setConditions((current) => ({ ...current, companion: value }))}>{label}</Option>)}
              </OptionSection>
              <OptionSection number="02" title="どんな気分ですか？" description="複数選べます">
                {moodOptions.map(([value, label]) => <Option key={value} selected={conditions.moods.includes(value)} onClick={() => toggleMood(value)}>{label}</Option>)}
              </OptionSection>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4">
              <div className="today-step-intro">
                <span>02</span>
                <div><p>移動と過ごし方を決める</p><small>初期値のままでも提案できます</small></div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <OptionSection number="03" title="予算">
                  {budgetOptions.map(([value, label]) => <Option key={String(value)} selected={conditions.budgetMax === value} onClick={() => setConditions((current) => ({ ...current, budgetMax: value }))}>{label}</Option>)}
                </OptionSection>
                <OptionSection number="04" title="移動時間">
                  {travelOptions.map(([value, label]) => <Option key={String(value)} selected={conditions.travelMinutes === value} onClick={() => setConditions((current) => ({ ...current, travelMinutes: value }))}>{label}</Option>)}
                </OptionSection>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <OptionSection number="05" title="滞在時間">
                  {stayOptions.map(([value, label]) => <Option key={value} selected={conditions.stay === value} onClick={() => setConditions((current) => ({ ...current, stay: value }))}>{label}</Option>)}
                </OptionSection>
                <OptionSection number="06" title="移動手段">
                  {transportOptions.map(([value, label, Icon]) => <Option key={value} selected={conditions.transport === value} onClick={() => setConditions((current) => ({ ...current, transport: value }))}><Icon className="size-4" />{label}</Option>)}
                </OptionSection>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4">
              <div className="today-step-intro">
                <span>03</span>
                <div><p>最後に、外せない条件だけ</p><small>何も選ばなくても大丈夫です</small></div>
              </div>
              <OptionSection number="07" title="詳しい希望" description="必要なものだけ選択">
                {detailOptions.map(([value, label]) => <Option key={value} selected={conditions.details.includes(value)} onClick={() => toggleDetail(value)}>{label}</Option>)}
              </OptionSection>
              <aside className="today-summary" aria-label="選択内容の確認">
                <p className="text-xs font-black tracking-[0.12em] text-[var(--color-primary-dark)]">YOUR PLAN</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="chip is-green">{companionOptions.find(([value]) => value === conditions.companion)?.[1]}</span>
                  {conditions.moods.slice(0, 3).map((mood) => <span key={mood} className="chip">{moodOptions.find(([value]) => value === mood)?.[1]}</span>)}
                  <span className="chip">{conditions.travelMinutes ? `${conditions.travelMinutes}分以内` : "移動時間指定なし"}</span>
                  <span className="chip">{conditions.budgetMax === null ? "予算指定なし" : `${conditions.budgetMax.toLocaleString()}円以内`}</span>
                </div>
              </aside>
            </div>
          )}
        </div>

        <div className="today-action-bar sticky bottom-20 z-20 mt-6 p-3 md:bottom-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 px-2 text-xs font-semibold text-[var(--color-text-secondary)]" aria-live="polite">
              <LocateFixed className="size-4 text-[var(--color-primary)]" />
              {step === 3 ? locationStatus : step === 1 ? "次は、予算と移動時間です" : "次は、外せない条件の確認です"}
            </div>
            <div className="flex items-center justify-end gap-2">
              {step > 1 && (
                <button type="button" onClick={() => setStep((current) => Math.max(1, current - 1) as 1 | 2 | 3)} className="btn-secondary min-w-28">
                  <ArrowLeft className="size-4" />戻る
                </button>
              )}
              {step < 3 ? (
                <button type="button" onClick={() => setStep((current) => Math.min(3, current + 1) as 1 | 2 | 3)} className="btn-primary min-w-44">
                  次へ進む<ArrowRight className="size-4" />
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={submitting} className="btn-primary min-w-56 disabled:cursor-wait disabled:opacity-70">
                  {submitting ? "3つに絞っています…" : <>おすすめ3件を見る<ArrowRight className="size-4" /></>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function OptionSection({ number, title, description, children }: { number: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card-v2 rounded-2xl p-4 sm:p-5">
      <div className="flex items-baseline gap-3">
        <span className="text-[0.65rem] font-black tracking-[0.12em] text-[var(--color-primary)]">{number}</span>
        <h2 className="text-base font-black">{title}</h2>
        {description && <span className="text-[0.68rem] font-semibold text-[var(--color-text-secondary)]">{description}</span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{children}</div>
    </section>
  )
}

function Option({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`pill ${selected ? "is-selected" : ""}`} aria-pressed={selected}>
      {selected && <Check className="size-3.5" />}{children}
    </button>
  )
}
