import type { Place } from "@/lib/supabase/database.types"
import type { PlaceWithAvgRating } from "@/lib/places"

const SITE_URL = "https://kansai.asobi.nexia-llc.jp"

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}

export function itemListJsonLd(name: string, places: PlaceWithAvgRating[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: places.length,
    itemListElement: places.map((place, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: place.name,
      url: `${SITE_URL}/places/${place.id}`,
    })),
  }
}

export function touristAttractionJsonLd(place: Place & { avg_rating?: number | null; review_count?: number }) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: place.name,
    description: place.description ?? undefined,
    url: `${SITE_URL}/places/${place.id}`,
    image: `${SITE_URL}/api/place-image/${place.id}`,
    address: {
      "@type": "PostalAddress",
      addressRegion: place.prefecture,
      addressLocality: place.city,
      streetAddress: place.address,
      addressCountry: "JP",
    },
    isAccessibleForFree: place.price_type === "free",
  }
  if (place.latitude !== null && place.longitude !== null) {
    data.geo = { "@type": "GeoCoordinates", latitude: place.latitude, longitude: place.longitude }
  }
  if (place.opening_hours) data.openingHours = place.opening_hours
  if (
    typeof place.avg_rating === "number" &&
    typeof place.review_count === "number" &&
    place.review_count > 0
  ) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(place.avg_rating.toFixed(1)),
      reviewCount: place.review_count,
      bestRating: 5,
      worstRating: 1,
    }
  }
  return data
}
