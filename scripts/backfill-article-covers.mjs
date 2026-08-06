/**
 * カバー未設定の記事に、紹介スポット先頭の実写真を割り当てる。
 *
 * 記事内で実際に紹介している施設の写真なので「イメージ写真」ではない。
 * 施設写真は place-images バケットにあり、articles.cover_storage_path も
 * 同じバケットを指すため、パスを写すだけでよい。
 *
 * Dry run: node scripts/backfill-article-covers.mjs
 * Apply:   node scripts/backfill-article-covers.mjs --apply
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

const { data: articles, error } = await supabase
  .from("articles")
  .select("id,slug,title,cover_storage_path,cover_external_url")
  .eq("status", "published")
if (error) { console.error(error.message); process.exit(1) }

const targets = articles.filter((a) => !a.cover_storage_path && !a.cover_external_url)
console.log(`カバー未設定: ${targets.length} / ${articles.length} 件`)

let planned = 0
for (const article of targets) {
  const { data: links } = await supabase
    .from("article_places")
    .select("place_id,sort_order")
    .eq("article_id", article.id)
    .order("sort_order")
  if (!links || links.length === 0) { console.log(`SKIP ${article.slug}: 紹介スポットなし`); continue }

  // 先頭から順に、写真を持つ施設を探す
  let cover = null
  for (const link of links) {
    const { data: place } = await supabase
      .from("places")
      .select("name,image_storage_path")
      .eq("id", link.place_id)
      .single()
    if (place?.image_storage_path) { cover = { path: place.image_storage_path, name: place.name }; break }
  }
  if (!cover) { console.log(`SKIP ${article.slug}: 写真を持つスポットなし`); continue }

  planned += 1
  console.log(`${article.slug}\n   ← ${cover.name} (${cover.path})`)
  if (apply) {
    const { error: updateError } = await supabase
      .from("articles")
      .update({ cover_storage_path: cover.path })
      .eq("id", article.id)
    if (updateError) console.error(`FAIL ${article.slug}: ${updateError.message}`)
  }
}

console.log(apply ? `\n${planned} 件に設定しました` : `\n(確認モード) --apply で ${planned} 件に設定します`)
