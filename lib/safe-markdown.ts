/**
 * 記事本文の簡易Markdownレンダラ。
 * 依存を増やさず、かつ設計としてXSSを不可能にするため
 * 「先に全部エスケープ → 限定パターンだけタグ化」の順で処理する。
 * 生HTMLは一切通さない。
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** リンクは http(s) と サイト内相対パスのみ許可 (javascript: 等を弾く) */
function safeHref(href: string): string | null {
  const trimmed = href.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^\/[^/\\]/.test(trimmed)) return trimmed
  return null
}

/** 画像は https のみ許可 (data: や http は弾く) */
function safeImageSrc(src: string): string | null {
  const trimmed = src.trim()
  if (/^https:\/\//i.test(trimmed)) return trimmed
  if (/^\/[^/\\]/.test(trimmed)) return trimmed
  return null
}

function inline(escaped: string): string {
  return escaped
    // [表示テキスト](URL)  ※画像記法 ![...] より後に処理されないよう、画像はブロック側で先に処理する
    .replace(/\[([^\]]{1,120})\]\(([^)\s]{1,500})\)/g, (match, text, href) => {
      const safe = safeHref(href)
      if (!safe) return text
      const external = /^https?:\/\//i.test(safe)
      const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : ""
      return `<a href="${safe}"${attrs}>${text}</a>`
    })
    .replace(/\*\*([^*]{1,200})\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]{1,200})\*/g, "$1<em>$2</em>")
}

/**
 * 画像行: ![代替テキスト](https://... "出典・著作権")
 * 出典は必須ではないが、入れたら figcaption に出す。
 */
function renderImage(escaped: string): string | null {
  const match = escaped.trim().match(/^!\[([^\]]{0,200})\]\(([^)\s]{1,600})(?:\s+&quot;([^&]{0,200})&quot;)?\)$/)
  if (!match) return null
  const src = safeImageSrc(match[2])
  if (!src) return null
  const alt = match[1]
  const credit = match[3]
  return `<figure><img src="${src}" alt="${alt}" loading="lazy" decoding="async" />${
    credit ? `<figcaption>${credit}</figcaption>` : ""
  }</figure>`
}

/** 見出しのアンカーID。和文はIDにできないので連番へフォールバックする */
export function headingId(text: string, fallbackIndex: number): string {
  const ascii = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
  return ascii.length >= 3 ? `h-${ascii.slice(0, 40)}` : `h-${fallbackIndex}`
}

/** 本文中の見出し数。分割レンダリング時に採番を連続させるために使う */
export function countHeadings(source: string): number {
  return (source ?? "").replace(/\r\n/g, "\n").split("\n")
    .filter((line) => /^\s*#{2,3}\s+.+$/.test(line)).length
}

/**
 * @param headingOffset 記事を複数セグメントに分けて描画するとき、
 *   見出しの通し番号がずれないように前のセグメントまでの見出し数を渡す。
 *   目次 (extractToc) と同じIDを振るために必須。
 */
export function renderSafeMarkdown(source: string, headingOffset = 0): string {
  const lines = escapeHtml(source).replace(/\r\n/g, "\n").split("\n")
  const html: string[] = []
  let listBuffer: string[] = []
  let paragraphBuffer: string[] = []
  let headingIndex = headingOffset

  const flushList = () => {
    if (listBuffer.length === 0) return
    html.push(`<ul>${listBuffer.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`)
    listBuffer = []
  }
  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return
    html.push(`<p>${inline(paragraphBuffer.join("<br />"))}</p>`)
    paragraphBuffer = []
  }
  const flushAll = () => {
    flushList()
    flushParagraph()
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === "") {
      flushAll()
      continue
    }
    const heading = trimmed.match(/^(#{2,3})\s+(.+)$/)
    if (heading) {
      flushAll()
      const level = heading[1].length // 2 or 3
      const text = heading[2]
      // 目次から飛べるようにアンカーを振る (extractToc と同じ採番)
      const id = headingId(text, headingIndex)
      headingIndex += 1
      html.push(`<h${level} id="${id}">${inline(text)}</h${level}>`)
      continue
    }
    const image = renderImage(trimmed)
    if (image) {
      flushAll()
      html.push(image)
      continue
    }
    const listItem = trimmed.match(/^[-*]\s+(.+)$/)
    if (listItem) {
      flushParagraph()
      listBuffer.push(listItem[1])
      continue
    }
    if (trimmed === "---") {
      flushAll()
      html.push("<hr />")
      continue
    }
    flushList()
    paragraphBuffer.push(trimmed)
  }
  flushAll()

  return html.join("")
}
