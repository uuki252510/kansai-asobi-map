/**
 * 施設1件を非公開化する汎用ユーティリティ。任意でリダイレクト先も設定。
 * 物理削除はしない。
 *
 * 使い方:
 *   node scripts/archive-place.mjs --name="施設名" [--redirect-to="別の施設名"] [--apply]
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
const redirectArg = process.argv.find((v) => v.startsWith("--redirect-to="))?.slice(14)
if (!nameArg) { console.error("--name= が必要です"); process.exit(1) }

const { data: targets, error } = await supabase
  .from("places")
  .select("id,name,is_published")
  .eq("name", nameArg)
  .eq("is_published", true)
if (error) throw new Error(error.message)
if (!targets || targets.length === 0) { console.log("公開中の該当なし:", nameArg); process.exit(0) }

let redirectId = null
if (redirectArg) {
  const { data: to, error: toError } = await supabase
    .from("places")
    .select("id,name")
    .eq("name", redirectArg)
    .eq("is_published", true)
    .limit(1)
  if (toError) throw new Error(toError.message)
  if (!to || to.length === 0) { console.error("リダイレクト先が見つかりません:", redirectArg); process.exit(1) }
  redirectId = to[0].id
}

for (const t of targets) console.log(`非公開化: ${t.name} (${t.id})${redirectArg ? ` → ${redirectArg}` : ""}`)
if (!apply) { console.log("(確認モード) --apply で実行します"); process.exit(0) }

for (const t of targets) {
  const patch = { is_published: false, publication_status: "archived" }
  if (redirectId) patch.merged_into_place_id = redirectId
  const { error: updateError } = await supabase.from("places").update(patch).eq("id", t.id)
  if (updateError) { console.error(`FAIL: ${updateError.message}`); continue }
  console.log("完了:", t.name)
}
