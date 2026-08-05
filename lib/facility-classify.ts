import type { Place } from "@/lib/supabase/database.types"

/**
 * 既存 places の情報から カテゴリー / タグ / 設備 を推定する純関数。
 * バックフィルスクリプトと admin の入力補助の両方から使う (推測結果は
 * 「候補」であり、管理画面で人が確認・上書きできることを前提とする)。
 */

type ClassifyInput = Pick<
  Place,
  | "name"
  | "description"
  | "indoor_type"
  | "price_type"
  | "target_ages"
  | "mood_tags"
  | "companion_types"
  | "rainy_day_ok"
  | "has_parking"
  | "has_nursing_room"
  | "has_diaper_space"
  | "average_stay_minutes"
> &
  Partial<
    Pick<Place, "stroller_accessible" | "barrier_free" | "pet_friendly" | "meal_available" | "reservation_required" | "same_day_booking">
  >

/** 名称パターン → カテゴリーslug。上から順に評価し、最初の一致を採用する */
const CATEGORY_RULES: Array<[RegExp, string]> = [
  // 固有名で水族館と分かるもの (海遊館・ニフレル等) も拾う
  [/水族館|アクアリウム|ニフレル|海遊館|マリンピア|マリンワールド|すいぞくかん/, "aquarium"],
  [/動物園|どうぶつ王国|サファリ/, "zoo"],
  [/植物園|フラワーパーク|花畑|ガーデン/, "botanical-garden"],
  [/牧場|ファーム(?!.*ステイ)/, "farm"],
  [/遊園地|ランド$|パラダイス/, "amusement-park"],
  [/テーマパーク|ユニバーサル|スタジオ・?ジャパン|ワールド$/, "theme-park"],
  [/プラネタリウム|天文|星空/, "planetarium"],
  [/科学館|科学|サイエンス/, "science-museum"],
  [/博物館|資料館|ミュージアム|歴史館|記念館/, "museum"],
  [/美術館|アートギャラリー/, "museum"],
  [/工場見学|工場|ファクトリー|製作所/, "factory-tour"],
  [/いちご狩り|イチゴ狩り/, "strawberry-picking"],
  [/ぶどう狩り|みかん狩り|なし狩り|果物狩り|味覚狩り|果樹園/, "fruit-picking"],
  [/農業体験|農園(?!.*カフェ)/, "agriculture"],
  [/キャンプ|オートキャンプ|グランピング/, "campground"],
  [/バーベキュー|BBQ/, "bbq"],
  [/釣り|フィッシング/, "fishing"],
  [/海水浴|海岸|ビーチ|浜$/, "beach"],
  [/プール|ウォーターパーク|water/i, "pool"],
  [/温泉|スパ|湯$|健康ランド|足湯/, "onsen"],
  [/スキー|スノーパーク/, "ski"],
  [/スケート|アイスアリーナ/, "skating"],
  [/アスレチック|フィールドアスレチック|ジップライン|ターザン/, "athletic"],
  [/道の駅/, "michinoeki"],
  [/ショッピング|アウトレット|モール|百貨店|商店街/, "shopping"],
  [/カフェ|喫茶/, "cafe"],
  [/レストラン|食堂|グルメ/, "restaurant"],
  [/ホテル|旅館|宿$|ロッジ|コテージ/, "hotel"],
  [/体験|ワークショップ|陶芸|ガラス工房|クラフト/, "experience"],
  [/展望|タワー|城$|城跡|城址|神社|大社|寺$|寺院|遺跡/, "sightseeing"],
  [/公園|緑地|園地|広場/, "park"],
  [/スポーツ|競技場|体育館|グラウンド|アリーナ/, "sports"],
  [/キッズ|こども|子ども|児童館|ボーネルンド|キドキド/, "indoor-playground"],
  [/ゲームセンター|ボウリング|カラオケ|アミューズメント/, "amusement"],
  [/自然|渓谷|高原|湿原|森林|滝$|鍾乳洞|洞窟|湖$|湖畔/, "nature"],
]

export function inferCategorySlugs(place: ClassifyInput): string[] {
  const haystack = `${place.name} ${place.description ?? ""}`
  const slugs: string[] = []
  for (const [pattern, slug] of CATEGORY_RULES) {
    if (pattern.test(place.name) && !slugs.includes(slug)) slugs.push(slug)
    if (slugs.length >= 3) break
  }
  // 名称で拾えなかったら説明文で1つだけ補う
  if (slugs.length === 0) {
    for (const [pattern, slug] of CATEGORY_RULES) {
      if (pattern.test(haystack)) {
        slugs.push(slug)
        break
      }
    }
  }
  // 屋内キッズ施設の補完
  if (place.indoor_type === "indoor" && place.target_ages.length > 0 && !slugs.includes("indoor-playground")) {
    slugs.push("indoor-playground")
  }
  return slugs.length > 0 ? slugs.slice(0, 3) : ["other"]
}

const MOOD_TO_TAG: Record<string, string> = {
  active: "athletic-tag",
  kids: "family",
  food: "adults-too",
  healing: "picnic",
  photo: "adults-too",
  rain: "rainy-day-ok",
  discovery: "adults-too",
  shopping: "adults-too",
  relax: "picnic",
}

const COMPANION_TO_TAG: Record<string, string> = {
  couple: "date",
  family: "family",
  children: "family",
  friends: "friends",
  multigenerational: "family",
}

export function inferTagSlugs(place: ClassifyInput): string[] {
  const tags = new Set<string>()
  const haystack = `${place.name} ${place.description ?? ""}`

  if (place.rainy_day_ok || place.indoor_type === "indoor") tags.add("rainy-day-ok")
  if (place.price_type === "free") tags.add("free")
  if (place.has_nursing_room) tags.add("nursing-room")
  if (place.has_diaper_space) tags.add("diaper-space")
  if (place.stroller_accessible === true) tags.add("stroller-ok")
  if (place.pet_friendly === true) tags.add("pet-friendly")
  if (place.reservation_required === false) tags.add("no-reservation")
  if (place.same_day_booking === true) tags.add("same-day-reservation")
  if ((place.average_stay_minutes ?? 0) >= 240) tags.add("all-day")
  if (place.target_ages.includes("0-2")) tags.add("baby-friendly")
  if (place.target_ages.includes("6-12")) tags.add("elementary")

  for (const mood of place.mood_tags ?? []) {
    const tag = MOOD_TO_TAG[mood]
    if (tag) tags.add(tag)
  }
  for (const companion of place.companion_types ?? []) {
    const tag = COMPANION_TO_TAG[companion]
    if (tag) tags.add(tag)
  }

  if (/水遊び|じゃぶじゃぶ|噴水|水路/.test(haystack)) tags.add("water-play")
  if (/川遊び|渓流|河原/.test(haystack)) tags.add("river-play")
  if (/ふれあい|えさやり|餌やり|乗馬|動物と/.test(haystack)) tags.add("animal-encounter")
  if (/ピクニック|芝生|お弁当/.test(haystack)) tags.add("picnic")
  if (/ゴーカート|カート/.test(haystack)) tags.add("go-kart")
  if (/アスレチック|遊具/.test(haystack)) tags.add("athletic-tag")
  if (/迷路/.test(haystack)) tags.add("giant-maze")
  if (/トリックアート|だまし絵/.test(haystack)) tags.add("trick-art")
  if (/電車|鉄道|SL|新幹線/.test(haystack)) tags.add("train-lover")
  if (/クライミング|ボルダリング/.test(haystack)) tags.add("rock-climbing")
  if (/穴場|知る人ぞ知る/.test(haystack)) tags.add("hidden-gem")

  return [...tags]
}

export function inferAmenitySlugs(place: ClassifyInput): string[] {
  const amenities = new Set<string>()
  if (place.has_parking) amenities.add("parking")
  if (place.has_nursing_room) amenities.add("nursing-room")
  if (place.has_diaper_space) amenities.add("diaper-table")
  if (place.stroller_accessible === true) amenities.add("stroller-ok")
  if (place.barrier_free === true) {
    amenities.add("barrier-free")
    amenities.add("multi-toilet")
  }
  if (place.pet_friendly === true) amenities.add("pet-allowed")
  if (place.meal_available === true) amenities.add("restaurant")
  return [...amenities]
}

/** 年齢帯おすすめ度 (0-5)。target_ages と各スコアから推定 */
export function inferAgeSuitability(place: ClassifyInput & Partial<Pick<Place, "child_fun_score" | "date_score" | "activity_level">>): Array<{ age_band: string; suitability: number }> {
  const bands: Array<{ age_band: string; suitability: number }> = []
  const childScore = place.child_fun_score ?? null
  const push = (band: string, value: number) => {
    if (value > 0) bands.push({ age_band: band, suitability: Math.min(5, value) })
  }

  if (place.target_ages.includes("0-2")) {
    push("baby", place.has_nursing_room && place.has_diaper_space ? 5 : 4)
    push("toddler", 4)
  }
  if (place.target_ages.includes("3-5")) push("preschool", childScore && childScore >= 70 ? 5 : 4)
  if (place.target_ages.includes("6-12")) push("elementary", childScore && childScore >= 70 ? 5 : 4)
  if ((place.date_score ?? 0) >= 60) push("adult", 4)
  if ((place.activity_level ?? 0) >= 60) push("junior_high", 3)
  if (place.indoor_type !== "outdoor" && (place.barrier_free === true)) push("senior", 4)

  return bands
}
