import type { PlaceWithAvgRating } from "@/lib/places"

/**
 * 季節の遊び情報。
 * 「いま何が旬か」をトップで出し分ける。分類バックフィル済みの
 * カテゴリー/タグを使わず、施設の素性 (名前・説明・屋内外) から
 * 判定するため migration/分類の適用状況に依存しない。
 */

export type Season = "spring" | "summer" | "autumn" | "winter"

export function currentSeason(now = new Date()): Season {
  const month = now.getMonth() + 1
  if (month >= 3 && month <= 5) return "spring"
  if (month >= 6 && month <= 8) return "summer"
  if (month >= 9 && month <= 11) return "autumn"
  return "winter"
}

export interface SeasonalTheme {
  key: string
  title: string
  /** 一覧へのリンク (無ければカルーセルのみ) */
  href?: string
  match: (place: PlaceWithAvgRating) => boolean
}

const text = (place: PlaceWithAvgRating) => `${place.name} ${place.description ?? ""}`

const THEMES: Record<Season, SeasonalTheme[]> = {
  spring: [
    {
      key: "sakura",
      title: "桜・お花見スポット",
      match: (place) => /桜|さくら|花見|梅林|チューリップ|ネモフィラ|花畑|フラワー/.test(text(place)),
    },
    {
      key: "picnic",
      title: "ぽかぽかピクニック日和",
      match: (place) => place.indoor_type !== "indoor" && /公園|芝生|広場|緑地|牧場/.test(text(place)),
    },
    {
      key: "animal",
      title: "動物とふれあう",
      match: (place) => /動物園|どうぶつ|牧場|ふれあい|水族館/.test(text(place)),
    },
  ],
  summer: [
    {
      key: "water",
      title: "夏を満喫！水遊び・プール",
      match: (place) => /プール|水遊び|じゃぶじゃぶ|噴水|ウォーター|海水浴|ビーチ|海岸|川遊び|渓流/.test(text(place)),
    },
    {
      key: "cool-indoor",
      title: "涼しい屋内でゆっくり",
      match: (place) =>
        (place.indoor_type === "indoor" || place.rainy_day_ok) &&
        /water|プール/i.test(text(place)) === false,
    },
    {
      key: "camp",
      title: "夏休みのアウトドア",
      match: (place) => /キャンプ|バーベキュー|BBQ|グランピング|アスレチック|釣り/.test(text(place)),
    },
  ],
  autumn: [
    {
      key: "koyo",
      title: "紅葉・秋の景色",
      match: (place) => /紅葉|もみじ|渓谷|高原|山$|寺$|神社|庭園/.test(text(place)),
    },
    {
      key: "harvest",
      title: "実りの季節の味覚狩り",
      match: (place) => /狩り|農園|果樹園|収穫|いも掘り|農業体験|道の駅/.test(text(place)),
    },
    {
      key: "sport",
      title: "外で体を動かす",
      match: (place) => place.indoor_type !== "indoor" && /アスレチック|公園|サイクリング|ハイキング/.test(text(place)),
    },
  ],
  winter: [
    {
      key: "illumination",
      title: "冬のイルミネーション",
      match: (place) => /イルミネーション|ライトアップ|夜景|展望|タワー/.test(text(place)),
    },
    {
      key: "snow",
      title: "雪あそび・ウィンタースポーツ",
      match: (place) => /スキー|スノー|雪|スケート|ソリ/.test(text(place)),
    },
    {
      key: "warm",
      title: "あったかい屋内スポット",
      match: (place) => place.indoor_type === "indoor" || /温泉|スパ|足湯/.test(text(place)),
    },
  ],
}

export const SEASON_LABELS: Record<Season, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
}

/** いまの季節のテーマ行を、実際に該当スポットがあるものだけ返す */
export function seasonalRows(
  places: PlaceWithAvgRating[],
  now = new Date(),
  minCount = 6,
  perRow = 12,
): Array<{ theme: SeasonalTheme; places: PlaceWithAvgRating[] }> {
  const season = currentSeason(now)
  const used = new Set<string>()
  const rows: Array<{ theme: SeasonalTheme; places: PlaceWithAvgRating[] }> = []

  for (const theme of THEMES[season]) {
    const matched = places
      .filter((place) => !used.has(place.id) && place.image_url && theme.match(place))
      .slice(0, perRow)
    if (matched.length >= minCount) {
      matched.forEach((place) => used.add(place.id))
      rows.push({ theme, places: matched })
    }
  }
  return rows
}
