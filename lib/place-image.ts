export function placeImageUrl(place: { id: string }) {
  return `/api/place-image/${encodeURIComponent(place.id)}`
}
