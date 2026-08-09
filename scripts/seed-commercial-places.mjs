/**
 * 商業施設・屋内アミューズメントの定番を追加登録する (2026-08)。
 * 全件、Google Places の住所トークン照合を通った場合のみ写真を取り込む
 * (seed-verified-places.mjs と同方式)。料金の詳細は推測せず公式案内に倒す。
 *
 * Dry run: node scripts/seed-commercial-places.mjs
 * Apply:   node scripts/seed-commercial-places.mjs --apply
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

// VS PARK ららぽーと門真店は照合の結果 EXPOCITY 店しか見つからず、実在を
// 確認できなかったため見送った (既存の VS PARK EXPOCITY 店が正)。
const PLACES = [
  {
    // 「VS PARK 梅田店」(捏造) が指していたと思われる実在施設
    name: "VS.（ヴイエス）グラングリーン大阪",
    description: "うめきた公園ノースパークにある没入型の体験エンターテインメント施設。デジタルとリアルが融合するアトラクションを大人も子どもも楽しめる。",
    prefecture: "大阪府", city: "大阪市北区", address: "大阪府大阪市北区大深町6-86 グラングリーン大阪",
    latitude: 34.7047, longitude: 135.4907,
    indoor_type: "indoor", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    average_stay_minutes: 120,
    searchQuery: "VS. グラングリーン大阪", addressToken: "北区",
  },
  {
    name: "ラウンドワンスタジアム千日前店",
    description: "なんばの大型アミューズメント施設。ボウリング・カラオケ・ゲームなどがワンフロアごとに揃い、家族でもグループでも過ごせる。",
    prefecture: "大阪府", city: "大阪市中央区", address: "大阪府大阪市中央区難波1-3-1",
    latitude: 34.6668, longitude: 135.5021,
    indoor_type: "indoor", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    searchQuery: "ラウンドワンスタジアム千日前店", addressToken: "中央区",
  },
  {
    name: "ラウンドワン梅田店",
    description: "梅田・阪急東通り近くのアミューズメント施設。ボウリングやカラオケ、クレーンゲームまで雨の日の定番として使える。",
    prefecture: "大阪府", city: "大阪市北区", address: "大阪府大阪市北区小松原町4-16",
    latitude: 34.7038, longitude: 135.5008,
    indoor_type: "indoor", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    searchQuery: "ラウンドワン梅田店", addressToken: "北区",
  },
  {
    name: "ボーネルンド あそびのせかい グランフロント大阪店",
    description: "グランフロント大阪にある屋内あそび場「キドキド」と世界の遊び道具ショップ。赤ちゃんから小学生まで年齢別に遊べるゾーンが揃う。",
    prefecture: "大阪府", city: "大阪市北区", address: "大阪府大阪市北区大深町 グランフロント大阪",
    latitude: 34.7057, longitude: 135.4949,
    indoor_type: "indoor", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    average_stay_minutes: 120,
    searchQuery: "ボーネルンド あそびのせかい グランフロント大阪", addressToken: "北区",
  },
  {
    name: "Bb箕面船場店",
    description: "ボウリング・カラオケ・キッズコーナー・温浴まで揃う大型複合レジャー施設。時間制で遊び放題のスタイルが特徴。",
    prefecture: "大阪府", city: "箕面市", address: "大阪府箕面市船場東3-13-11",
    latitude: 34.8256, longitude: 135.4931,
    indoor_type: "indoor", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    searchQuery: "Bb箕面船場店", addressToken: "箕面市",
  },
  {
    name: "空庭温泉 OSAKA BAY TOWER",
    description: "弁天町駅直結、安土桃山時代がテーマの関西最大級の温泉テーマパーク。温泉・岩盤浴・縁日・庭園で一日過ごせる。",
    prefecture: "大阪府", city: "大阪市港区", address: "大阪府大阪市港区弁天1-2-3",
    latitude: 34.6693, longitude: 135.4565,
    indoor_type: "indoor", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    average_stay_minutes: 240,
    searchQuery: "空庭温泉 OSAKA BAY TOWER", addressToken: "港区",
  },
  {
    name: "神戸ハーバーランドumie",
    description: "神戸港に面した大型ショッピングモール。モザイク側は海沿いのデッキや観覧車があり、買い物と港の景色を同時に楽しめる。",
    prefecture: "兵庫県", city: "神戸市中央区", address: "兵庫県神戸市中央区東川崎町1-7-2",
    latitude: 34.6795, longitude: 135.1786,
    indoor_type: "both", price_type: "free", rainy_day_ok: true,
    average_stay_minutes: 180,
    searchQuery: "神戸ハーバーランドumie", addressToken: "神戸市",
  },
  {
    name: "キッズランドUS 奈良学園前店",
    description: "時間制で遊び放題の室内あそびパーク。ボールプールや乗り物系の遊具が揃い、小さな子ども連れの雨の日の定番。",
    prefecture: "奈良県", city: "奈良市", address: "奈良県奈良市 (学園前)",
    latitude: 34.6857, longitude: 135.7625,
    indoor_type: "indoor", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    average_stay_minutes: 120,
    searchQuery: "キッズランドUS 奈良学園前店", addressToken: "奈良市",
  },
  {
    name: "ピエリ守山",
    description: "琵琶湖岸に立つショッピングモール。湖を望むロケーションで、屋内あそび場やペット関連施設など家族向けテナントが多い。",
    prefecture: "滋賀県", city: "守山市", address: "滋賀県守山市今浜町2620-5",
    latitude: 35.1210, longitude: 135.9360,
    indoor_type: "both", price_type: "free", rainy_day_ok: true,
    average_stay_minutes: 180,
    searchQuery: "ピエリ守山", addressToken: "守山市",
  },
  {
    name: "あべのハルカス ハルカス300（展望台）",
    description: "日本一の高さクラスの超高層ビル最上部にある展望台。300mから大阪平野を一望でき、天気が良ければ淡路島まで見渡せる。",
    prefecture: "大阪府", city: "大阪市阿倍野区", address: "大阪府大阪市阿倍野区阿倍野筋1-1-43",
    latitude: 34.6459, longitude: 135.5136,
    indoor_type: "indoor", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    average_stay_minutes: 90,
    searchQuery: "ハルカス300 展望台", addressToken: "阿倍野区",
  },
  {
    name: "梅田スカイビル 空中庭園展望台",
    description: "2棟のビルを最上部でつないだ独特の建築で知られる展望スポット。屋上の回廊から梅田の街と夕景・夜景を360度見渡せる。",
    prefecture: "大阪府", city: "大阪市北区", address: "大阪府大阪市北区大淀中1-1-88",
    latitude: 34.7052, longitude: 135.4894,
    indoor_type: "both", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    average_stay_minutes: 60,
    searchQuery: "梅田スカイビル 空中庭園展望台", addressToken: "北区",
  },
  {
    name: "通天閣",
    description: "新世界のシンボルタワー。展望台からミナミの街を一望でき、ビリケンさんや体験型スライダーなど昭和レトロな見どころが詰まっている。",
    prefecture: "大阪府", city: "大阪市浪速区", address: "大阪府大阪市浪速区恵美須東1-18-6",
    latitude: 34.6525, longitude: 135.5063,
    indoor_type: "indoor", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    average_stay_minutes: 60,
    searchQuery: "通天閣", addressToken: "浪速区",
  },
  {
    name: "京都タワー",
    description: "京都駅前に立つ市街地で最も高い塔。展望室から東寺や清水寺など市内の寺社を見渡せ、雨の日の京都観光の定番。",
    prefecture: "京都府", city: "京都市下京区", address: "京都府京都市下京区東塩小路町721-1",
    latitude: 34.9875, longitude: 135.7593,
    indoor_type: "indoor", price_type: "paid", price_note: PAID_NOTE, rainy_day_ok: true,
    average_stay_minutes: 60,
    searchQuery: "京都タワー展望室", addressToken: "下京区",
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
