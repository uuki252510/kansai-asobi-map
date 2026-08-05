/**
 * 画像アップロード検証のテスト (マジックバイト判定)。
 * Run: npx tsx scripts/media-validation-test.mjs
 */
import assert from "node:assert/strict"
import { detectImageMime, extensionFor, validateUpload, MAX_UPLOAD_BYTES } from "../lib/media-validation.ts"

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

const pad = (head) => new Uint8Array([...head, ...new Array(20).fill(0)])
const JPEG = pad([0xff, 0xd8, 0xff, 0xe0])
const PNG = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const WEBP = pad([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
const AVIF = pad([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66])

test("JPEG を判定できる", () => assert.equal(detectImageMime(JPEG), "image/jpeg"))
test("PNG を判定できる", () => assert.equal(detectImageMime(PNG), "image/png"))
test("WebP を判定できる", () => assert.equal(detectImageMime(WEBP), "image/webp"))
test("AVIF を判定できる", () => assert.equal(detectImageMime(AVIF), "image/avif"))

test("拡張子偽装を弾く: 中身がテキストのjpg", () => {
  const text = new TextEncoder().encode("<?php system($_GET['c']); ?>            ")
  const result = validateUpload(text, "image/jpeg", text.byteLength)
  assert.equal(result.ok, false)
  assert.match(result.error, /画像のみ/)
})

test("SVG (XSSリスク) を弾く", () => {
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')
  assert.equal(validateUpload(svg, "image/svg+xml", svg.byteLength).ok, false)
})

test("GIF は許可しない", () => {
  const gif = pad([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  assert.equal(detectImageMime(gif), null)
})

test("サイズ超過を弾く", () => {
  const result = validateUpload(JPEG, "image/jpeg", MAX_UPLOAD_BYTES + 1)
  assert.equal(result.ok, false)
  assert.match(result.error, /8MB/)
})

test("空ファイルを弾く", () => {
  assert.equal(validateUpload(new Uint8Array(0), "image/jpeg", 0).ok, false)
})

test("正常なJPEGは通る", () => {
  const result = validateUpload(JPEG, "image/jpeg", JPEG.byteLength)
  assert.equal(result.ok, true)
  assert.equal(result.mime, "image/jpeg")
})

test("宣言typeが許可外なら弾く (中身が画像でも)", () => {
  assert.equal(validateUpload(PNG, "application/x-msdownload", PNG.byteLength).ok, false)
})

test("拡張子が正しく決まる", () => {
  assert.equal(extensionFor("image/jpeg"), "jpg")
  assert.equal(extensionFor("image/webp"), "webp")
})

console.log(`\n${passed} tests passed${process.exitCode ? " (with failures)" : ""}`)
