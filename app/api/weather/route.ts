import { NextResponse } from "next/server"
import { EMPTY_WEATHER, getWeatherSnapshot } from "@/lib/weather"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const latitude = Number(url.searchParams.get("lat") ?? "34.6901")
  const longitude = Number(url.searchParams.get("lng") ?? "135.1955")

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return NextResponse.json({ ...EMPTY_WEATHER, error: "位置情報が正しくありません" }, { status: 400 })
  }

  return NextResponse.json(await getWeatherSnapshot(latitude, longitude))
}

