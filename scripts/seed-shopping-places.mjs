/**
 * 大型商業施設 (モール・アウトレット・駅ビル) の定番を追加登録する (2026-08)。
 * 全件、Google Places の住所トークン照合を通った場合のみ写真を取り込む
 * (seed-commercial-places.mjs と同方式)。
 *
 * Dry run: node scripts/seed-shopping-places.mjs
 * Apply:   node scripts/seed-shopping-places.mjs --apply
 */

import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"

const env = {}
for (const line of readFileSync("./.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "")
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const googleApiKey = env.GOOGLE_MAPS_API_KEY
const apply = process.argv.includes("--apply")
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const PLACES = [
  {
    name: "EXPOCITY（エキスポシティ）",
    description: "万博記念公園に隣接する大型複合施設。ららぽーとEXPOCITYを中心に、ニフレルやVS PARK、大観覧車など体験型施設が集まり、一日遊べる。",
    prefecture: "大阪府", city: "吹田市", address: "大阪府吹田市千里万博公園2-1",
    latitude: 34.8051, longitude: 135.5347,
    indoor_type: "both", price_type: "free",
    price_note: "入場無料。各施設の利用料金は公式サイトをご確認ください。",
    rainy_day_ok: true, average_stay_minutes: 240,
    searchQuery: "EXPOCITY 吹田市", addressToken: "吹田市",
  },
  {
    name: "三井ショッピングパーク ららぽーと門真",
    description: "2023年開業の大型ショッピングモール。三井アウトレットパーク大阪門真と一体で、キッズ向けテナントやフードコートが充実。",
    prefecture: "大阪府", city: "門真市", address: "大阪府門真市松生町1-11",
    latitude: 34.7292, longitude: 135.5983,
    indoor_type: "indoor", price_type: "free", rainy_day_ok: true,
    average_stay_minutes: 180,
    searchQuery: "ららぽーと門真", addressToken: "門真市",
  },
  {
    name: "ららぽーと和泉",
    description: "泉北エリアの大型ショッピングモール。屋内あそび場や子ども服のテナントが揃い、家族連れの雨の日の定番。",
    prefecture: "大阪府", city: "和泉市", address: "大阪府和泉市あゆみ野4-4-7",
    latitude: 34.4497, longitude: 135.4577,
    indoor_type: "indoor", price_type: "free", rainy_day_ok: true,
    average_stay_minutes: 180,
    searchQuery: "ららぽーと和泉", addressToken: "和泉市",
  },
  {
    name: "ららぽーと堺",
    description: "2022年開業の堺・美原の大型ショッピングモール。広いフードコートとキッズスペースがあり、周辺の公園と合わせて過ごしやすい。",
    prefecture: "大阪府", city: "堺市美原区", address: "大阪府堺市美原区黒山22-1",
    latitude: 34.5411, longitude: 135.5567,
    indoor_type: "indoor", price_type: "free", rainy_day_ok: true,
    average_stay_minutes: 180,
    searchQuery: "ららぽーと堺", addressToken: "美原区",
  },
  {
    name: "ららぽーと甲子園",
    description: "甲子園球場のすぐ隣にある大型ショッピングモール。キッザニア甲子園が併設され、野球観戦と組み合わせた一日プランも定番。",
    prefecture: "兵庫県", city: "西宮市", address: "兵庫県西宮市甲子園八番町1-100",
    latitude: 34.7186, longitude: 135.3644,
    indoor_type: "indoor", price_type: "free", rainy_day_ok: true,
    average_stay_minutes: 180,
    searchQuery: "ららぽーと甲子園", addressToken: "西宮市",
  },
  {
    name: "りんくうプレミアム・アウトレット",
    description: "関西空港の対岸に広がる国内最大級のアウトレットモール。海沿いの開放的な街並みで、りんくう公園やマーブルビーチがすぐそば。",
    prefecture: "大阪府", city: "泉佐野市", address: "大阪府泉佐野市りんくう往来南3-28",
    latitude: 34.4046, longitude: 135.3096,
    indoor_type: "both", price_type: "free", rainy_day_ok: false,
    average_stay_minutes: 180,
    searchQuery: "りんくうプレミアムアウトレット", addressToken: "泉佐野市",
  },
  {
    name: "三井アウトレットパーク マリンピア神戸",
    description: "明石海峡大橋を望む海辺のアウトレットモール。2024年に全面建て替えでリニューアルし、海沿いのデッキや芝生広場も整備された。",
    prefecture: "兵庫県", city: "神戸市垂水区", address: "兵庫県神戸市垂水区海岸通12-2",
    latitude: 34.6266, longitude: 135.0499,
    indoor_type: "both", price_type: "free", rainy_day_ok: false,
    average_stay_minutes: 180,
    searchQuery: "三井アウトレットパーク マリンピア神戸", addressToken: "垂水区",
  },
  {
    name: "京都駅ビル",
    description: "吹き抜けの大階段や屋上の大空広場、空中径路など無料で楽しめる見どころが多い駅ビル。雨の日の京都でも移動なしで過ごせる。",
    prefecture: "京都府", city: "京都市下京区", address: "京都府京都市下京区東塩小路町901",
    latitude: 34.9858, longitude: 135.7588,
    indoor_type: "both", price_type: "free", rainy_day_ok: true,
    average_stay_minutes: 90,
    searchQuery: "京都駅ビル", addressToken: "下京区",
  },
  {
    name: "なんばパークス",
    description: "段丘状の屋上庭園「パークスガーデン」で知られるミナミの商業施設。都心にいながら緑の中を散歩でき、映画館やレストランも揃う。",
    prefecture: "大阪府", city: "大阪市浪速区", address: "大阪府大阪市浪速区難波中2-10-70",
    latitude: 34.6614, longitude: 135.5019,
    indoor_type: "both", price_type: "free", rainy_day_ok: true,
    average_stay_minutes: 120,
    searchQuery: "なんばパークス", addressToken: "浪速区",
  },
  {
    name: "グランフロント大阪",
    description: "大阪駅直結の大型複合施設。体験型ショールームやキドキド、うめきた広場のイベントなど、買い物以外の楽しみが多い。",
    prefecture: "大阪府", city: "大阪市北区", address: "大阪府大阪市北区大深町",
    latitude: 34.7047, longitude: 135.4945,
    indoor_type: "both", price_type: "free", rainy_day_ok: true,
    average_stay_minutes: 120,
    searchQuery: "グランフロント大阪", addressToken: "北区",
  },
  {
    name: "イオンモール京都桂川",
    description: "京都最大級のイオンモール。キッズ向けテナントや映画館が揃い、桂川・洛西エリアの雨の日の定番スポット。",
    prefecture: "京都府", city: "京都市南区", address: "京都府京都市南区久世高田町376-1",
    latitude: 34.9445, longitude: 135.7106,
    indoor_type: "indoor", price_type: "free", rainy_day_ok: true,
    average_stay_minutes: 180,
    searchQuery: "イオンモール京都桂川", addressToken: "南区",
  },
  {
    name: "イオンモール四條畷",
    description: "北河内エリアの大型イオンモール。屋内あそび場やベビー休憩室が充実し、小さな子ども連れでも過ごしやすい。",
    prefecture: "大阪府", city: "四條畷市", address: "大阪府四條畷市砂4-3-2",
    latitude: 34.7444, longitude: 135.6280,
    indoor_type: "indoor", price_type: "free", rainy_day_ok: true,
    average_stay_minutes: 180,
    searchQuery: "イオンモール四條畷", addressToken: "四條畷市",
  },
]

async function findPhoto(query, addressToken) {
  const search = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": googleApiKey,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.photos",
    },
    body: JSON.stringify({ textQuery: query, languageCode: "ja", regionCode: "JP", pageSize: 1 }),
    signal: AbortSignal.timeout(12_000),
  })
  if (!search.ok) throw new Error(`searchText ${search.status}`)
  const candidate = (await search.json()).places?.[0]
  if (!candidate) throw new Error("検索ヒットなし")
  const address = candidate.formattedAddress ?? ""
  if (!address.includes(addressToken)) throw new Error(`住所不一致: ${address.slice(0, 40)}`)
  const photo = (candidate.photos ?? []).find((entry) => {
    if (!entry.name) return false
    if (!entry.widthPx || !entry.heightPx) return true
    const ratio = entry.widthPx / entry.heightPx
    return ratio >= 0.65 && ratio <= 2.8
  })
  if (!photo?.name) throw new Error("使える写真なし")
  return { photoName: photo.name, matchedName: candidate.displayName?.text ?? "" }
}

async function fetchPhoto(photoName) {
  const mediaUrl = new URL(`https://places.googleapis.com/v1/${photoName}/media`)
  mediaUrl.searchParams.set("maxWidthPx", "1600")
  mediaUrl.searchParams.set("maxHeightPx", "1200")
  const image = await fetch(mediaUrl, {
    headers: { accept: "image/*", "X-Goog-Api-Key": googleApiKey },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  })
  const contentType = image.headers.get("content-type") ?? ""
  if (!image.ok || !contentType.startsWith("image/")) throw new Error(`media ${image.status}`)
  return { buffer: Buffer.from(await image.arrayBuffer()), contentType }
}

for (const entry of PLACES) {
  const { searchQuery, addressToken, ...place } = entry
  const { data: existing } = await supabase.from("places").select("id").eq("name", place.name).limit(1)
  if (existing && existing.length > 0) {
    console.log(`スキップ (登録済み): ${place.name}`)
    continue
  }

  let found = null
  try {
    found = await findPhoto(searchQuery, addressToken)
    console.log(`写真OK ${place.name} ← ${found.matchedName}`)
  } catch (error) {
    console.log(`写真見つからず ${place.name}: ${error.message}`)
  }

  if (!apply) continue

  place.google_map_url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place.name)
  place.is_published = true
  const { data: inserted, error } = await supabase.from("places").insert(place).select("id,name").single()
  if (error) { console.error(`FAIL insert ${place.name}: ${error.message}`); continue }

  if (found) {
    try {
      const photo = await fetchPhoto(found.photoName)
      const ext = photo.contentType.includes("png") ? "png" : photo.contentType.includes("webp") ? "webp" : "jpg"
      const path = `${inserted.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from("place-images")
        .upload(path, photo.buffer, { contentType: photo.contentType, upsert: true })
      if (uploadError) throw new Error(uploadError.message)
      const { error: updateError } = await supabase
        .from("places")
        .update({ image_storage_path: path, image_source: "google", image_synced_at: new Date().toISOString() })
        .eq("id", inserted.id)
      if (updateError) throw new Error(updateError.message)
      console.log(`登録+写真 ${inserted.name} (${Math.round(photo.buffer.length / 1024)}KB)`)
    } catch (error) {
      console.log(`登録のみ (写真失敗) ${inserted.name}: ${error.message}`)
    }
  } else {
    console.log(`登録のみ ${inserted.name}`)
  }
  await wait(300)
}
console.log(`\nDONE${apply ? "" : " (dry run)"}`)
