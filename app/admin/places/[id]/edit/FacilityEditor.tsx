"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import {
  validateFacilityDetails,
  type BusinessExceptionInput,
  type BusinessHourInput,
  type FacilityDetailsPayload,
  type PricePlanInput,
} from "@/lib/facility-details-payload"
import { DAY_LABELS, TIER_LABELS } from "@/lib/facility-types"
import MediaEditor from "./MediaEditor"
import OffersEditor from "./OffersEditor"

type Master = { id: string; slug: string; name: string; category?: string | null; group_id?: string | null }

interface LoadedDetails {
  place: Record<string, unknown>
  business_hours: Array<{ day_of_week: number; is_closed: boolean; note: string | null; slots: Array<{ opening_time: string; closing_time: string; last_entry_time: string | null }> }>
  business_exceptions: Array<{ date: string; exception_type: BusinessExceptionInput["exception_type"]; opening_time: string | null; closing_time: string | null; reason: string | null }>
  price_plans: Array<{ plan_name: string; plan_type: string | null; day_type: "all" | "weekday" | "holiday" | null; note: string | null; tiers: Array<{ tier: string; price: number; is_free: boolean; conditions: string | null }> }>
  facility_categories: Array<{ category_id: string; is_primary: boolean }>
  facility_tags: Array<{ tag_id: string }>
  facility_amenities: Array<{ amenity_id: string; available: boolean; free_or_paid: "free" | "paid" | null; fee: number | null }>
  masters: { categories: Master[]; tags: Master[]; amenities: Master[] }
}

const TABS = ["分類", "営業時間", "料金", "設備", "画像", "イベント・特典", "公開・鮮度"] as const
const TIER_OPTIONS = Object.entries(TIER_LABELS)
const EXCEPTION_LABELS: Record<string, string> = {
  temporary_closure: "臨時休業",
  special_open: "特別営業",
  shortened: "短縮営業",
  year_end: "年末年始",
  maintenance: "メンテナンス休業",
}

function trimTime(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : ""
}

export default function FacilityEditor({ placeId }: { placeId: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("分類")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [masters, setMasters] = useState<LoadedDetails["masters"]>({ categories: [], tags: [], amenities: [] })
  const [placeName, setPlaceName] = useState("")

  const [hours, setHours] = useState<BusinessHourInput[]>([])
  const [exceptions, setExceptions] = useState<BusinessExceptionInput[]>([])
  const [plans, setPlans] = useState<PricePlanInput[]>([])
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string | null>(null)
  const [tagIds, setTagIds] = useState<string[]>([])
  const [amenityIds, setAmenityIds] = useState<Set<string>>(new Set())
  const [meta, setMeta] = useState<FacilityDetailsPayload["meta"]>({})

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/places/${placeId}/details`)
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? `HTTP ${response.status}`)
        return response.json() as Promise<LoadedDetails>
      })
      .then((data) => {
        if (cancelled) return
        setMasters(data.masters)
        setPlaceName(String(data.place.name ?? ""))
        setHours(
          data.business_hours.map((hour) => ({
            day_of_week: hour.day_of_week,
            is_closed: hour.is_closed,
            note: hour.note,
            slots: hour.slots.map((slot) => ({
              opening_time: trimTime(slot.opening_time),
              closing_time: trimTime(slot.closing_time),
              last_entry_time: trimTime(slot.last_entry_time) || null,
            })),
          })),
        )
        setExceptions(
          data.business_exceptions.map((exception) => ({
            date: exception.date,
            exception_type: exception.exception_type,
            opening_time: trimTime(exception.opening_time) || null,
            closing_time: trimTime(exception.closing_time) || null,
            reason: exception.reason,
          })),
        )
        setPlans(
          data.price_plans.map((plan) => ({
            plan_name: plan.plan_name,
            plan_type: plan.plan_type,
            day_type: plan.day_type,
            note: plan.note,
            tiers: plan.tiers.map((tier) => ({ tier: tier.tier, price: tier.price, is_free: tier.is_free, conditions: tier.conditions })),
          })),
        )
        setCategoryIds(data.facility_categories.map((entry) => entry.category_id))
        setPrimaryCategoryId(data.facility_categories.find((entry) => entry.is_primary)?.category_id ?? null)
        setTagIds(data.facility_tags.map((entry) => entry.tag_id))
        setAmenityIds(new Set(data.facility_amenities.filter((entry) => entry.available).map((entry) => entry.amenity_id)))
        setMeta({
          publication_status: (data.place.publication_status as string) ?? "published",
          catchphrase: (data.place.catchphrase as string) ?? null,
          short_description: (data.place.short_description as string) ?? null,
          seo_title: (data.place.seo_title as string) ?? null,
          seo_description: (data.place.seo_description as string) ?? null,
          is_temporarily_closed: Boolean(data.place.is_temporarily_closed),
          confirmation_method: (data.place.confirmation_method as string) ?? null,
          confirmation_source_url: (data.place.confirmation_source_url as string) ?? null,
        })
        setLoading(false)
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setMessage({ kind: "error", text: `読み込みに失敗しました: ${error.message}（migration未適用の可能性）` })
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [placeId])

  const payload = useMemo<FacilityDetailsPayload>(
    () => ({
      business_hours: hours,
      business_exceptions: exceptions,
      price_plans: plans,
      category_ids: categoryIds,
      primary_category_id: primaryCategoryId,
      tag_ids: tagIds,
      amenities: [...amenityIds].map((amenity_id) => ({ amenity_id, available: true })),
      meta,
    }),
    [hours, exceptions, plans, categoryIds, primaryCategoryId, tagIds, amenityIds, meta],
  )

  async function save(markConfirmed = false) {
    const finalPayload = markConfirmed
      ? { ...payload, meta: { ...payload.meta, mark_confirmed: true } }
      : payload
    const validated = validateFacilityDetails(finalPayload)
    if ("error" in validated) {
      setMessage({ kind: "error", text: validated.error })
      return
    }
    setSaving(true)
    setMessage(null)
    const response = await fetch(`/api/admin/places/${placeId}/details`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validated.payload),
    })
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    setSaving(false)
    if (!response.ok) {
      setMessage({ kind: "error", text: body.error ?? `HTTP ${response.status}` })
      return
    }
    setMessage({ kind: "ok", text: markConfirmed ? "保存し、情報確認日を更新しました" : "保存しました" })
  }

  if (loading) return <p className="text-sm text-ink-soft">読み込み中…</p>

  return (
    <div className="card-v2 p-5 sm:p-6">
      <p className="text-lg font-black text-ink">{placeName}</p>

      <div role="tablist" className="mt-4 flex flex-wrap gap-2">
        {TABS.map((label) => (
          <button key={label} role="tab" aria-selected={tab === label} className={`pill${tab === label ? " is-active" : ""}`} onClick={() => setTab(label)}>
            {label}
          </button>
        ))}
      </div>

      {message && (
        <p role="status" className={`mt-4 rounded-xl px-4 py-3 text-sm font-bold ${message.kind === "ok" ? "bg-positive-soft text-positive" : "bg-caution-soft text-caution"}`}>
          {message.text}
        </p>
      )}

      <div className="mt-5">
        {tab === "分類" && (
          <div className="space-y-6">
            <section>
              <h2 className="text-sm font-black text-ink">カテゴリー（複数可・★=メイン）</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {masters.categories.map((category) => {
                  const selected = categoryIds.includes(category.id)
                  return (
                    <button
                      key={category.id}
                      type="button"
                      className={`pill !min-h-9 !text-xs${selected ? " is-active" : ""}`}
                      onClick={() => {
                        if (selected && primaryCategoryId === category.id) setPrimaryCategoryId(null)
                        setCategoryIds((current) => selected ? current.filter((id) => id !== category.id) : [...current, category.id])
                      }}
                      onDoubleClick={() => selected && setPrimaryCategoryId(category.id)}
                    >
                      {primaryCategoryId === category.id ? "★ " : ""}{category.name}
                    </button>
                  )
                })}
              </div>
              <p className="mt-1 text-xs text-ink-faint">ダブルクリックでメインカテゴリーに設定</p>
            </section>
            <section>
              <h2 className="text-sm font-black text-ink">タグ（複数可）</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {masters.tags.map((tag) => {
                  const selected = tagIds.includes(tag.id)
                  return (
                    <button key={tag.id} type="button" className={`pill !min-h-9 !text-xs${selected ? " is-active" : ""}`}
                      onClick={() => setTagIds((current) => selected ? current.filter((id) => id !== tag.id) : [...current, tag.id])}>
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            </section>
          </div>
        )}

        {tab === "営業時間" && (
          <div className="space-y-6">
            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-ink">曜日別営業時間</h2>
                <button type="button" className="btn-secondary !min-h-9 text-xs" onClick={() => {
                  const used = new Set(hours.map((hour) => hour.day_of_week))
                  const next = [0, 1, 2, 3, 4, 5, 6].find((day) => !used.has(day))
                  if (next !== undefined) setHours((current) => [...current, { day_of_week: next, is_closed: false, slots: [{ opening_time: "09:00", closing_time: "17:00", last_entry_time: null }] }])
                }}>
                  <Plus className="size-4" />曜日を追加
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {hours.length === 0 && <p className="text-xs text-ink-faint">未登録です。「曜日を追加」から登録してください。</p>}
                {hours.map((hour, hourIndex) => (
                  <div key={hourIndex} className="rounded-xl border border-line p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <select value={hour.day_of_week} className="rounded-lg border border-line px-2 py-1.5 text-sm font-bold"
                        onChange={(event) => setHours((current) => current.map((entry, index) => index === hourIndex ? { ...entry, day_of_week: Number(event.target.value) } : entry))}>
                        {DAY_LABELS.map((label, day) => <option key={day} value={day}>{label}曜日</option>)}
                      </select>
                      <label className="flex items-center gap-1.5 text-sm font-bold text-ink">
                        <input type="checkbox" checked={hour.is_closed}
                          onChange={(event) => setHours((current) => current.map((entry, index) => index === hourIndex ? { ...entry, is_closed: event.target.checked } : entry))} />
                        定休日
                      </label>
                      <button type="button" className="btn-ghost !min-h-8 !px-2 ml-auto" aria-label="この曜日を削除"
                        onClick={() => setHours((current) => current.filter((_, index) => index !== hourIndex))}>
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    {!hour.is_closed && (
                      <div className="mt-2 space-y-2">
                        {hour.slots.map((slot, slotIndex) => (
                          <div key={slotIndex} className="flex flex-wrap items-center gap-2 text-sm">
                            <input type="time" value={slot.opening_time} className="rounded-lg border border-line px-2 py-1"
                              onChange={(event) => setHours((current) => current.map((entry, index) => index === hourIndex ? { ...entry, slots: entry.slots.map((s, si) => si === slotIndex ? { ...s, opening_time: event.target.value } : s) } : entry))} />
                            〜
                            <input type="time" value={slot.closing_time} className="rounded-lg border border-line px-2 py-1"
                              onChange={(event) => setHours((current) => current.map((entry, index) => index === hourIndex ? { ...entry, slots: entry.slots.map((s, si) => si === slotIndex ? { ...s, closing_time: event.target.value } : s) } : entry))} />
                            <span className="text-xs text-ink-faint">最終入場</span>
                            <input type="time" value={slot.last_entry_time ?? ""} className="rounded-lg border border-line px-2 py-1"
                              onChange={(event) => setHours((current) => current.map((entry, index) => index === hourIndex ? { ...entry, slots: entry.slots.map((s, si) => si === slotIndex ? { ...s, last_entry_time: event.target.value || null } : s) } : entry))} />
                            <button type="button" className="btn-ghost !min-h-8 !px-2" aria-label="時間帯を削除"
                              onClick={() => setHours((current) => current.map((entry, index) => index === hourIndex ? { ...entry, slots: entry.slots.filter((_, si) => si !== slotIndex) } : entry))}>
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                        <button type="button" className="text-xs font-bold text-accent-strong"
                          onClick={() => setHours((current) => current.map((entry, index) => index === hourIndex ? { ...entry, slots: [...entry.slots, { opening_time: "13:00", closing_time: "17:00", last_entry_time: null }] } : entry))}>
                          + 時間帯を追加（午前/午後など）
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-ink">臨時営業・休業</h2>
                <button type="button" className="btn-secondary !min-h-9 text-xs"
                  onClick={() => setExceptions((current) => [...current, { date: new Date().toISOString().slice(0, 10), exception_type: "temporary_closure", opening_time: null, closing_time: null, reason: null }])}>
                  <Plus className="size-4" />追加
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {exceptions.map((exception, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3 text-sm">
                    <input type="date" value={exception.date} className="rounded-lg border border-line px-2 py-1"
                      onChange={(event) => setExceptions((current) => current.map((entry, i) => i === index ? { ...entry, date: event.target.value } : entry))} />
                    <select value={exception.exception_type} className="rounded-lg border border-line px-2 py-1 font-bold"
                      onChange={(event) => setExceptions((current) => current.map((entry, i) => i === index ? { ...entry, exception_type: event.target.value as BusinessExceptionInput["exception_type"] } : entry))}>
                      {Object.entries(EXCEPTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    {(exception.exception_type === "special_open" || exception.exception_type === "shortened") && (
                      <>
                        <input type="time" value={exception.opening_time ?? ""} className="rounded-lg border border-line px-2 py-1"
                          onChange={(event) => setExceptions((current) => current.map((entry, i) => i === index ? { ...entry, opening_time: event.target.value || null } : entry))} />
                        〜
                        <input type="time" value={exception.closing_time ?? ""} className="rounded-lg border border-line px-2 py-1"
                          onChange={(event) => setExceptions((current) => current.map((entry, i) => i === index ? { ...entry, closing_time: event.target.value || null } : entry))} />
                      </>
                    )}
                    <input type="text" placeholder="理由 (任意)" value={exception.reason ?? ""} className="min-w-32 flex-1 rounded-lg border border-line px-2 py-1"
                      onChange={(event) => setExceptions((current) => current.map((entry, i) => i === index ? { ...entry, reason: event.target.value || null } : entry))} />
                    <button type="button" className="btn-ghost !min-h-8 !px-2" aria-label="削除"
                      onClick={() => setExceptions((current) => current.filter((_, i) => i !== index))}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "料金" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-ink">料金プラン</h2>
              <button type="button" className="btn-secondary !min-h-9 text-xs"
                onClick={() => setPlans((current) => [...current, { plan_name: "入場料", plan_type: "admission", day_type: "all", note: null, tiers: [{ tier: "adult", price: 0, is_free: false, conditions: null }] }])}>
                <Plus className="size-4" />プランを追加
              </button>
            </div>
            {plans.length === 0 && <p className="text-xs text-ink-faint">未登録です。公開画面には既存の料金メモが表示されます。</p>}
            {plans.map((plan, planIndex) => (
              <div key={planIndex} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input type="text" value={plan.plan_name} placeholder="プラン名" className="min-w-40 rounded-lg border border-line px-2 py-1.5 text-sm font-bold"
                    onChange={(event) => setPlans((current) => current.map((entry, i) => i === planIndex ? { ...entry, plan_name: event.target.value } : entry))} />
                  <select value={plan.day_type ?? "all"} className="rounded-lg border border-line px-2 py-1.5 text-sm"
                    onChange={(event) => setPlans((current) => current.map((entry, i) => i === planIndex ? { ...entry, day_type: event.target.value as PricePlanInput["day_type"] } : entry))}>
                    <option value="all">全日</option>
                    <option value="weekday">平日</option>
                    <option value="holiday">土日祝</option>
                  </select>
                  <button type="button" className="btn-ghost !min-h-8 !px-2 ml-auto" aria-label="プランを削除"
                    onClick={() => setPlans((current) => current.filter((_, i) => i !== planIndex))}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {plan.tiers.map((tier, tierIndex) => (
                    <div key={tierIndex} className="flex flex-wrap items-center gap-2 text-sm">
                      <select value={tier.tier} className="rounded-lg border border-line px-2 py-1"
                        onChange={(event) => setPlans((current) => current.map((entry, i) => i === planIndex ? { ...entry, tiers: entry.tiers.map((t, ti) => ti === tierIndex ? { ...t, tier: event.target.value } : t) } : entry))}>
                        {TIER_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <label className="flex items-center gap-1 text-xs font-bold">
                        <input type="checkbox" checked={tier.is_free}
                          onChange={(event) => setPlans((current) => current.map((entry, i) => i === planIndex ? { ...entry, tiers: entry.tiers.map((t, ti) => ti === tierIndex ? { ...t, is_free: event.target.checked } : t) } : entry))} />
                        無料
                      </label>
                      {!tier.is_free && (
                        <input type="number" min={0} value={tier.price} className="w-28 rounded-lg border border-line px-2 py-1"
                          onChange={(event) => setPlans((current) => current.map((entry, i) => i === planIndex ? { ...entry, tiers: entry.tiers.map((t, ti) => ti === tierIndex ? { ...t, price: Number(event.target.value) } : t) } : entry))} />
                      )}
                      <span className="text-xs text-ink-faint">円</span>
                      <button type="button" className="btn-ghost !min-h-8 !px-2" aria-label="区分を削除"
                        onClick={() => setPlans((current) => current.map((entry, i) => i === planIndex ? { ...entry, tiers: entry.tiers.filter((_, ti) => ti !== tierIndex) } : entry))}>
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="text-xs font-bold text-accent-strong"
                    onClick={() => setPlans((current) => current.map((entry, i) => i === planIndex ? { ...entry, tiers: [...entry.tiers, { tier: "elementary", price: 0, is_free: false, conditions: null }] } : entry))}>
                    + 料金区分を追加
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "設備" && (
          <div>
            <h2 className="text-sm font-black text-ink">利用できる設備（タップで切替）</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {masters.amenities.map((amenity) => {
                const selected = amenityIds.has(amenity.id)
                return (
                  <button key={amenity.id} type="button" className={`pill !min-h-9 !text-xs${selected ? " is-active" : ""}`}
                    onClick={() => setAmenityIds((current) => {
                      const next = new Set(current)
                      if (next.has(amenity.id)) next.delete(amenity.id)
                      else next.add(amenity.id)
                      return next
                    })}>
                    {amenity.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {tab === "画像" && <MediaEditor placeId={placeId} />}

        {tab === "イベント・特典" && <OffersEditor placeId={placeId} />}

        {tab === "公開・鮮度" && (
          <div className="space-y-4">
            <label className="block text-sm font-black text-ink">
              公開ステータス
              <select value={meta.publication_status ?? "published"} className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm"
                onChange={(event) => setMeta((current) => ({ ...current, publication_status: event.target.value }))}>
                <option value="draft">下書き</option>
                <option value="pending_review">承認待ち</option>
                <option value="approved">承認済み（未公開）</option>
                <option value="published">公開</option>
                <option value="suspended">公開停止</option>
                <option value="archived">アーカイブ</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-ink">
              <input type="checkbox" checked={Boolean(meta.is_temporarily_closed)}
                onChange={(event) => setMeta((current) => ({ ...current, is_temporarily_closed: event.target.checked }))} />
              臨時休業中として表示する
            </label>
            <label className="block text-sm font-black text-ink">
              キャッチコピー
              <input type="text" value={meta.catchphrase ?? ""} maxLength={120} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm font-normal"
                onChange={(event) => setMeta((current) => ({ ...current, catchphrase: event.target.value || null }))} />
            </label>
            <label className="block text-sm font-black text-ink">
              SEOタイトル
              <input type="text" value={meta.seo_title ?? ""} maxLength={120} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm font-normal"
                onChange={(event) => setMeta((current) => ({ ...current, seo_title: event.target.value || null }))} />
            </label>
            <label className="block text-sm font-black text-ink">
              SEOディスクリプション
              <textarea value={meta.seo_description ?? ""} maxLength={300} rows={2} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm font-normal"
                onChange={(event) => setMeta((current) => ({ ...current, seo_description: event.target.value || null }))} />
            </label>
            <label className="block text-sm font-black text-ink">
              情報確認方法（電話 / 公式サイト / 現地 など）
              <input type="text" value={meta.confirmation_method ?? ""} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm font-normal"
                onChange={(event) => setMeta((current) => ({ ...current, confirmation_method: event.target.value || null }))} />
            </label>
            <label className="block text-sm font-black text-ink">
              確認元URL
              <input type="url" value={meta.confirmation_source_url ?? ""} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm font-normal"
                onChange={(event) => setMeta((current) => ({ ...current, confirmation_source_url: event.target.value || null }))} />
            </label>
          </div>
        )}
      </div>

      {/* 画像・イベントタブは各エディタ側に専用の保存ボタンがある */}
      {tab !== "イベント・特典" && tab !== "画像" && (
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-line pt-4">
          <button type="button" className="btn-secondary" disabled={saving} onClick={() => void save(true)}>
            保存して情報確認日を更新
          </button>
          <button type="button" className="btn-primary" disabled={saving} onClick={() => void save(false)}>
            {saving ? "保存中…" : "保存する"}
          </button>
        </div>
      )}
    </div>
  )
}
