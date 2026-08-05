import { verifyAdminRequest } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/service"

/**
 * 施設CSVエクスポート (admin)。UTF-8 BOM付き = Excelでそのまま開ける。
 * インポートは scripts/import-facilities-csv.mjs (同じカラム構成)。
 */

const COLUMNS = [
  "id", "name", "prefecture", "city", "address", "latitude", "longitude",
  "indoor_type", "price_type", "price_note", "phone_number", "website_url",
  "google_map_url", "opening_hours", "catchphrase", "short_description",
  "description", "is_published", "publication_status", "last_verified_at",
] as const

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ""
  const text = String(value)
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) {
    return new Response(JSON.stringify({ error: "認証が必要です" }), { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const rows: Record<string, unknown>[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("places")
      .select(COLUMNS.join(","))
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    rows.push(...((data ?? []) as unknown as Record<string, unknown>[]))
    if (!data || data.length < pageSize) break
  }

  const lines = [
    COLUMNS.join(","),
    ...rows.map((row) => COLUMNS.map((column) => csvEscape(row[column])).join(",")),
  ]
  const csv = "﻿" + lines.join("\r\n")

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="dekakeru-facilities-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  })
}
