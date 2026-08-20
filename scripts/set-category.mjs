/**
 * 施設1件のカテゴリを指定スラッグに置き換える小ユーティリティ。
 * 自動分類 (classify-facilities.mjs) の誤判定を個別に直すためのもの。
 *
 * 使い方: node scripts/set-category.mjs --name="施設名" --slugs=shopping,park [--apply]
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
const nameArg = process.argv.find((v) => v.startsWith("--name="))?.slice(7)
const slugsArg = process.argv.find((v) => v.startsWith("--slugs="))?.slice(8)
if (!nameArg || !slugsArg) { console.error("--name= と --slugs= が必要です"); process.exit(1) }
const slugs = slugsArg.split(",").map((s) => s.trim()).filter(Boolean)

const { data: place, error } = await supabase.from("places").select("id,name").eq("name", nameArg).single()
if (error) { console.error("施設が見つかりません:", error.message); process.exit(1) }

const { data: categories, error: catError } = await supabase.from("categories").select("id,slug").in("slug", slugs)
if (catError) throw new Error(catError.message)
if (!categories || categories.length !== slugs.length) {
  console.error("存在しないスラッグがあります:", slugs.join(","))
  process.exit(1)
}

const { data: current } = await supabase
  .from("facility_categories")
  .select("category_id, categories(slug)")
  .eq("place_id", place.id)
console.log(`${place.name}: 現在=[${(current ?? []).map((r) => r.categories?.slug).join(",")}] → 新=[${slugs.join(",")}]`)

if (!apply) { console.log("(確認モード) --apply で書き換えます"); process.exit(0) }

const { error: delError } = await supabase.from("facility_categories").delete().eq("place_id", place.id)
if (delError) throw new Error(delError.message)
const { error: insError } = await supabase
  .from("facility_categories")
  .insert(categories.map((c) => ({ place_id: place.id, category_id: c.id })))
if (insError) throw new Error(insError.message)
console.log("更新しました")
