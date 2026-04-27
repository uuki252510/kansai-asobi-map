"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import type { Place, Prefecture, IndoorType, PriceType, TargetAge } from "@/lib/supabase/database.types"
import { PREFECTURES } from "@/lib/places"

const emptyForm = (): Omit<Place, "id" | "created_at"> => ({
  name: "",
  description: "",
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
  opening_hours: "",
  image_url: "",
  google_map_url: null,
  website_url: null,
  is_published: true,
})

interface Props {
  initialPlaces: Place[]
}

export default function AdminClient({ initialPlaces }: Props) {
  const router = useRouter()
  const [places, setPlaces] = useState(initialPlaces)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function openNew() {
    setForm(emptyForm())
    setEditingId(null)
    setShowForm(true)
    setError("")
  }

  function openEdit(p: Place) {
    setForm({
      name: p.name,
      description: p.description ?? "",
      prefecture: p.prefecture,
      city: p.city,
      address: p.address,
      latitude: p.latitude,
      longitude: p.longitude,
      indoor_type: p.indoor_type,
      target_ages: p.target_ages,
      price_type: p.price_type,
      price_note: p.price_note,
      has_parking: p.has_parking,
      has_nursing_room: p.has_nursing_room,
      has_diaper_space: p.has_diaper_space,
      rainy_day_ok: p.rainy_day_ok,
      opening_hours: p.opening_hours ?? "",
      image_url: p.image_url ?? "",
      google_map_url: p.google_map_url,
      website_url: p.website_url ?? null,
      is_published: p.is_published,
    })
    setEditingId(p.id)
    setShowForm(true)
    setError("")
  }

  async function handleDelete(id: string) {
    if (!confirm("この遊び場を削除しますか？")) return
    const { error: err } = await supabase.from("places").delete().eq("id", id)
    if (err) { alert("削除に失敗しました"); return }
    setPlaces(prev => prev.filter(p => p.id !== id))
  }

  async function togglePublished(id: string, current: boolean) {
    const { error: err } = await supabase
      .from("places")
      .update({ is_published: !current })
      .eq("id", id)
    if (err) { alert("更新に失敗しました"); return }
    setPlaces(prev => prev.map(p => p.id === id ? { ...p, is_published: !current } : p))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.address.trim() || !form.city.trim()) {
      setError("施設名・市区町村・住所は必須です")
      return
    }
    setLoading(true)
    setError("")

    const payload = {
      ...form,
      description: form.description || null,
      price_note: form.price_note || null,
      opening_hours: (form.opening_hours as string) || null,
      image_url: (form.image_url as string) || null,
      google_map_url: form.google_map_url || null,
      website_url: form.website_url || null,
    }

    if (editingId) {
      const { error: err } = await supabase.from("places").update(payload).eq("id", editingId)
      if (err) { setError("更新に失敗しました: " + err.message); setLoading(false); return }
      setPlaces(prev => prev.map(p => p.id === editingId ? { ...p, ...payload } : p))
    } else {
      const { data, error: err } = await supabase.from("places").insert(payload).select().single()
      if (err) { setError("登録に失敗しました: " + err.message); setLoading(false); return }
      if (data) setPlaces(prev => [data as Place, ...prev])
    }

    setLoading(false)
    setShowForm(false)
    router.refresh()
  }

  function toggleAge(age: TargetAge) {
    setForm(prev => ({
      ...prev,
      target_ages: prev.target_ages.includes(age)
        ? prev.target_ages.filter(a => a !== age)
        : [...prev.target_ages, age],
    }))
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">全 {places.length} 件</p>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 rounded-full">
          + 新規登録
        </Button>
      </div>

      {/* Place list */}
      <div className="space-y-3 mb-8">
        {places.map(p => (
          <div
            key={p.id}
            className="bg-white border border-border rounded-2xl p-4 flex items-start gap-4 shadow-sm"
          >
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🌳</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-foreground truncate">{p.name}</h3>
                <Badge
                  variant={p.is_published ? "default" : "secondary"}
                  className={`text-xs rounded-full ${p.is_published ? "bg-green-100 text-green-700" : ""}`}
                >
                  {p.is_published ? "公開中" : "非公開"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {p.prefecture} {p.city} · {p.indoor_type === "indoor" ? "屋内" : p.indoor_type === "outdoor" ? "屋外" : "屋内外"} · {p.price_type === "free" ? "無料" : "有料"}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => togglePublished(p.id, p.is_published)}
                className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors"
              >
                {p.is_published ? "非公開に" : "公開する"}
              </button>
              <button
                onClick={() => openEdit(p)}
                className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors"
              >
                編集
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                className="text-xs px-3 py-1.5 rounded-full border border-destructive/30 hover:bg-destructive/10 text-destructive transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        ))}
        {places.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">まだ登録された遊び場がありません</p>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <h2 className="font-bold text-lg">{editingId ? "遊び場を編集" : "新規遊び場を登録"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              <Field label="施設名 *">
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例：キッズパーク大阪" className="rounded-xl" />
              </Field>

              <Field label="説明">
                <textarea
                  value={form.description ?? ""}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="施設の説明"
                  className="w-full text-sm border border-input rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="都道府県 *">
                  <select
                    value={form.prefecture}
                    onChange={e => setForm(f => ({ ...f, prefecture: e.target.value as Prefecture }))}
                    className="w-full text-sm border border-input rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="市区町村 *">
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="例：大阪市北区" className="rounded-xl" />
                </Field>
              </div>

              <Field label="住所 *">
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="例：大阪府大阪市北区梅田1-1-1" className="rounded-xl" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="緯度">
                  <Input type="number" step="any" value={form.latitude ?? ""} onChange={e => setForm(f => ({ ...f, latitude: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="34.693" className="rounded-xl" />
                </Field>
                <Field label="経度">
                  <Input type="number" step="any" value={form.longitude ?? ""} onChange={e => setForm(f => ({ ...f, longitude: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="135.502" className="rounded-xl" />
                </Field>
              </div>

              <Field label="屋内/屋外">
                <div className="flex gap-2">
                  {(["indoor", "outdoor", "both"] as IndoorType[]).map(v => (
                    <button key={v} type="button" onClick={() => setForm(f => ({ ...f, indoor_type: v }))}
                      className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${form.indoor_type === v ? "bg-primary text-white border-primary" : "border-border text-muted-foreground"}`}>
                      {v === "indoor" ? "屋内" : v === "outdoor" ? "屋外" : "屋内外"}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="対象年齢">
                <div className="flex gap-2 flex-wrap">
                  {(["0-2", "3-5", "6-12"] as TargetAge[]).map(age => (
                    <button key={age} type="button" onClick={() => toggleAge(age)}
                      className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${form.target_ages.includes(age) ? "bg-primary text-white border-primary" : "border-border text-muted-foreground"}`}>
                      {age === "0-2" ? "0〜2歳" : age === "3-5" ? "3〜5歳" : "小学生"}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="料金">
                <div className="flex gap-2">
                  {(["free", "paid", "mixed"] as PriceType[]).map(v => (
                    <button key={v} type="button" onClick={() => setForm(f => ({ ...f, price_type: v }))}
                      className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${form.price_type === v ? "bg-primary text-white border-primary" : "border-border text-muted-foreground"}`}>
                      {v === "free" ? "無料" : v === "paid" ? "有料" : "一部有料"}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="料金メモ">
                <Input value={form.price_note ?? ""} onChange={e => setForm(f => ({ ...f, price_note: e.target.value || null }))} placeholder="例：大人500円、子ども300円" className="rounded-xl" />
              </Field>

              <Field label="営業時間">
                <Input value={(form.opening_hours as string) ?? ""} onChange={e => setForm(f => ({ ...f, opening_hours: e.target.value }))} placeholder="例：10:00〜18:00（月曜休）" className="rounded-xl" />
              </Field>

              <Field label="画像URL">
                <Input value={(form.image_url as string) ?? ""} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." className="rounded-xl" />
              </Field>

              <Field label="公式サイトURL">
                <Input value={form.website_url ?? ""} onChange={e => setForm(f => ({ ...f, website_url: e.target.value || null }))} placeholder="https://..." className="rounded-xl" />
              </Field>

              <Field label="Google マップURL">
                <Input value={form.google_map_url ?? ""} onChange={e => setForm(f => ({ ...f, google_map_url: e.target.value || null }))} placeholder="https://maps.google.com/..." className="rounded-xl" />
              </Field>

              {/* Boolean toggles */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "has_parking" as const, label: "🚗 駐車場" },
                  { key: "has_nursing_room" as const, label: "🍼 授乳室" },
                  { key: "has_diaper_space" as const, label: "👶 おむつ替え" },
                  { key: "rainy_day_ok" as const, label: "☔ 雨の日OK" },
                  { key: "is_published" as const, label: "✅ 公開" },
                ].map(({ key, label }) => (
                  <button key={key} type="button"
                    onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${form[key] ? "bg-primary text-white border-primary" : "border-border text-muted-foreground"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" className="flex-1 rounded-full" onClick={() => setShowForm(false)}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-primary hover:bg-primary/90 rounded-full">
                  {loading ? "保存中..." : editingId ? "更新する" : "登録する"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
