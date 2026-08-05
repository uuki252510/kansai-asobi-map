"use client"

import Link from "next/link"
import PlaceImage from "@/components/PlaceImage"
import { useEffect, useState } from "react"
import { CalendarDays, Check, MapPin, NotebookTabs, Trash2 } from "lucide-react"
import { trackEvent } from "@/lib/analytics"

type HistoryRecord = { id: string; placeId: string; placeName: string; imageUrl: string | null; prefecture: string; city: string; decidedAt: string; score: number; role: string; visited?: boolean }
const KEY = "kyodokoiko-outing-history"

export default function HistoryClient() {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  useEffect(() => { setRecords(JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as HistoryRecord[]) }, [])
  function save(next: HistoryRecord[]) { setRecords(next); window.localStorage.setItem(KEY, JSON.stringify(next)) }
  function markVisited(id: string) { const next = records.map((record) => record.id === id ? { ...record, visited: true } : record); save(next); trackEvent("outing_record_created", { history_id: id }) }
  return (
    <main className="utility-page page-shell py-8 sm:py-12">
      <div className="utility-hero"><p className="section-kicker">思い出を少しずつ</p><h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">おでかけ記録</h1><p className="mt-3 text-sm text-[var(--color-text-secondary)]">「ここにする」で決めた場所を、あとから振り返れます。</p></div>
      {records.length === 0 ? <div className="empty-state mx-auto mt-12 max-w-xl rounded-3xl p-8 text-center"><span className="empty-state-icon is-mint"><NotebookTabs className="size-6" /></span><h2 className="mt-4 text-lg font-black">まだおでかけ記録がありません</h2><p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">おすすめ3件から「ここにする」を選ぶと、こちらに記録されます。</p><Link href="/today" className="btn-primary mt-6">今日の行き先を決める</Link></div> : (
        <div className="history-layout mt-7 grid gap-4 md:grid-cols-[1fr_18rem]">
          <div className="space-y-3">{records.map((record) => <article key={record.id} className="card-v2 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center"><div className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-[#edf1ee] sm:w-32">{record.imageUrl && <PlaceImage place={{ id: record.placeId, image_url: record.imageUrl }} alt="" className="spot-photo" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-1.5"><span className="chip is-green">{record.role}</span>{record.visited && <span className="chip is-coral"><Check className="size-3" />訪問済み</span>}</div><h2 className="mt-2 text-base font-black">{record.placeName}</h2><p className="mt-1 flex items-center gap-1 text-[0.68rem] text-[var(--color-text-secondary)]"><MapPin className="size-3" />{record.prefecture}・{record.city}<CalendarDays className="ml-2 size-3" />{new Date(record.decidedAt).toLocaleDateString("ja-JP")}</p></div><div className="flex gap-2"><Link href={`/places/${record.placeId}`} className="btn-secondary">詳細</Link>{!record.visited && <button type="button" onClick={() => markVisited(record.id)} className="btn-secondary">行った</button>}<button type="button" onClick={() => save(records.filter((item) => item.id !== record.id))} className="icon-button" aria-label="記録を削除"><Trash2 className="size-4" /></button></div></article>)}</div>
          <aside className="history-summary card-v2 h-fit rounded-2xl p-5"><p className="text-xs font-bold text-[var(--color-text-secondary)]">このおでかけ</p><p className="mt-2 text-3xl font-black">{records.length}<span className="ml-1 text-xs">件</span></p><div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-[var(--color-primary-soft)] p-3"><p className="text-xl font-black text-[var(--color-primary-dark)]">{new Set(records.map((record) => record.prefecture)).size}</p><p className="text-[0.62rem]">エリア</p></div><div className="rounded-xl bg-[var(--color-cream)] p-3"><p className="text-xl font-black">{records.filter((record) => record.visited).length}</p><p className="text-[0.62rem]">訪問済み</p></div></div></aside>
        </div>
      )}
    </main>
  )
}
