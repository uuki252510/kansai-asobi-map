/**
 * イベントAPIの通し検証 (作成 → 公開ページ → 一覧 → 削除)。
 * Run: node scripts/event-e2e.mjs [baseUrl]
 */
import { readFileSync } from "fs"

const base = process.argv[2] ?? "http://localhost:3000"
const env = {}
for (const line of readFileSync("./.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "")
}
if (!env.ADMIN_TOKEN) { console.error("ADMIN_TOKEN がありません"); process.exit(1) }
const cookie = `admin_session=${env.ADMIN_TOKEN}`

let failures = 0
const check = (name, ok, detail = "") => {
  if (ok) console.log(`OK   ${name}`)
  else { console.error(`FAIL ${name} ${detail}`); failures += 1 }
}

const slug = `e2e-hanabi-${Date.now().toString(36)}`
let eventId = null
const pad = (n) => String(n).padStart(2, "0")
const local = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`

try {
  check("未認証は401", (await fetch(`${base}/api/admin/events`)).status === 401)

  // 日付逆転
  const reversed = await fetch(`${base}/api/admin/events`, {
    method: "POST", headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ name: "逆転", start_at: "2026-08-10T18:00", end_at: "2026-08-09T18:00", status: "draft" }),
  })
  check("終了が開始より前は400", reversed.status === 400, `got ${reversed.status}`)

  // 会場情報なしで公開
  const noVenue = await fetch(`${base}/api/admin/events`, {
    method: "POST", headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ name: "会場なし", start_at: "2026-08-10T18:00", end_at: "2026-08-10T20:00", status: "published" }),
  })
  check("会場情報なしの公開は400", noVenue.status === 400, `got ${noVenue.status}`)

  // 作成 (今週末にかかる期間にする)
  const now = new Date()
  const start = new Date(now.getTime() + 60 * 60 * 1000)
  const end = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000)
  const created = await fetch(`${base}/api/admin/events`, {
    method: "POST", headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      name: "E2E花火大会", slug, event_category: "fireworks",
      summary: "テスト用の花火大会です。", description: "## 見どころ\n\n約5000発の花火。",
      venue_name: "テスト河川敷", address: "大阪府大阪市北区", prefecture: "大阪府", city: "大阪市北区",
      start_at: local(start), end_at: local(end),
      is_free: true, reservation_required: false, organizer_name: "テスト実行委員会",
      rain_policy: "荒天中止", access_note: "JRテスト駅から徒歩5分",
      status: "published",
    }),
  })
  const body = await created.json().catch(() => ({}))
  check("イベントを作成できる", created.status === 201 && body.event?.id, `got ${created.status} ${JSON.stringify(body)}`)
  eventId = body.event?.id

  const dup = await fetch(`${base}/api/admin/events`, {
    method: "POST", headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ name: "重複", slug, start_at: local(start), end_at: local(end), venue_name: "x", status: "draft" }),
  })
  check("slug重複は409", dup.status === 409, `got ${dup.status}`)

  const page = await fetch(`${base}/events/${slug}`)
  const html = await page.text()
  check("詳細ページが200", page.status === 200, `got ${page.status}`)
  check("イベント名が出る", html.includes("E2E花火大会"))
  check("Event構造化データが出る", html.includes('"@type":"Event"'))
  check("会場がlocationに入る", html.includes('"@type":"Place"'))
  check("無料がOfferに入る", html.includes('"@type":"Offer"'))
  check("雨天時の対応が出る", html.includes("荒天中止"))
  // 見出しには目次アンカー用のIDが付く
  check("Markdownがh2になる", /<h2 id="h-\d+">見どころ<\/h2>/.test(html))

  const list = await fetch(`${base}/events`)
  const listHtml = await list.text()
  check("イベント一覧に載る", listHtml.includes("E2E花火大会"))

  const filtered = await fetch(`${base}/events?category=fireworks`)
  check("カテゴリ絞り込みでヒット", (await filtered.text()).includes("E2E花火大会"))

  const wrongCategory = await fetch(`${base}/events?category=sale`)
  check("別カテゴリでは出ない", !(await wrongCategory.text()).includes("E2E花火大会"))
} catch (error) {
  console.error(`FAIL 例外: ${error.message}`)
  failures += 1
} finally {
  if (eventId) {
    const deleted = await fetch(`${base}/api/admin/events/${eventId}`, { method: "DELETE", headers: { cookie } })
    check("イベントを削除できる (後片付け)", deleted.ok, `got ${deleted.status}`)
  }
}

console.log(failures === 0 ? "\nすべて通過" : `\n${failures} 件失敗`)
process.exit(failures === 0 ? 0 : 1)
