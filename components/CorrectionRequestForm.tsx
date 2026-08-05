"use client"

import { useState, type FormEvent } from "react"
import { CheckCircle2, Flag } from "lucide-react"

/**
 * 情報修正リクエスト (公開・匿名可)。
 * 「情報の信頼性」を支える導線。送信内容は管理者確認後に反映される。
 */
const TYPES = [
  { value: "hours", label: "営業時間がちがう" },
  { value: "price", label: "料金がちがう" },
  { value: "closure", label: "休業・閉業している" },
  { value: "address", label: "場所・住所がちがう" },
  { value: "contact", label: "電話・公式サイトがちがう" },
  { value: "facility_info", label: "設備の情報がちがう" },
  { value: "other", label: "その他" },
]

export default function CorrectionRequestForm({ placeId }: { placeId: string }) {
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [correctionType, setCorrectionType] = useState("hours")
  const [proposedValue, setProposedValue] = useState("")
  const [evidenceUrl, setEvidenceUrl] = useState("")

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSending(true)
    setError(null)
    try {
      const response = await fetch("/api/corrections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          place_id: placeId,
          correction_type: correctionType,
          proposed_value: proposedValue,
          evidence_url: evidenceUrl || undefined,
        }),
      })
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        setError(body.error ?? "送信に失敗しました")
        setSending(false)
        return
      }
      setDone(true)
    } catch {
      setError("通信に失敗しました")
    }
    setSending(false)
  }

  if (done) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-positive-soft px-4 py-3 text-sm font-bold text-positive">
        <CheckCircle2 className="size-4" aria-hidden />
        ありがとうございます。編集部が内容を確認して反映します。
      </p>
    )
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft underline-offset-4 hover:text-ink hover:underline">
        <Flag className="size-3.5" aria-hidden />
        情報の誤りを報告する
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="card-v2 space-y-3 p-4">
      <p className="text-sm font-black text-ink">情報の誤りを報告</p>
      <label className="block text-xs font-bold text-ink-soft">
        どの情報がちがいますか？
        <select
          value={correctionType}
          onChange={(event) => setCorrectionType(event.target.value)}
          className="mt-1 block w-full rounded-lg border border-line px-3 py-2 text-sm font-normal text-ink"
        >
          {TYPES.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-bold text-ink-soft">
        正しい情報（5文字以上）
        <textarea
          required
          minLength={5}
          maxLength={2000}
          rows={3}
          value={proposedValue}
          onChange={(event) => setProposedValue(event.target.value)}
          placeholder="例: 現在の営業時間は10:00〜16:00です（冬期短縮）"
          className="mt-1 block w-full rounded-lg border border-line px-3 py-2 text-sm font-normal text-ink"
        />
      </label>
      <label className="block text-xs font-bold text-ink-soft">
        参考URL（任意）
        <input
          type="url"
          value={evidenceUrl}
          onChange={(event) => setEvidenceUrl(event.target.value)}
          placeholder="https://..."
          className="mt-1 block w-full rounded-lg border border-line px-3 py-2 text-sm font-normal text-ink"
        />
      </label>
      {error && <p role="alert" className="text-xs font-bold text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost text-sm" onClick={() => setOpen(false)}>キャンセル</button>
        <button type="submit" className="btn-primary !min-h-10 text-sm" disabled={sending}>
          {sending ? "送信中…" : "報告する"}
        </button>
      </div>
    </form>
  )
}
