import { NextResponse } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"
import { verifyAdminRequest } from "@/lib/admin-auth"
import { validateFacilityDetails } from "@/lib/facility-details-payload"
import { createServiceRoleClient } from "@/lib/supabase/service"

const UUID_PATTERN = /^[0-9a-f-]{36}$/i

/**
 * 施設の詳細編集 (営業時間/料金/分類/設備/公開・鮮度) の読み書きAPI。
 * PUT はセクション単位で delete → insert の置き換え。
 * 変更前スナップショットを facility_revisions / audit_logs へ記録する。
 */

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminRequest(request)) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  const supabase = createServiceRoleClient()
  const [place, hours, exceptions, plans, categories, tags, amenities, allCategories, allTags, allAmenities] =
    await Promise.all([
      supabase.from("places").select("*").eq("id", id).single(),
      supabase.from("facility_business_hours" as never).select("*, slots:facility_business_hour_slots(*)").eq("place_id", id).order("day_of_week"),
      supabase.from("facility_business_exceptions" as never).select("*").eq("place_id", id).order("date"),
      supabase.from("facility_price_plans" as never).select("*, tiers:facility_price_tiers(*)").eq("place_id", id).order("sort_order"),
      supabase.from("facility_categories" as never).select("category_id,is_primary").eq("place_id", id),
      supabase.from("facility_tags" as never).select("tag_id").eq("place_id", id),
      supabase.from("facility_amenities" as never).select("amenity_id,available,free_or_paid,fee,location_note").eq("place_id", id),
      supabase.from("categories" as never).select("id,slug,name,parent_id,sort_order").eq("is_active", true).order("sort_order"),
      supabase.from("tags" as never).select("id,slug,name,group_id,sort_order").eq("is_active", true).is("canonical_tag_id", null).order("sort_order"),
      supabase.from("amenities" as never).select("id,slug,name,category,sort_order").eq("is_active", true).order("sort_order"),
    ])

  if (place.error || !place.data) return NextResponse.json({ error: "施設が見つかりません" }, { status: 404 })

  return NextResponse.json({
    place: place.data,
    business_hours: hours.data ?? [],
    business_exceptions: exceptions.data ?? [],
    price_plans: plans.data ?? [],
    facility_categories: categories.data ?? [],
    facility_tags: tags.data ?? [],
    facility_amenities: amenities.data ?? [],
    masters: {
      categories: allCategories.data ?? [],
      tags: allTags.data ?? [],
      amenities: allAmenities.data ?? [],
    },
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminRequest(request)) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "JSONが正しくありません" }, { status: 400 })
  }
  const parsed = validateFacilityDetails(raw)
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const payload = parsed.payload

  const supabase = createServiceRoleClient()
  const { data: place, error: placeError } = await supabase.from("places").select("*").eq("id", id).single()
  if (placeError || !place) return NextResponse.json({ error: "施設が見つかりません" }, { status: 404 })

  // 変更前スナップショット (復元用) + 監査ログ
  await supabase.from("facility_revisions" as never).insert({
    place_id: id,
    snapshot: place as never,
    created_by: "admin",
  } as never)
  await supabase.from("audit_logs" as never).insert({
    table_name: "places:details",
    record_id: id,
    action: "update",
    new_data: payload as never,
    actor: "admin",
    ip_address: request.headers.get("x-forwarded-for") ?? null,
    user_agent: request.headers.get("user-agent") ?? null,
  } as never)

  try {
    // ---- 営業時間 (置き換え) ----
    await supabase.from("facility_business_hours" as never).delete().eq("place_id", id)
    for (const hour of payload.business_hours) {
      const { data: inserted, error } = await supabase
        .from("facility_business_hours" as never)
        .insert({ place_id: id, day_of_week: hour.day_of_week, is_closed: hour.is_closed, note: hour.note } as never)
        .select("id")
        .single()
      if (error || !inserted) throw new Error(`hours: ${error?.message}`)
      if (hour.slots.length > 0) {
        const { error: slotError } = await supabase.from("facility_business_hour_slots" as never).insert(
          hour.slots.map((slot, index) => ({
            business_hour_id: (inserted as { id: string }).id,
            opening_time: slot.opening_time,
            closing_time: slot.closing_time,
            last_entry_time: slot.last_entry_time,
            sort_order: index,
          })) as never,
        )
        if (slotError) throw new Error(`slots: ${slotError.message}`)
      }
    }

    // ---- 臨時営業・休業 (置き換え) ----
    await supabase.from("facility_business_exceptions" as never).delete().eq("place_id", id)
    if (payload.business_exceptions.length > 0) {
      const { error } = await supabase.from("facility_business_exceptions" as never).insert(
        payload.business_exceptions.map((exception) => ({ place_id: id, ...exception })) as never,
      )
      if (error) throw new Error(`exceptions: ${error.message}`)
    }

    // ---- 料金 (置き換え) ----
    await supabase.from("facility_price_plans" as never).delete().eq("place_id", id)
    for (const [index, plan] of payload.price_plans.entries()) {
      const { data: inserted, error } = await supabase
        .from("facility_price_plans" as never)
        .insert({
          place_id: id,
          plan_name: plan.plan_name,
          plan_type: plan.plan_type,
          day_type: plan.day_type,
          note: plan.note,
          sort_order: index,
        } as never)
        .select("id")
        .single()
      if (error || !inserted) throw new Error(`plans: ${error?.message}`)
      if (plan.tiers.length > 0) {
        const { error: tierError } = await supabase.from("facility_price_tiers" as never).insert(
          plan.tiers.map((tier, tierIndex) => ({
            plan_id: (inserted as { id: string }).id,
            tier: tier.tier,
            price: tier.price,
            is_free: tier.is_free,
            conditions: tier.conditions,
            sort_order: tierIndex,
          })) as never,
        )
        if (tierError) throw new Error(`tiers: ${tierError.message}`)
      }
    }

    // ---- カテゴリ・タグ・設備 (置き換え) ----
    await supabase.from("facility_categories" as never).delete().eq("place_id", id)
    if (payload.category_ids.length > 0) {
      const { error } = await supabase.from("facility_categories" as never).insert(
        payload.category_ids.map((categoryId) => ({
          place_id: id,
          category_id: categoryId,
          is_primary: categoryId === payload.primary_category_id,
        })) as never,
      )
      if (error) throw new Error(`categories: ${error.message}`)
    }

    await supabase.from("facility_tags" as never).delete().eq("place_id", id)
    if (payload.tag_ids.length > 0) {
      const { error } = await supabase.from("facility_tags" as never).insert(
        payload.tag_ids.map((tagId) => ({ place_id: id, tag_id: tagId })) as never,
      )
      if (error) throw new Error(`tags: ${error.message}`)
    }

    await supabase.from("facility_amenities" as never).delete().eq("place_id", id)
    if (payload.amenities.length > 0) {
      const { error } = await supabase.from("facility_amenities" as never).insert(
        payload.amenities.map((amenity) => ({ place_id: id, ...amenity })) as never,
      )
      if (error) throw new Error(`amenities: ${error.message}`)
    }

    // ---- places のメタ更新 ----
    const metaUpdate: Record<string, unknown> = {
      catchphrase: payload.meta.catchphrase,
      short_description: payload.meta.short_description,
      seo_title: payload.meta.seo_title,
      seo_description: payload.meta.seo_description,
      is_temporarily_closed: payload.meta.is_temporarily_closed,
    }
    if (payload.meta.publication_status) {
      metaUpdate.publication_status = payload.meta.publication_status
      metaUpdate.is_published = payload.meta.publication_status === "published"
    }
    if (payload.meta.mark_confirmed) {
      metaUpdate.last_verified_at = new Date().toISOString()
      metaUpdate.confirmation_method = payload.meta.confirmation_method
      metaUpdate.confirmation_source_url = payload.meta.confirmation_source_url
      metaUpdate.next_confirmation_due_at = new Date(Date.now() + 90 * 86_400_000).toISOString()
    }
    const { error: metaError } = await supabase.from("places").update(metaUpdate as never).eq("id", id)
    if (metaError) throw new Error(`meta: ${metaError.message}`)
  } catch (error) {
    return NextResponse.json(
      { error: `保存に失敗しました: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 500 },
    )
  }

  revalidateTag("places", "max")
  revalidatePath(`/places/${id}`)
  return NextResponse.json({ ok: true })
}
