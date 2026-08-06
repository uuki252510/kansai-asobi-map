import { test, expect } from "@playwright/test"
import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"

/**
 * 口コミ投稿の通し確認。
 *
 * 口コミは公開側から匿名で insert する唯一の書き込みなので、
 * RLS やフォームが壊れると「実データが一切集まらない」状態に静かに陥る。
 * 投稿 → 表示 → 平均評価への反映 まで見て、最後にテスト行を消す。
 */

const env: Record<string, string> = {}
for (const line of readFileSync("./.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "")
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

test("口コミを投稿できる", async ({ page }) => {
  const { data: place } = await admin
    .from("places")
    .select("id,name")
    .eq("is_published", true)
    .limit(1)
    .single()
  expect(place, "公開スポットが1件も無い").toBeTruthy()

  const userName = `e2e-${Date.now().toString(36)}`
  const comment = "自動テストの投稿です。実行後に削除されます。"

  await page.goto(`/places/${place!.id}`)

  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "口コミを投稿する" }) })
  await expect(form).toBeVisible()

  // 星は button[aria-label="4点"] のようなラベルを持つ
  await form.getByRole("button", { name: "4点" }).click()
  await form.getByPlaceholder("例：ゆきママ").fill(userName)
  await form.locator("textarea").fill(comment)

  await form.getByRole("button", { name: "口コミを投稿する" }).click()

  // 投稿できたことをユーザーに見える形で確認する
  await expect(page.getByText("口コミを投稿しました")).toBeVisible({ timeout: 15_000 })

  // DBに入っているか
  const { data: saved } = await admin
    .from("reviews")
    .select("id,rating,comment,user_name")
    .eq("user_name", userName)
    .maybeSingle()
  expect(saved, "口コミがDBに入っていない").toBeTruthy()
  expect(saved!.rating).toBe(4)
  expect(saved!.comment).toBe(comment)

  // 再読み込みで一覧に出て、件数が0件でなくなる
  await page.reload()
  await expect(page.getByText(comment)).toBeVisible()
  await expect(page.getByText("まだ口コミがありません")).toHaveCount(0)

  // 後片付け
  await admin.from("reviews").delete().eq("id", saved!.id)
})
