import { NextResponse } from "next/server"
import { getWikipediaPlaceInfo } from "@/lib/place-enrichment"
import { createServerClient } from "@/lib/supabase/server"

const staticImageHosts = new Set(["upload.wikimedia.org"])

function trustedStaticImageUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:"
      && (staticImageHosts.has(url.hostname) || url.hostname.endsWith(".supabase.co"))
  } catch {
    return false
  }
}

function googlePlaceId(value?: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.hostname !== "places.googleapis.com") return null
    const match = url.pathname.match(/^\/v1\/places\/([A-Za-z0-9_-]+)$/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

function fallback(request: Request) {
  const response = NextResponse.redirect(new URL("/brand/place-photo-fallback.png", request.url), 307)
  response.headers.set("x-place-image-source", "fallback")
  return response
}

async function staticImageResponse(url: string, source: "database" | "wikimedia") {
  const image = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(8_000),
    headers: { accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
    next: { revalidate: 604_800 },
  })
  const contentType = image.headers.get("content-type") ?? ""
  if (!image.ok || !image.body || !contentType.startsWith("image/")) return null
  return new NextResponse(image.body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
      "x-content-type-options": "nosniff",
      "x-place-image-source": source,
    },
  })
}

interface GooglePlacePhoto {
  name?: string
  widthPx?: number
  heightPx?: number
}

async function googlePlaceImageResponse(placeId: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return null

  const details = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=ja`, {
    headers: {
      accept: "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,photos",
    },
    next: { revalidate: 86_400 },
    signal: AbortSignal.timeout(8_000),
  })
  if (!details.ok) return null
  const payload = await details.json() as { id?: string; photos?: GooglePlacePhoto[] }
  if (payload.id !== placeId) return null

  const photo = payload.photos?.find((candidate) => {
    if (!candidate.name) return false
    if (!candidate.widthPx || !candidate.heightPx) return true
    const ratio = candidate.widthPx / candidate.heightPx
    return ratio >= 0.65 && ratio <= 2.8
  })
  if (!photo?.name || !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(photo.name)) return null

  const mediaUrl = new URL(`https://places.googleapis.com/v1/${photo.name}/media`)
  mediaUrl.searchParams.set("maxWidthPx", "1600")
  mediaUrl.searchParams.set("maxHeightPx", "1200")
  mediaUrl.searchParams.set("skipHttpRedirect", "false")
  const image = await fetch(mediaUrl, {
    headers: {
      accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "X-Goog-Api-Key": apiKey,
    },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  })
  const contentType = image.headers.get("content-type") ?? ""
  if (!image.ok || !image.body || !contentType.startsWith("image/")) return null

  return new NextResponse(image.body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
      "x-content-type-options": "nosniff",
      "x-place-image-source": "google-places",
    },
  })
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 400 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("places")
    .select("image_url, image_storage_path, name, city, prefecture")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle<{
      image_url: string | null
      image_storage_path: string | null
      name: string
      city: string
      prefecture: string
    }>()
  if (error || !data) return fallback(request)

  // Storage取込済みならCDNの公開URLへ302 (Nextサーバーを画像配信から外す)
  if (data.image_storage_path && /^[\w./-]+$/.test(data.image_storage_path)) {
    const storageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/place-images/${data.image_storage_path}`
    const response = NextResponse.redirect(storageUrl, 302)
    response.headers.set("cache-control", "public, max-age=3600, s-maxage=86400")
    response.headers.set("x-place-image-source", "storage")
    return response
  }

  try {
    const placeId = googlePlaceId(data.image_url)
    if (placeId) {
      const googleImage = await googlePlaceImageResponse(placeId)
      if (googleImage) return googleImage
    }

    if (data.image_url && trustedStaticImageUrl(data.image_url)) {
      const stored = await staticImageResponse(data.image_url, "database")
      if (stored) return stored
    }

    const wikipedia = await getWikipediaPlaceInfo({
      name: data.name,
      city: data.city,
      prefecture: data.prefecture,
    })
    if (wikipedia?.thumbnailUrl && trustedStaticImageUrl(wikipedia.thumbnailUrl)) {
      const pageImage = await staticImageResponse(wikipedia.thumbnailUrl, "wikimedia")
      if (pageImage) return pageImage
    }

    return fallback(request)
  } catch {
    return fallback(request)
  }
}
