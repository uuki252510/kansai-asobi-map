import "server-only"

import { cache } from "react"

export interface EnrichmentPhoto {
  title: string
  thumbnailUrl: string
  sourceUrl: string
  author: string | null
  license: string | null
  description: string | null
  width: number | null
  height: number | null
}

export interface PlaceEnrichment {
  searchLabel: string
  wikipedia: {
    title: string
    summary: string
    url: string
    thumbnailUrl: string | null
  } | null
  photos: EnrichmentPhoto[]
}

interface PlaceIdentity {
  name: string
  city: string
  prefecture: string
}

interface WikiPage {
  title?: string
  extract?: string
  fullurl?: string
  thumbnail?: { source?: string }
}

interface CommonsMetadataValue {
  value?: string
}

interface CommonsImageInfo {
  thumburl?: string
  descriptionurl?: string
  url?: string
  mime?: string
  width?: number
  height?: number
  extmetadata?: Record<string, CommonsMetadataValue>
}

interface CommonsPage {
  title?: string
  imageinfo?: CommonsImageInfo[]
}

const USER_AGENT = "Kyodokoiko/1.0 (public place discovery; https://kansai.asobi.nexia-llc.jp)"

function plainPlaceName(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[（(][^）)]*[）)]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function comparable(value: string) {
  return plainPlaceName(value)
    .toLocaleLowerCase("ja")
    .replace(/[\s・･\-ー「」『』]/g, "")
}

function isRelevantArticle(title: string, placeName: string) {
  const article = comparable(title)
  const place = comparable(placeName)
  if (article.length < 2 || place.length < 2) return false
  const lengthRatio = Math.min(article.length, place.length) / Math.max(article.length, place.length)
  return lengthRatio >= 0.55 && (article.includes(place) || place.includes(article))
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
}

function stripHtml(value?: string, limit = 180) {
  if (!value) return null
  const plain = decodeEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
  if (!plain) return null
  return plain.length > limit ? `${plain.slice(0, limit - 1)}…` : plain
}

function safeHttpsUrl(value?: string, hosts?: string[]) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") return null
    if (hosts && !hosts.includes(url.hostname)) return null
    return url.toString()
  } catch {
    return null
  }
}

async function fetchJson<T>(url: URL): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json", "user-agent": USER_AGENT },
      next: { revalidate: 604_800 },
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) return null
    return await response.json() as T
  } catch {
    return null
  }
}

export const getWikipediaPlaceInfo = cache(async (place: PlaceIdentity) => {
  const searchLabel = `${plainPlaceName(place.name)} ${place.city} ${place.prefecture}`.trim()
  const url = new URL("https://ja.wikipedia.org/w/api.php")
  url.search = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: searchLabel,
    gsrnamespace: "0",
    gsrlimit: "5",
    prop: "extracts|pageimages|info",
    exintro: "1",
    explaintext: "1",
    exsentences: "4",
    inprop: "url",
    piprop: "thumbnail|name",
    pithumbsize: "1400",
    pilicense: "free",
    format: "json",
    formatversion: "2",
    origin: "*",
  }).toString()

  const payload = await fetchJson<{ query?: { pages?: WikiPage[] } }>(url)
  const pages = payload?.query?.pages ?? []
  const match = pages.find((page) => page.title && isRelevantArticle(page.title, place.name))
  if (!match?.title || !match.fullurl || !match.extract) return null

  return {
    title: match.title,
    summary: match.extract.trim(),
    url: match.fullurl,
    thumbnailUrl: safeHttpsUrl(match.thumbnail?.source, ["upload.wikimedia.org"]),
  }
})

function isUsefulPhoto(page: CommonsPage, info: CommonsImageInfo) {
  if (!info.mime?.startsWith("image/")) return false
  const title = page.title?.toLocaleLowerCase("ja") ?? ""
  if (/\.(svg|gif|pdf|webm)$/i.test(title)) return false
  if (/map|logo|icon|diagram|route|station|poster|flyer|地図|ロゴ|案内図|路線図|駅名|ポスター|チラシ/i.test(title)) return false
  if (info.width && info.height) {
    const ratio = info.width / info.height
    if (ratio < 0.65 || ratio > 2.6 || info.width < 640) return false
  }
  return Boolean(safeHttpsUrl(info.thumburl ?? info.url, ["upload.wikimedia.org"]))
}

async function fetchCommonsPhotos(place: PlaceIdentity): Promise<EnrichmentPhoto[]> {
  const searchLabel = `${plainPlaceName(place.name)} ${place.prefecture}`.trim()
  const url = new URL("https://commons.wikimedia.org/w/api.php")
  url.search = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: searchLabel,
    gsrnamespace: "6",
    gsrlimit: "12",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "1400",
    iiextmetadatalanguage: "ja",
    iiextmetadatafilter: "Artist|Credit|LicenseShortName|UsageTerms|ImageDescription",
    format: "json",
    formatversion: "2",
    origin: "*",
  }).toString()

  const payload = await fetchJson<{ query?: { pages?: CommonsPage[] } }>(url)
  const pages = payload?.query?.pages ?? []
  const seen = new Set<string>()
  const photos: EnrichmentPhoto[] = []

  for (const page of pages) {
    const info = page.imageinfo?.[0]
    if (!info || !isUsefulPhoto(page, info)) continue
    const thumbnailUrl = safeHttpsUrl(info.thumburl ?? info.url, ["upload.wikimedia.org"])
    const sourceUrl = safeHttpsUrl(info.descriptionurl, ["commons.wikimedia.org"])
    if (!thumbnailUrl || !sourceUrl || seen.has(thumbnailUrl)) continue
    seen.add(thumbnailUrl)
    const metadata = info.extmetadata ?? {}
    photos.push({
      title: (page.title ?? "Wikimedia Commons").replace(/^File:/i, ""),
      thumbnailUrl,
      sourceUrl,
      author: stripHtml(metadata.Artist?.value ?? metadata.Credit?.value, 90),
      license: stripHtml(metadata.LicenseShortName?.value ?? metadata.UsageTerms?.value, 60),
      description: stripHtml(metadata.ImageDescription?.value, 140),
      width: info.width ?? null,
      height: info.height ?? null,
    })
    if (photos.length >= 5) break
  }

  return photos
}

export const getPlaceEnrichment = cache(async (place: PlaceIdentity): Promise<PlaceEnrichment> => {
  const searchLabel = `${plainPlaceName(place.name)} ${place.prefecture}`.trim()
  const wikipedia = await getWikipediaPlaceInfo(place)
  const photos = wikipedia ? await fetchCommonsPhotos(place) : []

  return { searchLabel, wikipedia, photos }
})
