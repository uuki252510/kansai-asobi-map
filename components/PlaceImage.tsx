"use client"

import { useEffect, useState } from "react"
import { placeImageUrl } from "@/lib/place-image"

interface Props {
  place: { id: string; image_url?: string | null }
  alt: string
  className?: string
  loading?: "eager" | "lazy"
}

export default function PlaceImage({ place, alt, className = "spot-photo", loading = "lazy" }: Props) {
  const [failed, setFailed] = useState(false)
  const src = placeImageUrl(place)

  useEffect(() => setFailed(false), [place.id, src])

  return (
    <img
      src={failed ? "/brand/place-photo-fallback.png" : src}
      alt={alt}
      width={960}
      height={640}
      fetchPriority={loading === "eager" ? "high" : undefined}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
