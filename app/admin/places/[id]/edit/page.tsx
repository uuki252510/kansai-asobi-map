export const dynamic = "force-dynamic"

import Link from "next/link"
import { requireAdmin } from "@/lib/admin-guard"
import FacilityEditor from "./FacilityEditor"

export default async function FacilityEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  return (
    <main className="page-shell py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-wide text-ink-soft">FACILITY DETAILS</p>
          <h1 className="mt-1 text-2xl font-black text-ink">施設の詳細情報を編集</h1>
        </div>
        <Link href="/admin" className="btn-secondary">管理一覧へ戻る</Link>
      </div>
      <FacilityEditor placeId={id} />
    </main>
  )
}
