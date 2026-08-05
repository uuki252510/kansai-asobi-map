import { calcDistance, type PlaceWithAvgRating } from "@/lib/places"
import type { Prefecture } from "@/lib/supabase/database.types"

/**
 * エリアハブ定義。migration 20260805000002 の areas テーブルと同内容。
 * Phase 1 ではコード定数を正とし (migration未適用環境でも動作させるため)、
 * Phase 2 で admin 管理に移行する際に DB 読みへ切り替える。
 */
export interface AreaDefinition {
  slug: string
  name: string
  kind: "prefecture" | "city" | "station" | "landmark"
  prefecture: Prefecture
  centerLat: number
  centerLng: number
  radiusKm: number
  parentSlug: string | null
  sortOrder: number
  description: string
}

export const AREAS: AreaDefinition[] = [
  { slug: "osaka", name: "大阪府", kind: "prefecture", prefecture: "大阪府", centerLat: 34.6863, centerLng: 135.52, radiusKm: 60, parentSlug: null, sortOrder: 10, description: "大阪府全域のおでかけスポット。都心の屋内施設から郊外の大型公園まで。" },
  { slug: "hyogo", name: "兵庫県", kind: "prefecture", prefecture: "兵庫県", centerLat: 34.6913, centerLng: 135.183, radiusKm: 80, parentSlug: null, sortOrder: 20, description: "神戸・阪神間から姫路、淡路、但馬まで。海も山も楽しめる兵庫県のスポット。" },
  { slug: "kyoto", name: "京都府", kind: "prefecture", prefecture: "京都府", centerLat: 35.0116, centerLng: 135.7681, radiusKm: 60, parentSlug: null, sortOrder: 30, description: "歴史とあそびが同居する京都府。市内の定番から海の京都まで。" },
  { slug: "nara", name: "奈良県", kind: "prefecture", prefecture: "奈良県", centerLat: 34.6851, centerLng: 135.805, radiusKm: 50, parentSlug: null, sortOrder: 40, description: "奈良公園の鹿だけじゃない。大自然と歴史遺産の奈良県のスポット。" },
  { slug: "shiga", name: "滋賀県", kind: "prefecture", prefecture: "滋賀県", centerLat: 35.0045, centerLng: 135.8686, radiusKm: 50, parentSlug: null, sortOrder: 50, description: "琵琶湖を中心に、水遊びもアウトドアも充実の滋賀県のスポット。" },
  { slug: "wakayama", name: "和歌山県", kind: "prefecture", prefecture: "和歌山県", centerLat: 34.226, centerLng: 135.1675, radiusKm: 80, parentSlug: null, sortOrder: 60, description: "アドベンチャーワールドから白浜の海まで。和歌山県のおでかけスポット。" },
  { slug: "umeda", name: "梅田・大阪駅", kind: "station", prefecture: "大阪府", centerLat: 34.7025, centerLng: 135.4959, radiusKm: 2.5, parentSlug: "osaka", sortOrder: 110, description: "梅田・大阪駅周辺。雨の日も安心の屋内スポットが集まる関西最大のターミナル。" },
  { slug: "namba", name: "なんば・心斎橋", kind: "station", prefecture: "大阪府", centerLat: 34.6666, centerLng: 135.501, radiusKm: 2.5, parentSlug: "osaka", sortOrder: 120, description: "なんば・心斎橋エリア。食べ歩きもエンタメも楽しめるミナミの中心。" },
  { slug: "tennoji", name: "天王寺・阿倍野", kind: "station", prefecture: "大阪府", centerLat: 34.6462, centerLng: 135.5134, radiusKm: 2.5, parentSlug: "osaka", sortOrder: 130, description: "天王寺動物園やハルカスなど、家族で1日遊べる天王寺・阿倍野エリア。" },
  { slug: "osaka-bay", name: "大阪ベイエリア", kind: "landmark", prefecture: "大阪府", centerLat: 34.6545, centerLng: 135.429, radiusKm: 5, parentSlug: "osaka", sortOrder: 140, description: "海遊館やUSJを擁する大阪ベイエリア。1日たっぷり遊べる大型スポット揃い。" },
  { slug: "banpaku", name: "万博記念公園周辺", kind: "landmark", prefecture: "大阪府", centerLat: 34.8051, centerLng: 135.5323, radiusKm: 4, parentSlug: "osaka", sortOrder: 150, description: "万博記念公園とエキスポシティ。緑と遊びがそろう北大阪の定番。" },
  { slug: "sannomiya", name: "三宮・元町", kind: "station", prefecture: "兵庫県", centerLat: 34.6946, centerLng: 135.198, radiusKm: 2.5, parentSlug: "hyogo", sortOrder: 210, description: "三宮・元町エリア。港町神戸の中心で、動物園も科学館も徒歩圏。" },
  { slug: "kobe-rokko", name: "六甲山・摩耶山", kind: "landmark", prefecture: "兵庫県", centerLat: 34.778, centerLng: 135.232, radiusKm: 5, parentSlug: "hyogo", sortOrder: 220, description: "六甲山・摩耶山エリア。アスレチックや牧場、夜景まで山の遊びが凝縮。" },
  { slug: "himeji", name: "姫路", kind: "city", prefecture: "兵庫県", centerLat: 34.8151, centerLng: 134.6854, radiusKm: 8, parentSlug: "hyogo", sortOrder: 230, description: "姫路城だけじゃない。水族館も動物園もそろう姫路エリア。" },
  { slug: "kyoto-city", name: "京都市内", kind: "city", prefecture: "京都府", centerLat: 35.0116, centerLng: 135.7681, radiusKm: 8, parentSlug: "kyoto", sortOrder: 310, description: "京都市内の定番スポット。水族館・鉄道博物館・寺社めぐりまで。" },
  { slug: "arashiyama", name: "嵐山・嵯峨野", kind: "landmark", prefecture: "京都府", centerLat: 35.0094, centerLng: 135.6668, radiusKm: 3, parentSlug: "kyoto", sortOrder: 320, description: "嵐山・嵯峨野エリア。竹林とトロッコ、川遊びの自然派エリア。" },
  { slug: "nara-park", name: "奈良公園周辺", kind: "landmark", prefecture: "奈良県", centerLat: 34.6851, centerLng: 135.843, radiusKm: 3, parentSlug: "nara", sortOrder: 410, description: "奈良公園と周辺エリア。鹿と大仏、ミュージアムが徒歩圏に。" },
  { slug: "biwako", name: "琵琶湖周辺", kind: "landmark", prefecture: "滋賀県", centerLat: 35.25, centerLng: 136.08, radiusKm: 25, parentSlug: "shiga", sortOrder: 510, description: "琵琶湖周辺の水遊び・アウトドアスポット。夏のおでかけの定番。" },
  { slug: "shirahama", name: "白浜", kind: "landmark", prefecture: "和歌山県", centerLat: 33.6789, centerLng: 135.348, radiusKm: 6, parentSlug: "wakayama", sortOrder: 610, description: "アドベンチャーワールドと白良浜。関西屈指のファミリーリゾート白浜。" },
]

export function getAreaBySlug(slug: string): AreaDefinition | null {
  return AREAS.find((area) => area.slug === slug) ?? null
}

export function getChildAreas(parentSlug: string): AreaDefinition[] {
  return AREAS.filter((area) => area.parentSlug === parentSlug).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getSiblingAreas(area: AreaDefinition): AreaDefinition[] {
  if (!area.parentSlug) return []
  return AREAS.filter((candidate) => candidate.parentSlug === area.parentSlug && candidate.slug !== area.slug)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

/**
 * エリア所属判定。府県は prefecture 一致、それ以外は中心座標からの
 * Haversine 距離が radiusKm 以内 (かつ同一府県) のスポット。
 */
export function getPlacesForArea(area: AreaDefinition, allPlaces: PlaceWithAvgRating[]): PlaceWithAvgRating[] {
  if (area.kind === "prefecture") {
    return allPlaces.filter((place) => place.prefecture === area.prefecture)
  }
  return allPlaces.filter((place) => {
    if (place.prefecture !== area.prefecture) return false
    if (place.latitude === null || place.longitude === null) return false
    return calcDistance(area.centerLat, area.centerLng, place.latitude, place.longitude) <= area.radiusKm
  })
}
