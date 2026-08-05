/**
 * 未適用のmigrationを Supabase へ適用する。
 *
 * 認証は2通りを自動判定する:
 *  A) SUPABASE_ACCESS_TOKEN (Personal Access Token)
 *     → Management API /v1/projects/{ref}/database/query で実行。DBパスワード不要
 *  B) SUPABASE_DB_URL / DATABASE_URL (postgres接続文字列)
 *     → supabase CLI の db push を使う想定 (このスクリプトでは案内のみ)
 *
 * 秘密情報は一切標準出力に出さない (存在有無だけ表示する)。
 *
 * 確認のみ: node scripts/apply-migrations.mjs
 * 実行:     node scripts/apply-migrations.mjs --apply
 */

import { readFileSync, readdirSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, resolve, join } from "path"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, "..")

const envVars = {}
try {
  for (const line of readFileSync(join(projectRoot, ".env.local"), "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (match) envVars[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "")
  }
} catch {
  console.error("FATAL: .env.local が読み込めませんでした")
  process.exit(1)
}

const apply = process.argv.includes("--apply")
const onlyArg = process.argv.find((value) => value.startsWith("--only="))

// プロジェクトref は公開URLから導出できる (秘密ではない)
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL ?? ""
const projectRef = supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? null
const accessToken = envVars.SUPABASE_ACCESS_TOKEN ?? process.env.SUPABASE_ACCESS_TOKEN ?? null
const dbUrl = envVars.SUPABASE_DB_URL ?? envVars.DATABASE_URL ?? null

console.log("=== 環境チェック (値は表示しません) ===")
console.log(`NEXT_PUBLIC_SUPABASE_URL   : ${supabaseUrl ? "あり" : "なし"}`)
console.log(`  → project ref            : ${projectRef ?? "導出できず"}`)
console.log(`SUPABASE_SERVICE_ROLE_KEY  : ${envVars.SUPABASE_SERVICE_ROLE_KEY ? "あり" : "なし"} (DDLには使えません)`)
console.log(`SUPABASE_ACCESS_TOKEN      : ${accessToken ? "あり" : "なし"} ← Management API に必要`)
console.log(`SUPABASE_DB_URL/DATABASE_URL: ${dbUrl ? "あり" : "なし"} ← CLI db push に必要`)

const migrationsDirectory = join(projectRoot, "supabase", "migrations")
const files = readdirSync(migrationsDirectory)
  .filter((name) => name.endsWith(".sql"))
  .filter((name) => (onlyArg ? name.includes(onlyArg.split("=")[1]) : name.startsWith("20260805")))
  .sort()

console.log(`\n=== 対象migration (${files.length}件) ===`)
for (const file of files) console.log(`  ${file}`)

if (!accessToken) {
  console.log(`
=== 適用できません ===
Management API で実行するには Personal Access Token が必要です。

  1. https://supabase.com/dashboard/account/tokens で token を作成
  2. .env.local に追記:  SUPABASE_ACCESS_TOKEN=sbp_xxxxx
  3. 再実行:            node scripts/apply-migrations.mjs --apply

【代替】Dashboard の SQL Editor に docs/apply-migrations.sql を貼って実行しても同じ結果になります。
【代替】DBパスワードがあるなら:
  npx supabase link --project-ref ${projectRef ?? "<ref>"}
  npx supabase db push
`)
  process.exit(accessToken ? 0 : 2)
}

if (!projectRef) {
  console.error("FATAL: NEXT_PUBLIC_SUPABASE_URL から project ref を導出できませんでした")
  process.exit(1)
}

async function runSql(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
    signal: AbortSignal.timeout(120_000),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`)
  return text
}

async function main() {
  if (!apply) {
    console.log("\n(確認モード) 実際に適用するには --apply を付けてください。")
    // 接続確認だけ行う
    try {
      await runSql("select 1 as ok;")
      console.log("接続確認: OK — Management API で SQL を実行できます。")
    } catch (error) {
      console.error(`接続確認: 失敗 — ${error.message}`)
      process.exit(1)
    }
    return
  }

  let applied = 0
  for (const file of files) {
    const sql = readFileSync(join(migrationsDirectory, file), "utf8")
    process.stdout.write(`applying ${file} ... `)
    try {
      await runSql(sql)
      console.log("OK")
      applied += 1
    } catch (error) {
      console.log("FAILED")
      console.error(`  ${error.message}`)
      console.error("\n中断しました。全migrationは冪等なので、原因を直して再実行できます。")
      process.exit(1)
    }
  }

  // 反映確認
  const verify = await runSql(`
    select table_name from information_schema.tables
    where table_schema = 'public'
      and table_name in ('categories','tags','amenities','facility_business_hours','facility_price_plans','events','coupons','tickets','areas')
    order by table_name;
  `)
  console.log(`\nDONE: ${applied} migrations applied`)
  console.log(`検証 (主要テーブルの存在): ${verify}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
