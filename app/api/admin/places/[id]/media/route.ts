import { NextResponse } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"
import { verifyAdminRequest } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { extensionFor, storagePublicUrl, validateUpload } from "@/lib/media-validation"

const UUID_PATTERN = /^[0-9a-f-]{36}$/i
const BUCKET = "place-images"
const MAX_MEDIA_PER_PLACE = 20

const MEDIA_TYPES = new Set([
  "main", "gallery", "exterior", "interior", "attraction",
  "food", "map", "floor_map", "logo", "video", "panorama",
])

interface MediaRow {
  id: string
  storage_path: string | null
  external_url: string | null
  alt_text: string | null
  media_type: string
  is_primary: boolean
  sort_order: number
}

function withUrl(row: MediaRow) {
  return { ...row, url: row.storage_path ? storagePublicUrl(row.storage_path, BUCKET) : row.external_url }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminRequest(request)) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("facility_media" as never)
    .select("id,storage_path,external_url,alt_text,media_type,is_primary,sort_order")
    .eq("place_id", id)
    .order("sort_order")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ media: ((data ?? []) as unknown as MediaRow[]).map(withUrl) })
}

/** 画像アップロード (multipart/form-data) */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminRequest(request)) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "ファイルの受け取りに失敗しました" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "ファイルが指定されていません" }, { status: 400 })

  const bytes = new Uint8Array(await file.arrayBuffer())
  const validation = validateUpload(bytes, file.type, bytes.byteLength)
  if (!validation.ok || !validation.mime) {
    return NextResponse.json({ error: validation.error ?? "検証に失敗しました" }, { status: 400 })
  }

  const mediaType = String(formData.get("media_type") ?? "gallery")
  if (!MEDIA_TYPES.has(mediaType)) return NextResponse.json({ error: "メディア種別が不正です" }, { status: 400 })
  const altText = String(formData.get("alt_text") ?? "").slice(0, 200) || null

  const supabase = createServiceRoleClient()

  const { count } = await supabase
    .from("facility_media" as never)
    .select("id", { count: "exact", head: true })
    .eq("place_id", id)
  if ((count ?? 0) >= MAX_MEDIA_PER_PLACE) {
    return NextResponse.json({ error: `画像は1施設あたり${MAX_MEDIA_PER_PLACE}枚までです` }, { status: 400 })
  }

  // パスは施設IDのフォルダ配下に固定 (パストラバーサル不可)
  const storagePath = `media/${id}/${crypto.randomUUID()}.${extensionFor(validation.mime)}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: validation.mime, upsert: false })
  if (uploadError) {
    return NextResponse.json({ error: `アップロードに失敗しました: ${uploadError.message}` }, { status: 500 })
  }

  const { data, error } = await supabase
    .from("facility_media" as never)
    .insert({
      place_id: id,
      media_type: mediaType,
      storage_path: storagePath,
      alt_text: altText,
      sort_order: (count ?? 0) + 1,
      status: "approved",
      uploaded_by: "admin",
    } as never)
    .select("id,storage_path,external_url,alt_text,media_type,is_primary,sort_order")
    .single()
  if (error || !data) {
    // DB登録に失敗したらStorageの孤児ファイルを消す
    await supabase.storage.from(BUCKET).remove([storagePath])
    return NextResponse.json({ error: `登録に失敗しました: ${error?.message}` }, { status: 500 })
  }

  revalidateTag("places", "max")
  revalidatePath(`/places/${id}`)
  return NextResponse.json({ media: withUrl(data as unknown as MediaRow) }, { status: 201 })
}

/** 並び替え・alt更新・メイン設定・削除をまとめて反映 */
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

  const input = raw as { items?: Array<{ id: string; alt_text?: string | null; sort_order?: number; is_primary?: boolean }>; deleted_ids?: string[] }
  const items = (input.items ?? []).filter((item) => UUID_PATTERN.test(item.id))
  const deletedIds = (input.deleted_ids ?? []).filter((deletedId) => UUID_PATTERN.test(deletedId))

  const primaryCount = items.filter((item) => item.is_primary).length
  if (primaryCount > 1) return NextResponse.json({ error: "メイン画像は1枚だけ選べます" }, { status: 400 })

  const supabase = createServiceRoleClient()

  try {
    // 削除: Storage実体 → DB行の順
    if (deletedIds.length > 0) {
      const { data: targets } = await supabase
        .from("facility_media" as never)
        .select("id,storage_path")
        .eq("place_id", id)
        .in("id", deletedIds)
      const paths = ((targets ?? []) as unknown as MediaRow[])
        .map((row) => row.storage_path)
        .filter((path): path is string => Boolean(path))
      if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths)
      const { error } = await supabase.from("facility_media" as never).delete().eq("place_id", id).in("id", deletedIds)
      if (error) throw new Error(error.message)
    }

    for (const item of items) {
      const { error } = await supabase
        .from("facility_media" as never)
        .update({
          alt_text: item.alt_text?.slice(0, 200) ?? null,
          sort_order: typeof item.sort_order === "number" ? item.sort_order : 100,
          is_primary: Boolean(item.is_primary),
        } as never)
        .eq("place_id", id)
        .eq("id", item.id)
      if (error) throw new Error(error.message)
    }

    // メイン画像は公開側の画像APIが参照する places.image_storage_path にも反映する
    const primary = items.find((item) => item.is_primary)
    if (primary) {
      const { data: row } = await supabase
        .from("facility_media" as never)
        .select("storage_path")
        .eq("id", primary.id)
        .maybeSingle()
      const path = (row as unknown as MediaRow | null)?.storage_path
      if (path) {
        await supabase
          .from("places")
          .update({ image_storage_path: path, image_source: "manual", image_synced_at: new Date().toISOString() } as never)
          .eq("id", id)
      }
    }
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
