/**
 * イベント / クーポン / チケットの入力検証。
 * admin フォームと API の両方から同じ関数を使う。
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

export interface EventInput {
  name: string
  summary?: string | null
  start_at: string // datetime-local
  end_at: string
  child_price?: number | null
  adult_price?: number | null
  reservation_required?: boolean
  official_url?: string | null
  status: "draft" | "published" | "archived" | "cancelled"
}

export interface CouponInput {
  name: string
  description?: string | null
  discount_type: "amount" | "percent" | "child_free" | "adult_free" | "gift" | "set_discount"
  discount_value?: number | null
  valid_from?: string | null
  valid_until?: string | null
  display_code?: string | null
  terms?: string | null
  status: "draft" | "published" | "expired" | "archived"
}

export interface TicketInput {
  name: string
  provider_name?: string | null
  external_ticket_url: string
  sale_price?: number | null
  regular_price?: number | null
  is_featured?: boolean
  status: "draft" | "published" | "expired" | "archived"
}

export interface OffersPayload {
  events: EventInput[]
  coupons: CouponInput[]
  tickets: TicketInput[]
}

const DISCOUNT_TYPES = new Set(["amount", "percent", "child_free", "adult_free", "gift", "set_discount"])
const EVENT_STATUSES = new Set(["draft", "published", "archived", "cancelled"])
const OFFER_STATUSES = new Set(["draft", "published", "expired", "archived"])

function optionalNumber(value: unknown, max = 10_000_000): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) return null
  return Math.round(parsed)
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  return /^https?:\/\//.test(value.trim()) ? value.trim().slice(0, 2000) : null
}

export function validateOffers(raw: unknown): { payload: OffersPayload } | { error: string } {
  if (typeof raw !== "object" || raw === null) return { error: "payload must be an object" }
  const input = raw as Partial<OffersPayload>

  const events: EventInput[] = []
  for (const event of Array.isArray(input.events) ? input.events : []) {
    if (!event.name?.trim()) return { error: "イベント名は必須です" }
    if (!DATETIME_LOCAL_PATTERN.test(event.start_at) || !DATETIME_LOCAL_PATTERN.test(event.end_at)) {
      return { error: `イベント「${event.name}」の日時形式が不正です` }
    }
    if (event.end_at < event.start_at) {
      return { error: `イベント「${event.name}」の終了日時は開始日時より後にしてください` }
    }
    if (!EVENT_STATUSES.has(event.status)) return { error: "イベントのステータスが不正です" }
    const url = event.official_url ? httpsUrl(event.official_url) : null
    if (event.official_url && !url) return { error: "イベントの公式URLは http(s) から始めてください" }
    events.push({
      name: event.name.trim().slice(0, 120),
      summary: event.summary?.slice(0, 500) ?? null,
      start_at: event.start_at,
      end_at: event.end_at,
      child_price: optionalNumber(event.child_price),
      adult_price: optionalNumber(event.adult_price),
      reservation_required: Boolean(event.reservation_required),
      official_url: url,
      status: event.status,
    })
  }

  const coupons: CouponInput[] = []
  for (const coupon of Array.isArray(input.coupons) ? input.coupons : []) {
    if (!coupon.name?.trim()) return { error: "クーポン名は必須です" }
    if (!DISCOUNT_TYPES.has(coupon.discount_type)) return { error: "割引タイプが不正です" }
    if (!OFFER_STATUSES.has(coupon.status)) return { error: "クーポンのステータスが不正です" }
    if (coupon.valid_from && !DATE_PATTERN.test(coupon.valid_from)) return { error: "クーポンの開始日形式が不正です" }
    if (coupon.valid_until && !DATE_PATTERN.test(coupon.valid_until)) return { error: "クーポンの終了日形式が不正です" }
    if (coupon.valid_from && coupon.valid_until && coupon.valid_until < coupon.valid_from) {
      return { error: `クーポン「${coupon.name}」の終了日は開始日より後にしてください` }
    }
    if (coupon.discount_type === "percent") {
      const value = optionalNumber(coupon.discount_value, 100)
      if (value === null) return { error: "パーセント割引は0〜100で入力してください" }
    }
    coupons.push({
      name: coupon.name.trim().slice(0, 120),
      description: coupon.description?.slice(0, 500) ?? null,
      discount_type: coupon.discount_type,
      discount_value: optionalNumber(coupon.discount_value, coupon.discount_type === "percent" ? 100 : 10_000_000),
      valid_from: coupon.valid_from || null,
      valid_until: coupon.valid_until || null,
      display_code: coupon.display_code?.trim().slice(0, 40) || null,
      terms: coupon.terms?.slice(0, 1000) ?? null,
      status: coupon.status,
    })
  }

  const tickets: TicketInput[] = []
  for (const ticket of Array.isArray(input.tickets) ? input.tickets : []) {
    if (!ticket.name?.trim()) return { error: "チケット名は必須です" }
    const url = httpsUrl(ticket.external_ticket_url)
    if (!url) return { error: `チケット「${ticket.name}」の購入URLは http(s) から始めてください` }
    if (!OFFER_STATUSES.has(ticket.status)) return { error: "チケットのステータスが不正です" }
    const salePrice = optionalNumber(ticket.sale_price)
    const regularPrice = optionalNumber(ticket.regular_price)
    if (salePrice !== null && regularPrice !== null && salePrice > regularPrice) {
      return { error: `チケット「${ticket.name}」の販売価格が通常価格を上回っています` }
    }
    tickets.push({
      name: ticket.name.trim().slice(0, 120),
      provider_name: ticket.provider_name?.trim().slice(0, 80) || null,
      external_ticket_url: url,
      sale_price: salePrice,
      regular_price: regularPrice,
      is_featured: Boolean(ticket.is_featured),
      status: ticket.status,
    })
  }

  return { payload: { events, coupons, tickets } }
}
