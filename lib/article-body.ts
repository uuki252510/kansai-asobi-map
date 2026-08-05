import { headingId } from "@/lib/safe-markdown"

/**
 * 記事本文の構造化。
 * 本文中に施設カードを埋め込めるようにする (いこーよ型)。
 *
 *   :::spot 78de788f-19de-4d0c-8bdc-65811a5b1a51
 *
 * この1行がスポットカードに置き換わる。前後は通常のMarkdown。
 */

const UUID_PATTERN = /^[0-9a-f-]{36}$/i
const SPOT_DIRECTIVE = /^:::spot\s+([0-9a-f-]{36})\s*$/i

export type ArticleSegment =
  | { type: "markdown"; content: string }
  | { type: "spot"; placeId: string }

export function parseArticleBody(source: string): ArticleSegment[] {
  const segments: ArticleSegment[] = []
  let buffer: string[] = []

  const flush = () => {
    const content = buffer.join("\n").trim()
    if (content) segments.push({ type: "markdown", content })
    buffer = []
  }

  for (const line of (source ?? "").replace(/\r\n/g, "\n").split("\n")) {
    const match = line.trim().match(SPOT_DIRECTIVE)
    if (match) {
      flush()
      segments.push({ type: "spot", placeId: match[1] })
      continue
    }
    buffer.push(line)
  }
  flush()
  return segments
}

/** 本文に埋め込まれたスポットIDを重複なく取り出す (まとめて取得するため) */
export function extractSpotIds(source: string): string[] {
  const ids = new Set<string>()
  for (const line of (source ?? "").split(/\r?\n/)) {
    const match = line.trim().match(SPOT_DIRECTIVE)
    if (match && UUID_PATTERN.test(match[1])) ids.add(match[1])
  }
  return [...ids]
}

export interface TocEntry {
  id: string
  text: string
  level: 2 | 3
}

/**
 * 目次。見出しが3つ以上あるときだけ意味があるので、呼び出し側で件数を見る。
 * 15見出しの長文でも迷子にならないようにするための、いこーよに無い改善点。
 */
export function extractToc(source: string): TocEntry[] {
  const entries: TocEntry[] = []
  let index = 0
  for (const line of (source ?? "").replace(/\r\n/g, "\n").split("\n")) {
    const match = line.trim().match(/^(#{2,3})\s+(.+)$/)
    if (!match) continue
    const text = match[2].replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").trim()
    entries.push({ id: headingId(text, index), text, level: match[1].length === 2 ? 2 : 3 })
    index += 1
  }
  return entries
}

/** 読了目安。日本語は約400字/分で計算する */
export function readingMinutes(source: string): number {
  const characters = (source ?? "").replace(/\s+/g, "").length
  return Math.max(1, Math.round(characters / 400))
}
