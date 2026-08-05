import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getPlacesByIds } from "@/lib/places"

type VotePayload = {
  action?: "create" | "vote"
  spot_ids?: string[]
  title?: string
  closes_at?: string | null
  token?: string
  place_id?: string
  voter_name?: string
  voter_fingerprint?: string
  comment?: string
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("id")
  if (!token) return NextResponse.json({ error: "投票IDが必要です" }, { status: 400 })

  try {
    const supabase = createServerClient()
    const { data: group, error: groupError } = await supabase
      .from("share_groups")
      .select("*")
      .eq("public_token", token)
      .single()
    if (groupError || !group) return NextResponse.json({ error: "投票が見つかりません" }, { status: 404 })

    const [{ data: groupSpots }, { data: votes }] = await Promise.all([
      supabase.from("share_group_spots").select("place_id, position").eq("share_group_id", group.id).order("position"),
      supabase.from("votes").select("id, place_id, voter_name, comment, created_at").eq("share_group_id", group.id).order("created_at"),
    ])
    const spotIds = (groupSpots ?? []).map((item) => item.place_id)
    const places = await getPlacesByIds(spotIds)
    const position = new Map((groupSpots ?? []).map((item) => [item.place_id, item.position]))

    return NextResponse.json({
      group: {
        title: group.title,
        status: group.status,
        closes_at: group.closes_at,
        created_at: group.created_at,
      },
      places: places
        .map((place) => ({
          id: place.id,
          name: place.name,
          image_url: place.image_url,
          prefecture: place.prefecture,
          city: place.city,
          position: position.get(place.id) ?? 99,
        }))
        .sort((left, right) => left.position - right.position),
      votes: votes ?? [],
    })
  } catch {
    return NextResponse.json({ error: "投票機能はmigration適用後に利用できます" }, { status: 503 })
  }
}

export async function POST(request: Request) {
  let payload: VotePayload
  try {
    payload = (await request.json()) as VotePayload
  } catch {
    return NextResponse.json({ error: "JSONが正しくありません" }, { status: 400 })
  }

  try {
    const supabase = createServerClient()
    if (payload.action === "create") {
      const spotIds = [...new Set(payload.spot_ids ?? [])].slice(0, 5)
      if (spotIds.length < 2) return NextResponse.json({ error: "候補は2〜5件必要です" }, { status: 400 })
      const { data: group, error } = await supabase
        .from("share_groups")
        .insert({
          owner_user_id: null,
          title: payload.title?.slice(0, 80) || "週末どこに行く？",
          closes_at: payload.closes_at ?? null,
        })
        .select("id, public_token")
        .single()
      if (error || !group) throw error

      const { error: spotError } = await supabase.from("share_group_spots").insert(
        spotIds.map((placeId, index) => ({
          share_group_id: group.id,
          place_id: placeId,
          position: index + 1,
        })),
      )
      if (spotError) throw spotError
      return NextResponse.json({ id: group.public_token, url: `/vote/${group.public_token}` }, { status: 201 })
    }

    if (payload.action === "vote") {
      if (!payload.token || !payload.place_id || !payload.voter_name || !payload.voter_fingerprint) {
        return NextResponse.json({ error: "投票内容が不足しています" }, { status: 400 })
      }
      const { data: group, error: groupError } = await supabase
        .from("share_groups")
        .select("id, status, closes_at")
        .eq("public_token", payload.token)
        .single()
      if (groupError || !group) return NextResponse.json({ error: "投票が見つかりません" }, { status: 404 })
      if (group.status !== "open" || (group.closes_at && new Date(group.closes_at) < new Date())) {
        return NextResponse.json({ error: "この投票は締め切られました" }, { status: 409 })
      }
      const { data: candidate } = await supabase
        .from("share_group_spots")
        .select("id")
        .eq("share_group_id", group.id)
        .eq("place_id", payload.place_id)
        .maybeSingle()
      if (!candidate) return NextResponse.json({ error: "候補にないスポットです" }, { status: 400 })

      const { error } = await supabase.from("votes").upsert(
        {
          share_group_id: group.id,
          place_id: payload.place_id,
          voter_name: payload.voter_name.slice(0, 30),
          voter_fingerprint: payload.voter_fingerprint.slice(0, 100),
          comment: payload.comment?.slice(0, 240) || null,
        },
        { onConflict: "share_group_id,voter_fingerprint" },
      )
      if (error) throw error
      return NextResponse.json({ accepted: true })
    }

    return NextResponse.json({ error: "unsupported action" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "投票機能はmigration適用後に利用できます" }, { status: 503 })
  }
}
