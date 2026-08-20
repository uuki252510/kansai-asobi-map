/**
 * 2026年秋 (9〜11月) の関西の定番イベントを投入する。
 *
 * 出典 (2026-08-19 時点で日程が公表されているものだけを入れる):
 *   - ファッションプレス「関西秋イベント2026」 https://www.fashion-press.net/news/149133
 *     (USJハロウィーン 9/10-11/8, 怪々ヨウカイ祭 9/12-11/29, 魚ジャパンフェス 10/2-4,
 *      なにわ淀川花火 10/17, 大阪芸術花火 10/31, 万博蚤の市 10/23-25,
 *      正倉院展 10/24-11/9, 万博夜空がアートになる日 11/21)
 *   - 岸和田市公式ほか「岸和田だんじり祭 2026」9/19-20
 *   - 京都観光Navi・京都ガイド「東寺 紅葉ライトアップ 2026」10/31-12/13 18:00-21:30
 *   - 灘のけんか祭り (毎年10/14-15固定) / 時代祭 (毎年10/22固定)
 *
 * 開始時刻が未発表のものは start_time_unknown を立てて日付だけ表示する。
 * 料金・詳細は主催者発表に委ねる (推測して書かない)。
 *
 * Dry run: node scripts/seed-autumn-events.mjs
 * Apply:   node scripts/seed-autumn-events.mjs --apply
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

const day = (date) => ({ start: `${date}T00:00:00+09:00`, end: `${date}T23:59:00+09:00` })
const period = (from, to) => ({ start: `${from}T00:00:00+09:00`, end: `${to}T23:59:00+09:00` })

const EVENTS = [
  {
    slug: "usj-halloween-horror-nights-2026",
    name: "ユニバーサル・ハロウィーン 2026",
    category: "seasonal",
    prefecture: "大阪府", city: "大阪市此花区", venue: "ユニバーサル・スタジオ・ジャパン",
    ...period("2026-09-10", "2026-11-08"),
    summary: "USJのハロウィーンイベント。日中はかわいいハロウィーン、夜はホラー・ナイトへと園内の空気が一変する秋の風物詩。",
    placeName: "ユニバーサル・スタジオ・ジャパン（USJ）",
    officialUrl: "https://www.usj.co.jp/",
  },
  {
    slug: "kishiwada-danjiri-sep-2026",
    name: "岸和田だんじり祭（9月祭礼）",
    category: "festival",
    prefecture: "大阪府", city: "岸和田市", venue: "岸和田駅周辺・岸和田城下一帯",
    ...period("2026-09-19", "2026-09-20"),
    summary: "豪快な「やりまわし」で知られる岸和田の秋祭り。初日が宵宮、2日目が本宮で、市街地を曳行するだんじりを間近で観覧できる。",
    isFree: true,
  },
  {
    slug: "uzumasa-yokai-matsuri-2026",
    name: "怪々ヨウカイ祭 2026",
    category: "seasonal",
    prefecture: "京都府", city: "京都市右京区", venue: "東映太秦映画村",
    ...period("2026-09-12", "2026-11-29"),
    summary: "東映太秦映画村のハロウィーンシーズン企画。妖怪をテーマにした期間限定の演出やイベントが村内で展開される。",
    note: "期間中に休村日があります。営業日は公式カレンダーをご確認ください。",
    placeName: "東映太秦映画村",
  },
  {
    slug: "sakana-japan-fes-banpaku-2026",
    name: "魚ジャパンフェス 2026",
    category: "market",
    prefecture: "大阪府", city: "吹田市", venue: "万博記念公園",
    ...period("2026-10-02", "2026-10-04"),
    summary: "全国の魚介グルメが万博記念公園に集まるフードフェス。海鮮丼や浜焼きなど、秋の公園ピクニックと合わせて楽しめる。",
    placeName: "万博記念公園 自然文化園",
  },
  {
    slug: "nada-kenka-matsuri-2026",
    name: "灘のけんか祭り",
    category: "festival",
    prefecture: "兵庫県", city: "姫路市", venue: "松原八幡神社周辺（白浜町）",
    ...period("2026-10-14", "2026-10-15"),
    summary: "神輿同士を豪快にぶつけ合う播州の秋祭りの代表格。毎年10月14日・15日に行われ、15日の本宮が最大の見せ場。",
    isFree: true,
  },
  {
    slug: "naniwa-yodogawa-hanabi-2026",
    name: "なにわ淀川花火大会",
    category: "fireworks",
    prefecture: "大阪府", city: "大阪市淀川区", venue: "淀川河川敷",
    ...day("2026-10-17"),
    summary: "大阪の街を背景に淀川の川面から打ち上がる大規模花火大会。2026年は秋開催で、有料観覧席が用意される。",
    paidSeat: true,
  },
  {
    slug: "jidai-matsuri-2026",
    name: "時代祭",
    category: "festival",
    prefecture: "京都府", city: "京都市", venue: "京都御所〜平安神宮",
    ...day("2026-10-22"),
    summary: "明治維新から平安京の時代までを遡る時代行列が都大路を進む、京都三大祭のひとつ。毎年10月22日に行われる。",
    paidSeat: true,
  },
  {
    slug: "banpaku-nominoichi-2026",
    name: "万博蚤の市 2026秋",
    category: "market",
    prefecture: "大阪府", city: "吹田市", venue: "万博記念公園",
    ...period("2026-10-23", "2026-10-25"),
    summary: "古道具・古着・クラフトの店が万博記念公園に並ぶ大規模マーケット。秋の公園さんぽと掘り出し物探しを一度に楽しめる。",
    placeName: "万博記念公園 自然文化園",
  },
  {
    slug: "shosoin-exhibition-2026",
    name: "第78回 正倉院展",
    category: "exhibition",
    prefecture: "奈良県", city: "奈良市", venue: "奈良国立博物館",
    ...period("2026-10-24", "2026-11-09"),
    summary: "正倉院の宝物を年に一度だけ公開する秋の奈良の恒例展。会期が短く、奈良公園の散策と合わせた計画がおすすめ。",
  },
  {
    slug: "toji-koyo-lightup-2026",
    name: "東寺 紅葉ライトアップと夜間特別拝観",
    category: "seasonal",
    prefecture: "京都府", city: "京都市南区", venue: "東寺（教王護国寺）",
    start: "2026-10-31T18:00:00+09:00", end: "2026-12-13T21:30:00+09:00",
    startTimeKnown: true,
    summary: "五重塔と紅葉が瓢箪池の水面に映る、京都の秋の代表的なライトアップ。金堂・講堂の夜間特別拝観も行われる。",
    note: "点灯は各日18:00〜21:30 (受付は21:00まで) です。",
  },
  {
    slug: "osaka-geijutsu-hanabi-2026",
    name: "大阪芸術花火 2026",
    category: "fireworks",
    prefecture: "大阪府", city: "泉南市", venue: "泉南りんくう公園",
    ...day("2026-10-31"),
    summary: "音楽と完全にシンクロさせた「芸術花火」を海辺で観る有料観覧イベント。座って楽しむ鑑賞型の花火大会。",
    paidSeat: true,
    placeName: "泉南りんくう公園",
  },
  {
    slug: "banpaku-yozora-art-2026",
    name: "万博夜空がアートになる日 2026",
    category: "fireworks",
    prefecture: "大阪府", city: "吹田市", venue: "万博記念公園",
    ...day("2026-11-21"),
    summary: "アーティストの音楽と花火を組み合わせた万博記念公園の夜のイベント。太陽の塔と花火の共演が名物。",
    paidSeat: true,
    placeName: "万博記念公園 自然文化園",
  },
]

function buildDescription(event) {
  const lines = ["## 開催概要", "", `- 会場: ${event.venue}`, `- 場所: ${event.prefecture}${event.city}`]
  if (event.paidSeat) lines.push("- 有料観覧席: あり")
  if (event.note) lines.push(`- 補足: ${event.note}`)
  lines.push(
    "",
    "## お出かけ前に",
    "",
    "開催時間・料金・雨天時の対応は主催者の最新発表をご確認ください。",
    "屋外イベントは天候によって内容変更・中止になることがあります。",
  )
  return lines.join("\n")
}

// placeName → id を解決 (公開行のみ)
const placeIds = new Map()
for (const event of EVENTS) {
  if (!event.placeName || placeIds.has(event.placeName)) continue
  const { data } = await supabase.from("places").select("id").eq("name", event.placeName).eq("is_published", true).limit(1)
  if (data && data.length > 0) placeIds.set(event.placeName, data[0].id)
  else console.warn(`WARN 施設が見つかりません: ${event.placeName}`)
}

const rows = EVENTS.map((event) => ({
  slug: event.slug,
  name: event.name,
  event_category: event.category,
  summary: event.summary + (event.paidSeat ? "有料観覧席があります。" : ""),
  description: buildDescription(event),
  venue_name: event.venue,
  prefecture: event.prefecture,
  city: event.city,
  address: `${event.prefecture}${event.city}`,
  start_at: event.start,
  end_at: event.end,
  start_time_unknown: !event.startTimeKnown,
  place_id: event.placeName ? placeIds.get(event.placeName) ?? null : null,
  official_url: event.officialUrl ?? null,
  is_free: event.isFree ?? false,
  status: "published",
  published_at: new Date().toISOString(),
}))

console.log(`投入対象 ${rows.length} 件`)
rows.forEach((r) => console.log(`  ${r.start_at.slice(0, 10)}〜${r.end_at.slice(0, 10)} ${r.name}${r.place_id ? " (施設リンクあり)" : ""}`))

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
