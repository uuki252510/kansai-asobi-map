/**
 * ジャンル空白を埋める定番スポットの追加登録 (2026-08)。
 * 温泉・海水浴場・味覚狩り・工場見学・絶景/乗り物の5ジャンル。
 * 全件、Google Places の住所トークン照合を通った場合のみ写真を取り込む。
 *
 * Dry run: node scripts/seed-genre-places.mjs
 * Apply:   node scripts/seed-genre-places.mjs --apply
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

const PAID_NOTE = "料金は公式サイトをご確認ください。"

const PLACES = [
  // ---- 温泉・スパ ----
  {
    name: "有馬温泉 太閤の湯",
    description: "日本最古の名湯・有馬温泉の大型日帰り温泉テーマパーク。金泉・銀泉の両方に入れる岩盤浴つきで、家族で一日過ごせる。",
    prefecture: "兵庫県", city: "神戸市北区", address: "兵庫県神戸市北区有馬町池の尻292-2",
    latitude: 34.798, longitude: 135.249,
    indoor_type: "both", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    average_stay_minutes: 240,
    searchQuery: "有馬温泉 太閤の湯", addressToken: "有馬町",
  },
  {
    name: "神戸ハーバーランド温泉 万葉倶楽部",
    description: "ハーバーランドにある温泉・岩盤浴・リラクゼーションの複合施設。有馬と湯村から運ぶ名湯を港の夜景とともに楽しめる。",
    prefecture: "兵庫県", city: "神戸市中央区", address: "兵庫県神戸市中央区東川崎町1-8-1",
    latitude: 34.679, longitude: 135.178,
    indoor_type: "indoor", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    average_stay_minutes: 240,
    searchQuery: "神戸ハーバーランド温泉 万葉倶楽部", addressToken: "中央区",
  },
  {
    name: "天然露天温泉スパスミノエ",
    description: "大阪市内とは思えない竹林の露天風呂が名物の日帰り温泉。住之江公園駅からすぐで、街なか温泉の定番。",
    prefecture: "大阪府", city: "大阪市住之江区", address: "大阪府大阪市住之江区泉1-1-82",
    latitude: 34.609, longitude: 135.471,
    indoor_type: "both", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    average_stay_minutes: 180,
    searchQuery: "天然露天温泉スパスミノエ", addressToken: "住之江区",
  },
  // 箕面温泉スパーガーデンは照合で検索ヒットゼロ (閉館の可能性)。確認できるまで見送り
  {
    name: "京都嵐山温泉 風風の湯",
    description: "嵐山の渡月橋近くにある日帰り温泉。観光の締めに立ち寄れる立地で、露天風呂とサウナを気軽に楽しめる。",
    prefecture: "京都府", city: "京都市西京区", address: "京都府京都市西京区嵐山上河原町1",
    latitude: 35.011, longitude: 135.679,
    indoor_type: "indoor", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    average_stay_minutes: 120,
    searchQuery: "京都嵐山温泉 風風の湯", addressToken: "西京区",
  },
  {
    name: "神戸みなと温泉 蓮",
    description: "神戸港に湧く自家源泉の温泉リゾート。三宮から送迎ありの日帰り利用ができ、港を見渡す露天風呂が名物。",
    prefecture: "兵庫県", city: "神戸市中央区", address: "兵庫県神戸市中央区新港町1-1",
    latitude: 34.683, longitude: 135.199,
    indoor_type: "both", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    average_stay_minutes: 240,
    searchQuery: "神戸みなと温泉 蓮", addressToken: "中央区",
  },
  {
    name: "白浜温泉 崎の湯",
    description: "太平洋の波打ち際にある日本最古級の露天風呂。湯船から海までの距離が近く、白浜観光の名物体験になっている。",
    prefecture: "和歌山県", city: "西牟婁郡白浜町", address: "和歌山県西牟婁郡白浜町1668",
    latitude: 33.678, longitude: 135.335,
    indoor_type: "outdoor", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: false,
    average_stay_minutes: 60,
    searchQuery: "白浜温泉 崎の湯", addressToken: "白浜町",
  },
  // ---- 海水浴場 ----
  {
    name: "箱作海水浴場（ぴちぴちビーチ）",
    description: "大阪湾南部の遠浅ビーチ。バーベキュー区画やビーチバレーコートが整備され、南海箱作駅から歩いて行ける。",
    prefecture: "大阪府", city: "阪南市", address: "大阪府阪南市箱作",
    latitude: 34.342, longitude: 135.211,
    indoor_type: "outdoor", price_type: "free", rainy_day_ok: false,
    average_stay_minutes: 180,
    searchQuery: "箱作海水浴場 ぴちぴちビーチ", addressToken: "阪南市",
  },
  {
    name: "淡輪海水浴場（ときめきビーチ）",
    description: "岬町の遠浅で波の穏やかな海水浴場。潮干狩り場としても知られ、小さな子ども連れの海デビューの定番。",
    prefecture: "大阪府", city: "泉南郡岬町", address: "大阪府泉南郡岬町淡輪",
    latitude: 34.334, longitude: 135.185,
    indoor_type: "outdoor", price_type: "free", rainy_day_ok: false,
    average_stay_minutes: 180,
    searchQuery: "淡輪海水浴場 ときめきビーチ", addressToken: "岬町",
  },
  {
    name: "竹野浜海水浴場",
    description: "日本海側屈指の透明度を誇る山陰海岸ジオパークのビーチ。約1kmの白砂が続き、快水浴場百選にも選ばれている。",
    prefecture: "兵庫県", city: "豊岡市", address: "兵庫県豊岡市竹野町竹野",
    latitude: 35.660, longitude: 134.760,
    indoor_type: "outdoor", price_type: "free", rainy_day_ok: false,
    average_stay_minutes: 240,
    searchQuery: "竹野浜海水浴場", addressToken: "豊岡市",
  },
  {
    name: "慶野松原海水浴場",
    description: "淡路島西海岸、約2.5kmの松原と夕日で知られる海水浴場。国の名勝に指定された松林でのキャンプも人気。",
    prefecture: "兵庫県", city: "南あわじ市", address: "兵庫県南あわじ市松帆慶野",
    latitude: 34.318, longitude: 134.722,
    indoor_type: "outdoor", price_type: "free", rainy_day_ok: false,
    average_stay_minutes: 180,
    searchQuery: "慶野松原海水浴場", addressToken: "南あわじ市",
  },
  {
    name: "近江舞子水泳場",
    description: "琵琶湖を代表する湖水浴場。白い砂浜と松林が続き、波が穏やかで子ども連れでも泳ぎやすい。駅から徒歩圏。",
    prefecture: "滋賀県", city: "大津市", address: "滋賀県大津市南小松",
    latitude: 35.183, longitude: 135.965,
    indoor_type: "outdoor", price_type: "free", rainy_day_ok: false,
    average_stay_minutes: 180,
    searchQuery: "近江舞子水泳場", addressToken: "大津市",
  },
  // ---- 味覚狩り ----
  {
    name: "観光農園 南楽園",
    description: "堺市南部の丘陵にある観光農園。季節ごとにみかん狩りやぶどう狩り、いも掘りが楽しめ、ハイキングコースもある。",
    prefecture: "大阪府", city: "堺市南区", address: "大阪府堺市南区別所1457",
    latitude: 34.470, longitude: 135.465,
    indoor_type: "outdoor", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: false,
    average_stay_minutes: 120,
    searchQuery: "観光農園 南楽園 堺市", addressToken: "南区",
  },
  {
    name: "有田巨峰村",
    description: "西日本最大級のぶどう狩り観光農園エリア。夏から秋の巨峰シーズンには量り売りや食べ放題プランで賑わう。",
    prefecture: "和歌山県", city: "有田郡有田川町", address: "和歌山県有田郡有田川町川口",
    latitude: 34.060, longitude: 135.220,
    indoor_type: "outdoor", price_type: "paid", price_note: "収穫時期・料金は公式情報をご確認ください。", rainy_day_ok: false,
    average_stay_minutes: 120,
    searchQuery: "有田巨峰村", addressToken: "有田川町",
  },
  // ---- 工場見学 ----
  {
    name: "グリコピア神戸",
    description: "ポッキーやプリッツの製造工程を見学できるグリコの企業ミュージアム。要予約・見学無料で、雨の日の学び系おでかけの定番。",
    prefecture: "兵庫県", city: "神戸市西区", address: "兵庫県神戸市西区高塚台7-1",
    latitude: 34.690, longitude: 134.970,
    indoor_type: "indoor", price_type: "free",
    price_note: "見学無料・事前予約制。公式サイトからご予約ください。",
    rainy_day_ok: true, average_stay_minutes: 90,
    searchQuery: "グリコピア神戸", addressToken: "西区",
  },
  {
    name: "キリンビール神戸工場",
    description: "一番搾りの製造工程をガイド付きで見学できるビール工場。試飲やソフトドリンクの提供もあり、大人の社会見学として人気。",
    prefecture: "兵庫県", city: "神戸市北区", address: "兵庫県神戸市北区赤松台2-1-1",
    latitude: 34.790, longitude: 135.120,
    indoor_type: "indoor", price_type: "free",
    price_note: "見学ツアーは事前予約制。詳細は公式サイトをご確認ください。",
    rainy_day_ok: true, average_stay_minutes: 90,
    searchQuery: "キリンビール神戸工場", addressToken: "北区",
  },
  {
    name: "造幣博物館",
    description: "貨幣の製造で知られる造幣局構内の博物館。大判小判や記念貨幣の展示を無料で見学でき、春は桜の通り抜けでも有名。",
    prefecture: "大阪府", city: "大阪市北区", address: "大阪府大阪市北区天満1-1-79",
    latitude: 34.696, longitude: 135.521,
    indoor_type: "indoor", price_type: "free", rainy_day_ok: true,
    average_stay_minutes: 60,
    searchQuery: "造幣博物館 大阪", addressToken: "北区",
  },
  // ---- 絶景・乗り物 ----
  {
    name: "琵琶湖汽船 ミシガンクルーズ",
    description: "大津港から出航する外輪船ミシガンの琵琶湖クルーズ。デッキから湖と比良山系を眺めながら、食事やショーも楽しめる。",
    prefecture: "滋賀県", city: "大津市", address: "滋賀県大津市浜大津5-1-1",
    latitude: 35.006, longitude: 135.866,
    indoor_type: "both", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    average_stay_minutes: 90,
    searchQuery: "琵琶湖汽船 ミシガンクルーズ 大津港", addressToken: "大津市",
  },
  {
    name: "嵯峨野観光鉄道 トロッコ列車",
    description: "保津川渓谷をゆっくり走る観光列車。車窓いっぱいに渓谷美が広がり、紅葉シーズンは特に人気。トロッコ嵯峨駅から乗車できる。",
    prefecture: "京都府", city: "京都市右京区", address: "京都府京都市右京区嵯峨天龍寺車道町",
    latitude: 35.018, longitude: 135.681,
    indoor_type: "both", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    average_stay_minutes: 90,
    searchQuery: "トロッコ嵯峨駅 嵯峨野観光鉄道", addressToken: "右京区",
  },
  {
    name: "天橋立ビューランド",
    description: "日本三景・天橋立を「飛龍観」で見下ろす山上の遊園地。リフトやモノレールで上がり、股のぞきと小さな乗り物を楽しめる。",
    prefecture: "京都府", city: "宮津市", address: "京都府宮津市文珠",
    latitude: 35.556, longitude: 135.182,
    indoor_type: "outdoor", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: false,
    average_stay_minutes: 120,
    searchQuery: "天橋立ビューランド", addressToken: "宮津市",
  },
  {
    name: "摩耶山掬星台",
    description: "日本三大夜景に数えられる神戸の展望スポット。まやビューライン (ケーブル+ロープウェー) で山上へ上がれる。",
    prefecture: "兵庫県", city: "神戸市灘区", address: "兵庫県神戸市灘区摩耶山町2-2",
    latitude: 34.737, longitude: 135.204,
    indoor_type: "outdoor", price_type: "free",
    price_note: "展望台は無料。まやビューラインの運賃は公式サイトをご確認ください。",
    rainy_day_ok: false, average_stay_minutes: 120,
    searchQuery: "摩耶山掬星台", addressToken: "灘区",
  },
  {
    name: "びわ湖バレイ（びわ湖テラス）",
    description: "ロープウェイで上がる標高1,100mの山上リゾート。琵琶湖を一望するびわ湖テラスが名物で、冬はスキー場になる。",
    prefecture: "滋賀県", city: "大津市", address: "滋賀県大津市木戸1547-1",
    latitude: 35.207, longitude: 135.898,
    indoor_type: "both", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: false,
    average_stay_minutes: 240,
    searchQuery: "びわ湖バレイ", addressToken: "大津市",
  },
  {
    name: "六甲山スノーパーク",
    description: "阪神間から最も近い人工スキー場。そり専用ゲレンデと雪あそび広場があり、冬の子どもの雪デビューの定番。",
    prefecture: "兵庫県", city: "神戸市灘区", address: "兵庫県神戸市灘区六甲山町北六甲4512-143",
    latitude: 34.760, longitude: 135.220,
    indoor_type: "outdoor", price_type: "paid",
    price_note: "冬季営業。営業期間・料金は公式サイトをご確認ください。",
    rainy_day_ok: false, average_stay_minutes: 180,
    searchQuery: "六甲山スノーパーク", addressToken: "灘区",
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
