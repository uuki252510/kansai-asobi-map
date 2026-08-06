/**
 * 日本時間 (Asia/Tokyo) での日付・時刻の読み出し。
 *
 * 本番サーバーは UTC で動くため、Date の getHours()/getDay()/getDate() を
 * 直接読むと 9時間ずれる (JST朝9時までは前日扱いになる)。
 * 営業時間・イベント日付・曜日など「日本の壁時計」を前提にする値は、
 * 必ずここを経由して読む。
 *
 * JSTは夏時間が無く UTC+9 固定なので、エポックを +9h ずらして
 * getUTC* で読むだけで正確に求まる。
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

export interface JstParts {
  year: number
  /** 1〜12 */
  month: number
  day: number
  hour: number
  minute: number
  /** 0=日曜 〜 6=土曜 */
  weekday: number
}

export function jstParts(date: Date = new Date()): JstParts {
  const shifted = new Date(date.getTime() + JST_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  }
}

/** JSTでの "YYYY-MM-DD" */
export function jstDateKey(date: Date = new Date()): string {
  const parts = jstParts(date)
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
}

/** JSTでの 0:00 からの経過分 */
export function jstMinutesOfDay(date: Date = new Date()): number {
  const parts = jstParts(date)
  return parts.hour * 60 + parts.minute
}

/** 2つの時刻がJSTで同じ日か */
export function jstSameDay(a: Date, b: Date): boolean {
  return jstDateKey(a) === jstDateKey(b)
}

export const JST_WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const

/**
 * JSTの (year, month, day) を指す瞬間 (UTC Date) を作る。
 * day は月を跨いでよい (Date.UTC が繰り上げる)。
 */
export function jstMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - JST_OFFSET_MS)
}

/**
 * datetime-local 入力用の "YYYY-MM-DDTHH:mm" (JST基準)。
 * DBのUTC ISO文字列を slice すると UTC の壁時計になり9時間ずれるので、
 * 編集フォームへ返すときはこれを使う。
 */
export function jstDateTimeLocal(value: string | Date): string {
  const parts = jstParts(typeof value === "string" ? new Date(value) : value)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`
}
