/**
 * 写真の無い公開施設に、Google Places の Text Search で写真を見つけて
 * Storage へ取り込む。
 *
 * 既存の import-place-images-to-storage.mjs は image_url に Google の
 * リソースURLが残っている前提。死んだURLを掃除した後の「写真なし」勢は
 * Place ID 自体が無いので、名前+市区町村で検索して特定する。
 *
 * 誤マッチ対策: 返ってきた住所に市区町村 (または府県) が含まれない場合は
 * 取り込まない。写真より「違う施設の写真」の方が害が大きい。
 *
 * 課金: searchText (Pro, photos込み) + Photo media。1施設あたり2リクエスト。
 *
 * Dry run: node scripts/find-and-import-photos.mjs --limit=5
 * Apply:   node scripts/find-and-import-photos.mjs --apply --all
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
if (!googleApiKey) { console.error("GOOGLE_MAPS_API_KEY がありません"); process.exit(1) }

const args = new Set(process.argv.slice(2))
const apply = args.has("--apply")
const all = args.has("--all")
const limitArg = process.argv.find((v) => v.startsWith("--limit="))
const limit = all ? Number.POSITIVE_INFINITY : Math.max(1, Number(limitArg?.split("=")[1] ?? 5))
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 名前の類似ゲート。Google は「近くの似た施設」を平気で返すため、
 * 住所照合だけでは 岩出総合公園←大宮緑地 のような誤マッチを通してしまう。
 * 間違った施設の写真は無いより害。bigram Dice 係数 + 包含で判定する。
 */
function normalizeName(value) {
  return (value ?? "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[s　・･、。「」!！?？&＆-]/g, "")
    .toLowerCase()
}

function nameSimilarity(a, b) {
  const grams = (t) => new Set(Array.from({ length: Math.max(t.length - 1, 0) }, (_, i) => t.slice(i, i + 2)))
  const ga = grams(a)
  const gb = grams(b)
  if (!ga.size || !gb.size) return a === b ? 1 : 0
  let shared = 0
  for (const g of ga) if (gb.has(g)) shared += 1
  return (2 * shared) / (ga.size + gb.size)
}

function coreOf(t, cityTokens) {
  let v = t
  for (const token of cityTokens) if (token && v.startsWith(token)) v = v.slice(token.length)
  v = v.replace(/^(市立|町立|村立|区立|県立|府立|市営|県営|府営|国営)/, "")
  v = v.replace(/(総合公園|運動公園|公園|児童館|児童センター|センター|広場|会館|図書館|博物館|美術館|資料館|科学館|プール|キャンプ場)$/, "")
  return v
}

function pairAccept(a, b, cityTokens) {
  if (a === b) return true
  const coreA = coreOf(a, cityTokens)
  const coreB = coreOf(b, cityTokens)
  if (coreA.length >= 2 && coreB.length >= 2) {
    if ((coreA.includes(coreB) && coreB.length >= 3) || (coreB.includes(coreA) && coreA.length >= 3)) return true
    return nameSimilarity(coreA, coreB) >= 0.55
  }
  if ((a.includes(b) && b.length >= 4) || (b.includes(a) && a.length >= 4)) return true
  return nameSimilarity(a, b) >= 0.75
}

function acceptMatch(queryName, matchedName, city) {
  const b = normalizeName(matchedName)
  if (!b) return false
  // マッチ名に自分の市区町村と違う市名が含まれていたら別施設 (奈良市←橿原市立 等)
  const cityBase = (city ?? "").replace(/.*郡/, "").replace(/[市町村区]$/, "")
  const otherCity = matchedName.match(/([一-龠]{2,4})市立/)
  if (otherCity && cityBase && otherCity[1] !== cityBase) return false
  // 郡付き町名にも対応した剥がしトークン
  const cityTokens = [normalizeName(city ?? ""), normalizeName(cityBase)].filter(Boolean)
  // 正式名と括弧内の別名 (サバーファーム等) のどちらかが一致すればよい
  const names = [queryName]
  for (const alias of queryName.matchAll(/[（(]([^）)]+)[）)]/g)) names.push(alias[1])
  return names.some((candidate) => {
    const a = normalizeName(candidate)
    return a && pairAccept(a, b, cityTokens)
  })
}

async function searchPlace(name, city, prefecture) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": googleApiKey,
      // photos を含めるので Pro SKU。1施設1回で済ませる
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.photos",
    },
    body: JSON.stringify({ textQuery: `${name} ${city ?? ""}`, languageCode: "ja", regionCode: "JP", pageSize: 1 }),
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) throw new Error(`searchText ${response.status}`)
  const payload = await response.json()
  const candidate = payload.places?.[0]
  if (!candidate) throw new Error("検索ヒットなし")
  const address = candidate.formattedAddress ?? ""
  // 誤マッチ防止: 住所に市区町村か府県が入っていること
  if (city && !address.includes(city) && !(prefecture && address.includes(prefecture))) {
    throw new Error(`住所不一致: ${address.slice(0, 40)}`)
  }
  const photo = (candidate.photos ?? []).find((entry) => {
    if (!entry.name) return false
    if (!entry.widthPx || !entry.heightPx) return true
    const ratio = entry.widthPx / entry.heightPx
    return ratio >= 0.65 && ratio <= 2.8
  })
  const matchedName = candidate.displayName?.text ?? ""
  if (!acceptMatch(name, matchedName, city)) throw new Error("名前不一致: " + matchedName)
  if (!photo?.name) throw new Error("使える写真なし")
  return { photoName: photo.name, matchedName }
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

const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("places")
    .select("id,name,city,prefecture")
    .eq("is_published", true)
    .is("image_storage_path", null)
    .is("image_url", null)
    .range(from, from + 999)
  if (error) throw new Error(error.message)
  rows.push(...(data ?? []))
  if (!data || data.length < 1000) break
}
const targets = rows.slice(0, limit)
console.log(`写真なし ${rows.length} 件 / 今回対象 ${targets.length} 件 (apply=${apply})`)

let imported = 0
let skipped = 0
for (const place of targets) {
  await wait(300)
  try {
    const found = await searchPlace(place.name, place.city, place.prefecture)
    if (!apply) { console.log(`候補 ${place.name} ← ${found.matchedName}`); imported += 1; continue }
    const photo = await fetchPhoto(found.photoName)
    const ext = photo.contentType.includes("png") ? "png" : photo.contentType.includes("webp") ? "webp" : "jpg"
    const path = `${place.id}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from("place-images")
      .upload(path, photo.buffer, { contentType: photo.contentType, upsert: true })
    if (uploadError) throw new Error(`upload: ${uploadError.message}`)
    const { error: updateError } = await supabase
      .from("places")
      .update({ image_storage_path: path, image_source: "google", image_synced_at: new Date().toISOString() })
      .eq("id", place.id)
    if (updateError) throw new Error(`update: ${updateError.message}`)
    imported += 1
    console.log(`OK   ${place.name} ← ${found.matchedName} (${Math.round(photo.buffer.length / 1024)}KB)`)
  } catch (error) {
    skipped += 1
    console.log(`SKIP ${place.name}: ${error.message}`)
  }
}
console.log(`\nDONE: 取込 ${imported} / 見送り ${skipped}${apply ? "" : " (dry run)"}`)
