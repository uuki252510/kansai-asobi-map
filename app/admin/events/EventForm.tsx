"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Trash2, X } from "lucide-react"
import {
  EVENT_CATEGORIES,
  EVENT_STATUSES,
  PREFECTURE_OPTIONS,
  suggestEventSlug,
  validateEvent,
  type EventPayload,
} from "@/lib/event-payload"
import { EVENT_CATEGORY_LABELS } from "@/lib/events"

interface PlaceOption { id: string; name: string; prefecture: string; city: string }

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き", published: "公開", archived: "アーカイブ", cancelled: "中止",
}

const EMPTY: EventPayload = {
  name: "", slug: null, summary: null, description: null, event_category: "festival",
  place_id: null, venue_name: null, address: null, prefecture: null, city: null,
  latitude: null, longitude: null, start_at: "", end_at: "",
  is_free: true, child_price: null, adult_price: null, reservation_required: null,
  official_url: null, application_url: null, organizer_name: null,
  access_note: null, rain_policy: null, cover_external_url: null,
  is_featured: false, status: "draft",
}

const field = "w-full rounded-lg border border-line px-3 py-2 text-sm font-normal"

export default function EventForm({ eventId }: { eventId?: string }) {
  const router = useRouter()
  const [form, setForm] = useState<EventPayload>(EMPTY)
  const [loading, setLoading] = useState(Boolean(eventId))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [placeQuery, setPlaceQuery] = useState("")
  const [placeResults, setPlaceResults] = useState<PlaceOption[]>([])
  const [linkedPlace, setLinkedPlace] = useState<PlaceOption | null>(null)

  function patch<K extends keyof EventPayload>(key: K, value: EventPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  useEffect(() => {
    if (!eventId) return
    let cancelled = false
    fetch(`/api/admin/events/${eventId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? `HTTP ${response.status}`)
        return response.json()
      })
      .then(async (data) => {
        if (cancelled) return
        const event = data.event as Record<string, unknown>
        setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(event).filter(([key]) => key in EMPTY)) } as EventPayload)
        if (event.place_id) {
          const response = await fetch(`/api/admin/places/search?ids=${event.place_id}`)
          const body = await response.json().catch(() => ({ places: [] }))
          if (!cancelled) setLinkedPlace(body.places?.[0] ?? null)
        }
        setLoading(false)
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setMessage({ kind: "error", text: `読み込みに失敗しました: ${error.message}` })
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [eventId])

  useEffect(() => {
    if (placeQuery.trim().length < 2) { setPlaceResults([]); return }
    const timer = window.setTimeout(() => {
      void fetch(`/api/admin/places/search?q=${encodeURIComponent(placeQuery.trim())}`)
        .then((response) => response.json())
        .then((data) => setPlaceResults(data.places ?? []))
        .catch(() => setPlaceResults([]))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [placeQuery])

  async function save() {
    const validated = validateEvent(form)
    if ("error" in validated) { setMessage({ kind: "error", text: validated.error }); return }
    setSaving(true)
    setMessage(null)
    const response = await fetch(eventId ? `/api/admin/events/${eventId}` : "/api/admin/events", {
      method: eventId ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validated.payload),
    })
    const body = (await response.json().catch(() => ({}))) as { error?: string; event?: { id: string } }
    setSaving(false)
    if (!response.ok) { setMessage({ kind: "error", text: body.error ?? `HTTP ${response.status}` }); return }
    if (!eventId && body.event) { router.push(`/admin/events/${body.event.id}`); return }
    setMessage({ kind: "ok", text: "保存しました" })
  }

  async function remove() {
    if (!eventId || !window.confirm("このイベントを削除しますか？")) return
    const response = await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" })
    if (response.ok) router.push("/admin/events")
    else setMessage({ kind: "error", text: "削除に失敗しました" })
  }

  if (loading) return <p className="text-sm text-ink-soft">読み込み中…</p>

  return (
    <div className="space-y-5">
      {message && (
        <p role="status" className={`rounded-xl px-4 py-3 text-sm font-bold ${message.kind === "ok" ? "bg-positive-soft text-positive" : "bg-caution-soft text-caution"}`}>
          {message.text}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <label className="block text-sm font-black text-ink">
            イベント名 *
            <input type="text" value={form.name} className={`mt-1 ${field}`} placeholder="例: 天神祭 奉納花火"
              onChange={(event) => {
                patch("name", event.target.value)
                if (!eventId && !form.slug) patch("slug", suggestEventSlug(event.target.value))
              }} />
          </label>

          <label className="block text-sm font-black text-ink">
            URLスラッグ（任意・未入力ならIDでアクセス）
            <input type="text" value={form.slug ?? ""} className={`mt-1 ${field} font-mono`}
              onChange={(event) => patch("slug", event.target.value || null)} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-black text-ink">
              開始日時 *
              <input type="datetime-local" value={form.start_at} className={`mt-1 ${field}`}
                onChange={(event) => patch("start_at", event.target.value)} />
            </label>
            <label className="block text-sm font-black text-ink">
              終了日時 *
              <input type="datetime-local" value={form.end_at} className={`mt-1 ${field}`}
                onChange={(event) => patch("end_at", event.target.value)} />
            </label>
          </div>

          <label className="block text-sm font-black text-ink">
            リード文（一覧に出る一言）
            <textarea rows={2} maxLength={300} value={form.summary ?? ""} className={`mt-1 ${field}`}
              onChange={(event) => patch("summary", event.target.value || null)} />
          </label>

          <label className="block text-sm font-black text-ink">
            詳細（Markdown可: ## 見出し / - 箇条書き / **強調** / [リンク](URL)）
            <textarea rows={10} value={form.description ?? ""} className={`mt-1 ${field} font-mono text-[13px] leading-6`}
              onChange={(event) => patch("description", event.target.value || null)} />
          </label>

          {/* 会場 */}
          <fieldset className="rounded-xl border border-line p-4">
            <legend className="px-1 text-sm font-black text-ink">会場</legend>
            <p className="text-xs text-ink-faint">掲載スポットで開催するなら紐付け、そうでなければ会場名・住所を入力してください。</p>

            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
              <input type="search" value={placeQuery} placeholder="掲載スポットを検索して紐付け（任意）" className={`${field} pl-9`}
                onChange={(event) => setPlaceQuery(event.target.value)} />
              {placeResults.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-line bg-surface shadow-[var(--shadow-overlay)]">
                  {placeResults.map((place) => (
                    <li key={place.id}>
                      <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-canvas"
                        onClick={() => {
                          patch("place_id", place.id)
                          if (!form.venue_name) patch("venue_name", place.name)
                          if (!form.prefecture) patch("prefecture", place.prefecture)
                          if (!form.city) patch("city", place.city)
                          setLinkedPlace(place)
                          setPlaceQuery("")
                          setPlaceResults([])
                        }}>
                        <span className="font-bold text-ink">{place.name}</span>
                        <span className="ml-2 text-xs text-ink-soft">{place.prefecture}{place.city}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {linkedPlace && (
              <button type="button" className="pill mt-2 !min-h-9 !text-xs"
                onClick={() => { patch("place_id", null); setLinkedPlace(null) }}>
                {linkedPlace.name}<X className="size-3.5" aria-hidden />
              </button>
            )}

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-ink-soft">
                会場名
                <input type="text" value={form.venue_name ?? ""} className={`mt-1 ${field}`} placeholder="例: 大川周辺"
                  onChange={(event) => patch("venue_name", event.target.value || null)} />
              </label>
              <label className="block text-xs font-bold text-ink-soft">
                住所
                <input type="text" value={form.address ?? ""} className={`mt-1 ${field}`}
                  onChange={(event) => patch("address", event.target.value || null)} />
              </label>
              <label className="block text-xs font-bold text-ink-soft">
                府県
                <select value={form.prefecture ?? ""} className={`mt-1 ${field}`}
                  onChange={(event) => patch("prefecture", event.target.value || null)}>
                  <option value="">指定なし</option>
                  {PREFECTURE_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold text-ink-soft">
                市区町村
                <input type="text" value={form.city ?? ""} className={`mt-1 ${field}`}
                  onChange={(event) => patch("city", event.target.value || null)} />
              </label>
            </div>

            <label className="mt-3 block text-xs font-bold text-ink-soft">
              アクセス
              <input type="text" value={form.access_note ?? ""} className={`mt-1 ${field}`} placeholder="例: JR大阪天満宮駅から徒歩5分"
                onChange={(event) => patch("access_note", event.target.value || null)} />
            </label>
            <label className="mt-3 block text-xs font-bold text-ink-soft">
              雨天時の対応
              <input type="text" value={form.rain_policy ?? ""} className={`mt-1 ${field}`} placeholder="例: 荒天中止（順延なし）"
                onChange={(event) => patch("rain_policy", event.target.value || null)} />
            </label>
          </fieldset>
        </div>

        <aside className="space-y-4 rounded-xl border border-line p-4">
          <label className="block text-sm font-black text-ink">
            公開ステータス
            <select value={form.status} className={`mt-1 ${field}`}
              onChange={(event) => patch("status", event.target.value as EventPayload["status"])}>
              {EVENT_STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-black text-ink">
            カテゴリー
            <select value={form.event_category ?? ""} className={`mt-1 ${field}`}
              onChange={(event) => patch("event_category", (event.target.value || null) as EventPayload["event_category"])}>
              <option value="">指定なし</option>
              {EVENT_CATEGORIES.map((value) => <option key={value} value={value}>{EVENT_CATEGORY_LABELS[value]}</option>)}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm font-bold text-ink">
            <input type="checkbox" checked={form.is_free} onChange={(event) => patch("is_free", event.target.checked)} />
            入場無料
          </label>
          {!form.is_free && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-bold text-ink-soft">
                子ども
                <input type="number" min={0} value={form.child_price ?? ""} className={`mt-1 ${field}`}
                  onChange={(event) => patch("child_price", event.target.value === "" ? null : Number(event.target.value))} />
              </label>
              <label className="block text-xs font-bold text-ink-soft">
                大人
                <input type="number" min={0} value={form.adult_price ?? ""} className={`mt-1 ${field}`}
                  onChange={(event) => patch("adult_price", event.target.value === "" ? null : Number(event.target.value))} />
              </label>
            </div>
          )}

          <label className="block text-sm font-black text-ink">
            予約
            <select value={form.reservation_required === null ? "" : String(form.reservation_required)} className={`mt-1 ${field}`}
              onChange={(event) => patch("reservation_required", event.target.value === "" ? null : event.target.value === "true")}>
              <option value="">未設定</option>
              <option value="false">予約不要</option>
              <option value="true">要予約</option>
            </select>
          </label>

          <label className="block text-sm font-black text-ink">
            主催
            <input type="text" value={form.organizer_name ?? ""} className={`mt-1 ${field}`}
              onChange={(event) => patch("organizer_name", event.target.value || null)} />
          </label>
          <label className="block text-sm font-black text-ink">
            公式URL
            <input type="url" value={form.official_url ?? ""} className={`mt-1 ${field}`}
              onChange={(event) => patch("official_url", event.target.value || null)} />
          </label>
          <label className="block text-sm font-black text-ink">
            申込URL
            <input type="url" value={form.application_url ?? ""} className={`mt-1 ${field}`}
              onChange={(event) => patch("application_url", event.target.value || null)} />
          </label>
          <label className="block text-sm font-black text-ink">
            画像URL
            <input type="url" value={form.cover_external_url ?? ""} className={`mt-1 ${field}`}
              onChange={(event) => patch("cover_external_url", event.target.value || null)} />
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-ink">
            <input type="checkbox" checked={form.is_featured} onChange={(event) => patch("is_featured", event.target.checked)} />
            注目イベントにする
          </label>
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        {eventId ? (
          <button type="button" className="btn-ghost text-sm text-destructive" onClick={() => void remove()}>
            <Trash2 className="size-4" aria-hidden />削除
          </button>
        ) : <span />}
        <div className="flex gap-3">
          {eventId && form.status === "published" && (
            <a href={`/events/${form.slug ?? eventId}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              公開ページを見る
            </a>
          )}
          <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>
            {saving ? "保存中…" : eventId ? "保存する" : "イベントを作成"}
          </button>
        </div>
      </div>
    </div>
  )
}
