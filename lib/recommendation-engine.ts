import type {
  CompanionType,
  MoodTag,
  Place,
  RecommendedSeason,
  RecommendedWeather,
} from "@/lib/supabase/database.types"
import type { PlaceWithAvgRating } from "@/lib/places"

export type TransportMode = "car" | "train" | "walk" | "bicycle"
export type StayChoice = "hour" | "half-day" | "day" | "evening" | "night"
export type RecommendationRole = "王道プラン" | "穴場プラン" | "ちょっと冒険プラン"

export interface WeatherSnapshot {
  available: boolean
  condition: RecommendedWeather
  conditionLabel: string
  temperature: number | null
  high: number | null
  low: number | null
  precipitationProbability: number | null
  rainTimeLabel: string | null
}

export interface RecommendationConditions {
  companion: CompanionType
  moods: MoodTag[]
  budgetMax: number | null
  travelMinutes: number | null
  stay: StayChoice
  transport: TransportMode
  details: string[]
  latitude: number | null
  longitude: number | null
  visitedPlaceIds?: string[]
  favoritePlaceIds?: string[]
}

export interface RecommendationResult {
  place: PlaceWithAvgRating
  role: RecommendationRole
  score: number
  reason: string
  distanceKm: number | null
  travelMinutes: number | null
  matchedMoods: MoodTag[]
  weatherFit: "good" | "neutral" | "poor"
}

const ROLE_ORDER: RecommendationRole[] = ["王道プラン", "穴場プラン", "ちょっと冒険プラン"]

export const MOOD_LABELS: Record<MoodTag, string> = {
  relax: "のんびり",
  active: "アクティブ",
  kids: "子どもを遊ばせたい",
  food: "おいしいもの",
  healing: "癒やされたい",
  photo: "写真を撮りたい",
  rain: "雨でも楽しみたい",
  discovery: "新しい体験",
  shopping: "買い物",
}

const VALID_MOODS = Object.keys(MOOD_LABELS) as MoodTag[]
const STRICT_INTENT_MOODS = new Set<MoodTag>(["food", "rain", "shopping"])

const detailChecks: Record<string, (place: Place) => boolean> = {
  indoor: (place) => place.indoor_type === "indoor" || place.indoor_type === "both",
  outdoor: (place) => place.indoor_type === "outdoor" || place.indoor_type === "both",
  parking: (place) => place.has_parking,
  rainy: (place) => place.rainy_day_ok,
  stroller: (place) => place.stroller_accessible === true,
  nursing: (place) => place.has_nursing_room,
  diaper: (place) => place.has_diaper_space,
  barrierFree: (place) => place.barrier_free === true,
  pet: (place) => place.pet_friendly === true,
  free: (place) => place.price_type === "free",
  noReservation: (place) => place.reservation_required === false,
  sameDay: (place) => place.same_day_booking === true,
  meal: (place) => place.meal_available === true,
  quiet: (place) => place.crowd_level === "quiet",
}

const companionFallback: Record<CompanionType, (place: Place) => boolean> = {
  solo: () => true,
  couple: (place) => (place.date_score ?? 0) >= 55,
  friends: (place) => (place.activity_level ?? 0) >= 45,
  family: (place) => place.target_ages.length > 0,
  children: (place) => place.target_ages.length > 0,
  multigenerational: (place) => place.barrier_free === true || place.indoor_type !== "outdoor",
}

type MoodEvidence = { score: number; reason: string | null }

const FOOD_NAME_PATTERN =
  /レストラン|食堂|カフェ|喫茶|茶屋|市場|マーケット|道の駅|フードコート|フードパーク|キッチンカー|ベーカリー|パン屋|パン工房|スイーツ|菓子|ケーキ|ジェラート|アイスクリーム|ラーメン|うどん|そば|寿司|焼肉|バーベキュー|BBQ|農園|果樹園|いちご|ぶどう|みかん|フルーツ|ワイナリー|ビール|めんたい|カップヌードル|チキンラーメン/i
const FOOD_EXPERIENCE_PATTERN =
  /食べ歩き|食べ放題|味わえる|味わう|ご当地グルメ|名物|旬の味|収穫体験|いちご狩り|果物狩り|味覚狩り|農業体験|料理体験|調理体験|試食|食文化|製造工程|フードコート/i

function moodEvidence(place: Place, mood: MoodTag): MoodEvidence {
  const name = place.name
  const description = place.description ?? ""
  let score = place.mood_tags?.includes(mood) ? 6 : 0
  let reason: string | null = null

  switch (mood) {
    case "food": {
      if (FOOD_NAME_PATTERN.test(name)) {
        score += 6
        reason = /農園|果樹園|狩り|いちご|ぶどう|みかん/i.test(name)
          ? "収穫や旬の味を目的にできるスポットです。"
          : /カップヌードル|チキンラーメン|めんたい/i.test(name)
            ? "食にまつわる見学や体験を目的に楽しめます。"
            : /市場|マーケット|道の駅/i.test(name)
              ? "ご当地の味や食の買い物を目的に楽しめます。"
              : "食事やカフェ時間を目的に楽しめる候補です。"
      }
      if (FOOD_EXPERIENCE_PATTERN.test(description)) {
        score += 4
        reason ??= "名物や食の体験を目的に楽しめる内容があります。"
      }
      if (place.meal_available === true) score += 2
      break
    }
    case "active":
      if (/アスレチック|スポーツ|プール|遊園地|テーマパーク|トランポリン|ボルダリング|クライミング|サイクリング|ハイキング|登山|スキー|スケート|フィールドアスレチック/i.test(name)) score += 6
      if (/大型遊具|体を動か|アクティビティ|ジップライン|アスレチック|サイクリング|ハイキング|スポーツ/i.test(description)) score += 3
      if ((place.activity_level ?? 0) >= 55) score += 3
      if (score >= 3) reason = "体を動かして遊べる内容があるスポットです。"
      break
    case "kids":
      if (place.target_ages.length > 0) score += 5
      if (/こども|子ども|キッズ|児童|アンパンマン|遊園地|動物園|水族館|科学館|公園|アスレチック/i.test(name)) score += 4
      if ((place.child_fun_score ?? 0) >= 55) score += 3
      if (score >= 3) reason = "子どもの対象年齢が登録されている、家族向けの候補です。"
      break
    case "relax":
      if (/公園|庭園|植物園|温泉|足湯|スパ|海岸|ビーチ|湖畔|渓谷|森林|高原|牧場|寺$|寺院|神社|展望|美術館|カフェ/i.test(name)) score += 5
      if (/のんびり|ゆったり|散策|芝生|自然の中|穏やか|くつろ|ピクニック/i.test(description)) score += 3
      if (place.crowd_level === "quiet") score += 3
      if (score >= 3) reason = "散策や休憩を中心に、ゆっくり過ごしやすい候補です。"
      break
    case "healing":
      if (/温泉|スパ|足湯|庭園|植物園|森林|森公園|渓谷|湖畔|海岸|寺$|寺院|神社|花畑|フラワー|牧場/i.test(name)) score += 5
      if (/癒|森林浴|リラックス|静か|絶景|自然に囲ま|四季|温泉/i.test(description)) score += 3
      if ((place.healing_score ?? 0) >= 55) score += 3
      if (score >= 3) reason = "自然や落ち着いた景観に触れて、気分転換しやすい候補です。"
      break
    case "photo":
      if (/展望|タワー|庭園|植物園|花畑|フラワー|美術館|城$|城跡|城址|神社|寺$|寺院|水族館|海岸|ビーチ|イルミネーション/i.test(name)) score += 5
      if (/絶景|写真|撮影|フォト|夜景|紅葉|桜|花|景観|眺望/i.test(description)) score += 3
      if ((place.photo_score ?? 0) >= 55) score += 3
      if (score >= 3) reason = "景観や展示を写真に残しやすいスポットです。"
      break
    case "rain":
      if (place.rainy_day_ok) score += 7
      else if (place.indoor_type === "indoor") score += 5
      else if (place.indoor_type === "both") score += 2
      if ((place.rainy_day_score ?? 0) >= 55) score += 3
      if (score >= 3) reason = "屋内または雨天対応として登録されている候補です。"
      break
    case "discovery":
      if (/博物館|科学館|美術館|資料館|ミュージアム|工場|体験|陶芸|ガラス|ワークショップ|水族館|動物園|城$|城跡|城址|歴史/i.test(name)) score += 5
      if (/体験|学べ|見学|展示|ワークショップ|ものづくり|観察|文化|歴史/i.test(description)) score += 3
      if (score >= 3) reason = "見学・学び・体験のいずれかを楽しめる候補です。"
      break
    case "shopping":
      if (/モール|アウトレット|商店街|市場|マーケット|百貨店|ショッピング|道の駅/i.test(name)) score += 6
      if (/買い物|ショップ|お土産|物販|直売/i.test(description)) score += 3
      if (score >= 3) reason = "買い物やお土産探しを目的にできる候補です。"
      break
  }

  return { score, reason }
}

function isMoodMatch(place: Place, mood: MoodTag) {
  return moodEvidence(place, mood).score >= 3
}

export function inferMoodTags(place: Place): MoodTag[] {
  return VALID_MOODS.filter((mood) => isMoodMatch(place, mood))
}

function matchesRequestedIntent(place: Place, moods: MoodTag[]) {
  if (moods.length === 0) return true
  const matched = moods.filter((mood) => isMoodMatch(place, mood))
  if (matched.length === 0) return false
  return moods.filter((mood) => STRICT_INTENT_MOODS.has(mood)).every((mood) => matched.includes(mood))
}

export function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371
  const latitudeDelta = ((lat2 - lat1) * Math.PI) / 180
  const longitudeDelta = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(longitudeDelta / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function estimatedTravelMinutes(distanceKm: number, transport: TransportMode) {
  const speed = { car: 32, train: 28, walk: 4.5, bicycle: 14 }[transport]
  const overhead = transport === "train" ? 12 : transport === "car" ? 5 : 0
  return Math.max(1, Math.round((distanceKm / speed) * 60 + overhead))
}

function currentSeason(date = new Date()): RecommendedSeason {
  const month = date.getMonth() + 1
  if (month >= 3 && month <= 5) return "spring"
  if (month >= 6 && month <= 8) return "summer"
  if (month >= 9 && month <= 11) return "autumn"
  return "winter"
}

function weatherCompatibility(place: Place, weather: WeatherSnapshot | null) {
  if (!weather?.available) return { points: 3, fit: "neutral" as const }
  const recommended = place.recommended_weather ?? []
  if (recommended.includes("any") || recommended.includes(weather.condition)) {
    return { points: 12, fit: "good" as const }
  }
  if (weather.condition === "rainy") {
    if (place.rainy_day_ok || place.indoor_type === "indoor") return { points: 12, fit: "good" as const }
    return { points: -12, fit: "poor" as const }
  }
  if (place.indoor_type === "outdoor" || place.indoor_type === "both") {
    return { points: 8, fit: "good" as const }
  }
  return { points: 3, fit: "neutral" as const }
}

function roleModifier(place: PlaceWithAvgRating, role: RecommendationRole) {
  const moods = inferMoodTags(place)
  if (role === "王道プラン") {
    return Math.min(8, place.review_count * 1.5 + (place.avg_rating ?? 0) * 0.8)
  }
  if (role === "穴場プラン") {
    return (place.review_count <= 2 ? 7 : 0) + (place.crowd_level === "quiet" ? 6 : 0)
  }
  return moods.includes("discovery") || moods.includes("active") ? 9 : 1
}

function scorePlace(
  place: PlaceWithAvgRating,
  conditions: RecommendationConditions,
  weather: WeatherSnapshot | null,
  role: RecommendationRole,
) {
  let score = 30
  const placeMoods = inferMoodTags(place)
  const matchedMoods = conditions.moods.filter((mood) => placeMoods.includes(mood))
  const moodStrength = matchedMoods.reduce(
    (sum, mood) => sum + Math.min(8, moodEvidence(place, mood).score),
    0,
  )
  if (conditions.moods.length === 0) {
    score += 4
  } else {
    const coverage = matchedMoods.length / conditions.moods.length
    score += Math.min(32, matchedMoods.length * 12 + moodStrength + Math.round(coverage * 8))
    score -= (conditions.moods.length - matchedMoods.length) * 10
  }

  const companions = place.companion_types ?? []
  const companionMatch = companions.includes(conditions.companion) ||
    (companions.length === 0 && companionFallback[conditions.companion](place))
  score += companionMatch ? 9 : -3

  const priceCeiling = place.price_max ?? (place.price_type === "free" ? 0 : null)
  if (conditions.budgetMax === null) score += 3
  else if (priceCeiling === null) score += 1
  else score += priceCeiling <= conditions.budgetMax ? 10 : -10

  let distanceKm: number | null = null
  let travelMinutes: number | null = null
  if (
    conditions.latitude !== null &&
    conditions.longitude !== null &&
    place.latitude !== null &&
    place.longitude !== null
  ) {
    distanceKm = calculateDistanceKm(
      conditions.latitude,
      conditions.longitude,
      place.latitude,
      place.longitude,
    )
    travelMinutes = estimatedTravelMinutes(distanceKm, conditions.transport)
    if (conditions.travelMinutes === null) score += 4
    else if (travelMinutes <= conditions.travelMinutes) score += 14
    else score -= Math.min(16, Math.round((travelMinutes - conditions.travelMinutes) / 5))
  } else {
    score += 2
  }

  const stayTarget = { hour: 60, "half-day": 240, day: 480, evening: 180, night: 120 }[conditions.stay]
  if (place.average_stay_minutes !== null && place.average_stay_minutes !== undefined) {
    const difference = Math.abs(place.average_stay_minutes - stayTarget)
    score += difference <= 90 ? 7 : difference <= 180 ? 3 : -2
  }

  const detailsMatched = conditions.details.filter((detail) => detailChecks[detail]?.(place)).length
  score += Math.min(9, detailsMatched * 3)
  if (conditions.details.length > 0 && detailsMatched === 0) score -= 5

  const weatherResult = weatherCompatibility(place, weather)
  score += weatherResult.points

  const seasons = place.recommended_seasons ?? []
  if (seasons.includes("any") || seasons.includes(currentSeason())) score += 4
  if (conditions.favoritePlaceIds?.includes(place.id)) score += 4
  if (!conditions.visitedPlaceIds?.includes(place.id)) score += 3
  if (place.image_url) score += 2
  score += roleModifier(place, role)

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    matchedMoods,
    distanceKm,
    travelMinutes,
    weatherFit: weatherResult.fit,
  }
}

function priceSentence(place: Place) {
  if (place.price_type === "free") return "入場無料で楽しめます。"
  if (place.price_note) return `料金は「${place.price_note}」と案内されています。`
  return null
}

function childSentence(place: Place) {
  if (place.target_ages.includes("6-12")) return "小学生の子どもとのおでかけにも向いています。"
  if (place.target_ages.includes("3-5")) return "未就学の子どもと過ごす候補に向いています。"
  if (place.target_ages.includes("0-2")) return "乳幼児と一緒のおでかけ候補にできます。"
  return null
}

function buildReason(
  result: ReturnType<typeof scorePlace>,
  place: PlaceWithAvgRating,
  weather: WeatherSnapshot | null,
  conditions: RecommendationConditions,
) {
  const sentences = conditions.moods
    .filter((mood) => result.matchedMoods.includes(mood))
    .map((mood) => moodEvidence(place, mood).reason)
    .filter((reason): reason is string => Boolean(reason))
    .slice(0, 2)
  if (weather?.available) {
    if (weather.condition === "rainy" && (place.rainy_day_ok || place.indoor_type === "indoor")) {
      sentences.push("今日は雨の可能性がありますが、雨の日に対応できる施設です。")
    } else if (weather.condition === "sunny" && place.indoor_type !== "indoor") {
      sentences.push(`今日は${weather.conditionLabel}で、屋外でも過ごしやすい候補です。`)
    } else {
      sentences.push(`今日の${weather.conditionLabel}を踏まえて選びました。`)
    }
  }
  if (result.travelMinutes !== null && result.distanceKm !== null) {
    sentences.push(`現在地から約${result.travelMinutes}分（${result.distanceKm.toFixed(1)}km）の見込みです。`)
  }
  const price = priceSentence(place)
  if (price) sentences.push(price)
  const child = childSentence(place)
  if (child) sentences.push(child)
  if (place.opening_hours) sentences.push(`営業時間の登録情報は「${place.opening_hours}」です。`)
  if (sentences.length === 0 && place.description) {
    sentences.push(place.description.slice(0, 90).replace(/。?$/, "。"))
  }
  if (sentences.length === 0) {
    sentences.push(`${place.prefecture}${place.city}にある、今回の条件と相性のよい候補です。`)
  }
  return sentences.slice(0, 3).join("")
}

function canonicalPlaceName(name: string) {
  return name
    .normalize("NFKC")
    .replace(/（[^）]*再掲[^）]*）|再掲/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
}

export function recommendPlaces(
  places: PlaceWithAvgRating[],
  conditions: RecommendationConditions,
  weather: WeatherSnapshot | null,
): RecommendationResult[] {
  const selected = new Set<string>()
  const selectedNames = new Set<string>()
  const recommendations: RecommendationResult[] = []
  const candidates = places.filter((place) => matchesRequestedIntent(place, conditions.moods))

  for (const role of ROLE_ORDER) {
    const candidate = candidates
      .filter((place) => !selected.has(place.id) && !selectedNames.has(canonicalPlaceName(place.name)))
      .map((place) => ({ place, ...scorePlace(place, conditions, weather, role) }))
      .sort((left, right) => right.score - left.score)[0]

    if (!candidate) continue
    selected.add(candidate.place.id)
    selectedNames.add(canonicalPlaceName(candidate.place.name))
    recommendations.push({
      place: candidate.place,
      role,
      score: candidate.score,
      reason: buildReason(candidate, candidate.place, weather, conditions),
      distanceKm: candidate.distanceKm,
      travelMinutes: candidate.travelMinutes,
      matchedMoods: candidate.matchedMoods,
      weatherFit: candidate.weatherFit,
    })
  }

  return recommendations
}

export const DEFAULT_CONDITIONS: RecommendationConditions = {
  companion: "family",
  moods: ["kids"],
  budgetMax: 3000,
  travelMinutes: 30,
  stay: "half-day",
  transport: "car",
  details: [],
  latitude: null,
  longitude: null,
}

const VALID_COMPANIONS: CompanionType[] = ["solo", "couple", "friends", "family", "children", "multigenerational"]
const VALID_STAYS: StayChoice[] = ["hour", "half-day", "day", "evening", "night"]
const VALID_TRANSPORTS: TransportMode[] = ["car", "train", "walk", "bicycle"]
const VALID_DETAILS = new Set(Object.keys(detailChecks))

function pickEnum<T extends string>(raw: string | null, valid: readonly T[], fallback: T): T {
  return valid.includes(raw as T) ? (raw as T) : fallback
}

function pickNumber(raw: string | null, min: number, max: number, fallback: number | null): number | null {
  if (raw === null) return fallback
  if (raw === "any") return null
  const value = Number(raw)
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function pickCoordinate(raw: string | null, min: number, max: number): number | null {
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value < min || value > max) return null
  return value
}

export function conditionsFromSearchParams(params: URLSearchParams): RecommendationConditions {
  const requestedMoods = params.get("moods")?.split(",").filter(Boolean) ?? DEFAULT_CONDITIONS.moods
  const moods = requestedMoods.filter((mood): mood is MoodTag => VALID_MOODS.includes(mood as MoodTag))
  const latitude = pickCoordinate(params.get("lat"), 20, 50)
  const longitude = pickCoordinate(params.get("lng"), 120, 155)
  return {
    companion: pickEnum(params.get("companion"), VALID_COMPANIONS, DEFAULT_CONDITIONS.companion),
    moods: moods.length > 0 ? moods : DEFAULT_CONDITIONS.moods,
    budgetMax: pickNumber(params.get("budget"), 0, 1_000_000, DEFAULT_CONDITIONS.budgetMax),
    travelMinutes: pickNumber(params.get("travel"), 1, 600, DEFAULT_CONDITIONS.travelMinutes),
    stay: pickEnum(params.get("stay"), VALID_STAYS, DEFAULT_CONDITIONS.stay),
    transport: pickEnum(params.get("transport"), VALID_TRANSPORTS, DEFAULT_CONDITIONS.transport),
    details: params.get("details")?.split(",").filter((detail) => VALID_DETAILS.has(detail)) ?? [],
    // 片方だけの座標は距離計算に使えないため両方揃ったときのみ採用
    latitude: latitude !== null && longitude !== null ? latitude : null,
    longitude: latitude !== null && longitude !== null ? longitude : null,
  }
}

export function conditionsToSearchParams(conditions: RecommendationConditions) {
  const params = new URLSearchParams()
  params.set("companion", conditions.companion)
  params.set("moods", conditions.moods.join(","))
  params.set("budget", conditions.budgetMax === null ? "any" : String(conditions.budgetMax))
  params.set("travel", conditions.travelMinutes === null ? "any" : String(conditions.travelMinutes))
  params.set("stay", conditions.stay)
  params.set("transport", conditions.transport)
  if (conditions.details.length > 0) params.set("details", conditions.details.join(","))
  if (conditions.latitude !== null) params.set("lat", String(conditions.latitude))
  if (conditions.longitude !== null) params.set("lng", String(conditions.longitude))
  return params
}
