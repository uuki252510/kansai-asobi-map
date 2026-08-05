/**
 * 単独イベント (夏祭り・花火大会など) の入力検証。
 * 施設ひも付きイベントの OffersEditor とは別に、会場情報を持てる。
 */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UUID_PATTERN = /^[0-9a-f-]{36}$/i
const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

export const EVENT_CATEGORIES = [
  "festival", "fireworks", "market", "workshop", "sale",
  "seasonal", "exhibition", "stage", "sports", "other",
] as const
export const EVENT_STATUSES = ["draft", "published", "archived", "cancelled"] as const
export const PREFECTURE_OPTIONS = ["大阪府", "兵庫県", "京都府", "奈良県", "滋賀県", "和歌山県"] as const

export interface EventPayload {
  name: string
  slug: string | null
  summary: string | null
  description: string | null
  event_category: (typeof EVENT_CATEGORIES)[number] | null
  place_id: string | null
  venue_name: string | null
  address: string | null
  prefecture: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  start_at: string
  end_at: string
  is_free: boolean
  child_price: number | null
  adult_price: number | null
  reservation_required: boolean | null
  official_url: string | null
  application_url: string | null
  organizer_name: string | null
  access_note: string | null
  rain_policy: string | null
  cover_external_url: string | null
  is_featured: boolean
  status: (typeof EVENT_STATUSES)[number]
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function numberOrNull(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

function httpUrl(value: unknown): string | null {
  const url = text(value, 2000)
  if (!url) return null
  return /^https?:\/\//.test(url) ? url : null
}

export function suggestEventSlug(name: string): string {
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
  const ascii = name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/^-|-$/g, "")
  return ascii.length >= 3 ? `${ascii.slice(0, 50)}-${stamp}` : `event-${stamp}-${Math.random().toString(36).slice(2, 7)}`
}

export function validateEvent(raw: unknown): { payload: EventPayload } | { error: string } {
  if (typeof raw !== "object" || raw === null) return { error: "payload must be an object" }
  const input = raw as Record<string, unknown>

  const name = text(input.name, 160)
  if (!name) return { error: "イベント名は必須です" }

  const startAt = text(input.start_at, 20)
  const endAt = text(input.end_at, 20)
  if (!startAt || !DATETIME_LOCAL_PATTERN.test(startAt)) return { error: "開始日時を入力してください" }
  if (!endAt || !DATETIME_LOCAL_PATTERN.test(endAt)) return { error: "終了日時を入力してください" }
  if (endAt < startAt) return { error: "終了日時は開始日時より後にしてください" }

  const slug = text(input.slug, 60)?.toLowerCase() ?? null
  if (slug && !SLUG_PATTERN.test(slug)) {
    return { error: "URLスラッグは英小文字・数字・ハイフンのみで入力してください" }
  }

  const status = EVENT_STATUSES.includes(input.status as never)
    ? (input.status as EventPayload["status"])
    : "draft"
  const category = EVENT_CATEGORIES.includes(input.event_category as never)
    ? (input.event_category as EventPayload["event_category"])
    : null

  const placeId = typeof input.place_id === "string" && UUID_PATTERN.test(input.place_id) ? input.place_id : null
  const venueName = text(input.venue_name, 120)
  const address = text(input.address, 200)
  // 単独イベントを公開するなら、どこでやるのか分かる情報が要る
  if (status === "published" && !placeId && !venueName && !address) {
    return { error: "公開するには会場名か住所、または対象スポットのどれかを入れてください" }
  }

  const official = input.official_url ? httpUrl(input.official_url) : null
  if (input.official_url && !official) return { error: "公式URLは http(s) から始めてください" }
  const application = input.application_url ? httpUrl(input.application_url) : null
  if (input.application_url && !application) return { error: "申込URLは http(s) から始めてください" }
  const cover = input.cover_external_url ? httpUrl(input.cover_external_url) : null
  if (input.cover_external_url && !cover) return { error: "画像URLは http(s) から始めてください" }

  const isFree = input.is_free === true
  const childPrice = isFree ? null : numberOrNull(input.child_price, 0, 1_000_000)
  const adultPrice = isFree ? null : numberOrNull(input.adult_price, 0, 1_000_000)

  const prefecture = PREFECTURE_OPTIONS.includes(input.prefecture as never)
    ? (input.prefecture as string)
    : null

  return {
    payload: {
      name,
      slug,
      summary: text(input.summary, 300),
      description: typeof input.description === "string" ? input.description.slice(0, 20_000) : null,
      event_category: category,
      place_id: placeId,
      venue_name: venueName,
      address,
      prefecture,
      city: text(input.city, 60),
      latitude: numberOrNull(input.latitude, 20, 50),
      longitude: numberOrNull(input.longitude, 120, 155),
      start_at: startAt,
      end_at: endAt,
      is_free: isFree,
      child_price: childPrice,
      adult_price: adultPrice,
      reservation_required: typeof input.reservation_required === "boolean" ? input.reservation_required : null,
      official_url: official,
      application_url: application,
      organizer_name: text(input.organizer_name, 120),
      access_note: text(input.access_note, 300),
      rain_policy: text(input.rain_policy, 200),
      cover_external_url: cover,
      is_featured: input.is_featured === true,
      status,
    },
  }
}
