"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Check, Copy, Dices, Radio, Vote } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import PlaceImage from "@/components/PlaceImage"

type VoteData = {
  group: { title: string; status: "open" | "closed"; closes_at: string | null; created_at: string }
  places: Array<{ id: string; name: string; image_url: string | null; prefecture: string; city: string; position: number }>
  votes: Array<{ id: string; place_id: string; voter_name: string; comment: string | null; created_at: string }>
}

export default function VoteClient({ token }: { token: string }) {
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>["channel"]> | null>(null)
  const [data, setData] = useState<VoteData | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [randomWinner, setRandomWinner] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/votes?id=${encodeURIComponent(token)}`, { cache: "no-store" })
      if (!response.ok) throw new Error()
      setData((await response.json()) as VoteData)
    } catch {
      setMessage("投票データを読み込めません。migrationが適用済みか確認してください。")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
    const supabase = getSupabase()
    const channel = supabase
      .channel(`vote:${token}`)
      .on("broadcast", { event: "vote_changed" }, () => void load())
      .subscribe()
    channelRef.current = channel
    const fallbackPoll = window.setInterval(() => void load(), 15_000)
    return () => {
      window.clearInterval(fallbackPoll)
      void supabase.removeChannel(channel)
    }
  }, [load, token])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    data?.votes.forEach((vote) => map.set(vote.place_id, (map.get(vote.place_id) ?? 0) + 1))
    return map
  }, [data])
  const maxVotes = Math.max(0, ...counts.values())

  async function submitVote() {
    if (!selected || !name.trim()) {
      setMessage("候補とお名前を入力してください。")
      return
    }
    setSubmitting(true)
    setMessage(null)
    const fingerprintKey = `kyodokoiko-voter-${token}`
    let fingerprint = window.localStorage.getItem(fingerprintKey)
    if (!fingerprint) {
      fingerprint = crypto.randomUUID()
      window.localStorage.setItem(fingerprintKey, fingerprint)
    }
    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "vote", token, place_id: selected, voter_name: name.trim(), voter_fingerprint: fingerprint, comment: comment.trim() }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error ?? "投票できませんでした")
      setMessage("投票を受け付けました。変更もいつでもできます。")
      await load()
      await channelRef.current?.send({ type: "broadcast", event: "vote_changed", payload: {} })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "投票できませんでした")
    } finally {
      setSubmitting(false)
    }
  }

  function decideTie() {
    if (!data) return
    const leaders = data.places.filter((place) => (counts.get(place.id) ?? 0) === maxVotes)
    const winner = leaders[Math.floor(Math.random() * leaders.length)]
    if (winner) setRandomWinner(winner.name)
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(window.location.href)
    setMessage("共有URLをコピーしました。")
  }

  if (loading) {
    return <main className="page-shell py-12"><div className="mx-auto max-w-4xl"><div className="skeleton h-9 w-72" /><div className="skeleton mt-6 h-80 w-full" /></div></main>
  }
  if (!data) {
    return <main className="page-shell py-16"><div className="mx-auto max-w-xl rounded-3xl border border-[var(--color-border)] bg-white p-8 text-center"><Vote className="mx-auto size-9 text-[var(--color-primary)]" /><h1 className="mt-4 text-xl font-black">投票を表示できません</h1><p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">{message}</p></div></main>
  }

  return (
    <main className="vote-page page-shell py-7 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
          <div>
            <p className="section-kicker">みんなで投票する</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">{data.group.title}</h1>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">候補をひとつ選んでください。結果はリアルタイムに更新されます。</p>
            <button type="button" onClick={copyUrl} className="pill mt-4"><Copy className="size-4" />共有URLをコピー</button>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.places.map((place) => {
                const votes = counts.get(place.id) ?? 0
                const leading = maxVotes > 0 && votes === maxVotes
                return (
                  <button key={place.id} type="button" onClick={() => setSelected(place.id)} className={`vote-option relative overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition ${selected === place.id ? "is-selected border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/15" : "border-[var(--color-border)]"}`}>
                    {leading && <span className="absolute left-2 top-2 z-10 rounded-[2px] bg-[var(--color-primary)] px-2 py-1 text-[0.62rem] font-black text-white">現在1位</span>}
                    <div className="aspect-[1.5/1] bg-[#edf1ee]">{place.image_url && <PlaceImage place={place} alt="" className="spot-photo" />}</div>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2"><h2 className="text-sm font-black leading-5">{place.name}</h2>{selected === place.id && <Check className="size-5 shrink-0 text-[var(--color-primary)]" />}</div>
                      <p className="mt-1 text-[0.65rem] font-semibold text-[var(--color-text-secondary)]">{place.prefecture}・{place.city}</p>
                      <p className="mt-3 text-2xl font-black text-[var(--color-primary-dark)]">{votes}<span className="ml-1 text-xs text-[var(--color-text-secondary)]">票</span></p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="card-v2 mt-5 rounded-2xl p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold">お名前<span className="ml-1 text-[var(--color-coral)]">*</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={30} className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] px-3 text-sm" placeholder="例：ゆき" /></label>
                <label className="text-xs font-bold">コメント（任意）<input value={comment} onChange={(event) => setComment(event.target.value)} maxLength={240} className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] px-3 text-sm" placeholder="ここに行ってみたい！" /></label>
              </div>
              <button type="button" onClick={submitVote} disabled={submitting} className="btn-primary mt-4 w-full sm:w-auto">{submitting ? "送信中…" : "この候補に投票する"}</button>
              {message && <p className="mt-3 text-xs font-semibold text-[var(--color-text-secondary)]" role="status" aria-live="polite">{message}</p>}
            </div>
          </div>

          <aside className="vote-tally card-v2 h-fit rounded-2xl p-4 lg:sticky lg:top-24">
            <div className="flex items-center gap-2"><Radio className="size-4 text-[var(--color-primary)]" /><h2 className="text-sm font-black">投票状況</h2></div>
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">投票数：{data.votes.length}票</p>
            <div className="mt-4 space-y-4">
              {data.places.map((place) => {
                const votes = counts.get(place.id) ?? 0
                const percent = data.votes.length ? Math.round((votes / data.votes.length) * 100) : 0
                return <div key={place.id}><div className="flex justify-between gap-2 text-[0.68rem] font-bold"><span className="truncate">{place.name}</span><span>{votes}</span></div><div className="mt-1.5 h-2 rounded-full bg-[#edf1ee]"><div className="h-2 rounded-full bg-[var(--color-primary)] transition-[width]" style={{ width: `${percent}%` }} /></div></div>
              })}
            </div>
            <button type="button" onClick={decideTie} className="btn-secondary mt-5 w-full"><Dices className="size-4" />同票ならランダム決定</button>
            {randomWinner && <p className="mt-3 rounded-xl bg-[var(--color-cream)] p-3 text-xs font-black leading-5">今回は「{randomWinner}」に決定！</p>}
          </aside>
        </div>
      </div>
    </main>
  )
}
