/**
 * admin 詳細編集 (営業時間/料金/分類/設備/公開・鮮度) のバリデーション。
 * フロント (FacilityEditor) とサーバー (details API) で同じルールを共有する。
 */

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const UUID_PATTERN = /^[0-9a-f-]{36}$/i

export interface HourSlotInput {
  opening_time: string // "09:00"
  closing_time: string
  last_entry_time?: string | null
}

export interface BusinessHourInput {
  day_of_week: number
  is_closed: boolean
  note?: string | null
  slots: HourSlotInput[]
}

export interface BusinessExceptionInput {
  date: string
  exception_type: "temporary_closure" | "special_open" | "shortened" | "year_end" | "maintenance"
  opening_time?: string | null
  closing_time?: string | null
  reason?: string | null
}

export interface PriceTierInput {
  tier: string
  price: number
  is_free: boolean
  conditions?: string | null
}

export interface PricePlanInput {
  plan_name: string
  plan_type?: string | null
  day_type?: "all" | "weekday" | "holiday" | null
  note?: string | null
  tiers: PriceTierInput[]
}

export interface AmenityInput {
  amenity_id: string
  available: boolean
  free_or_paid?: "free" | "paid" | null
  fee?: number | null
  location_note?: string | null
}

export interface FacilityDetailsPayload {
  business_hours: BusinessHourInput[]
  business_exceptions: BusinessExceptionInput[]
  price_plans: PricePlanInput[]
  category_ids: string[]
  primary_category_id: string | null
  tag_ids: string[]
  amenities: AmenityInput[]
  meta: {
    publication_status?: string
    catchphrase?: string | null
    short_description?: string | null
    seo_title?: string | null
    seo_description?: string | null
    is_temporarily_closed?: boolean
    confirmation_method?: string | null
    confirmation_source_url?: string | null
    mark_confirmed?: boolean
  }
}

const EXCEPTION_TYPES = new Set(["temporary_closure", "special_open", "shortened", "year_end", "maintenance"])
const TIERS = new Set(["infant", "toddler", "elementary", "junior_high", "high_school", "adult", "senior", "disabled", "companion", "group"])
const PLAN_TYPES = new Set(["admission", "timed", "day_pass", "coupon_ticket", "monthly", "annual_pass", "per_activity", "season", "weekday", "holiday"])
const PUBLICATION_STATUSES = new Set(["draft", "pending_review", "approved", "published", "suspended", "archived", "rejected"])

export function validateFacilityDetails(raw: unknown): { payload: FacilityDetailsPayload } | { error: string } {
  if (typeof raw !== "object" || raw === null) return { error: "payload must be an object" }
  const input = raw as Partial<FacilityDetailsPayload>

  const hours = Array.isArray(input.business_hours) ? input.business_hours : []
  for (const hour of hours) {
    if (typeof hour.day_of_week !== "number" || hour.day_of_week < 0 || hour.day_of_week > 6) {
      return { error: "曜日が不正です" }
    }
    if (!hour.is_closed) {
      for (const slot of hour.slots ?? []) {
        if (!TIME_PATTERN.test(slot.opening_time) || !TIME_PATTERN.test(slot.closing_time)) {
          return { error: `営業時間の形式が不正です (${slot.opening_time}〜${slot.closing_time})` }
        }
        if (slot.opening_time >= slot.closing_time) {
          return { error: `開店時刻は閉店時刻より前にしてください (${slot.opening_time}〜${slot.closing_time})` }
        }
        if (slot.last_entry_time && !TIME_PATTERN.test(slot.last_entry_time)) {
          return { error: "最終入場時刻の形式が不正です" }
        }
      }
    }
  }

  const exceptions = Array.isArray(input.business_exceptions) ? input.business_exceptions : []
  for (const exception of exceptions) {
    if (!DATE_PATTERN.test(exception.date)) return { error: "臨時営業/休業の日付形式が不正です" }
    if (!EXCEPTION_TYPES.has(exception.exception_type)) return { error: "臨時営業/休業の種別が不正です" }
    if (exception.opening_time && !TIME_PATTERN.test(exception.opening_time)) return { error: "臨時営業の開店時刻が不正です" }
    if (exception.closing_time && !TIME_PATTERN.test(exception.closing_time)) return { error: "臨時営業の閉店時刻が不正です" }
    if (exception.opening_time && exception.closing_time && exception.opening_time >= exception.closing_time) {
      return { error: "臨時営業の開店時刻は閉店時刻より前にしてください" }
    }
  }

  const plans = Array.isArray(input.price_plans) ? input.price_plans : []
  for (const plan of plans) {
    if (!plan.plan_name?.trim()) return { error: "料金プラン名は必須です" }
    if (plan.plan_type && !PLAN_TYPES.has(plan.plan_type)) return { error: "料金プラン種別が不正です" }
    for (const tier of plan.tiers ?? []) {
      if (!TIERS.has(tier.tier)) return { error: "料金区分が不正です" }
      if (!tier.is_free && (typeof tier.price !== "number" || !Number.isFinite(tier.price) || tier.price < 0)) {
        return { error: "料金は0以上の数値にしてください" }
      }
    }
  }

  const categoryIds = Array.isArray(input.category_ids) ? input.category_ids.filter((id) => UUID_PATTERN.test(id)) : []
  const tagIds = Array.isArray(input.tag_ids) ? input.tag_ids.filter((id) => UUID_PATTERN.test(id)) : []
  const amenities = (Array.isArray(input.amenities) ? input.amenities : []).filter((entry) =>
    UUID_PATTERN.test(entry.amenity_id),
  )
  for (const amenity of amenities) {
    if (amenity.fee !== null && amenity.fee !== undefined && (amenity.fee < 0 || !Number.isFinite(amenity.fee))) {
      return { error: "設備の料金は0以上にしてください" }
    }
  }

  const primaryCategoryId =
    typeof input.primary_category_id === "string" && categoryIds.includes(input.primary_category_id)
      ? input.primary_category_id
      : categoryIds[0] ?? null

  const metaInput = (input.meta ?? {}) as FacilityDetailsPayload["meta"]
  if (metaInput.publication_status && !PUBLICATION_STATUSES.has(metaInput.publication_status)) {
    return { error: "公開ステータスが不正です" }
  }

  return {
    payload: {
      business_hours: hours.map((hour) => ({
        day_of_week: hour.day_of_week,
        is_closed: Boolean(hour.is_closed),
        note: hour.note?.slice(0, 200) ?? null,
        slots: hour.is_closed ? [] : (hour.slots ?? []).map((slot) => ({
          opening_time: slot.opening_time,
          closing_time: slot.closing_time,
          last_entry_time: slot.last_entry_time || null,
        })),
      })),
      business_exceptions: exceptions.map((exception) => ({
        date: exception.date,
        exception_type: exception.exception_type,
        opening_time: exception.opening_time || null,
        closing_time: exception.closing_time || null,
        reason: exception.reason?.slice(0, 200) ?? null,
      })),
      price_plans: plans.map((plan) => ({
        plan_name: plan.plan_name.trim().slice(0, 80),
        plan_type: plan.plan_type || null,
        day_type: plan.day_type || null,
        note: plan.note?.slice(0, 400) ?? null,
        tiers: (plan.tiers ?? []).map((tier) => ({
          tier: tier.tier,
          price: tier.is_free ? 0 : Math.round(tier.price),
          is_free: Boolean(tier.is_free),
          conditions: tier.conditions?.slice(0, 200) ?? null,
        })),
      })),
      category_ids: [...new Set(categoryIds)],
      primary_category_id: primaryCategoryId,
      tag_ids: [...new Set(tagIds)],
      amenities,
      meta: {
        publication_status: metaInput.publication_status,
        catchphrase: metaInput.catchphrase?.slice(0, 120) ?? null,
        short_description: metaInput.short_description?.slice(0, 300) ?? null,
        seo_title: metaInput.seo_title?.slice(0, 120) ?? null,
        seo_description: metaInput.seo_description?.slice(0, 300) ?? null,
        is_temporarily_closed: Boolean(metaInput.is_temporarily_closed),
        confirmation_method: metaInput.confirmation_method?.slice(0, 80) ?? null,
        confirmation_source_url: metaInput.confirmation_source_url?.slice(0, 2000) ?? null,
        mark_confirmed: Boolean(metaInput.mark_confirmed),
      },
    },
  }
}
