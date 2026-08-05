/**
 * 関西の主要駅マスタ（座標は公開情報の概算値）。
 * 全駅網羅ではなく「おでかけの起点になる駅」を選定している。
 * 関西は私鉄網が濃く、車を持たない世帯が多いため、駅起点の探索は
 * 全国型メディアが降りてこない差別化軸になる。
 */

export interface StationSeed {
  name: string
  line: string
  company: string
  prefecture: string
  latitude: number
  longitude: number
}

export const RAILWAY_LINES: Array<{ name: string; company: string }> = [
  { name: "JR大阪環状線", company: "JR西日本" },
  { name: "JR東海道本線（京都線・神戸線）", company: "JR西日本" },
  { name: "JR大和路線", company: "JR西日本" },
  { name: "JRゆめ咲線", company: "JR西日本" },
  { name: "阪急神戸線", company: "阪急電鉄" },
  { name: "阪急宝塚線", company: "阪急電鉄" },
  { name: "阪急京都線", company: "阪急電鉄" },
  { name: "阪神本線", company: "阪神電気鉄道" },
  { name: "南海本線", company: "南海電気鉄道" },
  { name: "南海高野線", company: "南海電気鉄道" },
  { name: "京阪本線", company: "京阪電気鉄道" },
  { name: "近鉄奈良線", company: "近畿日本鉄道" },
  { name: "近鉄南大阪線", company: "近畿日本鉄道" },
  { name: "大阪メトロ御堂筋線", company: "大阪メトロ" },
  { name: "大阪メトロ中央線", company: "大阪メトロ" },
  { name: "神戸市営地下鉄", company: "神戸市交通局" },
  { name: "京都市営地下鉄烏丸線", company: "京都市交通局" },
]

export const STATIONS: StationSeed[] = [
  // --- 大阪: ターミナル ---
  { name: "大阪", line: "JR東海道本線（京都線・神戸線）", company: "JR西日本", prefecture: "大阪府", latitude: 34.7024, longitude: 135.4959 },
  { name: "梅田", line: "阪急神戸線", company: "阪急電鉄", prefecture: "大阪府", latitude: 34.7055, longitude: 135.4983 },
  { name: "難波", line: "南海本線", company: "南海電気鉄道", prefecture: "大阪府", latitude: 34.6627, longitude: 135.5019 },
  { name: "なんば", line: "大阪メトロ御堂筋線", company: "大阪メトロ", prefecture: "大阪府", latitude: 34.6661, longitude: 135.5010 },
  { name: "天王寺", line: "JR大阪環状線", company: "JR西日本", prefecture: "大阪府", latitude: 34.6463, longitude: 135.5138 },
  { name: "京橋", line: "JR大阪環状線", company: "JR西日本", prefecture: "大阪府", latitude: 34.6969, longitude: 135.5342 },
  { name: "新大阪", line: "JR東海道本線（京都線・神戸線）", company: "JR西日本", prefecture: "大阪府", latitude: 34.7332, longitude: 135.5003 },
  { name: "本町", line: "大阪メトロ中央線", company: "大阪メトロ", prefecture: "大阪府", latitude: 34.6819, longitude: 135.4996 },
  { name: "心斎橋", line: "大阪メトロ御堂筋線", company: "大阪メトロ", prefecture: "大阪府", latitude: 34.6742, longitude: 135.5008 },
  // --- 大阪: おでかけ拠点 ---
  { name: "ユニバーサルシティ", line: "JRゆめ咲線", company: "JR西日本", prefecture: "大阪府", latitude: 34.6668, longitude: 135.4356 },
  { name: "大阪港", line: "大阪メトロ中央線", company: "大阪メトロ", prefecture: "大阪府", latitude: 34.6626, longitude: 135.4289 },
  { name: "万博記念公園", line: "大阪メトロ御堂筋線", company: "大阪メトロ", prefecture: "大阪府", latitude: 34.8074, longitude: 135.5348 },
  { name: "千里中央", line: "大阪メトロ御堂筋線", company: "大阪メトロ", prefecture: "大阪府", latitude: 34.8087, longitude: 135.4960 },
  { name: "堺東", line: "南海高野線", company: "南海電気鉄道", prefecture: "大阪府", latitude: 34.5738, longitude: 135.4870 },
  { name: "枚方市", line: "京阪本線", company: "京阪電気鉄道", prefecture: "大阪府", latitude: 34.8145, longitude: 135.6503 },
  { name: "高槻市", line: "阪急京都線", company: "阪急電鉄", prefecture: "大阪府", latitude: 34.8511, longitude: 135.6178 },
  { name: "箕面", line: "阪急宝塚線", company: "阪急電鉄", prefecture: "大阪府", latitude: 34.8283, longitude: 135.4703 },
  { name: "りんくうタウン", line: "南海本線", company: "南海電気鉄道", prefecture: "大阪府", latitude: 34.4118, longitude: 135.3007 },

  // --- 兵庫 ---
  { name: "三ノ宮", line: "JR東海道本線（京都線・神戸線）", company: "JR西日本", prefecture: "兵庫県", latitude: 34.6949, longitude: 135.1953 },
  { name: "神戸三宮", line: "阪急神戸線", company: "阪急電鉄", prefecture: "兵庫県", latitude: 34.6947, longitude: 135.1938 },
  { name: "元町", line: "JR東海道本線（京都線・神戸線）", company: "JR西日本", prefecture: "兵庫県", latitude: 34.6892, longitude: 135.1873 },
  { name: "新神戸", line: "神戸市営地下鉄", company: "神戸市交通局", prefecture: "兵庫県", latitude: 34.7011, longitude: 135.1972 },
  { name: "姫路", line: "JR東海道本線（京都線・神戸線）", company: "JR西日本", prefecture: "兵庫県", latitude: 34.8267, longitude: 134.6903 },
  { name: "西宮北口", line: "阪急神戸線", company: "阪急電鉄", prefecture: "兵庫県", latitude: 34.7383, longitude: 135.3620 },
  { name: "宝塚", line: "阪急宝塚線", company: "阪急電鉄", prefecture: "兵庫県", latitude: 34.8003, longitude: 135.3475 },
  { name: "甲子園", line: "阪神本線", company: "阪神電気鉄道", prefecture: "兵庫県", latitude: 34.7245, longitude: 135.3617 },
  { name: "明石", line: "JR東海道本線（京都線・神戸線）", company: "JR西日本", prefecture: "兵庫県", latitude: 34.6491, longitude: 134.9925 },
  { name: "有馬温泉", line: "神戸市営地下鉄", company: "神戸市交通局", prefecture: "兵庫県", latitude: 34.7974, longitude: 135.2489 },

  // --- 京都 ---
  { name: "京都", line: "JR東海道本線（京都線・神戸線）", company: "JR西日本", prefecture: "京都府", latitude: 34.9858, longitude: 135.7588 },
  { name: "四条", line: "京都市営地下鉄烏丸線", company: "京都市交通局", prefecture: "京都府", latitude: 35.0035, longitude: 135.7594 },
  { name: "河原町", line: "阪急京都線", company: "阪急電鉄", prefecture: "京都府", latitude: 35.0037, longitude: 135.7686 },
  { name: "嵐山", line: "阪急京都線", company: "阪急電鉄", prefecture: "京都府", latitude: 35.0128, longitude: 135.6773 },
  { name: "宇治", line: "京阪本線", company: "京阪電気鉄道", prefecture: "京都府", latitude: 34.8919, longitude: 135.8071 },
  { name: "二条", line: "京都市営地下鉄烏丸線", company: "京都市交通局", prefecture: "京都府", latitude: 35.0107, longitude: 135.7387 },

  // --- 奈良 ---
  { name: "近鉄奈良", line: "近鉄奈良線", company: "近畿日本鉄道", prefecture: "奈良県", latitude: 34.6836, longitude: 135.8296 },
  { name: "奈良", line: "JR大和路線", company: "JR西日本", prefecture: "奈良県", latitude: 34.6798, longitude: 135.8189 },
  { name: "大和西大寺", line: "近鉄奈良線", company: "近畿日本鉄道", prefecture: "奈良県", latitude: 34.6934, longitude: 135.7833 },
  { name: "橿原神宮前", line: "近鉄南大阪線", company: "近畿日本鉄道", prefecture: "奈良県", latitude: 34.4837, longitude: 135.7930 },

  // --- 滋賀 ---
  { name: "大津", line: "JR東海道本線（京都線・神戸線）", company: "JR西日本", prefecture: "滋賀県", latitude: 35.0116, longitude: 135.8656 },
  { name: "草津", line: "JR東海道本線（京都線・神戸線）", company: "JR西日本", prefecture: "滋賀県", latitude: 35.0180, longitude: 135.9614 },
  { name: "近江八幡", line: "JR東海道本線（京都線・神戸線）", company: "JR西日本", prefecture: "滋賀県", latitude: 35.1300, longitude: 136.0980 },
  { name: "彦根", line: "JR東海道本線（京都線・神戸線）", company: "JR西日本", prefecture: "滋賀県", latitude: 35.2647, longitude: 136.2594 },

  // --- 和歌山 ---
  { name: "和歌山", line: "JR大和路線", company: "JR西日本", prefecture: "和歌山県", latitude: 34.2408, longitude: 135.1955 },
  { name: "白浜", line: "JR大和路線", company: "JR西日本", prefecture: "和歌山県", latitude: 33.6797, longitude: 135.3739 },
  { name: "和歌山市", line: "南海本線", company: "南海電気鉄道", prefecture: "和歌山県", latitude: 34.2333, longitude: 135.1670 },
]

/** 駅からの距離の絞り込み段階 (m) */
export const WALK_DISTANCE_STEPS = [400, 800, 1200] as const

/** 徒歩分の目安 (不動産表示に合わせ 80m/分) */
export function walkMinutes(distanceMeters: number): number {
  return Math.max(1, Math.ceil(distanceMeters / 80))
}
