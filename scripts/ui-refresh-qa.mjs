import { createRequire } from "node:module"
import { writeFile } from "node:fs/promises"
import path from "node:path"

const require = createRequire(import.meta.url)
const { chromium } = require(
  "C:\\Users\\yuy04\\.codex\\visualizations\\2026\\07\\18\\019f72e5-071e-7bc1-a81d-83349a1c6a53\\qa-runtime\\node_modules\\playwright",
)

const prefix = process.argv[2] ?? "qa"
const outputDir =
  "C:\\Users\\yuy04\\.codex\\visualizations\\2026\\07\\24\\019f9483-e398-77a0-8b20-321c8fcc30b0"
const baseUrl = "http://localhost:3000"
const executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const browser = await chromium.launch({ headless: true, executablePath })
const report = {
  prefix,
  pages: [],
  interactions: [],
  consoleErrors: [],
  requestFailures: [],
}

function attachDiagnostics(page, name) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      report.consoleErrors.push({ page: name, message: message.text() })
    }
  })
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText ?? "failed"
    if (reason !== "net::ERR_ABORTED") {
      report.requestFailures.push({ page: name, method: request.method(), url: request.url(), reason })
    }
  })
}

async function collectMetrics(page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await page.evaluate(() => {
        const targets = [...document.querySelectorAll("a, button, input, select, textarea")]
        const undersizedTargets = targets.filter((element) => {
          const rect = element.getBoundingClientRect()
          return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)
        }).length
        return {
          title: document.title,
          h1: document.querySelector("h1")?.textContent?.trim() ?? null,
          viewport: { width: innerWidth, height: innerHeight },
          document: { width: document.body.scrollWidth, height: document.body.scrollHeight },
          horizontalOverflow: document.body.scrollWidth > innerWidth,
          headings: document.querySelectorAll("h1, h2, h3").length,
          buttons: document.querySelectorAll("button").length,
          links: document.querySelectorAll("a[href]").length,
          imagesWithoutAlt: [...document.images].filter((image) => !image.hasAttribute("alt")).length,
          undersizedTargets,
          overflowingElements: [...document.querySelectorAll("body *")]
            .map((element) => {
              const rect = element.getBoundingClientRect()
              return {
                tag: element.tagName.toLowerCase(),
                className: typeof element.className === "string" ? element.className.slice(0, 140) : "",
                text: (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 70),
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
              }
            })
            .filter((item) => item.width > 0 && (item.left < -1 || item.right > innerWidth + 1))
            .slice(0, 12),
        }
      })
    } catch (error) {
      if (attempt === 2) throw error
      await page.waitForLoadState("domcontentloaded")
      await page.waitForTimeout(700)
    }
  }
}

async function inspect(page, name, route, screenshotName, wait = 2500) {
  attachDiagnostics(page, name)
  const response = await page.goto(`${baseUrl}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  })
  await page.waitForTimeout(wait)
  await page.screenshot({
    path: path.join(outputDir, `${prefix}-${screenshotName}`),
    fullPage: false,
    timeout: 15_000,
  })
  const metrics = await collectMetrics(page)
  report.pages.push({ name, route, status: response?.status() ?? null, ...metrics })
}

const desktop = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 })
await inspect(desktop, "home-desktop", "/", "home-desktop.png", 5500)

const recommendButton = desktop.getByRole("button", { name: /おすすめ3件を見る/ }).first()
if (await recommendButton.isVisible().catch(() => false)) {
  await recommendButton.click()
  await desktop.waitForURL(/\/recommend/, { timeout: 20_000 })
  await desktop.waitForTimeout(3500)
  await desktop.screenshot({
    path: path.join(outputDir, `${prefix}-recommend-desktop.png`),
    fullPage: false,
  })
  report.interactions.push({ action: "home-to-recommendation", passed: desktop.url().includes("/recommend") })
}

const today = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 })
await inspect(today, "today-desktop", "/today", "today-desktop.png")

const spots = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 })
await inspect(spots, "spots-desktop", "/spots", "spots-desktop.png", 5000)
const detailLinks = spots.locator('a[href^="/places/"]')
const detailHref = (await detailLinks.count()) > 0 ? await detailLinks.first().getAttribute("href") : null

const map = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 })
await inspect(map, "map-desktop", "/map", "map-desktop.png", 4500)

const favorites = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 })
await inspect(favorites, "favorites-desktop", "/favorites", "favorites-desktop.png")

const history = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 })
await inspect(history, "history-desktop", "/history", "history-desktop.png")

const mypage = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 })
await inspect(mypage, "mypage-desktop", "/mypage", "mypage-desktop.png")

const adminLogin = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 })
await inspect(adminLogin, "admin-login-desktop", "/admin/login", "admin-login-desktop.png")

if (detailHref) {
  const detail = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 })
  await inspect(detail, "detail-desktop", detailHref, "detail-desktop.png", 7000)
  await detail.close()
}

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
await inspect(mobile, "home-mobile", "/", "home-mobile.png", 4500)
await inspect(mobile, "today-mobile", "/today", "today-mobile.png")
await inspect(mobile, "spots-mobile", "/spots", "spots-mobile.png", 4500)

await writeFile(
  path.join(outputDir, `${prefix}-report.json`),
  JSON.stringify(report, null, 2),
  "utf8",
)
await browser.close()
console.log(JSON.stringify(report, null, 2))
