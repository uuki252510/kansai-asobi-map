"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ImageOff, Pencil, Plus, Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import PlaceImage from "@/components/PlaceImage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PREFECTURES } from "@/lib/places"
import type { IndoorType, Place, Prefecture, PriceType, TargetAge } from "@/lib/supabase/database.types"

async function adminFetch<T>(url: string, init: RequestInit): Promise<{ data?: T; error?: string }> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: { "content-type": "application/json", ...init.headers },
    })
    const body = (await response.json().catch(() => ({}))) as T & { error?: string }
    if (!response.ok) return { error: body.error ?? `HTTP ${response.status}` }
    return { data: body }
  } catch {
    return { error: "通信に失敗しました" }
  }
}

type FormState = Omit<Place, "id" | "created_at" | "updated_at">
type NumericKey = "average_stay_minutes" | "activity_level" | "healing_score" | "child_fun_score" | "date_score" | "photo_score" | "rainy_day_score" | "price_min" | "price_max" | "recommended_age_min" | "recommended_age_max"
type OptionalBooleanKey = "reservation_required" | "same_day_booking" | "stroller_accessible" | "barrier_free" | "pet_friendly" | "meal_available"

const emptyForm = (): FormState => ({
  name: "",
  description: null,
  prefecture: "大阪府",
  city: "",
  address: "",
  latitude: null,
  longitude: null,
  indoor_type: "indoor",
  target_ages: [],
  price_type: "free",
  price_note: null,
  has_parking: false,
  has_nursing_room: false,
  has_diaper_space: false,
  rainy_day_ok: false,
  opening_hours: null,
  image_url: null,
  google_map_url: null,
  website_url: null,
  is_published: true,
  mood_tags: [],
  companion_types: [],
  recommended_weather: ["any"],
  recommended_seasons: ["any"],
  recommended_time_of_day: ["any"],
  average_stay_minutes: null,
  activity_level: null,
  healing_score: null,
  child_fun_score: null,
  date_score: null,
  photo_score: null,
  rainy_day_score: null,
  crowd_level: null,
  price_min: null,
  price_max: null,
  recommended_age_min: null,
  recommended_age_max: null,
  reservation_required: null,
  same_day_booking: null,
  stroller_accessible: null,
  barrier_free: null,
  pet_friendly: null,
  meal_available: null,
  last_verified_at: null,
})

const scoreFields: Array<[NumericKey, string, number | undefined]> = [
  ["average_stay_minutes", "滞在時間（分）", undefined],
  ["activity_level", "活動度", 100],
  ["healing_score", "癒やし", 100],
  ["child_fun_score", "子ども満足", 100],
  ["date_score", "デート", 100],
  ["photo_score", "写真", 100],
  ["rainy_day_score", "雨の日適性", 100],
  ["price_min", "最低料金", undefined],
  ["price_max", "最高料金", undefined],
  ["recommended_age_min", "推奨年齢 下限", undefined],
  ["recommended_age_max", "推奨年齢 上限", undefined],
]

const facilityFields: Array<[OptionalBooleanKey, string]> = [
  ["reservation_required", "予約必須"],
  ["same_day_booking", "当日予約可"],
  ["stroller_accessible", "ベビーカー可"],
  ["barrier_free", "バリアフリー"],
  ["pet_friendly", "ペット同伴"],
  ["meal_available", "食事あり"],
]

export default function AdminClient({ initialPlaces }: { initialPlaces: Place[] }) {
  const router = useRouter()
  const [places, setPlaces] = useState(initialPlaces)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const openNew = () => {
    setForm(emptyForm())
    setEditingId(null)
    setError("")
    setShowForm(true)
  }

  const openEdit = (place: Place) => {
    const { id, created_at, updated_at, ...editable } = place
    void id
    void created_at
    void updated_at
    setForm(editable)
    setEditingId(place.id)
    setError("")
    setShowForm(true)
  }

  const togglePublished = async (place: Place) => {
    const { error: updateError } = await adminFetch(`/api/admin/places/${place.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_published: !place.is_published }),
    })
    if (updateError) return window.alert(`更新に失敗しました: ${updateError}`)
    setPlaces((current) => current.map((item) => item.id === place.id ? { ...item, is_published: !item.is_published } : item))
  }

  const remove = async (place: Place) => {
    if (!window.confirm(`「${place.name}」を削除しますか？`)) return
    const { error: deleteError } = await adminFetch(`/api/admin/places/${place.id}`, { method: "DELETE" })
    if (deleteError) return window.alert(`削除に失敗しました: ${deleteError}`)
    setPlaces((current) => current.filter((item) => item.id !== place.id))
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim() || !form.city.trim() || !form.address.trim()) {
      setError("施設名・市区町村・住所は必須です。")
      return
    }
    setLoading(true)
    setError("")
    const payload: FormState = {
      ...form,
      description: form.description || null,
      price_note: form.price_note || null,
      opening_hours: form.opening_hours || null,
      image_url: form.image_url || null,
      website_url: form.website_url || null,
      google_map_url: form.google_map_url || null,
      last_verified_at: new Date().toISOString(),
    }

    if (editingId) {
      const { data, error: updateError } = await adminFetch<{ place: Place }>(`/api/admin/places/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      if (updateError || !data?.place) {
        setError(`更新に失敗しました: ${updateError ?? "unknown"}`)
        setLoading(false)
        return
      }
      const updated = data.place
      setPlaces((current) => current.map((place) => place.id === editingId ? updated : place))
    } else {
      const { data, error: insertError } = await adminFetch<{ place: Place }>("/api/admin/places", {
        method: "POST",
        body: JSON.stringify(payload),
      })
      if (insertError || !data?.place) {
        setError(`登録に失敗しました: ${insertError ?? "unknown"}`)
        setLoading(false)
        return
      }
      const created = data.place
      setPlaces((current) => [created, ...current])
    }

    setLoading(false)
    setShowForm(false)
    router.refresh()
  }

  const toggleAge = (age: TargetAge) => setForm((current) => ({
    ...current,
    target_ages: current.target_ages.includes(age) ? current.target_ages.filter((value) => value !== age) : [...current.target_ages, age],
  }))

  return (
    <div className="admin-workspace">
      <div className="admin-toolbar mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-ink-soft">全 {places.length} 件</p>
        <Button onClick={openNew} className="rounded-full"><Plus className="size-4" />新規登録</Button>
      </div>

      <div className="admin-list mb-8 space-y-3">
        {places.map((place) => (
          <article key={place.id} className="admin-row card-v2 flex items-start gap-4 rounded-2xl p-4">
            <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface">
              {place.image_url ? <PlaceImage place={place} alt="" className="size-full object-cover" /> : <ImageOff className="size-6 text-ink-soft" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-sm font-bold text-ink">{place.name}</h2>
                <Badge variant={place.is_published ? "default" : "secondary"}>{place.is_published ? "公開中" : "非公開"}</Badge>
              </div>
              <p className="mt-1 text-xs text-ink-soft">{place.prefecture} {place.city} · {place.indoor_type === "indoor" ? "屋内" : place.indoor_type === "outdoor" ? "屋外" : "屋内外"}</p>
              <p className="mt-1 text-xs text-ink-soft">気分タグ {place.mood_tags.length}件 · 最終確認 {place.last_verified_at ? new Date(place.last_verified_at).toLocaleDateString("ja-JP") : "未確認"}</p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <a href={`/admin/places/${place.id}/edit`} className="pill">詳細編集</a>
              <button type="button" onClick={() => void togglePublished(place)} className="pill">{place.is_published ? "非公開に" : "公開する"}</button>
              <button type="button" onClick={() => openEdit(place)} className="pill" aria-label={`${place.name}を編集`}><Pencil className="size-4" /></button>
              <button type="button" onClick={() => void remove(place)} className="pill text-red-600" aria-label={`${place.name}を削除`}><Trash2 className="size-4" /></button>
            </div>
          </article>
        ))}
        {places.length === 0 && <p className="rounded-2xl border border-dashed border-line py-12 text-center text-sm text-ink-soft">登録された遊び場がありません。</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="admin-form-title">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white shadow-float">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-4">
              <div><h2 id="admin-form-title" className="font-black text-ink">{editingId ? "遊び場を編集" : "新規遊び場を登録"}</h2><p className="mt-1 text-xs text-ink-soft">確認できた情報だけを入力してください。</p></div>
              <button type="button" onClick={() => setShowForm(false)} className="icon-button" aria-label="閉じる"><X className="size-5" /></button>
            </div>
            <form onSubmit={submit} className="space-y-6 p-5">
              <FormSection title="基本情報">
                <Field label="施設名 *"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
                <Field label="説明"><textarea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value || null })} rows={4} className="w-full resize-y rounded-xl border border-input px-3 py-2 text-sm" /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="どんなとこ？(1〜2文)"><textarea value={form.what_is_it ?? ""} onChange={(event) => setForm({ ...form, what_is_it: event.target.value || null })} rows={2} className="w-full resize-y rounded-xl border border-input px-3 py-2 text-sm" /></Field>
                  <Field label="なんで行くん？(行く理由)"><textarea value={form.why_go ?? ""} onChange={(event) => setForm({ ...form, why_go: event.target.value || null })} rows={2} className="w-full resize-y rounded-xl border border-input px-3 py-2 text-sm" /></Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="都道府県 *"><select value={form.prefecture} onChange={(event) => setForm({ ...form, prefecture: event.target.value as Prefecture })} className="w-full rounded-xl border border-input px-3 py-2 text-sm">{PREFECTURES.map((value) => <option key={value}>{value}</option>)}</select></Field>
                  <Field label="市区町村 *"><Input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Field>
                </div>
                <Field label="住所 *"><Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
                <div className="grid gap-3 sm:grid-cols-2"><NumberInput label="緯度" value={form.latitude} onChange={(value) => setForm({ ...form, latitude: value })} step="any" /><NumberInput label="経度" value={form.longitude} onChange={(value) => setForm({ ...form, longitude: value })} step="any" /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ChoiceField label="屋内・屋外" values={["indoor", "outdoor", "both"] as IndoorType[]} current={form.indoor_type} labels={["屋内", "屋外", "屋内外"]} onChange={(value) => setForm({ ...form, indoor_type: value })} />
                  <ChoiceField label="料金種別" values={["free", "paid", "mixed"] as PriceType[]} current={form.price_type} labels={["無料", "有料", "一部有料"]} onChange={(value) => setForm({ ...form, price_type: value })} />
                </div>
                <Field label="対象年齢"><div className="flex flex-wrap gap-2">{(["0-2", "3-5", "6-12"] as TargetAge[]).map((age) => <Toggle key={age} active={form.target_ages.includes(age)} onClick={() => toggleAge(age)}>{age === "0-2" ? "0〜2歳" : age === "3-5" ? "3〜5歳" : "小学生"}</Toggle>)}</div></Field>
                <div className="grid gap-3 sm:grid-cols-2"><Field label="料金メモ"><Input value={form.price_note ?? ""} onChange={(event) => setForm({ ...form, price_note: event.target.value || null })} /></Field><Field label="営業時間"><Input value={form.opening_hours ?? ""} onChange={(event) => setForm({ ...form, opening_hours: event.target.value || null })} /></Field></div>
                <Field label="画像URL"><Input type="url" value={form.image_url ?? ""} onChange={(event) => setForm({ ...form, image_url: event.target.value || null })} /></Field>
                <div className="grid gap-3 sm:grid-cols-2"><Field label="公式サイトURL"><Input type="url" value={form.website_url ?? ""} onChange={(event) => setForm({ ...form, website_url: event.target.value || null })} /></Field><Field label="Google マップURL"><Input type="url" value={form.google_map_url ?? ""} onChange={(event) => setForm({ ...form, google_map_url: event.target.value || null })} /></Field></div>
                <div className="flex flex-wrap gap-2">{([[
                  "has_parking", "駐車場"], ["has_nursing_room", "授乳室"], ["has_diaper_space", "おむつ替え"], ["rainy_day_ok", "雨の日OK"], ["is_published", "公開"]] as const).map(([key, label]) => <Toggle key={key} active={form[key]} onClick={() => setForm({ ...form, [key]: !form[key] })}>{label}</Toggle>)}</div>
              </FormSection>

              <FormSection title="おすすめ判定データ" description="カンマ区切りで複数指定できます。データがない項目は空欄のまま保存します。">
                <Field label="気分タグ"><Input value={form.mood_tags.join(", ")} onChange={(event) => setForm({ ...form, mood_tags: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) as Place["mood_tags"] })} placeholder="relax, active, kids, food, healing, photo, discovery" /></Field>
                <Field label="同行者タイプ"><Input value={form.companion_types.join(", ")} onChange={(event) => setForm({ ...form, companion_types: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) as Place["companion_types"] })} placeholder="solo, couple, friends, family, children" /></Field>
                <div className="grid gap-3 sm:grid-cols-3"><Field label="おすすめ天気"><Input value={form.recommended_weather.join(", ")} onChange={(event) => setForm({ ...form, recommended_weather: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) as Place["recommended_weather"] })} /></Field><Field label="おすすめ季節"><Input value={form.recommended_seasons.join(", ")} onChange={(event) => setForm({ ...form, recommended_seasons: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) as Place["recommended_seasons"] })} /></Field><Field label="おすすめ時間帯"><Input value={form.recommended_time_of_day.join(", ")} onChange={(event) => setForm({ ...form, recommended_time_of_day: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) as Place["recommended_time_of_day"] })} /></Field></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{scoreFields.map(([key, label, max]) => <NumberInput key={key} label={label} value={form[key]} max={max} onChange={(value) => setForm({ ...form, [key]: value })} />)}</div>
                <Field label="混雑目安"><select value={form.crowd_level ?? ""} onChange={(event) => setForm({ ...form, crowd_level: (event.target.value || null) as Place["crowd_level"] })} className="w-full rounded-xl border border-input px-3 py-2 text-sm"><option value="">未確認</option><option value="quiet">静か</option><option value="normal">普通</option><option value="busy">混雑</option><option value="very_busy">かなり混雑</option></select></Field>
                <div className="flex flex-wrap gap-2">{facilityFields.map(([key, label]) => <Toggle key={key} active={form[key] === true} onClick={() => setForm({ ...form, [key]: form[key] === true ? null : true })}>{label}</Toggle>)}</div>
              </FormSection>

              {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
              <div className="sticky bottom-0 flex gap-3 border-t border-line bg-white py-3"><Button type="button" variant="ghost" className="flex-1 rounded-full" onClick={() => setShowForm(false)}>キャンセル</Button><Button type="submit" disabled={loading} className="flex-1 rounded-full">{loading ? "保存中…" : editingId ? "更新する" : "登録する"}</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <section className="space-y-4 rounded-2xl border border-line bg-surface/40 p-4"><div><h3 className="font-bold text-ink">{title}</h3>{description && <p className="mt-1 text-xs leading-5 text-ink-soft">{description}</p>}</div>{children}</section>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>{children}</label>
}

function NumberInput({ label, value, onChange, max, step }: { label: string; value: number | null; onChange: (value: number | null) => void; max?: number; step?: string }) {
  return <Field label={label}><Input type="number" min="0" max={max} step={step} value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} /></Field>
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={active ? "pill is-active" : "pill"}>{children}</button>
}

function ChoiceField<T extends string>({ label, values, current, labels, onChange }: { label: string; values: T[]; current: T; labels: string[]; onChange: (value: T) => void }) {
  return <Field label={label}><div className="flex flex-wrap gap-2">{values.map((value, index) => <Toggle key={value} active={current === value} onClick={() => onChange(value)}>{labels[index]}</Toggle>)}</div></Field>
}
