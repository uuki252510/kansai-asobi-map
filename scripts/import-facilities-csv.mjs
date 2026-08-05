/**
 * 施設CSVインポート。エクスポート (/api/admin/places/export) と同じカラム構成。
 * 重複判定: 施設名+住所 / 電話番号 / 公式URL / 緯度経度(±50m) のいずれか一致で既存扱い。
 * import_jobs / import_job_rows に履歴を記録する (テーブル未適用ならスキップ)。
 *
 * Dry run: node scripts/import-facilities-csv.mjs data.csv
 * Apply:   node scripts/import-facilities-csv.mjs data.csv --apply [--mode=upsert|insert_only|update_only]
 */

import { readFileSync } from "fs"
import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.cjs"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const envVars = {}
for (const line of readFileSync(resolve(scriptDirectory, "../.env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (match) envVars[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "")
}

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const [, , filePath, ...flags] = process.argv
if (!filePath) {
  console.error("Usage: node scripts/import-facilities-csv.mjs <file.csv> [--apply] [--mode=upsert]")
  process.exit(1)
}
const apply = flags.includes("--apply")
const mode = flags.find((flag) => flag.startsWith("--mode="))?.split("=")[1] ?? "upsert"

/** RFC4180準拠の簡易CSVパーサ (引用符・改行対応) */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ""
  let inQuotes = false
  const source = text.replace(/^﻿/, "")
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') { field += '"'; index += 1 }
        else inQuotes = false
      } else field += char
    } else if (char === '"') inQuotes = true
    else if (char === ",") { row.push(field); field = "" }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1
      row.push(field); field = ""
      if (row.some((value) => value !== "")) rows.push(row)
      row = []
    } else field += char
  }
  if (field !== "" || row.length > 0) { row.push(field); if (row.some((value) => value !== "")) rows.push(row) }
  return rows
}

const VALID_PREFECTURES = new Set(["大阪府", "兵庫県", "京都府", "奈良県", "滋賀県", "和歌山県"])
const VALID_INDOOR = new Set(["indoor", "outdoor", "both"])
const VALID_PRICE = new Set(["free", "paid", "mixed"])

function validateRow(record) {
  const errors = []
  if (!record.name?.trim()) errors.push("name必須")
  if (!VALID_PREFECTURES.has(record.prefecture)) errors.push(`prefecture不正: ${record.prefecture}`)
  if (!record.city?.trim()) errors.push("city必須")
  if (!record.address?.trim()) errors.push("address必須")
  if (record.indoor_type && !VALID_INDOOR.has(record.indoor_type)) errors.push("indoor_type不正")
  if (record.price_type && !VALID_PRICE.has(record.price_type)) errors.push("price_type不正")
  if (record.latitude && (Number(record.latitude) < 20 || Number(record.latitude) > 50)) errors.push("latitude範囲外")
  if (record.longitude && (Number(record.longitude) < 120 || Number(record.longitude) > 155)) errors.push("longitude範囲外")
  if (record.website_url && !/^https?:\/\//.test(record.website_url)) errors.push("website_url形式不正")
  return errors
}

function normalizePhone(value) {
  return (value ?? "").replace(/[-\s()]/g, "")
}

async function main() {
  const rows = parseCsv(readFileSync(resolve(process.cwd(), filePath), "utf8"))
  if (rows.length < 2) { console.error("データ行がありません"); process.exit(1) }
  const header = rows[0].map((column) => column.trim())
  const records = rows.slice(1).map((row) => Object.fromEntries(header.map((column, index) => [column, row[index]?.trim() ?? ""])))
  console.log(`rows: ${records.length} (mode=${mode}, apply=${apply})`)

  // 既存施設 (重複判定用)
  const existing = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("places")
      .select("id,name,address,phone_number,website_url,latitude,longitude")
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    existing.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }

  function findDuplicate(record) {
    const phone = normalizePhone(record.phone_number)
    return existing.find((place) => {
      if (record.id && place.id === record.id) return true
      if (place.name === record.name && place.address === record.address) return true
      if (phone && normalizePhone(place.phone_number) === phone) return true
      if (record.website_url && place.website_url === record.website_url) return true
      if (record.latitude && record.longitude && place.latitude !== null && place.longitude !== null) {
        const dLat = Math.abs(place.latitude - Number(record.latitude))
        const dLng = Math.abs(place.longitude - Number(record.longitude))
        if (place.name === record.name && dLat < 0.0005 && dLng < 0.0005) return true
      }
      return false
    })
  }

  // ジョブ記録 (テーブル未適用なら黙ってスキップ)
  let jobId = null
  if (apply) {
    const { data } = await supabase.from("import_jobs").insert({
      kind: "facilities", status: "importing", file_name: filePath, total_rows: records.length, mode, created_by: "cli",
    }).select("id").single().then((r) => r, () => ({ data: null }))
    jobId = data?.id ?? null
  }

  let success = 0
  let skipped = 0
  let errors = 0
  for (const [index, record] of records.entries()) {
    const rowNumber = index + 2
    const validationErrors = validateRow(record)
    const logRow = async (status, error, placeId) => {
      if (jobId) await supabase.from("import_job_rows").insert({ job_id: jobId, row_number: rowNumber, raw: record, status, error, place_id: placeId ?? null }).then(() => {}, () => {})
    }
    if (validationErrors.length > 0) {
      errors += 1
      console.log(`ERROR row${rowNumber} ${record.name}: ${validationErrors.join(" / ")}`)
      await logRow("error", validationErrors.join(" / "))
      continue
    }

    const duplicate = findDuplicate(record)
    const payload = {
      name: record.name,
      prefecture: record.prefecture,
      city: record.city,
      address: record.address,
      latitude: record.latitude ? Number(record.latitude) : null,
      longitude: record.longitude ? Number(record.longitude) : null,
      indoor_type: record.indoor_type || "both",
      price_type: record.price_type || "paid",
      price_note: record.price_note || null,
      phone_number: record.phone_number || null,
      website_url: record.website_url || null,
      google_map_url: record.google_map_url || null,
      opening_hours: record.opening_hours || null,
      catchphrase: record.catchphrase || null,
      short_description: record.short_description || null,
      description: record.description || null,
    }

    if (duplicate) {
      if (mode === "insert_only") {
        skipped += 1
        console.log(`SKIP  row${rowNumber} ${record.name} (既存: ${duplicate.id})`)
        await logRow("skipped", "duplicate")
        continue
      }
      if (apply) {
        const { error } = await supabase.from("places").update(payload).eq("id", duplicate.id)
        if (error) { errors += 1; console.log(`ERROR row${rowNumber} update: ${error.message}`); await logRow("error", error.message); continue }
      }
      success += 1
      console.log(`UPDATE row${rowNumber} ${record.name} -> ${duplicate.id}`)
      await logRow("success", null, duplicate.id)
    } else {
      if (mode === "update_only") {
        skipped += 1
        await logRow("skipped", "not found")
        continue
      }
      if (apply) {
        const { data, error } = await supabase.from("places").insert({ ...payload, is_published: false, publication_status: "draft" }).select("id").single()
        if (error) { errors += 1; console.log(`ERROR row${rowNumber} insert: ${error.message}`); await logRow("error", error.message); continue }
        await logRow("success", null, data.id)
      } else await logRow("success")
      success += 1
      console.log(`INSERT row${rowNumber} ${record.name} (下書きとして登録)`)
    }
  }

  if (jobId) {
    await supabase.from("import_jobs").update({
      status: errors > 0 ? "completed_with_errors" : "completed",
      success_rows: success, error_rows: errors, finished_at: new Date().toISOString(),
    }).eq("id", jobId).then(() => {}, () => {})
  }
  console.log(`DONE: success ${success}, skipped ${skipped}, errors ${errors}${apply ? "" : " (dry run)"}`)
}

main().catch((error) => { console.error(error); process.exit(1) })
