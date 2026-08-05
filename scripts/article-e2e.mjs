/**
 * 記事APIの通し検証 (作成 → 公開 → 公開ページ表示 → 削除)。
 * 実際のDB/HTTPを通すので、admin Cookie が必要。
 *
 * Run: node scripts/article-e2e.mjs [baseUrl]
 */
import { readFileSync } from "fs"

const base = process.argv[2] ?? "http://localhost:3000"
const env = {}
for (const line of readFileSync("./.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "")
}
if (!env.ADMIN_TOKEN) {
  console.error("ADMIN_TOKEN が .env.local にありません")
  process.exit(1)
}
const cookie = `admin_session=${env.ADMIN_TOKEN}`

let failures = 0
function check(name, condition, detail = "") {
  if (condition) console.log(`OK   ${name}`)
  else {
    console.error(`FAIL ${name} ${detail}`)
    failures += 1
  }
}

const slug = `e2e-test-${Date.now().toString(36)}`
let articleId = null

try {
  // --- 認証ガード ---
  const noAuth = await fetch(`${base}/api/admin/articles`)
  check("未認証は401", noAuth.status === 401, `got ${noAuth.status}`)

  // --- バリデーション ---
  const badSlug = await fetch(`${base}/api/admin/articles`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ title: "テスト", slug: "日本語スラッグ", status: "draft" }),
  })
  check("不正slugは400", badSlug.status === 400, `got ${badSlug.status}`)

  const publishNoDate = await fetch(`${base}/api/admin/articles`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ title: "テスト", slug: `${slug}-x`, status: "published" }),
  })
  check("公開日時なしの公開は400", publishNoDate.status === 400, `got ${publishNoDate.status}`)

  // --- 作成 ---
  const created = await fetch(`${base}/api/admin/articles`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      title: "E2Eテスト記事",
      slug,
      excerpt: "自動テストで作成した記事です。",
      body: "## 見出し\n\n本文です。\n\n- 箇条書き\n- [スポット一覧](/spots)",
      article_type: "seasonal",
      status: "published",
      published_at: new Date().toISOString().slice(0, 16),
      author_name: "テスト",
    }),
  })
  const createdBody = await created.json().catch(() => ({}))
  check("記事を作成できる", created.status === 201 && createdBody.article?.id, `got ${created.status} ${JSON.stringify(createdBody)}`)
  articleId = createdBody.article?.id

  // --- slug重複 ---
  const duplicate = await fetch(`${base}/api/admin/articles`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ title: "重複", slug, status: "draft" }),
  })
  check("slug重複は409", duplicate.status === 409, `got ${duplicate.status}`)

  // --- 公開ページ ---
  const page = await fetch(`${base}/articles/${slug}`)
  const html = await page.text()
  check("公開ページが200", page.status === 200, `got ${page.status}`)
  check("タイトルが出る", html.includes("E2Eテスト記事"))
  // 見出しには目次アンカー用のIDが付く
  check("Markdown見出しがh2になる", /<h2 id="h-\d+">見出し<\/h2>/.test(html))
  check("サイト内リンクが出る", html.includes('href="/spots"'))
  check("Article構造化データが出る", html.includes('"@type":"Article"'))

  // --- 一覧 ---
  const list = await fetch(`${base}/articles`)
  const listHtml = await list.text()
  check("記事一覧に載る", listHtml.includes("E2Eテスト記事"))
} catch (error) {
  console.error(`FAIL 例外: ${error.message}`)
  failures += 1
} finally {
  if (articleId) {
    const deleted = await fetch(`${base}/api/admin/articles/${articleId}`, { method: "DELETE", headers: { cookie } })
    check("記事を削除できる (後片付け)", deleted.ok, `got ${deleted.status}`)
  }
}

console.log(failures === 0 ? "\nすべて通過" : `\n${failures} 件失敗`)
process.exit(failures === 0 ? 0 : 1)
