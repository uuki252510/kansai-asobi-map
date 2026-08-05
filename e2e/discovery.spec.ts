import { expect, test } from "@playwright/test"

/**
 * 発見の導線: トップ → 検索/絞り込み → 詳細 → お気に入り。
 * 「今日どこ行くか短時間で決められる」ことを守るテスト。
 */

test("トップに主要導線が揃っている", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByRole("heading", { level: 1 })).toContainText("どこ行く")
  await expect(page.getByRole("searchbox", { name: "スポットを検索" })).toBeVisible()

  // 件数タイル (装飾アイコンでなく数字が主役)
  const tiles = page.locator(".data-tile")
  await expect(tiles.first()).toBeVisible()
  expect(await tiles.count()).toBeGreaterThanOrEqual(4)

  // 時間軸ナビ
  await expect(page.getByRole("link", { name: "今日行ける" })).toBeVisible()
})

test("検索して詳細ページまで到達できる", async ({ page }) => {
  await page.goto("/spots")

  const searchBox = page.getByRole("searchbox", { name: "スポットを検索" })
  await searchBox.fill("公園")
  await searchBox.press("Enter")
  await page.waitForURL(/search=/)

  const firstCard = page.locator("article a[href^='/places/']").first()
  await expect(firstCard).toBeVisible()
  const name = (await firstCard.locator("h3").textContent())?.trim()
  await firstCard.click()

  await page.waitForURL(/\/places\//)
  await expect(page.getByRole("heading", { level: 1 })).toContainText(name ?? "")
  // 判断材料の2ブロックが必ず出る
  await expect(page.getByRole("heading", { name: "どんなとこ？" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "なんで行くん？" })).toBeVisible()
})

test("絞り込みシートの件数が実際の表示件数と一致する", async ({ page }) => {
  await page.goto("/spots")

  await page.getByRole("button", { name: /絞り込み/ }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  await dialog.getByRole("button", { name: "雨の日OK" }).click()

  // 「この条件で N件を見る」の N を取り出す
  const applyButton = dialog.getByRole("button", { name: /この条件で|該当なし/ })
  const label = (await applyButton.textContent()) ?? ""
  const promised = Number(label.replace(/[^0-9]/g, ""))
  expect(promised).toBeGreaterThan(0)

  await applyButton.click()
  await expect(dialog).toBeHidden()

  const shown = Number(((await page.locator("h1 + p").textContent()) ?? "").replace(/[^0-9]/g, ""))
  expect(shown).toBe(promised)
})

test("お気に入りが保存され、マイページに出る", async ({ page }) => {
  await page.goto("/spots")
  await page.waitForLoadState("networkidle")

  // 押すとアクセシブル名が「お気に入りを解除」に変わるため、
  // 名前ではなく最初のカード内の要素として掴む
  const heart = page.locator("article").first().locator("button.heart-button")
  await expect(heart).toHaveAttribute("aria-pressed", "false")
  await heart.click()
  await expect(heart).toHaveAttribute("aria-pressed", "true")
  await expect(heart).toHaveAccessibleName("お気に入りを解除")

  await page.goto("/mypage")
  await expect(page.getByRole("tab", { name: /行きたい \(1\)/ })).toBeVisible()
  await expect(page.locator("article a[href^='/places/']").first()).toBeVisible()
})

test("カテゴリーページが機能する", async ({ page }) => {
  await page.goto("/facilities/category/park")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("公園")
  await expect(page.locator("article a[href^='/places/']").first()).toBeVisible()
})

test("ランキングの期間を切り替えられる", async ({ page }) => {
  await page.goto("/ranking")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ランキング")

  await page.getByRole("link", { name: "週間", exact: true }).click()
  await page.waitForURL(/window=week/)
  await expect(page.getByRole("heading", { level: 1 })).toContainText("週間")
})
