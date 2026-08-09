/**
 * データ監査で「名前が捏造だが、指していた実在スポットは価値がある」と
 * 判定した8件を、正しい名称で登録し直す。写真は Google Places から
 * 住所トークン照合つきで取り込む (import-spa-world-photo.mjs と同方式)。
 *
 * 旧行の非公開化とリダイレクト設定は cleanup-unverified-places.mjs が担当。
 *
 * Dry run: node scripts/seed-verified-places.mjs
 * Apply:   node scripts/seed-verified-places.mjs --apply
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

// 滞在時間は確信のあるものだけ。料金詳細は推測せず公式案内に倒す
const PLACES = [
  {
    name: "国営飛鳥歴史公園",
    description: "石舞台古墳や高松塚古墳など飛鳥の史跡を囲む国営公園。芝生広場や遊具のある地区もあり、歴史散策と外遊びを一度に楽しめる。",
    prefecture: "奈良県", city: "高市郡明日香村", address: "奈良県高市郡明日香村",
    latitude: 34.4667, longitude: 135.8266,
    indoor_type: "outdoor", price_type: "free", rainy_day_ok: false,
    website_url: "https://www.asuka-park.jp/",
    average_stay_minutes: 180,
    searchQuery: "国営飛鳥歴史公園 石舞台地区", addressToken: "明日香村",
  },
  {
    name: "白鬚神社",
    description: "琵琶湖の中に大鳥居が立つ近江最古級の神社。「近江の厳島」とも呼ばれ、湖上の鳥居は人気のフォトスポット。",
    prefecture: "滋賀県", city: "高島市", address: "滋賀県高島市鵜川215",
    latitude: 35.2683, longitude: 136.0244,
    indoor_type: "outdoor", price_type: "free", rainy_day_ok: false,
    website_url: "http://shirahigejinja.com/",
    average_stay_minutes: 60,
    searchQuery: "白鬚神社 高島市", addressToken: "高島市",
  },
  {
    name: "兵庫県立円山川公苑",
    description: "円山川沿いの水辺のレジャー施設。カヌー・カッター体験や夏のプール、美術館を備え、城崎温泉からも近い。",
    prefecture: "兵庫県", city: "豊岡市", address: "兵庫県豊岡市小島1163",
    latitude: 35.5934, longitude: 134.8166,
    indoor_type: "both", price_type: "paid",
    price_note: "体験・施設により料金が異なります。公式サイトをご確認ください。",
    rainy_day_ok: false,
    website_url: "https://maruyamagawa.com/",
    searchQuery: "兵庫県立円山川公苑 豊岡市", addressToken: "豊岡市",
  },
  {
    name: "阪神甲子園球場",
    description: "阪神タイガースの本拠地であり高校野球の聖地。プロ野球観戦のほか、甲子園歴史館やスタジアム見学ツアーも子連れに人気。",
    prefecture: "兵庫県", city: "西宮市", address: "兵庫県西宮市甲子園町1-82",
    latitude: 34.7211, longitude: 135.3617,
    indoor_type: "outdoor", price_type: "paid",
    price_note: "観戦チケット・見学ツアーの料金は公式サイトをご確認ください。",
    rainy_day_ok: false,
    website_url: "https://www.hanshin.co.jp/koshien/",
    searchQuery: "阪神甲子園球場 西宮市", addressToken: "西宮市",
  },
  {
    name: "東和薬品RACTABドーム（大阪府立門真スポーツセンター）",
    description: "門真市にある大阪府立の大型スポーツ施設。プールやスケートリンクの一般開放があり、イベントも多数開催される。",
    prefecture: "大阪府", city: "門真市", address: "大阪府門真市三ツ島3-45",
    latitude: 34.7248, longitude: 135.6096,
    indoor_type: "indoor", price_type: "paid",
    price_note: "利用種目により料金が異なります。公式サイトをご確認ください。",
    rainy_day_ok: true,
    website_url: "https://www.ractab-dome.jp/",
    searchQuery: "東和薬品RACTABドーム 門真市", addressToken: "門真市",
  },
  {
    name: "那智海水浴場（ブルービーチ那智）",
    description: "JR那智駅の目の前に広がる遠浅の海水浴場。環境省の快水浴場百選にも選ばれ、家族連れで泳ぎやすい。",
    prefecture: "和歌山県", city: "東牟婁郡那智勝浦町", address: "和歌山県東牟婁郡那智勝浦町浜ノ宮",
    latitude: 33.6483, longitude: 135.9236,
    indoor_type: "outdoor", price_type: "free", rainy_day_ok: false,
    searchQuery: "那智海水浴場 那智勝浦町", addressToken: "那智勝浦町",
  },
  {
    name: "インフロニア草津アクアティクスセンター",
    description: "烏丸半島にある滋賀県立の水泳場。屋内50mプールなどを備え、一般開放日に利用できる。琵琶湖博物館がすぐ隣。",
    prefecture: "滋賀県", city: "草津市", address: "滋賀県草津市下物町1091",
    latitude: 35.0644, longitude: 135.9376,
    indoor_type: "indoor", price_type: "paid",
    price_note: "一般利用の料金・開放日は公式サイトをご確認ください。",
    rainy_day_ok: true,
    searchQuery: "インフロニア草津アクアティクスセンター", addressToken: "草津市",
  },
  {
    name: "ロート奈良鴻ノ池パーク（奈良市鴻ノ池運動公園）",
    description: "陸上競技場・体育館・プールなどが集まる奈良市の総合運動公園。遊具広場や芝生もあり、家族の外遊びにも使える。",
    prefecture: "奈良県", city: "奈良市", address: "奈良県奈良市法蓮佐保山4-5-1",
    latitude: 34.7031, longitude: 135.8199,
    indoor_type: "both", price_type: "mixed",
    price_note: "公園は無料。各施設の利用料金は公式サイトをご確認ください。",
    rainy_day_ok: false,
    searchQuery: "ロート奈良鴻ノ池パーク 奈良市", addressToken: "奈良市",
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
  return { photoName: photo.name, matchedName: candidate.displayName?.text ?? "", address }
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
    console.log(`写真なしで登録します ${place.name}: ${error.message}`)
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
