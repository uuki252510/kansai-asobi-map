/**
 * conditionsFromSearchParams のパラメータ検証smoke。
 * 不正値で例外・NaNが出ないことを確認する (DB不要)。
 *
 * Run: npx tsx scripts/conditions-validation-smoke.mjs
 */
import { conditionsFromSearchParams, recommendPlaces } from "../lib/recommendation-engine.ts"

const basePlace = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "テスト公園",
  description: "芝生でのんびり過ごせる公園",
  prefecture: "大阪府",
  city: "大阪市",
  address: "",
  latitude: 34.7,
  longitude: 135.5,
  indoor_type: "outdoor",
  target_ages: [],
  price_type: "free",
  price_note: null,
  has_parking: false,
  has_nursing_room: false,
  has_diaper_space: false,
  rainy_day_ok: false,
  opening_hours: null,
  image_url: null,
  google_map_url: null,
  website_url: null,
  is_published: true,
  mood_tags: [],
  companion_types: [], // ← companionFallback が呼ばれる経路
  recommended_weather: [],
  recommended_seasons: [],
  recommended_time_of_day: [],
  average_stay_minutes: null,
  activity_level: null,
  healing_score: null,
  child_fun_score: null,
  date_score: null,
  photo_score: null,
  rainy_day_score: null,
  crowd_level: null,
  price_min: null,
  price_max: null,
  recommended_age_min: null,
  recommended_age_max: null,
  reservation_required: null,
  same_day_booking: null,
  stroller_accessible: null,
  barrier_free: null,
  pet_friendly: null,
  meal_available: null,
  last_verified_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  avg_rating: null,
  review_count: 0,
}

const cases = [
  "",
  "companion=foo&stay=bar&transport=x",
  "companion=couple&moods=zzz,food",
  "budget=abc&travel=xyz",
  "lat=abc&lng=def",
  "lat=999&lng=999",
  "lat=34.7", // 片方だけ
  "budget=-500&travel=99999",
  "details=evil,parking",
  "companion=<script>&stay='&transport=%00",
]

let failed = 0
for (const query of cases) {
  try {
    const conditions = conditionsFromSearchParams(new URLSearchParams(query))
    const results = recommendPlaces([basePlace], conditions, null)
    const hasNaN = results.some((result) => Number.isNaN(result.score))
    const coordMismatch = (conditions.latitude === null) !== (conditions.longitude === null)
    if (hasNaN || coordMismatch) {
      failed += 1
      console.log(`FAIL "${query}" -> NaN=${hasNaN} coordMismatch=${coordMismatch}`)
    } else {
      console.log(`OK   "${query}" -> companion=${conditions.companion} stay=${conditions.stay} transport=${conditions.transport} score=${results[0]?.score ?? "-"}`)
    }
  } catch (error) {
    failed += 1
    console.log(`FAIL "${query}" -> threw: ${error.message}`)
  }
}

if (failed > 0) {
  console.error(`\n${failed} case(s) failed`)
  process.exit(1)
}
console.log("\nAll cases passed")
