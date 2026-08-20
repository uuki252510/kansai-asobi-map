import { supabase } from "@/lib/supabase/client"
import type {
  Amenity,
  BusinessException,
  BusinessHour,
  Category,
  Coupon,
  FacilityAmenity,
  FacilityEvent,
  FacilityNews,
  PricePlan,
  Tag,
  Ticket,
} from "@/lib/facility-types"

/**
 * 施設拡張データのアクセス層。
 * migration (20260805100000〜) 未適用の環境ではエラーを握りつぶして
 * 空データを返し、既存ページを壊さない。
 */

async function safeQuery<T>(run: () => PromiseLike<{ data: T | null; error: unknown }>, fallback: T): Promise<T> {
  try {
    const { data, error } = await run()
    if (error) return fallback
    return data ?? fallback
  } catch {
    return fallback
  }
}

export interface StationAccess {
  distance_meters: number | null
  walking_minutes: number | null
  route_description: string | null
  station: { id: string; name: string; line: { name: string; company_name: string | null } | null } | null
}

export interface FacilityDetails {
  categories: Category[]
  tags: Tag[]
  amenities: FacilityAmenity[]
  businessHours: BusinessHour[]
  businessExceptions: BusinessException[]
  pricePlans: PricePlan[]
  coupons: Coupon[]
  tickets: Ticket[]
  events: FacilityEvent[]
  news: FacilityNews[]
  stations: StationAccess[]
}

export const EMPTY_FACILITY_DETAILS: FacilityDetails = {
  categories: [],
  tags: [],
  amenities: [],
  businessHours: [],
  businessExceptions: [],
  pricePlans: [],
  coupons: [],
  tickets: [],
  events: [],
  news: [],
  stations: [],
}

/** 詳細ページ用に施設の拡張データを一括取得する */
export async function getFacilityDetails(placeId: string): Promise<FacilityDetails> {
  const today = new Date().toISOString().slice(0, 10)
  const [categories, tags, amenities, businessHours, businessExceptions, pricePlans, coupons, tickets, events, news, stations] =
    await Promise.all([
      safeQuery<Category[]>(
        () => supabase
          .from("facility_categories" as never)
          .select("category:categories(id,slug,name,description,icon,parent_id,sort_order,is_active,seo_title,seo_description)")
          .eq("place_id", placeId)
          .then((result) => ({
            data: ((result.data ?? []) as Array<{ category: Category | null }>)
              .map((row) => row.category)
              .filter((category): category is Category => Boolean(category)),
            error: result.error,
          })),
        [],
      ),
      safeQuery<Tag[]>(
        () => supabase
          .from("facility_tags" as never)
          .select("tag:tags(id,slug,name,group_id,sort_order,is_filterable,is_indexable,is_active,canonical_tag_id)")
          .eq("place_id", placeId)
          .then((result) => ({
            data: ((result.data ?? []) as Array<{ tag: Tag | null }>)
              .map((row) => row.tag)
              .filter((tag): tag is Tag => Boolean(tag) && tag!.canonical_tag_id === null),
            error: result.error,
          })),
        [],
      ),
      safeQuery<FacilityAmenity[]>(
        () => supabase
          .from("facility_amenities" as never)
          .select("amenity_id,available,free_or_paid,fee,location_note,usage_note,amenity:amenities(id,slug,name,category,sort_order)")
          .eq("place_id", placeId)
          .then((result) => ({ data: (result.data ?? []) as unknown as FacilityAmenity[], error: result.error })),
        [],
      ),
      safeQuery<BusinessHour[]>(
        () => supabase
          .from("facility_business_hours" as never)
          .select("id,place_id,day_of_week,is_closed,note,valid_from,valid_until,slots:facility_business_hour_slots(id,opening_time,closing_time,last_entry_time,sort_order)")
          .eq("place_id", placeId)
          .order("day_of_week")
          .then((result) => ({ data: (result.data ?? []) as unknown as BusinessHour[], error: result.error })),
        [],
      ),
      safeQuery<BusinessException[]>(
        () => supabase
          .from("facility_business_exceptions" as never)
          .select("id,place_id,date,exception_type,opening_time,closing_time,reason,notice")
          .eq("place_id", placeId)
          .gte("date", today)
          .order("date")
          .limit(30)
          .then((result) => ({ data: (result.data ?? []) as unknown as BusinessException[], error: result.error })),
        [],
      ),
      safeQuery<PricePlan[]>(
        () => supabase
          .from("facility_price_plans" as never)
          .select("id,place_id,plan_name,plan_type,day_type,duration_minutes,valid_from,valid_until,reservation_required,note,sort_order,tiers:facility_price_tiers(id,tier,price,original_price,is_free,conditions,sort_order)")
          .eq("place_id", placeId)
          .order("sort_order")
          .then((result) => ({ data: (result.data ?? []) as unknown as PricePlan[], error: result.error })),
        [],
      ),
      safeQuery<Coupon[]>(
        () => supabase
          .from("coupons" as never)
          .select("id,place_id,name,description,discount_type,discount_value,valid_from,valid_until,display_code,terms,status")
          .eq("place_id", placeId)
          .eq("status", "published")
          .then((result) => ({ data: (result.data ?? []) as unknown as Coupon[], error: result.error })),
        [],
      ),
      safeQuery<Ticket[]>(
        () => supabase
          .from("tickets" as never)
          .select("id,place_id,name,provider_name,external_ticket_url,sale_price,regular_price,is_featured,status")
          .eq("place_id", placeId)
          .eq("status", "published")
          .then((result) => ({ data: (result.data ?? []) as unknown as Ticket[], error: result.error })),
        [],
      ),
      safeQuery<FacilityEvent[]>(
        () => supabase
          .from("events" as never)
          .select("id,place_id,name,slug,summary,start_at,end_at,child_price,adult_price,reservation_required,official_url,status")
          .eq("place_id", placeId)
          .eq("status", "published")
          .gte("end_at", new Date().toISOString())
          .order("start_at")
          .limit(10)
          .then((result) => ({ data: (result.data ?? []) as unknown as FacilityEvent[], error: result.error })),
        [],
      ),
      safeQuery<FacilityNews[]>(
        () => supabase
          .from("facility_news" as never)
          .select("id,place_id,title,summary,news_type,published_at,expires_at,is_important")
          .eq("place_id", placeId)
          .eq("status", "published")
          .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
          .order("published_at", { ascending: false })
          .limit(5)
          .then((result) => ({ data: (result.data ?? []) as unknown as FacilityNews[], error: result.error })),
        [],
      ),
      safeQuery<StationAccess[]>(
        () => supabase
          .from("facility_station_access" as never)
          .select("distance_meters,walking_minutes,route_description,station:stations(id,name,line:railway_lines(name,company_name))")
          .eq("place_id", placeId)
          .order("sort_order")
          .then((result) => ({ data: (result.data ?? []) as unknown as StationAccess[], error: result.error })),
        [],
      ),
    ])

  return { categories, tags, amenities, businessHours, businessExceptions, pricePlans, coupons, tickets, events, news, stations }
}

/** マスタ取得 (admin/公開共通) */
export async function getCategories(): Promise<Category[]> {
  return safeQuery<Category[]>(
    () => supabase
      .from("categories" as never)
      .select("id,slug,name,description,icon,parent_id,sort_order,is_active,seo_title,seo_description")
      .eq("is_active", true)
      .order("sort_order")
      .then((result) => ({ data: (result.data ?? []) as unknown as Category[], error: result.error })),
    [],
  )
}

export async function getTags(): Promise<Tag[]> {
  return safeQuery<Tag[]>(
    () => supabase
      .from("tags" as never)
      .select("id,slug,name,group_id,sort_order,is_filterable,is_indexable,is_active,canonical_tag_id")
      .eq("is_active", true)
      .is("canonical_tag_id", null)
      .order("sort_order")
      .then((result) => ({ data: (result.data ?? []) as unknown as Tag[], error: result.error })),
    [],
  )
}

export async function getAmenities(): Promise<Amenity[]> {
  return safeQuery<Amenity[]>(
    () => supabase
      .from("amenities" as never)
      .select("id,slug,name,category,sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .then((result) => ({ data: (result.data ?? []) as unknown as Amenity[], error: result.error })),
    [],
  )
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return safeQuery<Category | null>(
    () => supabase
      .from("categories" as never)
      .select("id,slug,name,description,icon,parent_id,sort_order,is_active,seo_title,seo_description")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle()
      .then((result) => ({ data: result.data as unknown as Category | null, error: result.error })),
    null,
  )
}

export async function getTagBySlug(slug: string): Promise<Tag | null> {
  return safeQuery<Tag | null>(
    () => supabase
      .from("tags" as never)
      .select("id,slug,name,group_id,sort_order,is_filterable,is_indexable,is_active,canonical_tag_id")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle()
      .then((result) => ({ data: result.data as unknown as Tag | null, error: result.error })),
    null,
  )
}

/** カテゴリ/タグに属する公開施設ID一覧 */
export async function getPlaceIdsForCategory(categoryId: string): Promise<string[]> {
  return safeQuery<string[]>(
    () => supabase
      .from("facility_categories" as never)
      .select("place_id")
      .eq("category_id", categoryId)
      .then((result) => ({
        data: ((result.data ?? []) as Array<{ place_id: string }>).map((row) => row.place_id),
        error: result.error,
      })),
    [],
  )
}

export interface CategoryCount {
  slug: string
  name: string
  count: number
}

/** 公開施設が属するカテゴリごとの件数 (ホームのジャンル導線用) */
export async function getCategoryCounts(): Promise<CategoryCount[]> {
  type Row = { category: { slug: string; name: string; is_active: boolean } | null }
  const counts = new Map<string, CategoryCount>()
  for (let from = 0; ; from += 1000) {
    const rows = await safeQuery<Row[]>(
      () => supabase
        .from("facility_categories" as never)
        .select("category:categories(slug,name,is_active), places!inner(is_published)")
        .eq("places.is_published", true)
        .range(from, from + 999)
        .then((result) => ({ data: (result.data ?? []) as unknown as Row[], error: result.error })),
      [],
    )
    for (const row of rows) {
      const category = row.category
      if (!category?.is_active) continue
      const entry = counts.get(category.slug) ?? { slug: category.slug, name: category.name, count: 0 }
      entry.count += 1
      counts.set(category.slug, entry)
    }
    if (rows.length < 1000) break
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)
}

export async function getPlaceIdsForTag(tagId: string): Promise<string[]> {
  return safeQuery<string[]>(
    () => supabase
      .from("facility_tags" as never)
      .select("place_id")
      .eq("tag_id", tagId)
      .then((result) => ({
        data: ((result.data ?? []) as Array<{ place_id: string }>).map((row) => row.place_id),
        error: result.error,
      })),
    [],
  )
}
