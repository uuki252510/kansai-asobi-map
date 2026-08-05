import type {
  CompanionType,
  CrowdLevel,
  IndoorType,
  MoodTag,
  Place,
  Prefecture,
  PriceType,
  RecommendedSeason,
  RecommendedTimeOfDay,
  RecommendedWeather,
  TargetAge,
} from '@/lib/supabase/database.types'

export type PlaceWritePayload = Omit<Place, 'id' | 'created_at' | 'updated_at'>

const INDOOR_TYPES: IndoorType[] = ['indoor', 'outdoor', 'both']
const PRICE_TYPES: PriceType[] = ['free', 'paid', 'mixed']
const TARGET_AGES: TargetAge[] = ['0-2', '3-5', '6-12']
const PREFECTURES: Prefecture[] = ['大阪府', '兵庫県', '京都府', '奈良県', '滋賀県', '和歌山県']
const MOOD_TAGS: MoodTag[] = ['relax', 'active', 'kids', 'food', 'healing', 'photo', 'rain', 'discovery', 'shopping']
const COMPANION_TYPES: CompanionType[] = ['solo', 'couple', 'friends', 'family', 'children', 'multigenerational']
const WEATHER: RecommendedWeather[] = ['sunny', 'cloudy', 'rainy', 'any']
const SEASONS: RecommendedSeason[] = ['spring', 'summer', 'autumn', 'winter', 'any']
const TIMES: RecommendedTimeOfDay[] = ['morning', 'afternoon', 'evening', 'night', 'any']
const CROWD_LEVELS: CrowdLevel[] = ['quiet', 'normal', 'busy', 'very_busy']

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

function requiredText(value: unknown, maxLength: number): string | null {
  return text(value, maxLength)
}

function enumValue<T extends string>(value: unknown, valid: readonly T[], fallback: T): T {
  return valid.includes(value as T) ? (value as T) : fallback
}

function enumArray<T extends string>(value: unknown, valid: readonly T[]): T[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is T => valid.includes(item as T)))]
}

function numberOrNull(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value < min || value > max) return null
  return value
}

function booleanValue(value: unknown): boolean {
  return value === true
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function httpsUrlOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString().slice(0, 2000)
  } catch {
    return null
  }
}

export function parsePlacePayload(raw: unknown): { payload: PlaceWritePayload } | { error: string } {
  if (typeof raw !== 'object' || raw === null) return { error: 'payload must be an object' }
  const input = raw as Record<string, unknown>

  const name = requiredText(input.name, 120)
  const city = requiredText(input.city, 60)
  const address = requiredText(input.address, 200)
  if (!name || !city || !address) return { error: '施設名・市区町村・住所は必須です' }

  const payload: PlaceWritePayload = {
    name,
    description: text(input.description, 4000),
    prefecture: enumValue(input.prefecture, PREFECTURES, '大阪府'),
    city,
    address,
    latitude: numberOrNull(input.latitude, 20, 50),
    longitude: numberOrNull(input.longitude, 120, 155),
    indoor_type: enumValue(input.indoor_type, INDOOR_TYPES, 'indoor'),
    target_ages: enumArray(input.target_ages, TARGET_AGES),
    price_type: enumValue(input.price_type, PRICE_TYPES, 'free'),
    price_note: text(input.price_note, 400),
    has_parking: booleanValue(input.has_parking),
    has_nursing_room: booleanValue(input.has_nursing_room),
    has_diaper_space: booleanValue(input.has_diaper_space),
    rainy_day_ok: booleanValue(input.rainy_day_ok),
    opening_hours: text(input.opening_hours, 400),
    image_url: httpsUrlOrNull(input.image_url),
    google_map_url: httpsUrlOrNull(input.google_map_url),
    website_url: httpsUrlOrNull(input.website_url),
    is_published: input.is_published !== false,
    mood_tags: enumArray(input.mood_tags, MOOD_TAGS),
    companion_types: enumArray(input.companion_types, COMPANION_TYPES),
    recommended_weather: enumArray(input.recommended_weather, WEATHER),
    recommended_seasons: enumArray(input.recommended_seasons, SEASONS),
    recommended_time_of_day: enumArray(input.recommended_time_of_day, TIMES),
    average_stay_minutes: numberOrNull(input.average_stay_minutes, 0, 1440),
    activity_level: numberOrNull(input.activity_level, 0, 100),
    healing_score: numberOrNull(input.healing_score, 0, 100),
    child_fun_score: numberOrNull(input.child_fun_score, 0, 100),
    date_score: numberOrNull(input.date_score, 0, 100),
    photo_score: numberOrNull(input.photo_score, 0, 100),
    rainy_day_score: numberOrNull(input.rainy_day_score, 0, 100),
    crowd_level: CROWD_LEVELS.includes(input.crowd_level as CrowdLevel) ? (input.crowd_level as CrowdLevel) : null,
    price_min: numberOrNull(input.price_min, 0, 1_000_000),
    price_max: numberOrNull(input.price_max, 0, 1_000_000),
    recommended_age_min: numberOrNull(input.recommended_age_min, 0, 120),
    recommended_age_max: numberOrNull(input.recommended_age_max, 0, 120),
    reservation_required: booleanOrNull(input.reservation_required),
    same_day_booking: booleanOrNull(input.same_day_booking),
    stroller_accessible: booleanOrNull(input.stroller_accessible),
    barrier_free: booleanOrNull(input.barrier_free),
    pet_friendly: booleanOrNull(input.pet_friendly),
    meal_available: booleanOrNull(input.meal_available),
    last_verified_at: new Date().toISOString(),
  }

  // migration 20260805000002 未適用のDBでも update が失敗しないよう、
  // 値が入力されたときだけ列を含める
  const whatIsIt = text(input.what_is_it, 400)
  const whyGo = text(input.why_go, 800)
  if (whatIsIt !== null) payload.what_is_it = whatIsIt
  if (whyGo !== null) payload.why_go = whyGo

  return { payload }
}
