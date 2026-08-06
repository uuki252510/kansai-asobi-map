"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Trash2, X } from "lucide-react"
import {
  ARTICLE_STATUSES,
  ARTICLE_TYPES,
  SEASONS,
  suggestSlug,
  validateArticle,
  type ArticlePayload,
} from "@/lib/article-payload"
import { ARTICLE_TYPE_LABELS } from "@/lib/articles"
import { renderSafeMarkdown } from "@/lib/safe-markdown"

interface PlaceOption {
  id: string
  name: string
  prefecture: string
  city: string
}

const STATUS_LABELS: Record<string, string> = { draft: "下書き", published: "公開", archived: "アーカイブ" }
const SEASON_LABELS: Record<string, string> = { spring: "春", summer: "夏", autumn: "秋", winter: "冬" }

const EMPTY: ArticlePayload = {
  slug: "",
  title: "",
  excerpt: null,
  body: null,
  cover_external_url: null,
  article_type: "feature",
  season: null,
  prefecture: null,
  status: "draft",
  is_featured: false,
  published_at: null,
  author_name: "デカケル編集部",
  seo_title: null,
  seo_description: null,
  noindex: false,
  place_ids: [],
  tag_ids: [],
}

const field = "w-full rounded-lg border border-line px-3 py-2 text-sm"

export default function ArticleForm({ articleId }: { articleId?: string }) {
  const router = useRouter()
  const [form, setForm] = useState<ArticlePayload>(EMPTY)
  const [loading, setLoading] = useState(Boolean(articleId))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [preview, setPreview] = useState(false)
  const [placeQuery, setPlaceQuery] = useState("")
  const [placeResults, setPlaceResults] = useState<PlaceOption[]>([])
  const [selectedPlaces, setSelectedPlaces] = useState<PlaceOption[]>([])
  const [allTags, setAllTags] = useState<Array<{ id: string; name: string }>>([])
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  function patch<K extends keyof ArticlePayload>(key: K, value: ArticlePayload[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  useEffect(() => {
    if (!articleId) return
    let cancelled = false
    fetch(`/api/admin/articles/${articleId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? `HTTP ${response.status}`)
        return response.json()
      })
      .then(async (data) => {
        if (cancelled) return
        const article = data.article as Record<string, unknown>
        setForm({
          ...EMPTY,
          ...Object.fromEntries(Object.entries(article).filter(([key]) => key in EMPTY)),
          place_ids: data.place_ids ?? [],
          tag_ids: data.tag_ids ?? [],
        } as ArticlePayload)
        if ((data.place_ids ?? []).length > 0) {
          const response = await fetch(`/api/admin/places/search?ids=${data.place_ids.join(",")}`)
          const body = await response.json().catch(() => ({ places: [] }))
          if (!cancelled) setSelectedPlaces(body.places ?? [])
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
  }, [articleId])

  // タグ候補 (施設と同じ語彙を使う)
  useEffect(() => {
    void fetch("/api/admin/tags")
      .then((response) => response.json())
      .then((data) => setAllTags(data.tags ?? []))
      .catch(() => setAllTags([]))
  }, [])

  /** カーソル位置に :::spot を差し込む */
  function insertSpotDirective(place: PlaceOption) {
    const textarea = bodyRef.current
    const directive = `\n:::spot ${place.id}\n`
    const current = form.body ?? ""
    if (!textarea) {
      patch("body", `${current}${directive}`)
      return
    }
    const start = textarea.selectionStart ?? current.length
    const next = `${current.slice(0, start)}${directive}${current.slice(start)}`
    patch("body", next)
    requestAnimationFrame(() => {
      textarea.focus()
      const caret = start + directive.length
      textarea.setSelectionRange(caret, caret)
    })
  }

  // スポット検索 (300msデバウンス)
  useEffect(() => {
    if (placeQuery.trim().length < 2) {
      setPlaceResults([])
      return
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/admin/places/search?q=${encodeURIComponent(placeQuery.trim())}`)
        .then((response) => response.json())
        .then((data) => setPlaceResults(data.places ?? []))
        .catch(() => setPlaceResults([]))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [placeQuery])

  function addPlace(place: PlaceOption) {
    if (form.place_ids.includes(place.id)) return
    patch("place_ids", [...form.place_ids, place.id])
    setSelectedPlaces((current) => [...current, place])
    setPlaceQuery("")
    setPlaceResults([])
  }

  function removePlace(id: string) {
    patch("place_ids", form.place_ids.filter((placeId) => placeId !== id))
    setSelectedPlaces((current) => current.filter((place) => place.id !== id))
  }

  async function save() {
    const validated = validateArticle(form)
    if ("error" in validated) {
      setMessage({ kind: "error", text: validated.error })
      return
    }
    setSaving(true)
    setMessage(null)
    const response = await fetch(articleId ? `/api/admin/articles/${articleId}` : "/api/admin/articles", {
      method: articleId ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validated.payload),
    })
    const body = (await response.json().catch(() => ({}))) as { error?: string; article?: { id: string } }
    setSaving(false)
    if (!response.ok) {
      setMessage({ kind: "error", text: body.error ?? `HTTP ${response.status}` })
      return
    }
    if (!articleId && body.article) {
      router.push(`/admin/articles/${body.article.id}`)
      return
    }
    setMessage({ kind: "ok", text: "保存しました" })
  }

  async function remove() {
    if (!articleId || !window.confirm("この記事を削除しますか？")) return
    const response = await fetch(`/api/admin/articles/${articleId}`, { method: "DELETE" })
    if (response.ok) router.push("/admin/articles")
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
            タイトル *
            <input
              type="text"
              value={form.title}
              className={`mt-1 ${field} font-normal`}
              onChange={(event) => {
                patch("title", event.target.value)
                if (!articleId && !form.slug) patch("slug", suggestSlug(event.target.value))
              }}
            />
          </label>

          <label className="block text-sm font-black text-ink">
            URLスラッグ *（英小文字・数字・ハイフン）
            <div className="mt-1 flex gap-2">
              <input type="text" value={form.slug} className={`${field} font-mono font-normal`} onChange={(event) => patch("slug", event.target.value)} />
              <button type="button" className="btn-secondary !min-h-10 shrink-0 text-xs" onClick={() => patch("slug", suggestSlug(form.title))}>
                自動生成
              </button>
            </div>
            <span className="mt-1 block text-xs font-normal text-ink-faint">/articles/{form.slug || "…"}</span>
          </label>

          <label className="block text-sm font-black text-ink">
            リード文（一覧やSNSに出る要約）
            <textarea rows={2} maxLength={300} value={form.excerpt ?? ""} className={`mt-1 ${field} font-normal`} onChange={(event) => patch("excerpt", event.target.value || null)} />
          </label>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="article-body" className="text-sm font-black text-ink">本文</label>
              <button type="button" className="text-xs font-bold text-accent-strong" onClick={() => setPreview((value) => !value)}>
                {preview ? "編集に戻る" : "プレビュー"}
              </button>
            </div>
            {preview ? (
              <div className="article-body mt-1 min-h-64 rounded-lg border border-line bg-surface px-4 py-3" dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(form.body ?? "") }} />
            ) : (
              <textarea
                id="article-body"
                ref={bodyRef}
                rows={18}
                value={form.body ?? ""}
                placeholder={"## 見出し\n\n本文をここに。\n\n:::spot でスポットカードを差し込めます\n\n- 箇条書き\n- **強調** や [リンク](/spots) も使えます"}
                className={`mt-1 ${field} font-mono text-[13px] font-normal leading-6`}
                onChange={(event) => patch("body", event.target.value || null)}
              />
            )}
            <p className="mt-1 text-xs leading-6 text-ink-faint">
              使える記法: ## 見出し / ### 小見出し / - 箇条書き / **強調** / [表示テキスト](URL) / --- 区切り線<br />
              画像: ![説明](https://... &quot;出典&quot;) / スポットカード: :::spot &lt;施設ID&gt;（下の検索から挿入できます）
            </p>
          </div>

          {/* 紹介スポット */}
          <div>
            <p className="text-sm font-black text-ink">この記事で紹介するスポット</p>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
              <input
                type="search"
                value={placeQuery}
                placeholder="施設名・市区町村で検索（2文字以上）"
                className={`${field} pl-9 font-normal`}
                onChange={(event) => setPlaceQuery(event.target.value)}
              />
              {placeResults.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-line bg-surface shadow-[var(--shadow-overlay)]">
                  {placeResults.map((place) => (
                    <li key={place.id} className="flex items-center gap-1 px-2 py-1">
                      <button type="button" className="min-w-0 flex-1 rounded px-1 py-1 text-left text-sm hover:bg-canvas" onClick={() => addPlace(place)}>
                        <span className="font-bold text-ink">{place.name}</span>
                        <span className="ml-2 text-xs text-ink-soft">{place.prefecture}{place.city}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-secondary !min-h-8 shrink-0 !px-2 text-xs"
                        title="本文のカーソル位置にスポットカードを挿入"
                        onClick={() => { addPlace(place); insertSpotDirective(place) }}
                      >
                        本文に挿入
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {selectedPlaces.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {selectedPlaces.map((place) => (
                  <li key={place.id} className="flex items-center gap-1">
                    <button type="button" className="pill !min-h-9 !text-xs" onClick={() => removePlace(place.id)}>
                      {place.name}
                      <X className="size-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="text-xs font-bold text-accent-strong"
                      onClick={() => insertSpotDirective(place)}
                    >
                      ↵本文へ
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-xs text-ink-faint">
              本文に挿入したスポットは記事中にカードで表示され、末尾の一覧では重複しません。
            </p>
          </div>

          {/* 記事タグ */}
          <div>
            <p className="text-sm font-black text-ink">タグ</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const selected = form.tag_ids.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={`pill !min-h-9 !text-xs${selected ? " is-active" : ""}`}
                    onClick={() =>
                      patch("tag_ids", selected ? form.tag_ids.filter((id) => id !== tag.id) : [...form.tag_ids, tag.id])
                    }
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* サイド: 公開設定 */}
        <aside className="space-y-4 rounded-xl border border-line p-4">
          <label className="block text-sm font-black text-ink">
            公開ステータス
            <select value={form.status} className={`mt-1 ${field} font-normal`} onChange={(event) => patch("status", event.target.value as ArticlePayload["status"])}>
              {ARTICLE_STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-black text-ink">
            公開日時
            <input type="datetime-local" value={form.published_at ?? ""} className={`mt-1 ${field} font-normal`} onChange={(event) => patch("published_at", event.target.value || null)} />
          </label>
          <label className="block text-sm font-black text-ink">
            記事タイプ
            <select value={form.article_type} className={`mt-1 ${field} font-normal`} onChange={(event) => patch("article_type", event.target.value as ArticlePayload["article_type"])}>
              {ARTICLE_TYPES.map((value) => <option key={value} value={value}>{ARTICLE_TYPE_LABELS[value]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-black text-ink">
            季節（任意）
            <select value={form.season ?? ""} className={`mt-1 ${field} font-normal`} onChange={(event) => patch("season", (event.target.value || null) as ArticlePayload["season"])}>
              <option value="">指定なし</option>
              {SEASONS.map((value) => <option key={value} value={value}>{SEASON_LABELS[value]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-black text-ink">
            カバー画像URL
            <input type="url" value={form.cover_external_url ?? ""} className={`mt-1 ${field} font-normal`} onChange={(event) => patch("cover_external_url", event.target.value || null)} />
          </label>
          <label className="block text-sm font-black text-ink">
            著者名
            <input type="text" value={form.author_name ?? ""} className={`mt-1 ${field} font-normal`} onChange={(event) => patch("author_name", event.target.value || null)} />
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-ink">
            <input type="checkbox" checked={form.is_featured} onChange={(event) => patch("is_featured", event.target.checked)} />
            トップで大きく扱う
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-ink">
            <input type="checkbox" checked={form.noindex} onChange={(event) => patch("noindex", event.target.checked)} />
            検索エンジンに載せない
          </label>
          <label className="block text-sm font-black text-ink">
            SEOタイトル
            <input type="text" value={form.seo_title ?? ""} className={`mt-1 ${field} font-normal`} onChange={(event) => patch("seo_title", event.target.value || null)} />
          </label>
          <label className="block text-sm font-black text-ink">
            SEOディスクリプション
            <textarea rows={3} value={form.seo_description ?? ""} className={`mt-1 ${field} font-normal`} onChange={(event) => patch("seo_description", event.target.value || null)} />
          </label>
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        {articleId ? (
          <button type="button" className="btn-ghost text-sm text-destructive" onClick={() => void remove()}>
            <Trash2 className="size-4" aria-hidden />削除
          </button>
        ) : <span />}
        <div className="flex gap-3">
          {articleId && form.status === "published" && (
            <a href={`/articles/${form.slug}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              公開ページを見る
            </a>
          )}
          <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>
            {saving ? "保存中…" : articleId ? "保存する" : "記事を作成"}
          </button>
        </div>
      </div>
    </div>
  )
}
