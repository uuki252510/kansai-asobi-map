/**
 * 施設導出ロジックの単体テスト (営業中判定 / 料金目安 / 鮮度 / slug)。
 * Run: npx tsx scripts/facility-derive-test.mjs
 */
import assert from "node:assert/strict"
import {
  freshnessStatus,
  generateSlug,
  priceSummary,
  todayBusinessStatus,
} from "../lib/facility-derive.ts"

let passed = 0
function test(name, fn) {
  try {
    fn()
    passed += 1
    console.log(`OK   ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`)
    process.exitCode = 1
  }
}

// 2026-08-05 は水曜日 (day 3)
const wed10 = new Date("2026-08-05T10:00:00+09:00")
const wed1630 = new Date("2026-08-05T16:30:00+09:00")
const wed19 = new Date("2026-08-05T19:00:00+09:00")
const wed7 = new Date("2026-08-05T07:00:00+09:00")

const hoursWed = [{
  id: "h1", place_id: "p1", day_of_week: 3, is_closed: false, note: null, valid_from: null, valid_until: null,
  slots: [{ id: "s1", opening_time: "09:00:00", closing_time: "17:00:00", last_entry_time: null, sort_order: 0 }],
}]

test("営業中判定: 営業時間内はopen", () => {
  const status = todayBusinessStatus(hoursWed, [], wed10)
  assert.equal(status.state, "open")
  assert.match(status.label, /営業中/)
})

test("営業中判定: 閉館1時間前はclosing_soon", () => {
  assert.equal(todayBusinessStatus(hoursWed, [], wed1630).state, "closing_soon")
})

test("営業中判定: 閉館後はclosed_now", () => {
  const status = todayBusinessStatus(hoursWed, [], wed19)
  assert.equal(status.state, "closed_now")
  assert.match(status.label, /終了/)
})

test("営業中判定: 開店前は本日の営業時間を案内", () => {
  const status = todayBusinessStatus(hoursWed, [], wed7)
  assert.equal(status.state, "closed_now")
  assert.match(status.label, /09:00〜17:00/)
})

test("営業中判定: 定休日はclosed_today", () => {
  const closed = [{ ...hoursWed[0], is_closed: true, slots: [] }]
  assert.equal(todayBusinessStatus(closed, [], wed10).state, "closed_today")
})

test("営業中判定: 臨時休業が曜日設定より優先される", () => {
  const exceptions = [{ id: "e1", place_id: "p1", date: "2026-08-05", exception_type: "temporary_closure", opening_time: null, closing_time: null, reason: "設備点検", notice: null }]
  const status = todayBusinessStatus(hoursWed, exceptions, wed10)
  assert.equal(status.state, "closed_today")
  assert.equal(status.note, "設備点検")
})

test("営業中判定: 短縮営業の時間が使われる", () => {
  const exceptions = [{ id: "e2", place_id: "p1", date: "2026-08-05", exception_type: "shortened", opening_time: "10:00:00", closing_time: "15:00:00", reason: null, notice: null }]
  const status = todayBusinessStatus(hoursWed, exceptions, new Date("2026-08-05T14:30:00+09:00"))
  assert.equal(status.state, "closing_soon")
})

test("営業中判定: 複数時間帯 (昼休憩) の間はclosed_now", () => {
  const split = [{
    ...hoursWed[0],
    slots: [
      { id: "s1", opening_time: "09:00:00", closing_time: "12:00:00", last_entry_time: null, sort_order: 0 },
      { id: "s2", opening_time: "13:00:00", closing_time: "17:00:00", last_entry_time: null, sort_order: 1 },
    ],
  }]
  assert.equal(todayBusinessStatus(split, [], new Date("2026-08-05T12:30:00+09:00")).state, "closed_now")
  assert.equal(todayBusinessStatus(split, [], new Date("2026-08-05T13:30:00+09:00")).state, "open")
})

test("営業中判定: データなしはunknown", () => {
  assert.equal(todayBusinessStatus([], [], wed10).state, "unknown")
})

const plan = (tiers) => [{ id: "pl1", place_id: "p1", plan_name: "入場料", plan_type: "admission", day_type: "all", duration_minutes: null, valid_from: null, valid_until: null, reservation_required: null, note: null, sort_order: 0, tiers }]

test("料金目安: 子ども/大人の最安を算出", () => {
  const summary = priceSummary(plan([
    { id: "t1", tier: "elementary", price: 500, original_price: null, is_free: false, conditions: null, sort_order: 0 },
    { id: "t2", tier: "adult", price: 1200, original_price: null, is_free: false, conditions: null, sort_order: 1 },
  ]))
  assert.equal(summary.minChild, 500)
  assert.equal(summary.minAdult, 1200)
  assert.equal(summary.label, "子ども500円〜 / 大人1,200円〜")
})

test("料金目安: 全区分無料は入場無料", () => {
  const summary = priceSummary(plan([
    { id: "t1", tier: "elementary", price: 0, original_price: null, is_free: true, conditions: null, sort_order: 0 },
    { id: "t2", tier: "adult", price: 0, original_price: null, is_free: true, conditions: null, sort_order: 1 },
  ]))
  assert.equal(summary.isFree, true)
  assert.equal(summary.label, "入場無料")
})

test("料金目安: 子ども無料+大人有料", () => {
  const summary = priceSummary(plan([
    { id: "t1", tier: "toddler", price: 0, original_price: null, is_free: true, conditions: null, sort_order: 0 },
    { id: "t2", tier: "adult", price: 800, original_price: null, is_free: false, conditions: null, sort_order: 1 },
  ]))
  assert.equal(summary.label, "子ども無料 / 大人800円〜")
})

test("料金目安: 有効期限切れプランは除外", () => {
  const expired = plan([{ id: "t1", tier: "adult", price: 100, original_price: null, is_free: false, conditions: null, sort_order: 0 }])
  expired[0].valid_until = "2020-01-01"
  const summary = priceSummary(expired, "2026-08-05")
  assert.equal(summary.label, "")
})

test("鮮度: 30日以内はfresh", () => {
  assert.equal(freshnessStatus("2026-07-20T00:00:00Z", new Date("2026-08-05")), "fresh")
})

test("鮮度: 31〜90日はstale_30", () => {
  assert.equal(freshnessStatus("2026-06-01T00:00:00Z", new Date("2026-08-05")), "stale_30")
})

test("鮮度: 90日超はstale_90", () => {
  assert.equal(freshnessStatus("2026-01-01T00:00:00Z", new Date("2026-08-05")), "stale_90")
})

test("鮮度: nullはunknown", () => {
  assert.equal(freshnessStatus(null), "unknown")
})

test("slug: 英数はそのままkebab-case", () => {
  assert.equal(generateSlug("USJ Universal Studios"), "usj-universal-studios")
})

test("slug: 和文はspot-短縮ID", () => {
  const slug = generateSlug("海遊館", "11111111-2222-3333-4444-555555555555")
  assert.equal(slug, "spot-11111111")
})

test("slug: 同名和文でも決定的", () => {
  assert.equal(generateSlug("海遊館"), generateSlug("海遊館"))
})

console.log(`\n${passed} tests passed${process.exitCode ? " (with failures)" : ""}`)

// --- JST固定の検証: サーバーがUTCでも日本の壁時計で判定される ---
// 2026-08-05T01:00Z は JST 10:00 (水曜)。UTCのまま読むと 1:00 で開店前と誤判定される
const WED_HOURS = [{ day_of_week: 3, is_closed: false, note: null, valid_from: null, valid_until: null, slots: [{ opening_time: "09:00", closing_time: "17:00" }] }]
test("UTC表記の現在時刻でもJSTで営業中と判定", () => {
  assert.equal(todayBusinessStatus(WED_HOURS, [], new Date("2026-08-05T01:00:00Z")).state, "open")
})
test("UTC表記でJST朝7時は開店前", () => {
  assert.equal(todayBusinessStatus(WED_HOURS, [], new Date("2026-08-04T22:00:00Z")).state, "closed_now")
})

// --- 日跨ぎ営業 (21:00〜翌02:00) ---
const NIGHT_HOURS = [{ day_of_week: 3, is_closed: false, note: null, valid_from: null, valid_until: null, slots: [{ opening_time: "21:00", closing_time: "02:00" }] }]
test("日跨ぎ営業: 21:30は営業中", () => {
  assert.equal(todayBusinessStatus(NIGHT_HOURS, [], new Date("2026-08-05T21:30:00+09:00")).state, "open")
})
test("日跨ぎ営業: 20:00は開店前", () => {
  assert.equal(todayBusinessStatus(NIGHT_HOURS, [], new Date("2026-08-05T20:00:00+09:00")).state, "closed_now")
})
test("日跨ぎ営業: 23:30も営業中 (0:00で切れない)", () => {
  assert.equal(todayBusinessStatus(NIGHT_HOURS, [], new Date("2026-08-05T23:30:00+09:00")).state, "open")
})
