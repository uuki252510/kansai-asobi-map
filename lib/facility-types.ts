/**
 * 施設データベース拡張の型定義 (migrations 20260805100000〜100002)。
 * places = facilities。既存の Place 型 (database.types.ts) を中心に拡張する。
 */

export type PublicationStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "published"
  | "suspended"
  | "archived"
  | "rejected"

export interface Category {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  parent_id: string | null
  sort_order: number
  is_active: boolean
  seo_title: string | null
  seo_description: string | null
}

export interface Tag {
  id: string
  slug: string
  name: string
  group_id: string | null
  sort_order: number
  is_filterable: boolean
  is_indexable: boolean
  is_active: boolean
  canonical_tag_id: string | null
}

export interface Amenity {
  id: string
  slug: string
  name: string
  category: string | null
  sort_order: number
}

export interface FacilityAmenity {
  amenity_id: string
  available: boolean
  free_or_paid: "free" | "paid" | null
  fee: number | null
  location_note: string | null
  usage_note: string | null
  amenity?: Amenity
}

export interface BusinessHour {
  id: string
  place_id: string
  day_of_week: number // 0=日曜
  is_closed: boolean
  note: string | null
  valid_from: string | null
  valid_until: string | null
  slots: BusinessHourSlot[]
}

export interface BusinessHourSlot {
  id: string
  opening_time: string // "09:00:00"
  closing_time: string
  last_entry_time: string | null
  sort_order: number
}

export type ExceptionType =
  | "temporary_closure"
  | "special_open"
  | "shortened"
  | "year_end"
  | "maintenance"

export interface BusinessException {
  id: string
  place_id: string
  date: string // "2026-08-05"
  exception_type: ExceptionType
  opening_time: string | null
  closing_time: string | null
  reason: string | null
  notice: string | null
}

export type PriceTierKind =
  | "infant"
  | "toddler"
  | "elementary"
  | "junior_high"
  | "high_school"
  | "adult"
  | "senior"
  | "disabled"
  | "companion"
  | "group"

export interface PricePlan {
  id: string
  place_id: string
  plan_name: string
  plan_type: string | null
  day_type: "all" | "weekday" | "holiday" | null
  duration_minutes: number | null
  valid_from: string | null
  valid_until: string | null
  reservation_required: boolean | null
  note: string | null
  sort_order: number
  tiers: PriceTier[]
}

export interface PriceTier {
  id: string
  tier: PriceTierKind
  price: number
  original_price: number | null
  is_free: boolean
  conditions: string | null
  sort_order: number
}

export interface FacilityMedia {
  id: string
  place_id: string
  media_type: string
  storage_path: string | null
  external_url: string | null
  alt_text: string | null
  caption: string | null
  is_primary: boolean
  sort_order: number
  status: "pending" | "approved" | "rejected"
}

export interface FacilityNews {
  id: string
  place_id: string
  title: string
  summary: string | null
  news_type: string
  published_at: string
  expires_at: string | null
  is_important: boolean
}

export interface Coupon {
  id: string
  place_id: string
  name: string
  description: string | null
  discount_type: "amount" | "percent" | "child_free" | "adult_free" | "gift" | "set_discount"
  discount_value: number | null
  valid_from: string | null
  valid_until: string | null
  display_code: string | null
  terms: string | null
  status: string
}

export interface Ticket {
  id: string
  place_id: string
  name: string
  provider_name: string | null
  external_ticket_url: string
  sale_price: number | null
  regular_price: number | null
  is_featured: boolean
  status: string
}

export interface FacilityEvent {
  id: string
  place_id: string | null
  name: string
  slug: string | null
  summary: string | null
  start_at: string
  end_at: string
  child_price: number | null
  adult_price: number | null
  reservation_required: boolean | null
  official_url: string | null
  status: string
}

export const TIER_LABELS: Record<PriceTierKind, string> = {
  infant: "乳児",
  toddler: "幼児",
  elementary: "小学生",
  junior_high: "中学生",
  high_school: "高校生",
  adult: "大人",
  senior: "シニア",
  disabled: "障がい者",
  companion: "同伴者",
  group: "団体",
}

export const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const

export const AGE_BAND_LABELS: Record<string, string> = {
  baby: "0〜1歳",
  toddler: "2〜3歳",
  preschool: "4〜6歳",
  elementary: "小学生",
  junior_high: "中学生",
  high_school: "高校生",
  adult: "大人",
  senior: "シニア",
}
