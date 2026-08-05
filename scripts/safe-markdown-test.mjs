/**
 * 記事本文レンダラのXSS/整形テスト。
 * Run: npx tsx scripts/safe-markdown-test.mjs
 */
import assert from "node:assert/strict"
import { renderSafeMarkdown } from "../lib/safe-markdown.ts"

let passed = 0
function test(name, fn) {
  try {
    fn()
    passed += 1
    console.log(`OK   ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`)
    process.exitCode = 1
  }
}

test("生scriptタグを無害化する", () => {
  const html = renderSafeMarkdown('<script>alert(1)</script>')
  assert.ok(!html.includes("<script"))
  assert.ok(html.includes("&lt;script&gt;"))
})

test("imgのonerrorを無害化する (タグとして成立させない)", () => {
  const html = renderSafeMarkdown('<img src=x onerror=alert(1)>')
  // 文字列 "onerror=" はエスケープ済みテキストとして残ってよい。
  // 危険なのは <img が実タグとして出力されること。
  assert.ok(!html.includes("<img"), "img タグが生成されている")
  assert.ok(html.includes("&lt;img"), "エスケープされていない")
})

test("javascript: リンクを弾く (テキストだけ残す)", () => {
  const html = renderSafeMarkdown("[クリック](javascript:alert(1))")
  assert.ok(!html.includes("javascript:"))
  assert.ok(html.includes("クリック"))
})

test("data: リンクを弾く", () => {
  const html = renderSafeMarkdown("[x](data:text/html;base64,PHNjcmlwdD4=)")
  assert.ok(!html.includes("data:"))
})

test("外部リンクは新規タブ+noopener", () => {
  const html = renderSafeMarkdown("[海遊館](https://example.com/a)")
  assert.ok(html.includes('href="https://example.com/a"'))
  assert.ok(html.includes('rel="noopener noreferrer"'))
})

test("サイト内リンクは同一タブ", () => {
  const html = renderSafeMarkdown("[スポット一覧](/spots)")
  assert.ok(html.includes('href="/spots"'))
  assert.ok(!html.includes("target=") || !html.split('href="/spots"')[1].startsWith(' target'))
})

test("プロトコル相対URL //evil.com を弾く", () => {
  const html = renderSafeMarkdown("[x](//evil.com)")
  assert.ok(!html.includes('href="//evil.com"'))
})

test("見出し・リスト・段落を組み立てる", () => {
  const html = renderSafeMarkdown("## 夏の水遊び\n\n暑い日は水辺へ。\n\n- プール\n- 川遊び")
  // 見出しには目次から飛ぶためのアンカーIDが付く
  assert.match(html, /<h2 id="h-\d+">夏の水遊び<\/h2>/)
  assert.ok(html.includes("<p>暑い日は水辺へ。</p>"))
  assert.ok(html.includes("<li>プール</li>"))
  assert.ok(html.includes("<ul>"))
})

test("見出しIDは headingOffset で連番が続く", () => {
  const first = renderSafeMarkdown("## A", 0)
  const second = renderSafeMarkdown("## B", 1)
  assert.ok(first.includes('id="h-0"'))
  assert.ok(second.includes('id="h-1"'))
})

test("画像は figure + figcaption になる", () => {
  const html = renderSafeMarkdown('![滝の写真](https://example.com/a.jpg "出典: 例")')
  assert.ok(html.includes("<figure>"))
  assert.ok(html.includes('src="https://example.com/a.jpg"'))
  assert.ok(html.includes('alt="滝の写真"'))
  assert.ok(html.includes("<figcaption>出典: 例</figcaption>"))
})

test("画像の出典は省略できる", () => {
  const html = renderSafeMarkdown("![説明](https://example.com/a.jpg)")
  assert.ok(html.includes("<figure>"))
  assert.ok(!html.includes("figcaption"))
})

test("http (非TLS) の画像は弾く", () => {
  const html = renderSafeMarkdown("![x](http://example.com/a.jpg)")
  assert.ok(!html.includes("<img"))
})

test("javascript: の画像は弾く", () => {
  const html = renderSafeMarkdown("![x](javascript:alert(1))")
  assert.ok(!html.includes("<img"))
})

test("画像altに引用符を仕込んでも属性を割れない", () => {
  const html = renderSafeMarkdown('![" onerror="alert(1)](https://example.com/a.jpg)')
  assert.ok(!html.includes("onerror=\""), "属性が割れている")
  assert.ok(html.includes("&quot;") || !html.includes("<img"))
})

test("強調が効く", () => {
  const html = renderSafeMarkdown("**無料**で遊べる")
  assert.ok(html.includes("<strong>無料</strong>"))
})

test("段落内の改行は<br />になる", () => {
  const html = renderSafeMarkdown("1行目\n2行目")
  assert.ok(html.includes("1行目<br />2行目"))
})

console.log(`\n${passed} tests passed${process.exitCode ? " (with failures)" : ""}`)
