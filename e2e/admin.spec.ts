import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"

/**
 * 運営導線: ログイン → 記事を書く → 公開画面に出る → 片付ける。
 * 「登録したものが公開側に反映される」ことを守るテスト。
 */

function adminToken(): string {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*ADMIN_TOKEN\s*=\s*(.*)$/)
    if (match) return match[1].trim().replace(/^['"]|['"]$/g, "")
  }
  throw new Error("ADMIN_TOKEN が .env.local にありません")
}

test.describe("管理画面", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      {
        name: "admin_session",
        value: adminToken(),
        url: baseURL ?? "http://localhost:3000",
      },
    ])
  })

  test("未ログインだとログイン画面に飛ばされる", async ({ browser }) => {
    // Cookie を持たない別コンテキストで確認
    const clean = await browser.newContext()
    const page = await clean.newPage()
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/admin\/login/)
    await clean.close()
  })

  test("記事を書くと公開画面に出る", async ({ page }) => {
    const slug = `e2e-ui-${Date.now().toString(36)}`
    const title = `E2E自動テスト記事 ${slug}`

    await page.goto("/admin/articles/new")
    await page.getByLabel("タイトル *").fill(title)
    await page.getByLabel(/URLスラッグ/).fill(slug)
    await page.getByLabel(/リード文/).fill("Playwrightで作成した記事です。")
    await page.getByLabel("本文").fill("## 見出し\n\n本文テストです。")

    // 公開するには日時が要る
    await page.getByLabel("公開ステータス").selectOption("published")
    await page.getByLabel("公開日時").fill(new Date().toISOString().slice(0, 16))

    await page.getByRole("button", { name: "記事を作成" }).click()
    await page.waitForURL(/\/admin\/articles\/[0-9a-f-]{36}/)
    const articleId = page.url().split("/").pop()!

    // 公開画面に出る
    await page.goto(`/articles/${slug}`)
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title)
    await expect(page.getByRole("heading", { name: "見出し" })).toBeVisible()

    await page.goto("/articles")
    await expect(page.getByText(title)).toBeVisible()

    // 片付け
    const response = await page.request.delete(`/api/admin/articles/${articleId}`)
    expect(response.ok()).toBeTruthy()
  })

  test("バリデーションエラーが表示される", async ({ page }) => {
    await page.goto("/admin/articles/new")
    await page.getByLabel("タイトル *").fill("スラッグ不正テスト")
    await page.getByLabel(/URLスラッグ/).fill("日本語スラッグ")
    await page.getByRole("button", { name: "記事を作成" }).click()

    await expect(page.getByRole("status")).toContainText("英小文字")
    // 作成されていないこと
    await expect(page).toHaveURL(/\/admin\/articles\/new/)
  })
})
