import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"

const env = {}
for (const line of readFileSync("./.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "")
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("places")
    .select("id,name,description,prefecture,city,indoor_type,price_type,price_note,rainy_day_ok,has_parking,has_nursing_room,has_diaper_space,target_ages,image_url,image_storage_path,website_url")
    .eq("is_published", true)
    .range(from, from + 999)
  if (error) throw new Error(error.message)
  rows.push(...(data ?? []))
  if (!data || data.length < 1000) break
}

const withPhoto = rows.filter((r) => r.image_storage_path || r.image_url)
const text = (r) => `${r.name} ${r.description ?? ""}`

const themes = {
  water: (r) => /プール|水遊び|じゃぶじゃぶ|噴水|ウォーター|海水浴|ビーチ|海岸|川遊び|渓流|水辺/.test(text(r)),
  indoor: (r) => r.indoor_type === "indoor" || r.rainy_day_ok,
  free: (r) => r.price_type === "free",
  osaka: (r) => r.prefecture === "大阪府",
  hyogo: (r) => r.prefecture === "兵庫県",
  kyoto: (r) => r.prefecture === "京都府",
  nara: (r) => r.prefecture === "奈良県",
  shiga: (r) => r.prefecture === "滋賀県",
  wakayama: (r) => r.prefecture === "和歌山県",
  animal: (r) => /動物園|どうぶつ|水族館|牧場|ふれあい|アニマル/.test(text(r)),
  museum: (r) => /博物館|科学館|美術館|資料館|ミュージアム|プラネタリウム/.test(text(r)),
}

const target = process.argv[2]
const list = withPhoto.filter(themes[target] ?? (() => true))
console.log(`## ${target}: ${list.length}件 (写真あり ${withPhoto.length}/${rows.length})\n`)
for (const r of list.slice(0, Number(process.argv[3] ?? 25))) {
  const flags = [
    r.indoor_type === "indoor" ? "屋内" : r.indoor_type === "outdoor" ? "屋外" : "屋内外",
    r.price_type === "free" ? "無料" : r.price_type === "paid" ? "有料" : "一部有料",
    r.rainy_day_ok ? "雨OK" : "",
    r.has_parking ? "駐車場" : "",
    r.has_nursing_room ? "授乳室" : "",
    r.has_diaper_space ? "おむつ台" : "",
    (r.target_ages ?? []).join("/"),
  ].filter(Boolean).join(" ")
  console.log(`${r.id}\t${r.prefecture}${r.city}\t${r.name}\t[${flags}]`)
  if (r.description) console.log(`  ${r.description.replace(/\s+/g, " ").slice(0, 160)}`)
}
