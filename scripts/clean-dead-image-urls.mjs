/**
 * 死んだ画像URLの掃除。
 *
 * image_url に期限切れの Google 写真URL (lh3.googleusercontent の
 * place-photos リンク等) が残っている施設は、「写真あり」に見えるのに
 * 実際は代替画像に落ちる。ホームの選定ロジックがこれに騙されるので、
 * 実際に取得できないURLを null にしてデータを正直にする。
 *
 * Storage 取り込み済み (image_storage_path あり) の施設は image_url を
 * 使わないため対象外。チェックは公開CDNへの HEAD だけで、課金APIは呼ばない。
 *
 * Dry run: node scripts/clean-dead-image-urls.mjs
 * Apply:   node scripts/clean-dead-image-urls.mjs --apply
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
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("places")
    .select("id,name,image_url,image_storage_path")
    .eq("is_published", true)
    .is("image_storage_path", null)
    .not("image_url", "is", null)
    .range(from, from + 999)
  if (error) throw new Error(error.message)
  rows.push(...(data ?? []))
  if (!data || data.length < 1000) break
}
console.log(`Storage無し・URLあり: ${rows.length} 件をチェックします`)

const dead = []
let alive = 0
for (const place of rows) {
  await wait(150)
  let ok = false
  try {
    const response = await fetch(place.image_url, {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    })
    // 一部CDNはHEADを蹴るのでGETで再確認
    if (!response.ok && response.status !== 405) {
      const retry = await fetch(place.image_url, { method: "GET", signal: AbortSignal.timeout(8000) })
      ok = retry.ok && (retry.headers.get("content-type") ?? "").startsWith("image/")
    } else {
      ok = response.ok
    }
  } catch {
    ok = false
  }
  if (ok) alive += 1
  else { dead.push(place); console.log(`死: ${place.name}`) }
}
console.log(`\n生存 ${alive} / 死亡 ${dead.length}`)

if (!apply) { console.log("(確認モード) --apply で死んだURLを null にします"); process.exit(0) }

let cleaned = 0
for (const place of dead) {
  const { error } = await supabase.from("places").update({ image_url: null }).eq("id", place.id)
  if (error) { console.error(`FAIL ${place.name}: ${error.message}`); continue }
  cleaned += 1
}
console.log(`${cleaned} 件の image_url を無効化しました`)
