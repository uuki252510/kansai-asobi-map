"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2 } from "lucide-react"
import { MAX_UPLOAD_BYTES } from "@/lib/media-validation"

interface MediaItem {
  id: string
  url: string | null
  alt_text: string | null
  media_type: string
  is_primary: boolean
  sort_order: number
}

const MEDIA_TYPE_LABELS: Record<string, string> = {
  main: "メイン画像",
  gallery: "ギャラリー",
  exterior: "施設外観",
  interior: "施設内観",
  attraction: "アトラクション",
  food: "食事",
  map: "地図",
  floor_map: "フロアマップ",
  logo: "ロゴ",
  panorama: "360度画像",
}

/**
 * 施設画像の管理。アップロード / alt入力 / 並び替え / メイン画像設定 / 削除。
 * メインに設定した画像は公開側の画像API (places.image_storage_path) にも反映される。
 */
export default function MediaEditor({ placeId }: { placeId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<MediaItem[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [mediaType, setMediaType] = useState("gallery")

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/places/${placeId}/media`)
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? `HTTP ${response.status}`)
        return response.json()
      })
      .then((data) => {
        if (cancelled) return
        setItems(data.media ?? [])
        setLoading(false)
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setMessage({ kind: "error", text: `読み込みに失敗しました: ${error.message}` })
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [placeId])

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setMessage(null)
    for (const file of Array.from(files)) {
      if (file.size > MAX_UPLOAD_BYTES) {
        setMessage({ kind: "error", text: `${file.name}: サイズが大きすぎます（8MBまで）` })
        continue
      }
      const body = new FormData()
      body.append("file", file)
      body.append("media_type", mediaType)
      const response = await fetch(`/api/admin/places/${placeId}/media`, { method: "POST", body })
      const data = (await response.json().catch(() => ({}))) as { media?: MediaItem; error?: string }
      if (!response.ok || !data.media) {
        setMessage({ kind: "error", text: `${file.name}: ${data.error ?? "アップロードに失敗しました"}` })
        continue
      }
      setItems((current) => [...current, data.media!])
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function move(index: number, direction: -1 | 1) {
    setItems((current) => {
      const next = [...current]
      const target = index + direction
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function remove(id: string) {
    setItems((current) => current.filter((item) => item.id !== id))
    setDeletedIds((current) => [...current, id])
  }

  function setPrimary(id: string) {
    setItems((current) => current.map((item) => ({ ...item, is_primary: item.id === id })))
  }

  async function save() {
    setSaving(true)
    setMessage(null)
    const response = await fetch(`/api/admin/places/${placeId}/media`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: items.map((item, index) => ({
          id: item.id,
          alt_text: item.alt_text,
          sort_order: index + 1,
          is_primary: item.is_primary,
        })),
        deleted_ids: deletedIds,
      }),
    })
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    setSaving(false)
    if (!response.ok) {
      setMessage({ kind: "error", text: data.error ?? `HTTP ${response.status}` })
      return
    }
    setDeletedIds([])
    setMessage({ kind: "ok", text: "画像を保存しました" })
  }

  if (loading) return <p className="text-sm text-ink-soft">読み込み中…</p>

  return (
    <div className="space-y-5">
      {message && (
        <p role="status" className={`rounded-xl px-4 py-3 text-sm font-bold ${message.kind === "ok" ? "bg-positive-soft text-positive" : "bg-caution-soft text-caution"}`}>
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-line p-4">
        <select value={mediaType} onChange={(event) => setMediaType(event.target.value)} className="rounded-lg border border-line px-2 py-1.5 text-sm">
          {Object.entries(MEDIA_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={(event) => void upload(event.target.files)}
          className="hidden"
          id="media-upload-input"
        />
        <label htmlFor="media-upload-input" className="btn-primary !min-h-10 cursor-pointer px-5 text-sm">
          <ImagePlus className="size-4" aria-hidden />
          {uploading ? "アップロード中…" : "画像を追加"}
        </label>
        <p className="text-xs text-ink-faint">JPEG / PNG / WebP / AVIF・8MBまで・1施設20枚まで</p>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-ink-faint">まだ画像がありません。</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
              <span className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.alt_text ?? ""} className="size-full object-cover" />
                )}
              </span>
              <div className="min-w-48 flex-1 space-y-1.5">
                <p className="text-xs font-bold text-ink-soft">
                  {MEDIA_TYPE_LABELS[item.media_type] ?? item.media_type}
                  {item.is_primary && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[0.625rem] font-black text-white">メイン</span>}
                </p>
                <input
                  type="text"
                  value={item.alt_text ?? ""}
                  placeholder="代替テキスト（画像の内容を説明）"
                  className="w-full rounded-lg border border-line px-2 py-1.5 text-sm"
                  onChange={(event) => setItems((current) => current.map((entry, i) => i === index ? { ...entry, alt_text: event.target.value } : entry))}
                />
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" className="btn-ghost !min-h-9 !px-2" aria-label="上へ移動" disabled={index === 0} onClick={() => move(index, -1)}>
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" className="btn-ghost !min-h-9 !px-2" aria-label="下へ移動" disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                  <ArrowDown className="size-4" />
                </button>
                <button
                  type="button"
                  className={`btn-ghost !min-h-9 !px-2 ${item.is_primary ? "text-accent" : ""}`}
                  aria-label="メイン画像に設定"
                  aria-pressed={item.is_primary}
                  onClick={() => setPrimary(item.id)}
                >
                  <Star className={`size-4 ${item.is_primary ? "fill-current" : ""}`} />
                </button>
                <button type="button" className="btn-ghost !min-h-9 !px-2" aria-label="削除" onClick={() => remove(item.id)}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line pt-4">
        <p className="text-xs text-ink-faint">
          {deletedIds.length > 0 ? `${deletedIds.length}枚を削除予定（保存で確定）` : "★でメイン画像を指定できます"}
        </p>
        <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>
          {saving ? "保存中…" : "並び順とaltを保存"}
        </button>
      </div>
    </div>
  )
}
