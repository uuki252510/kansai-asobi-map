import { NextResponse } from 'next/server'
import { getPlaces, calcDistance } from '@/lib/places'
import type { PlaceWithAvgRating } from '@/lib/places'

export type NearbyPlace = PlaceWithAvgRating & { distanceKm: number }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lng = parseFloat(searchParams.get('lng') ?? '')
  const limit = parseInt(searchParams.get('limit') ?? '10')

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })
  }

  const all = await getPlaces({})
  const withDist: NearbyPlace[] = all
    .filter(p => p.latitude !== null && p.longitude !== null)
    .map(p => ({
      ...p,
      distanceKm: calcDistance(lat, lng, p.latitude!, p.longitude!),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)

  return NextResponse.json(withDist)
}
