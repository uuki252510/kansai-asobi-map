"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import {
  validateOffers,
  type CouponInput,
  type EventInput,
  type TicketInput,
} from "@/lib/facility-offers-payload"

const DISCOUNT_LABELS: Record<CouponInput["discount_type"], string> = {
  amount: "金額割引",
  percent: "パーセント割引",
  child_free: "子ども無料",
  adult_free: "大人無料",
  gift: "特典プレゼント",
  set_discount: "セット割引",
}

const STATUS_LABELS = { draft: "下書き", published: "公開", expired: "終了", archived: "アーカイブ" }

function fieldClass(extra = "") {
  return `rounded-lg border border-line px-2 py-1.5 text-sm ${extra}`
}

/**
 * イベント・クーポン・チケットの管理タブ。
 * 公開画面 (FacilityInfoSections) にそのまま反映される。
 */
export default function OffersEditor({ placeId }: { placeId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [events, setEvents] = useState<EventInput[]>([])
  const [coupons, setCoupons] = useState<CouponInput[]>([])
  const [tickets, setTickets] = useState<TicketInput[]>([])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/places/${placeId}/offers`)
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? `HTTP ${response.status}`)
        return response.json()
      })
      .then((data) => {
        if (cancelled) return
        setEvents(data.events ?? [])
        setCoupons(data.coupons ?? [])
        setTickets(data.tickets ?? [])
        setLoading(false)
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setMessage({ kind: "error", text: `読み込みに失敗しました: ${error.message}（migration未適用の可能性）` })
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [placeId])

  async function save() {
    const validated = validateOffers({ events, coupons, tickets })
    if ("error" in validated) {
      setMessage({ kind: "error", text: validated.error })
      return
    }
    setSaving(true)
    setMessage(null)
    const response = await fetch(`/api/admin/places/${placeId}/offers`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validated.payload),
    })
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    setSaving(false)
    setMessage(response.ok ? { kind: "ok", text: "保存しました" } : { kind: "error", text: body.error ?? `HTTP ${response.status}` })
  }

  if (loading) return <p className="text-sm text-ink-soft">読み込み中…</p>

  return (
    <div className="space-y-8">
      {message && (
        <p role="status" className={`rounded-xl px-4 py-3 text-sm font-bold ${message.kind === "ok" ? "bg-positive-soft text-positive" : "bg-caution-soft text-caution"}`}>
          {message.text}
        </p>
      )}

      {/* イベント */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-ink">イベント</h2>
          <button type="button" className="btn-secondary !min-h-9 text-xs" onClick={() => {
            const now = new Date().toISOString().slice(0, 16)
            setEvents((current) => [...current, { name: "", summary: null, start_at: now, end_at: now, child_price: null, adult_price: null, reservation_required: false, official_url: null, status: "draft" }])
          }}>
            <Plus className="size-4" />イベントを追加
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {events.length === 0 && <p className="text-xs text-ink-faint">未登録です。</p>}
          {events.map((event, index) => (
            <div key={index} className="space-y-2 rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input type="text" placeholder="イベント名" value={event.name} className={fieldClass("min-w-48 flex-1 font-bold")}
                  onChange={(e) => setEvents((c) => c.map((v, i) => i === index ? { ...v, name: e.target.value } : v))} />
                <select value={event.status} className={fieldClass()}
                  onChange={(e) => setEvents((c) => c.map((v, i) => i === index ? { ...v, status: e.target.value as EventInput["status"] } : v))}>
                  <option value="draft">下書き</option>
                  <option value="published">公開</option>
                  <option value="cancelled">中止</option>
                  <option value="archived">アーカイブ</option>
                </select>
                <button type="button" className="btn-ghost !min-h-8 !px-2" aria-label="イベントを削除"
                  onClick={() => setEvents((c) => c.filter((_, i) => i !== index))}>
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <input type="datetime-local" value={event.start_at} className={fieldClass()}
                  onChange={(e) => setEvents((c) => c.map((v, i) => i === index ? { ...v, start_at: e.target.value } : v))} />
                〜
                <input type="datetime-local" value={event.end_at} className={fieldClass()}
                  onChange={(e) => setEvents((c) => c.map((v, i) => i === index ? { ...v, end_at: e.target.value } : v))} />
                <label className="flex items-center gap-1 text-xs font-bold">
                  <input type="checkbox" checked={Boolean(event.reservation_required)}
                    onChange={(e) => setEvents((c) => c.map((v, i) => i === index ? { ...v, reservation_required: e.target.checked } : v))} />
                  要予約
                </label>
              </div>
              <textarea placeholder="概要 (任意)" rows={2} value={event.summary ?? ""} className={fieldClass("w-full")}
                onChange={(e) => setEvents((c) => c.map((v, i) => i === index ? { ...v, summary: e.target.value || null } : v))} />
              <input type="url" placeholder="公式URL (任意)" value={event.official_url ?? ""} className={fieldClass("w-full")}
                onChange={(e) => setEvents((c) => c.map((v, i) => i === index ? { ...v, official_url: e.target.value || null } : v))} />
            </div>
          ))}
        </div>
      </section>

      {/* クーポン */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-ink">クーポン</h2>
          <button type="button" className="btn-secondary !min-h-9 text-xs"
            onClick={() => setCoupons((current) => [...current, { name: "", description: null, discount_type: "amount", discount_value: null, valid_from: null, valid_until: null, display_code: null, terms: null, status: "draft" }])}>
            <Plus className="size-4" />クーポンを追加
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {coupons.length === 0 && <p className="text-xs text-ink-faint">未登録です。</p>}
          {coupons.map((coupon, index) => (
            <div key={index} className="space-y-2 rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input type="text" placeholder="クーポン名" value={coupon.name} className={fieldClass("min-w-48 flex-1 font-bold")}
                  onChange={(e) => setCoupons((c) => c.map((v, i) => i === index ? { ...v, name: e.target.value } : v))} />
                <select value={coupon.discount_type} className={fieldClass()}
                  onChange={(e) => setCoupons((c) => c.map((v, i) => i === index ? { ...v, discount_type: e.target.value as CouponInput["discount_type"] } : v))}>
                  {Object.entries(DISCOUNT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                {(coupon.discount_type === "amount" || coupon.discount_type === "percent") && (
                  <input type="number" min={0} max={coupon.discount_type === "percent" ? 100 : undefined} value={coupon.discount_value ?? ""} className={fieldClass("w-24")}
                    placeholder={coupon.discount_type === "percent" ? "%" : "円"}
                    onChange={(e) => setCoupons((c) => c.map((v, i) => i === index ? { ...v, discount_value: e.target.value === "" ? null : Number(e.target.value) } : v))} />
                )}
                <select value={coupon.status} className={fieldClass()}
                  onChange={(e) => setCoupons((c) => c.map((v, i) => i === index ? { ...v, status: e.target.value as CouponInput["status"] } : v))}>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button type="button" className="btn-ghost !min-h-8 !px-2" aria-label="クーポンを削除"
                  onClick={() => setCoupons((c) => c.filter((_, i) => i !== index))}>
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <input type="date" value={coupon.valid_from ?? ""} className={fieldClass()}
                  onChange={(e) => setCoupons((c) => c.map((v, i) => i === index ? { ...v, valid_from: e.target.value || null } : v))} />
                〜
                <input type="date" value={coupon.valid_until ?? ""} className={fieldClass()}
                  onChange={(e) => setCoupons((c) => c.map((v, i) => i === index ? { ...v, valid_until: e.target.value || null } : v))} />
                <input type="text" placeholder="提示コード (任意)" value={coupon.display_code ?? ""} className={fieldClass("w-40")}
                  onChange={(e) => setCoupons((c) => c.map((v, i) => i === index ? { ...v, display_code: e.target.value || null } : v))} />
              </div>
              <textarea placeholder="内容・利用条件" rows={2} value={coupon.description ?? ""} className={fieldClass("w-full")}
                onChange={(e) => setCoupons((c) => c.map((v, i) => i === index ? { ...v, description: e.target.value || null } : v))} />
            </div>
          ))}
        </div>
      </section>

      {/* チケット */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-ink">チケット（外部購入リンク）</h2>
          <button type="button" className="btn-secondary !min-h-9 text-xs"
            onClick={() => setTickets((current) => [...current, { name: "", provider_name: null, external_ticket_url: "", sale_price: null, regular_price: null, is_featured: false, status: "draft" }])}>
            <Plus className="size-4" />チケットを追加
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {tickets.length === 0 && <p className="text-xs text-ink-faint">未登録です。</p>}
          {tickets.map((ticket, index) => (
            <div key={index} className="space-y-2 rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input type="text" placeholder="チケット名" value={ticket.name} className={fieldClass("min-w-48 flex-1 font-bold")}
                  onChange={(e) => setTickets((c) => c.map((v, i) => i === index ? { ...v, name: e.target.value } : v))} />
                <input type="text" placeholder="提供元 (アソビュー等)" value={ticket.provider_name ?? ""} className={fieldClass("w-44")}
                  onChange={(e) => setTickets((c) => c.map((v, i) => i === index ? { ...v, provider_name: e.target.value || null } : v))} />
                <select value={ticket.status} className={fieldClass()}
                  onChange={(e) => setTickets((c) => c.map((v, i) => i === index ? { ...v, status: e.target.value as TicketInput["status"] } : v))}>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button type="button" className="btn-ghost !min-h-8 !px-2" aria-label="チケットを削除"
                  onClick={() => setTickets((c) => c.filter((_, i) => i !== index))}>
                  <Trash2 className="size-4" />
                </button>
              </div>
              <input type="url" required placeholder="購入URL (https://...)" value={ticket.external_ticket_url} className={fieldClass("w-full")}
                onChange={(e) => setTickets((c) => c.map((v, i) => i === index ? { ...v, external_ticket_url: e.target.value } : v))} />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="text-xs font-bold text-ink-soft">販売価格
                  <input type="number" min={0} value={ticket.sale_price ?? ""} className={fieldClass("ml-1 w-28")}
                    onChange={(e) => setTickets((c) => c.map((v, i) => i === index ? { ...v, sale_price: e.target.value === "" ? null : Number(e.target.value) } : v))} />
                </label>
                <label className="text-xs font-bold text-ink-soft">通常価格
                  <input type="number" min={0} value={ticket.regular_price ?? ""} className={fieldClass("ml-1 w-28")}
                    onChange={(e) => setTickets((c) => c.map((v, i) => i === index ? { ...v, regular_price: e.target.value === "" ? null : Number(e.target.value) } : v))} />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end border-t border-line pt-4">
        <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>
          {saving ? "保存中…" : "イベント・クーポン・チケットを保存"}
        </button>
      </div>
    </div>
  )
}
