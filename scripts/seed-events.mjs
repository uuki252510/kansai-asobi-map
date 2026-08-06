/**
 * 2026年夏の関西の花火大会を投入する。
 *
 * 出典: ウォーカープラス「2026年8月開催の関西花火大会」
 *   https://hanabi.walkerplus.com/calendar/08/ar0700/
 *   https://hanabi.walkerplus.com/calendar/08/ar0700/2.html
 *   SBI舞花火のみ個別ページで打上時刻とアクセスを確認
 *   https://hanabi.walkerplus.com/detail/ar0727e193439/
 *
 * 開催日・会場・打ち上げ数は出典に書かれている値をそのまま入れる。
 * 開始時刻はほとんどの大会で未発表のため start_time_unknown を立て、
 * 画面には日付だけを出す(0:00開始と表示すると誤情報になるため)。
 * 荒天時の対応・料金・主催者は出典に記載が無いので null のままにする。
 *
 * Dry run: node scripts/seed-events.mjs
 * Apply:   node scripts/seed-events.mjs --apply
 */

import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"

const env = {}
for (const line of readFileSync("./.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "")
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const apply = process.argv.includes("--apply")

/** 日付だけ分かっているイベントの期間。JSTの0:00〜23:59とし、表示は日付のみにする。 */
const day = (date) => ({ start: `${date}T00:00:00+09:00`, end: `${date}T23:59:00+09:00` })

const EVENTS = [
  {
    slug: "biwako-hanabi-2026", name: "第40回記念大会 2026 びわ湖大花火大会",
    prefecture: "滋賀県", city: "大津市", venue: "滋賀県営大津港沖水面一帯",
    ...day("2026-08-06"), scale: "約1万2000発(予定)", paidSeat: true,
  },
  {
    slug: "kotobon-2026", name: "ことう夏まつり ことぼん 2026",
    prefecture: "滋賀県", city: "東近江市", venue: "湖東ひばり公園",
    ...day("2026-08-08"), scale: null,
  },
  {
    slug: "ibaraki-benten-hanabi-2026", name: "第71回 茨木辯天花火大会",
    prefecture: "大阪府", city: "茨木市", venue: "辯天宗冥應寺境内",
    ...day("2026-08-08"), scale: "約3000発",
  },
  {
    slug: "sennichie-kankosai-2026", name: "千日会観光祭",
    prefecture: "京都府", city: "京丹後市", venue: "久美浜公園(浜公園隣)",
    ...day("2026-08-09"), scale: "約1500発",
  },
  {
    slug: "fukusaki-natsumatsuri-2026", name: "第51回 福崎夏まつり",
    prefecture: "兵庫県", city: "神崎郡福崎町", venue: "福崎町立福崎東中学校",
    ...day("2026-08-09"), scale: "約700発＋記念花火(発数未定)",
  },
  {
    slug: "nanki-shirahama-hanabi-festa-2026", name: "南紀白浜花火フェスタ2026",
    prefecture: "和歌山県", city: "西牟婁郡白浜町", venue: "白良浜海水浴場",
    ...day("2026-08-10"), scale: "約2500発",
  },
  {
    slug: "fukuchiyama-hanabi-2026", name: "福知山HANABI2026",
    prefecture: "京都府", city: "福知山市", venue: "由良川河川敷",
    ...day("2026-08-11"), scale: "6000発", paidSeat: true,
  },
  {
    slug: "nachikatsuura-hanabi-2026", name: "第17回 那智勝浦町花火大会",
    prefecture: "和歌山県", city: "東牟婁郡那智勝浦町", venue: "那智湾(ブルービーチなち)",
    ...day("2026-08-11"), scale: "約9000発",
  },
  {
    slug: "yamasaki-noryo-hanabi-2026", name: "第39回 山崎納涼夏祭り花火大会",
    prefecture: "兵庫県", city: "宍粟市", venue: "せせらぎ公園多目的広場",
    ...day("2026-08-13"), scale: "1300発", paidSeat: true,
  },
  {
    slug: "shingu-hanabi-2026", name: "熊野徐福万燈祭 第64回 新宮花火大会",
    prefecture: "和歌山県", city: "新宮市", venue: "熊野川河川敷",
    ...day("2026-08-13"), scale: "約6000発",
  },
  {
    slug: "yoshinogawa-matsuri-hanabi-2026", name: "第52回 吉野川祭り 納涼花火大会",
    prefecture: "奈良県", city: "五條市", venue: "吉野川大川橋上流側河川敷",
    ...day("2026-08-15"), scale: "約4000発", paidSeat: true,
  },
  {
    slug: "miyazu-toronagashi-hanabi-2026", name: "宮津燈籠流し花火大会",
    prefecture: "京都府", city: "宮津市", venue: "宮津市島崎公園沖の宮津湾",
    ...day("2026-08-16"), scale: null, paidSeat: true,
  },
  {
    slug: "nishiwaki-kurodasho-natsumatsuri-2026", name: "第47回 にしわき市・黒田庄夏まつり",
    prefecture: "兵庫県", city: "西脇市", venue: "黒田庄グラウンド",
    ...day("2026-08-16"), scale: "約400発",
  },
  {
    slug: "asago-natsumatsuri-hanabi-2026", name: "あさご夏祭り花火大会",
    prefecture: "兵庫県", city: "朝来市", venue: "朝来市朝来グラウンド付近",
    ...day("2026-08-16"), scale: "8シリーズ",
  },
  {
    slug: "haga-hanabi-2026", name: "はが祭り 第53回 波賀花火大会",
    prefecture: "兵庫県", city: "宍粟市", venue: "波賀総合スポーツ公園 駐車場",
    ...day("2026-08-16"), scale: null,
  },
  {
    slug: "kinosaki-yumehanabi-2026", name: "城崎温泉夏物語「夢花火」",
    prefecture: "兵庫県", city: "豊岡市", venue: "城崎温泉街",
    start: "2026-07-30T00:00:00+09:00", end: "2026-08-21T23:59:00+09:00",
    scale: "約200発", note: "平日のみの開催です。",
  },
  {
    slug: "sbi-maihanabi-sennan-2026", name: "SBI舞花火 in 大阪・泉南",
    prefecture: "大阪府", city: "泉南市", venue: "SENNAN LONG PARK(泉南りんくう公園)",
    ...day("2026-08-22"), scale: null, paidSeat: true,
    placeId: "44429fb0-0416-47ae-8ed9-d8897ab6619a",
    note: "打ち上げは19:15開始予定です。",
    access: "南海本線樽井駅から徒歩10分",
    officialUrl: "https://hanabi.walkerplus.com/detail/ar0727e193439/",
  },
  {
    slug: "yumesaki-furusato-matsuri-2026", name: "夢さきふるさとまつり",
    prefecture: "兵庫県", city: "姫路市", venue: "夢前川河川公園",
    ...day("2026-08-22"), scale: null,
  },
  {
    slug: "asago-santo-natsumatsuri-2026", name: "朝来市山東夏祭り",
    prefecture: "兵庫県", city: "朝来市", venue: "小谷与布土川左岸",
    ...day("2026-08-22"), scale: "約1400発", paidSeat: true,
  },
]

function buildSummary(event) {
  const parts = [`${event.prefecture}${event.city}の${event.venue}で開催される花火大会です。`]
  if (event.scale) parts.push(`打ち上げ数は${event.scale}。`)
  if (event.paidSeat) parts.push("有料観覧席があります。")
  if (event.note) parts.push(event.note)
  return parts.join("")
}

function buildDescription(event) {
  const lines = ["## 開催概要", "", `- 会場: ${event.venue}`, `- 場所: ${event.prefecture}${event.city}`]
  if (event.scale) lines.push(`- 打ち上げ数: ${event.scale}`)
  if (event.paidSeat) lines.push("- 有料観覧席: あり")
  if (event.access) lines.push(`- アクセス: ${event.access}`)
  lines.push(
    "",
    "## お出かけ前に",
    "",
    "開催時刻・有料席の価格・荒天時の対応は主催者の発表をご確認ください。",
    "花火大会は天候によって順延・中止になることがあります。",
  )
  return lines.join("\n")
}

const rows = EVENTS.map((event) => ({
  slug: event.slug,
  name: event.name,
  event_category: "fireworks",
  summary: buildSummary(event),
  description: buildDescription(event),
  venue_name: event.venue,
  prefecture: event.prefecture,
  city: event.city,
  address: `${event.prefecture}${event.city}`,
  start_at: event.start,
  end_at: event.end,
  // 開始時刻は出典に記載が無い。0:00開始と表示しないためのフラグ
  start_time_unknown: true,
  place_id: event.placeId ?? null,
  access_note: event.access ?? null,
  official_url: event.officialUrl ?? null,
  is_free: false,
  status: "published",
  published_at: new Date().toISOString(),
}))

console.log(`投入対象 ${rows.length} 件`)
const byPrefecture = {}
rows.forEach((r) => { byPrefecture[r.prefecture] = (byPrefecture[r.prefecture] ?? 0) + 1 })
console.log(`府県別: ${Object.entries(byPrefecture).map(([k, v]) => `${k}${v}`).join(" / ")}`)
const upcoming = rows.filter((r) => new Date(r.end_at) >= new Date()).length
console.log(`これから開催: ${upcoming} 件 / 終了済み: ${rows.length - upcoming} 件`)
rows.slice(0, 3).forEach((r) => console.log(`   ${r.start_at.slice(0, 10)} ${r.name} @ ${r.venue_name}`))

if (!apply) {
  console.log("\n(確認モード) --apply で投入します")
} else {
  let created = 0
  for (const row of rows) {
    const { error } = await supabase.from("events").upsert(row, { onConflict: "slug" })
    if (error) { console.error(`FAIL ${row.slug}: ${error.message}`); continue }
    created += 1
  }
  console.log(`\n${created} 件を公開しました`)
}
