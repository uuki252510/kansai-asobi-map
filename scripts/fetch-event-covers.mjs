/**
 * イベントカバー用のイメージ写真を Wikimedia Commons から取得して
 * Supabase Storage に取り込み、events.cover_storage_path を埋める。
 *
 * 使う写真の条件:
 *   - ライセンスが Public domain / CC0 のみ (帰属表示不要・商用可)
 *   - 日本の花火の実写真 (勝毎花火大会・スターマイン・五尺玉など)
 *
 * 各大会の実際の写真ではないため「イメージ写真」であり、UI側で
 * 「写真はイメージ」と明示する (storage path の stock- プレフィックスで判定)。
 * 取得時のライセンスと作者は docs/event-cover-sources.md に記録する。
 *
 * Dry run: node scripts/fetch-event-covers.mjs
 * Apply:   node scripts/fetch-event-covers.mjs --apply
 */

import { readFileSync, writeFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"

const env = {}
for (const line of readFileSync("./.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "")
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const apply = process.argv.includes("--apply")

const USER_AGENT = "dekakeru-portal/1.0 (contact: yuy.0402.2525@gmail.com)"
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 事前に目視で選定した Commons のファイル。
 * 縦長・看板・事故写真などは除外済み。ここに無いものは使わない。
 */
const FILES = [
  "File:Kachimai Hanabi Taikai 2010.jpg",
  "File:Kachimai Hanabi Taikai 2011.jpg",
  "File:Kachimai Hanabi Taikai 2012.jpg",
  "File:Kachimai Hanabi Taikai 2013.jpg",
  "File:Hanabi starmine.jpg",
  "File:Hanabi gosyaku dama.JPG",
  "File:Aomori Nebuta Festival fireworks.jpg",
  // Yokota基地の3枚は前景に軍用輸送機が大きく写っており、
  // 地方の花火大会のカバーとして不自然なので外した
]

// ライセンスと URL を確認する (信用せず毎回検証する)
const api = new URL("https://commons.wikimedia.org/w/api.php")
api.searchParams.set("action", "query")
api.searchParams.set("format", "json")
api.searchParams.set("titles", FILES.join("|"))
api.searchParams.set("prop", "imageinfo")
api.searchParams.set("iiprop", "url|extmetadata|size")
api.searchParams.set("iiurlwidth", "1600")

const response = await fetch(api, { headers: { "User-Agent": USER_AGENT } })
const json = await response.json()
const pages = Object.values(json.query?.pages ?? {})

const photos = []
for (const page of pages) {
  const info = page.imageinfo?.[0]
  if (!info) { console.error(`SKIP ${page.title}: imageinfo なし`); continue }
  const license = (info.extmetadata?.LicenseShortName?.value ?? "").trim()
  if (!/^(CC0|Public domain)$/i.test(license)) {
    console.error(`SKIP ${page.title}: ライセンスが ${license} (PD/CC0以外は使わない)`)
    continue
  }
  const artist = (info.extmetadata?.Artist?.value ?? "不明").replace(/<[^>]+>/g, "").trim()
  photos.push({
    title: page.title,
    license,
    artist,
    url: info.thumburl,
    descriptionUrl: info.descriptionurl,
  })
}

console.log(`使用できる写真: ${photos.length} / ${FILES.length}`)
photos.forEach((p) => console.log(`   [${p.license}] ${p.title.slice(5)}`))
if (photos.length < 5) {
  console.error("写真が少なすぎます。中止")
  process.exit(1)
}

const { data: events, error } = await supabase
  .from("events")
  .select("id,slug,name,start_at,cover_storage_path")
  .eq("status", "published")
  .order("start_at")
if (error) { console.error(error.message); process.exit(1) }

// 日付順に並べて写真を循環割り当てる。隣り合うカードが同じ写真にならない
const plan = events.map((event, index) => ({
  event,
  photo: photos[index % photos.length],
  path: `event-covers/stock-${index % photos.length}.jpg`,
}))
plan.forEach((p) => console.log(`${p.event.start_at.slice(0, 10)} ${p.event.name.slice(0, 30)} ← ${p.photo.title.slice(5, 45)}`))

if (!apply) {
  console.log("\n(確認モード) --apply で取り込みます")
  process.exit(0)
}

// 写真をダウンロードして Storage へ (同じ写真は1回だけ)
const uploaded = new Set()
for (const { photo, path } of plan) {
  if (uploaded.has(path)) continue
  uploaded.add(path)
  await wait(1500) // Commons への礼儀
  const imageResponse = await fetch(photo.url, { headers: { "User-Agent": USER_AGENT } })
  if (!imageResponse.ok) { console.error(`FAIL download ${photo.title}: ${imageResponse.status}`); process.exit(1) }
  const buffer = Buffer.from(await imageResponse.arrayBuffer())
  const { error: uploadError } = await supabase.storage
    .from("place-images")
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true })
  if (uploadError) { console.error(`FAIL upload ${path}: ${uploadError.message}`); process.exit(1) }
  console.log(`取込 ${path} (${Math.round(buffer.length / 1024)}KB) ← ${photo.title.slice(5)}`)
}

let updated = 0
for (const { event, path } of plan) {
  const { error: updateError } = await supabase.from("events").update({ cover_storage_path: path }).eq("id", event.id)
  if (updateError) { console.error(`FAIL ${event.slug}: ${updateError.message}`); continue }
  updated += 1
}
console.log(`\n${updated} 件のイベントにカバーを設定しました`)

// 出典台帳 (PD/CC0 なので法的義務はないが、由来を追えるようにする)
const ledger = [
  "# イベントカバー写真の出典",
  "",
  "イベントのカバーに使っているイメージ写真の出典。すべて Public domain / CC0",
  "(帰属表示不要・商用利用可) のみ。各大会の実際の写真ではないため、UIでは",
  "「写真はイメージ」と表示する (storage path の stock- プレフィックスで判定)。",
  "",
  "| storage path | 元ファイル | ライセンス | 作者 |",
  "|---|---|---|---|",
  ...[...new Set(plan.map((p) => p.path))].map((path) => {
    const photo = plan.find((p) => p.path === path).photo
    return `| ${path} | [${photo.title.slice(5)}](${photo.descriptionUrl}) | ${photo.license} | ${photo.artist} |`
  }),
  "",
]
writeFileSync("docs/event-cover-sources.md", ledger.join("\n"))
console.log("出典台帳: docs/event-cover-sources.md")
