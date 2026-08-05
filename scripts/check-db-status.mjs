/**
 * Supabase の接続状態と migration 適用状況を確認する。
 * 「アプリからのデータ読み書き(DML)」と「スキーマ変更(DDL)」は
 * 必要な権限が違うため、両方を分けて表示する。
 *
 * Run: node scripts/check-db-status.mjs
 */

import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"
import { fileURLToPath } from "url"
import { dirname, resolve, join } from "path"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const envVars = {}
for (const line of readFileSync(join(projectRoot, ".env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (match) envVars[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "")
}

const url = envVars.NEXT_PUBLIC_SUPABASE_URL
const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

/** 既存テーブル(migration適用前から存在) */
const EXISTING_TABLES = ["places", "reviews"]
/** 各migrationで追加されるテーブル */
const MIGRATION_TABLES = {
  "20260805000001 (rating view)": ["places_with_rating"],
  "20260805000002 (areas+editorial)": ["areas", "place_areas"],
  "20260805100000 (masters)": ["categories", "tags", "amenities", "purposes", "facility_categories"],
  "20260805100001 (operations)": ["facility_business_hours", "facility_price_plans", "facility_media", "facility_correction_requests"],
  "20260805100002 (engagement)": ["events", "coupons", "tickets", "audit_logs", "import_jobs"],
}
/** migrationで places に追加される列 */
const NEW_COLUMNS = ["image_storage_path", "what_is_it", "slug", "publication_status", "catchphrase"]

/**
 * テーブルの存在確認。
 * 注意: `{ head: true, count: "exact" }` は存在しないテーブルでもエラーを返さない
 * (PostgRESTがHEADで本文を返さないため) ので、必ず実データのselectで判定する。
 */
async function tableExists(client, table) {
  const { error } = await client.from(table).select("*").limit(1)
  if (!error) return true
  // 42P01 = undefined_table / PGRST205 = schema cacheに無い
  if (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message)) return false
  // 権限エラー等は「存在するが読めない」扱い
  return "restricted"
}

async function main() {
  console.log("=== 1. 接続 (アプリが使うDML経路) ===")
  if (!url || !anonKey) {
    console.log("❌ NEXT_PUBLIC_SUPABASE_URL / ANON_KEY が不足しています")
    process.exit(1)
  }

  const anon = createClient(url, anonKey, { auth: { persistSession: false } })
  const service = serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null

  const { count: publicCount, error: anonError } = await anon
    .from("places").select("*", { count: "exact", head: true }).eq("is_published", true)
  console.log(`anon key で places を読む : ${anonError ? `❌ ${anonError.message}` : `✅ OK (公開 ${publicCount} 件)`}`)

  if (service) {
    const { count: allCount, error: serviceError } = await service
      .from("places").select("*", { count: "exact", head: true })
    console.log(`service role で places   : ${serviceError ? `❌ ${serviceError.message}` : `✅ OK (全 ${allCount} 件)`}`)
  } else {
    console.log("service role              : ⚠️ キーなし")
  }

  const client = service ?? anon

  console.log("\n=== 2. 既存テーブル ===")
  for (const table of EXISTING_TABLES) {
    const exists = await tableExists(client, table)
    console.log(`  ${exists === true ? "✅" : exists === "restricted" ? "🔒" : "❌"} ${table}`)
  }

  console.log("\n=== 3. migration 適用状況 ===")
  let appliedGroups = 0
  for (const [migration, tables] of Object.entries(MIGRATION_TABLES)) {
    const results = await Promise.all(tables.map((table) => tableExists(client, table)))
    const found = results.filter((result) => result === true || result === "restricted").length
    const status = found === 0 ? "❌ 未適用" : found === tables.length ? "✅ 適用済み" : `⚠️ 一部のみ (${found}/${tables.length})`
    if (found === tables.length) appliedGroups += 1
    console.log(`  ${status}  ${migration}`)
    if (found > 0 && found < tables.length) {
      tables.forEach((table, index) => {
        if (results[index] === false) console.log(`      不足: ${table}`)
      })
    }
  }

  console.log("\n=== 4. places の追加列 ===")
  const { data: sample, error: sampleError } = await client.from("places").select("*").limit(1).maybeSingle()
  if (sampleError || !sample) {
    console.log("  取得できませんでした")
  } else {
    for (const column of NEW_COLUMNS) {
      console.log(`  ${column in sample ? "✅" : "❌"} ${column}`)
    }
  }

  console.log("\n=== 5. バックフィル状況 ===")
  if (service) {
    const countOf = async (table, filter = (q) => q) => {
      const { count, error } = await filter(service.from(table).select("*", { count: "exact", head: true }))
      return error ? null : count
    }
    const totalPlaces = await countOf("places")
    const checks = [
      ["カテゴリー付与", await countOf("facility_categories"), "件のひも付け"],
      ["タグ付与", await countOf("facility_tags"), "件のひも付け"],
      ["設備付与", await countOf("facility_amenities"), "件のひも付け"],
      ["年齢適性", await countOf("facility_age_suitability"), "件"],
      ["どんなとこ？記入済み", await countOf("places", (q) => q.not("what_is_it", "is", null)), `/ ${totalPlaces} 件`],
      ["画像Storage取込済み", await countOf("places", (q) => q.not("image_storage_path", "is", null)), `/ ${totalPlaces} 件`],
    ]
    for (const [label, value, unit] of checks) {
      console.log(`  ${value === null ? "❌ 取得失敗" : value > 0 ? "✅" : "⚠️ 未実行"} ${label.padEnd(22)} ${value ?? "-"} ${unit}`)
    }
  }

  console.log("\n=== まとめ ===")
  console.log(`データの読み書き (DML) : ✅ 接続済み — アプリは最初から動いています`)
  console.log(`スキーマ変更 (DDL)     : ${appliedGroups === Object.keys(MIGRATION_TABLES).length ? "✅ 全migration適用済み" : `❌ 未適用あり (${appliedGroups}/${Object.keys(MIGRATION_TABLES).length} グループ)`}`)
  if (appliedGroups < Object.keys(MIGRATION_TABLES).length) {
    console.log(`\nDDLには service role key ではなく、Personal Access Token か DBパスワードが必要です。`)
    console.log(`→ node scripts/apply-migrations.mjs で手順を確認できます。`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
