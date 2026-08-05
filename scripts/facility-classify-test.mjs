/**
 * 自動分類ロジックのテスト (DB不要)。実在スポット名で期待カテゴリを検証する。
 * Run: npx tsx scripts/facility-classify-test.mjs
 */
import assert from "node:assert/strict"
import { inferAmenitySlugs, inferCategorySlugs, inferTagSlugs } from "../lib/facility-classify.ts"

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

const base = {
  description: null,
  indoor_type: "both",
  price_type: "paid",
  target_ages: [],
  mood_tags: [],
  companion_types: [],
  rainy_day_ok: false,
  has_parking: false,
  has_nursing_room: false,
  has_diaper_space: false,
  average_stay_minutes: null,
}
const place = (overrides) => ({ ...base, ...overrides })

test("カテゴリ: 水族館", () => {
  assert.ok(inferCategorySlugs(place({ name: "海遊館" })).includes("aquarium"))
  assert.ok(inferCategorySlugs(place({ name: "京都水族館" })).includes("aquarium"))
  assert.ok(inferCategorySlugs(place({ name: "ニフレル" })).includes("aquarium"))
})

test("カテゴリ: 動物園", () => {
  assert.ok(inferCategorySlugs(place({ name: "天王寺動物園" })).includes("zoo"))
  assert.ok(inferCategorySlugs(place({ name: "神戸どうぶつ王国" })).includes("zoo"))
})

test("カテゴリ: テーマパーク", () => {
  assert.ok(inferCategorySlugs(place({ name: "ユニバーサル・スタジオ・ジャパン（USJ）" })).includes("theme-park"))
})

test("カテゴリ: 公園", () => {
  assert.ok(inferCategorySlugs(place({ name: "万博記念公園" })).includes("park"))
  assert.ok(inferCategorySlugs(place({ name: "奈良公園（鹿と触れ合い）" })).includes("park"))
})

test("カテゴリ: 屋内キッズ施設", () => {
  const result = inferCategorySlugs(place({ name: "キッズプラザ大阪", indoor_type: "indoor", target_ages: ["3-5"] }))
  assert.ok(result.includes("indoor-playground"))
})

test("カテゴリ: 該当なしはother", () => {
  assert.deepEqual(inferCategorySlugs(place({ name: "謎の場所ABC" })), ["other"])
})

test("カテゴリ: 最大3件", () => {
  assert.ok(inferCategorySlugs(place({ name: "温泉付き公園キャンプ場アスレチック動物園" })).length <= 3)
})

test("タグ: 屋内は自動で雨の日OK", () => {
  assert.ok(inferTagSlugs(place({ name: "屋内施設", indoor_type: "indoor" })).includes("rainy-day-ok"))
})

test("タグ: 無料スポット", () => {
  assert.ok(inferTagSlugs(place({ name: "無料公園", price_type: "free" })).includes("free"))
})

test("タグ: 0-2歳対象はbaby-friendly", () => {
  assert.ok(inferTagSlugs(place({ name: "テスト", target_ages: ["0-2"] })).includes("baby-friendly"))
})

test("タグ: 4時間以上は1日中遊べる", () => {
  assert.ok(inferTagSlugs(place({ name: "テスト", average_stay_minutes: 300 })).includes("all-day"))
})

test("タグ: 説明文から水遊び/動物ふれあいを検出", () => {
  const tags = inferTagSlugs(place({ name: "テスト公園", description: "じゃぶじゃぶ池で水遊び、動物とのふれあい体験も" }))
  assert.ok(tags.includes("water-play"))
  assert.ok(tags.includes("animal-encounter"))
})

test("タグ: companion_types couple → デート向け", () => {
  assert.ok(inferTagSlugs(place({ name: "テスト", companion_types: ["couple"] })).includes("date"))
})

test("タグ: 重複しない", () => {
  const tags = inferTagSlugs(place({ name: "屋内アスレチック", indoor_type: "indoor", rainy_day_ok: true, mood_tags: ["rain", "active"] }))
  assert.equal(tags.length, new Set(tags).size)
})

test("設備: bool列から変換", () => {
  const amenities = inferAmenitySlugs(place({ name: "テスト", has_parking: true, has_nursing_room: true, barrier_free: true }))
  assert.ok(amenities.includes("parking"))
  assert.ok(amenities.includes("nursing-room"))
  assert.ok(amenities.includes("barrier-free"))
  assert.ok(amenities.includes("multi-toilet"))
})

console.log(`\n${passed} tests passed${process.exitCode ? " (with failures)" : ""}`)
