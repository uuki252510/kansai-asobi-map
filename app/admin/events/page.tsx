export const dynamic = "force-dynamic"

import Link from "next/link"
import { Plus } from "lucide-react"
import { EVENT_CATEGORY_LABELS, type EventCategory } from "@/lib/events"
import { createServiceRoleClient } from "@/lib/supabase/service"

interface EventRow {
  id: string
  slug: string | null
  name: string
  event_category: EventCategory | null
  status: string
  start_at: string
  end_at: string
  prefecture: string | null
  venue_name: string | null
  is_featured: boolean
}

const STATUS_STYLES: Record<string, string> = {
  published: "bg-positive-soft text-positive",
  draft: "bg-muted text-ink-soft",
  archived: "bg-caution-soft text-caution",
  cancelled: "bg-caution-soft text-caution",
}
const STATUS_LABELS: Record<string, string> = {
  published: "公開中", draft: "下書き", archived: "アーカイブ", cancelled: "中止",
}

export default async function AdminEventsPage() {
  let events: EventRow[] = []
  let loadError: string | null = null
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from("events" as never)
      .select("id,slug,name,event_category,status,start_at,end_at,prefecture,venue_name,is_featured")
      .order("start_at", { ascending: false })
      .limit(300)
    if (error) loadError = error.message
    else events = (data ?? []) as unknown as EventRow[]
  } catch (error) {
    loadError = error instanceof Error ? error.message : "unknown"
  }

  const now = new Date()

  return (
    <main className="page-shell py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-wide text-ink-soft">EVENTS</p>
          <h1 className="mt-1 font-display text-2xl font-black text-ink">イベント（夏祭り・花火・催し）</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin" className="btn-secondary">施設管理へ</Link>
          <Link href="/admin/articles" className="btn-secondary">記事へ</Link>
          <Link href="/admin/events/new" className="btn-primary">
            <Plus className="size-4" aria-hidden />新しいイベント
          </Link>
        </div>
      </div>

      {loadError && (
        <p className="mb-4 rounded-xl bg-caution-soft px-4 py-3 text-sm font-bold text-caution">
          読み込みに失敗しました: {loadError}
        </p>
      )}

      {events.length === 0 ? (
        <div className="card-v2 px-6 py-14 text-center">
          <p className="text-base font-black text-ink">まだイベントがありません</p>
          <p className="mt-2 text-sm text-ink-soft">
            夏祭りや花火大会は、掲載スポットに属さない単独イベントとして登録できます。
          </p>
          <Link href="/admin/events/new" className="btn-primary mt-5">最初のイベントを登録</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const ended = new Date(event.end_at) < now
            return (
              <Link
                key={event.id}
                href={`/admin/events/${event.id}`}
                className="card-v2 flex flex-wrap items-center gap-3 p-4 transition-transform duration-150 active:scale-[0.995]"
              >
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${STATUS_STYLES[event.status] ?? STATUS_STYLES.draft}`}>
                  {STATUS_LABELS[event.status] ?? event.status}
                </span>
                {ended && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-ink-faint">終了</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-ink">
                    {event.is_featured && <span className="mr-1.5 text-accent-strong">★</span>}
                    {event.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink-soft">
                    {new Date(event.start_at).toLocaleDateString("ja-JP")}
                    {" 〜 "}
                    {new Date(event.end_at).toLocaleDateString("ja-JP")}
                    {event.event_category && ` · ${EVENT_CATEGORY_LABELS[event.event_category]}`}
                    {event.venue_name && ` · ${event.venue_name}`}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
