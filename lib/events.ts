import { supabase } from "@/lib/supabase/client"
import { storagePublicUrl } from "@/lib/media-validation"
import { jstMidnight, jstParts, jstSameDay } from "@/lib/jst"

/**
 * イベント (夏祭り・花火大会・商業施設の催し)。
 * place_id が null の単独イベントも扱う。
 * テーブル未適用でも空配列を返して公開画面を壊さない。
 */

export type EventCategory =
  | "festival"
  | "fireworks"
  | "market"
  | "workshop"
  | "sale"
  | "seasonal"
  | "exhibition"
  | "stage"
  | "sports"
  | "other"

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  festival: "夏祭り・盆踊り",
  fireworks: "花火大会",
  market: "マルシェ・縁日",
  workshop: "体験・ワークショップ",
  sale: "セール・キャンペーン",
  seasonal: "季節の催し",
  exhibition: "展示・企画展",
  stage: "ステージ・ショー",
  sports: "スポーツ・大会",
  other: "その他",
}

export interface PublicEvent {
  id: string
  slug: string | null
  place_id: string | null
  name: string
  summary: string | null
  description: string | null
  venue_name: string | null
  address: string | null
  prefecture: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  start_at: string
  end_at: string
  start_time_unknown: boolean
  status: "published" | "cancelled"
  highlight_label: string | null
  highlight_value: string | null
  event_category: EventCategory | null
  child_price: number | null
  adult_price: number | null
  is_free: boolean
  is_featured: boolean
  reservation_required: boolean | null
  official_url: string | null
  application_url: string | null
  organizer_name: string | null
  access_note: string | null
  rain_policy: string | null
  cover_storage_path: string | null
  cover_external_url: string | null
}

const COLUMNS =
  "id,slug,place_id,name,status,summary,description,venue_name,address,prefecture,city,latitude,longitude,start_at,end_at,start_time_unknown,highlight_label,highlight_value,event_category,child_price,adult_price,is_free,is_featured,reservation_required,official_url,application_url,organizer_name,access_note,rain_policy,cover_storage_path,cover_external_url"

export function eventCoverUrl(event: Pick<PublicEvent, "cover_storage_path" | "cover_external_url">): string | null {
  if (event.cover_storage_path) return storagePublicUrl(event.cover_storage_path)
  return event.cover_external_url
}

/** 一覧・カードで使う開催期間の表示 */
export function eventPeriodLabel(
  event: Pick<PublicEvent, "start_at" | "end_at"> & { start_time_unknown?: boolean },
): string {
  // サーバーはUTCで動くので、日本の日付・時刻は必ずJSTで読む
  // (直読みすると単日イベントが「前日〜当日」の2日間になる)
  const start = new Date(event.start_at)
  const end = new Date(event.end_at)
  const format = (date: Date) => {
    const parts = jstParts(date)
    return `${parts.month}/${parts.day}`
  }
  if (!jstSameDay(start, end)) return `${format(start)}〜${format(end)}`
  // 時刻が未発表のイベントで 0:00 開始と出すと誤情報になる
  if (event.start_time_unknown) return format(start)
  const parts = jstParts(start)
  return `${format(start)} ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}〜`
}

export function eventPriceLabel(event: Pick<PublicEvent, "is_free" | "child_price" | "adult_price">): string | null {
  if (event.is_free) return "入場無料"
  const parts: string[] = []
  if (event.child_price !== null) parts.push(`子ども${event.child_price.toLocaleString("ja-JP")}円`)
  if (event.adult_price !== null) parts.push(`大人${event.adult_price.toLocaleString("ja-JP")}円`)
  return parts.length > 0 ? parts.join(" / ") : null
}

async function safe<T>(run: () => PromiseLike<{ data: T | null; error: unknown }>, fallback: T): Promise<T> {
  try {
    const { data, error } = await run()
    if (error) return fallback
    return data ?? fallback
  } catch {
    return fallback
  }
}

export interface EventFilters {
  category?: EventCategory
  prefecture?: string
  /** 開催中/開催予定のみ (既定 true) */
  upcomingOnly?: boolean
  /** この日時までに始まるものだけ (今週末などの絞り込み用) */
  startsBefore?: Date
  limit?: number
}

export async function getPublishedEvents(filters: EventFilters = {}): Promise<PublicEvent[]> {
  const { category, prefecture, upcomingOnly = true, startsBefore, limit = 60 } = filters
  return safe<PublicEvent[]>(
    () => {
      let query = supabase
        .from("events" as never)
        .select(COLUMNS)
        .eq("status", "published")
        .order("start_at")
        .limit(limit)
      // 終了していないもの = 開催中 or これから
      if (upcomingOnly) query = query.gte("end_at", new Date().toISOString())
      if (startsBefore) query = query.lte("start_at", startsBefore.toISOString())
      if (category) query = query.eq("event_category", category)
      if (prefecture) query = query.eq("prefecture", prefecture)
      return query.then((result) => ({ data: result.data as unknown as PublicEvent[], error: result.error }))
    },
    [],
  )
}

export async function getEventByIdOrSlug(identifier: string): Promise<PublicEvent | null> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(identifier)
  return safe<PublicEvent | null>(
    () =>
      supabase
        .from("events" as never)
        .select(COLUMNS)
        .eq(isUuid ? "id" : "slug", identifier)
        // 中止イベントも表示する (中止の告知ができないと行く予定だった人が困る)
        .in("status", ["published", "cancelled"])
        .maybeSingle()
        .then((result) => ({ data: result.data as unknown as PublicEvent | null, error: result.error })),
    null,
  )
}

/**
 * 今週末 (直近の土日) に開催されるイベント。JSTの曜日で判定する。
 * 日曜に見たときは「今日まで」を週末として扱う (来週に飛ばさない)。
 */
export async function getWeekendEvents(limit = 12, now = new Date()): Promise<PublicEvent[]> {
  const parts = jstParts(now)
  const daysUntilSaturday = parts.weekday === 6 ? 0 : parts.weekday === 0 ? -1 : 6 - parts.weekday
  const saturday = jstMidnight(parts.year, parts.month, parts.day + daysUntilSaturday)
  const sundayEnd = new Date(jstMidnight(parts.year, parts.month, parts.day + daysUntilSaturday + 2).getTime() - 1)

  // 週末に「かかっている」= 開始が日曜終わり以前 かつ 終了が土曜開始以降。
  // 終了側もDBの条件に入れないと、開催中の長期イベントが limit を食い潰し
  // 今週末開始のイベントが1件も残らないことがある
  return safe<PublicEvent[]>(
    () =>
      supabase
        .from("events" as never)
        .select(COLUMNS)
        .eq("status", "published")
        .lte("start_at", sundayEnd.toISOString())
        .gte("end_at", saturday.toISOString())
        .order("start_at")
        .limit(limit)
        .then((result) => ({ data: result.data as unknown as PublicEvent[], error: result.error })),
    [],
  )
}

export function eventHref(event: Pick<PublicEvent, "id" | "slug">): string {
  return `/events/${event.slug ?? event.id}`
}
