/**
 * 記事の「質」の検証: 本文内スポット埋込 / 画像 / 目次 / タグ / 関連記事。
 * いこーよ相当の構成 (複数見出し + スポットカード) の記事を作って確認し、削除する。
 *
 * Run: node scripts/article-quality-e2e.mjs [baseUrl]
 */
import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"

const base = process.argv[2] ?? "http://localhost:3000"
const env = {}
for (const line of readFileSync("./.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "")
}
const cookie = `admin_session=${env.ADMIN_TOKEN}`
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let failures = 0
const check = (name, ok, detail = "") => {
  if (ok) console.log(`OK   ${name}`)
  else { console.error(`FAIL ${name} ${detail}`); failures += 1 }
}

const slug = `quality-${Date.now().toString(36)}`
let articleId = null

try {
  const { data: spots } = await supabase
    .from("places").select("id,name").eq("is_published", true).not("image_url", "is", null).limit(3)
  const { data: tags } = await supabase.from("tags").select("id,name").is("canonical_tag_id", null).limit(2)
  check("検証用スポットが取れる", (spots?.length ?? 0) === 3)

  const body = [
    "夏休みに行きたい関西のスポットをまとめました。",
    "",
    "## 水遊びができるスポット",
    "",
    "暑い日は水辺が気持ちいいです。",
    "",
    `:::spot ${spots[0].id}`,
    "",
    "![夏の水遊び](https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Example.jpg/320px-Example.jpg \"出典: Wikimedia Commons\")",
    "",
    "## 屋内で涼めるスポット",
    "",
    "- 冷房が効いている",
    "- **雨でも安心**",
    "",
    `:::spot ${spots[1].id}`,
    "",
    "## 一日中遊べるスポット",
    "",
    "朝から夕方までしっかり遊べます。",
    "",
    `:::spot ${spots[2].id}`,
  ].join("\n")

  const created = await fetch(`${base}/api/admin/articles`, {
    method: "POST", headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      title: "【関西】夏休みのおすすめスポット",
      slug,
      excerpt: "水遊び・屋内・一日中遊べる場所を厳選しました。",
      body,
      article_type: "seasonal",
      status: "published",
      published_at: new Date().toISOString().slice(0, 16),
      author_name: "デカケル編集部",
      place_ids: spots.map((s) => s.id),
      tag_ids: (tags ?? []).map((t) => t.id),
    }),
  })
  const createdBody = await created.json().catch(() => ({}))
  check("記事を作成できる", created.status === 201, `${created.status} ${JSON.stringify(createdBody)}`)
  articleId = createdBody.article?.id

  const raw = await (await fetch(`${base}/articles/${slug}`)).text()
  // React は隣接する式の間に <!-- --> を挟むので、テキスト判定の前に除去する
  const html = raw.replace(/<!--[\s\S]*?-->/g, "")

  // --- 構造 ---
  check("目次が出る", html.includes("目次") && html.includes('aria-label="目次"'))
  const tocLinks = (html.match(/href="#h-\d+"/g) || []).length
  check("目次リンクが3件", tocLinks === 3, `got ${tocLinks}`)

  const headingIds = (html.match(/<h2 id="(h-\d+)"/g) || []).map((m) => m.match(/"(h-\d+)"/)[1])
  const tocTargets = (html.match(/href="#(h-\d+)"/g) || []).map((m) => m.match(/#(h-\d+)/)[1])
  check("目次のリンク先が本文の見出しと一致する", tocTargets.every((id) => headingIds.includes(id)),
    `toc=${tocTargets} headings=${headingIds}`)

  // --- 本文内スポットカード ---
  const spotCards = (html.match(/<aside class="article-spot/g) || []).length
  check("本文にスポットカードが3枚", spotCards === 3, `got ${spotCards}`)
  check("スポットカードに住所が出る", html.includes("住所"))
  check("スポットカードに詳細リンクが出る", html.includes("詳しく見る"))
  for (const spot of spots) {
    check(`「${spot.name}」が本文に出る`, html.includes(spot.name))
  }

  // --- 画像 ---
  check("本文画像が figure で出る", html.includes("<figure>") && html.includes("upload.wikimedia.org"))
  check("画像の出典が出る", html.includes("figcaption") && html.includes("Wikimedia Commons"))

  // --- メタ ---
  check("読了目安が出る", /約\d+分で読めます/.test(html))
  check("スポット件数が出る", html.includes("スポット3件"))
  check("著者が出る", html.includes("デカケル編集部"))
  if ((tags?.length ?? 0) > 0) check("タグが出る", html.includes(tags[0].name))

  // --- 末尾で重複しない ---
  check("本文に出したスポットは末尾で重複しない", !html.includes("この記事で紹介したスポット"))
} catch (error) {
  console.error(`FAIL 例外: ${error.message}`)
  failures += 1
} finally {
  if (articleId) {
    const deleted = await fetch(`${base}/api/admin/articles/${articleId}`, { method: "DELETE", headers: { cookie } })
    check("記事を削除できる (後片付け)", deleted.ok)
  }
}

console.log(failures === 0 ? "\nすべて通過" : `\n${failures} 件失敗`)
process.exit(failures === 0 ? 0 : 1)
