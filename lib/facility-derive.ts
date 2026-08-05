import type {
  BusinessException,
  BusinessHour,
  PricePlan,
  PriceTierKind,
} from "@/lib/facility-types"
import { TIER_LABELS } from "@/lib/facility-types"

/**
 * 営業状況・料金目安・鮮度の導出ロジック (純関数・テスト対象)。
 * 「今日行って失敗しない」を支える中心部品。
 */

export type OpenState = "open" | "closing_soon" | "closed_now" | "closed_today" | "unknown"

export interface TodayStatus {
  state: OpenState
  label: string
  /** 本日の営業時間帯 (表示用 "09:00〜17:00") */
  todaySlots: string[]
  note: string | null
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * 本日の営業状況を判定する。
 * 優先順: 臨時休業/特別営業 (exceptions) → 曜日別営業時間 → 不明
 */
export function todayBusinessStatus(
  hours: BusinessHour[],
  exceptions: BusinessException[],
  now: Date = new Date(),
): TodayStatus {
  const today = dateKey(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  // 1) 例外日 (臨時休業・特別営業・短縮)
  const exception = exceptions.find((entry) => entry.date === today)
  if (exception) {
    if (exception.exception_type === "temporary_closure" || exception.exception_type === "maintenance" || exception.exception_type === "year_end") {
      return { state: "closed_today", label: "本日は休業", todaySlots: [], note: exception.reason ?? exception.notice }
    }
    if (exception.opening_time && exception.closing_time) {
      const open = toMinutes(exception.opening_time)
      const close = toMinutes(exception.closing_time)
      const slotLabel = `${formatTime(exception.opening_time)}〜${formatTime(exception.closing_time)}`
      if (nowMinutes < open) return { state: "closed_now", label: `本日 ${slotLabel}`, todaySlots: [slotLabel], note: exception.notice }
      if (nowMinutes >= close) return { state: "closed_now", label: "本日の営業は終了", todaySlots: [slotLabel], note: exception.notice }
      if (close - nowMinutes <= 60) return { state: "closing_soon", label: `まもなく閉館 (〜${formatTime(exception.closing_time)})`, todaySlots: [slotLabel], note: exception.notice }
      return { state: "open", label: `営業中 (〜${formatTime(exception.closing_time)})`, todaySlots: [slotLabel], note: exception.notice }
    }
  }

  // 2) 曜日別 (有効期間内のもの)
  const dayHours = hours.filter((hour) => {
    if (hour.day_of_week !== now.getDay()) return false
    if (hour.valid_from && today < hour.valid_from) return false
    if (hour.valid_until && today > hour.valid_until) return false
    return true
  })
  if (dayHours.length === 0) return { state: "unknown", label: "営業時間は要確認", todaySlots: [], note: null }

  const closedRow = dayHours.find((hour) => hour.is_closed)
  const openRows = dayHours.filter((hour) => !hour.is_closed && hour.slots.length > 0)
  if (openRows.length === 0) {
    if (closedRow) return { state: "closed_today", label: "本日は定休日", todaySlots: [], note: closedRow.note }
    return { state: "unknown", label: "営業時間は要確認", todaySlots: [], note: null }
  }

  const slots = openRows
    .flatMap((hour) => hour.slots)
    .sort((a, b) => toMinutes(a.opening_time) - toMinutes(b.opening_time))
  const todaySlots = slots.map((slot) => `${formatTime(slot.opening_time)}〜${formatTime(slot.closing_time)}`)

  for (const slot of slots) {
    const open = toMinutes(slot.opening_time)
    const close = toMinutes(slot.closing_time)
    if (nowMinutes >= open && nowMinutes < close) {
      if (close - nowMinutes <= 60) {
        return { state: "closing_soon", label: `まもなく閉館 (〜${formatTime(slot.closing_time)})`, todaySlots, note: openRows[0].note }
      }
      return { state: "open", label: `営業中 (〜${formatTime(slot.closing_time)})`, todaySlots, note: openRows[0].note }
    }
  }

  const firstOpen = toMinutes(slots[0].opening_time)
  if (nowMinutes < firstOpen) {
    return { state: "closed_now", label: `本日 ${todaySlots[0]} 営業`, todaySlots, note: openRows[0].note }
  }
  return { state: "closed_now", label: "本日の営業は終了", todaySlots, note: openRows[0].note }
}

export interface PriceSummary {
  isFree: boolean
  minChild: number | null
  minAdult: number | null
  /** 「子ども500円〜 / 大人1,200円〜」「入場無料」など */
  label: string
}

const CHILD_TIERS: PriceTierKind[] = ["infant", "toddler", "elementary", "junior_high"]
const ADULT_TIERS: PriceTierKind[] = ["high_school", "adult"]

/**
 * 料金プラン群から最安の子ども/大人料金と代表表示を算出する。
 */
export function priceSummary(plans: PricePlan[], today: string | null = null): PriceSummary {
  const activePlans = plans.filter((plan) => {
    if (!today) return true
    if (plan.valid_from && today < plan.valid_from) return false
    if (plan.valid_until && today > plan.valid_until) return false
    return true
  })
  const tiers = activePlans.flatMap((plan) => plan.tiers)
  if (tiers.length === 0) return { isFree: false, minChild: null, minAdult: null, label: "" }

  const allFree = tiers.every((tier) => tier.is_free || tier.price === 0)
  if (allFree) return { isFree: true, minChild: 0, minAdult: 0, label: "入場無料" }

  const minFor = (kinds: PriceTierKind[]): number | null => {
    const prices = tiers
      .filter((tier) => kinds.includes(tier.tier))
      .map((tier) => (tier.is_free ? 0 : tier.price))
    return prices.length > 0 ? Math.min(...prices) : null
  }

  const minChild = minFor(CHILD_TIERS)
  const minAdult = minFor(ADULT_TIERS)
  const hasFreeTier = tiers.some((tier) => tier.is_free || tier.price === 0)

  const parts: string[] = []
  if (minChild !== null) parts.push(minChild === 0 ? "子ども無料" : `子ども${minChild.toLocaleString("ja-JP")}円〜`)
  if (minAdult !== null) parts.push(minAdult === 0 ? "大人無料" : `大人${minAdult.toLocaleString("ja-JP")}円〜`)
  if (parts.length === 0) {
    const min = Math.min(...tiers.map((tier) => (tier.is_free ? 0 : tier.price)))
    parts.push(min === 0 ? "一部無料" : `${min.toLocaleString("ja-JP")}円〜`)
  }
  let label = parts.join(" / ")
  if (hasFreeTier && !allFree && minChild !== 0 && minAdult !== 0) label += "（一部無料あり）"
  return { isFree: false, minChild, minAdult, label }
}

export function tierLabel(tier: PriceTierKind): string {
  return TIER_LABELS[tier] ?? tier
}

export type FreshnessStatus = "fresh" | "stale_30" | "stale_90" | "unknown"

/**
 * 情報鮮度: 30日/90日で段階判定。「今日行って失敗しない」の信頼表示。
 */
export function freshnessStatus(lastConfirmedAt: string | null, now: Date = new Date()): FreshnessStatus {
  if (!lastConfirmedAt) return "unknown"
  const confirmed = new Date(lastConfirmedAt)
  if (Number.isNaN(confirmed.getTime())) return "unknown"
  const days = (now.getTime() - confirmed.getTime()) / 86_400_000
  if (days <= 30) return "fresh"
  if (days <= 90) return "stale_30"
  return "stale_90"
}

export const FRESHNESS_LABELS: Record<FreshnessStatus, string> = {
  fresh: "最新",
  stale_30: "30日以上未確認",
  stale_90: "90日以上未確認",
  unknown: "要確認",
}

/**
 * slug生成: 英数はそのまま、和文はローマ字化せず短縮ID方式で衝突回避。
 */
export function generateSlug(name: string, fallbackId?: string): string {
  const ascii = name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
  if (ascii.length >= 3) return ascii.slice(0, 60)
  const suffix = fallbackId ? fallbackId.replace(/-/g, "").slice(0, 8) : Math.abs(hashCode(name)).toString(36)
  return `spot-${suffix}`
}

function hashCode(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return hash
}
