import { createClient } from "@supabase/supabase-js"
import {
  DEFAULT_CONDITIONS,
  inferMoodTags,
  MOOD_LABELS,
  recommendPlaces,
} from "../lib/recommendation-engine.ts"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)
const { data, error } = await supabase
  .from("places")
  .select(
    "id,name,description,prefecture,city,indoor_type,target_ages,price_type,price_note,rainy_day_ok,image_url",
  )
  .eq("is_published", true)
  .limit(1000)

if (error) throw error

const places = (data ?? []).map((row) => ({
  ...row,
  address: "",
  latitude: null,
  longitude: null,
  has_parking: false,
  has_nursing_room: false,
  has_diaper_space: false,
  opening_hours: null,
  google_map_url: null,
  website_url: null,
  is_published: true,
  mood_tags: [],
  companion_types: [],
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
  created_at: "",
  updated_at: "",
  avg_rating: null,
  review_count: 0,
}))

const weather = {
  available: false,
  condition: "any",
  conditionLabel: "天気情報なし",
  temperature: null,
  high: null,
  low: null,
  precipitationProbability: null,
  rainTimeLabel: null,
}
const withPhotos = places.filter((place) => place.image_url)
const source = withPhotos.length >= 3 ? withPhotos : places
const report = Object.entries(MOOD_LABELS).map(([mood, label]) => {
  const eligible = places.filter((place) => inferMoodTags(place).includes(mood))
  const results = recommendPlaces(
    source,
    { ...DEFAULT_CONDITIONS, moods: [mood] },
    weather,
  )
  return {
    mood,
    label,
    eligible: eligible.length,
    results: results.map((result) => ({
      name: result.place.name,
      matched: result.matchedMoods.includes(mood),
      reason: result.reason,
    })),
  }
})

const failed = report.some(
  (item) =>
    item.results.length === 0 ||
    item.results.some((result) => !result.matched) ||
    new Set(item.results.map((result) => result.name)).size !== item.results.length,
)

console.log(JSON.stringify(report, null, 2))
if (failed) process.exitCode = 1
