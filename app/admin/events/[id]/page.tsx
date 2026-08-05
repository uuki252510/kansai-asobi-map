export const dynamic = "force-dynamic"

import Link from "next/link"
import EventForm from "../EventForm"

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <main className="page-shell py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-black text-ink">イベントを編集</h1>
        <Link href="/admin/events" className="btn-secondary">イベント一覧へ</Link>
      </div>
      <EventForm eventId={id} />
    </main>
  )
}
