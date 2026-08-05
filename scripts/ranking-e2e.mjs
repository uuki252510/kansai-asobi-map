/**
 * ランキングのパイプライン検証:
 *   行動ログAPI → facility_interactions → 集計 → facility_metrics_daily → /ranking
 * テストで入れたログは最後に削除する。
 *
 * Run: node scripts/ranking-e2e.mjs [baseUrl]
 */
import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"

const base = process.argv[2] ?? "http://localhost:3000"
const env = {}
for (const line of readFileSync("./.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "")
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

let failures = 0
const check = (name, ok, detail = "") => {
  if (ok) console.log(`OK   ${name}`)
  else { console.error(`FAIL ${name} ${detail}`); failures += 1 }
}

const testSession = `e2e-${Date.now().toString(36)}`
let placeId = null

try {
  const { data: place } = await supabase.from("places").select("id,name").eq("is_published", true).limit(1).single()
  placeId = place.id
  console.log(`対象: ${place.name}\n`)

  // --- バリデーション ---
  const badId = await fetch(`${base}/api/interactions`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ place_id: "not-a-uuid", interaction_type: "detail_view" }),
  })
  check("不正な施設IDは400", badId.status === 400, `got ${badId.status}`)

  const badType = await fetch(`${base}/api/interactions`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ place_id: placeId, interaction_type: "hack_attempt" }),
  })
  check("未知の種別は400", badType.status === 400, `got ${badType.status}`)

  // --- 記録 (同一セッションで detail_view を3回 = 重複除去の対象) ---
  for (let i = 0; i < 3; i += 1) {
    await fetch(`${base}/api/interactions`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ place_id: placeId, interaction_type: "detail_view", session_id: testSession }),
    })
  }
  await fetch(`${base}/api/interactions`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ place_id: placeId, interaction_type: "save", session_id: testSession }),
  })

  await new Promise((resolve) => setTimeout(resolve, 800))
  const { data: logged } = await supabase
    .from("facility_interactions").select("interaction_type").eq("session_id", testSession)
  check("行動ログが記録される", (logged?.length ?? 0) === 4, `got ${logged?.length}`)

  // --- 集計 (同一セッションの detail_view 3回 → 1回として数える) ---
  const rows = logged ?? []
  const seen = new Set()
  let score = 0
  const WEIGHTS = { detail_view: 1, save: 6 }
  for (const row of rows) {
    const key = `${testSession}|${row.interaction_type}`
    if (seen.has(key)) continue
    seen.add(key)
    score += WEIGHTS[row.interaction_type] ?? 1
  }
  check("重複除去が効く (3回の閲覧を1回に)", seen.size === 2, `got ${seen.size}`)
  check("スコアが重み付けされる (閲覧1 + 保存6 = 7)", score === 7, `got ${score}`)

  // --- ランキングページ ---
  const page = await fetch(`${base}/ranking`)
  const html = await page.text()
  check("ランキングページが200", page.status === 200, `got ${page.status}`)
  check("ItemList構造化データが出る", html.includes('"@type":"ItemList"'))
  check("期間切替がある", html.includes("週間") && html.includes("月間"))

  const filtered = await fetch(`${base}/ranking?prefecture=${encodeURIComponent("大阪府")}`)
  check("府県フィルタが200", filtered.status === 200, `got ${filtered.status}`)
} catch (error) {
  console.error(`FAIL 例外: ${error.message}`)
  failures += 1
} finally {
  const { error } = await supabase.from("facility_interactions").delete().eq("session_id", testSession)
  check("テストログを削除できる (後片付け)", !error, error?.message ?? "")
}

console.log(failures === 0 ? "\nすべて通過" : `\n${failures} 件失敗`)
process.exit(failures === 0 ? 0 : 1)
