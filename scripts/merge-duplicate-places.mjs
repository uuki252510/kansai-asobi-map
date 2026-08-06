/**
 * 重複施設を統合する。
 *
 * scripts/audit-duplicate-places.mjs --json の結果を入力に、各グループで
 *   1. 残す側の空欄を、消す側の値で埋める（情報を捨てない）
 *   2. 参照行を残す側へ付け替える（主キー衝突する行はスキップ）
 *   3. 自動生成の参照（カテゴリ/タグ/設備など）は消す側から削除する
 *   4. 消す側を非公開にする
 * を行う。既定は非公開化のみで、物理削除はしない（--hard-delete で明示）。
 *
 * Dry run: node scripts/merge-duplicate-places.mjs
 * Apply:   node scripts/merge-duplicate-places.mjs --apply
 */

import { readFileSync } from "fs"
import { execFileSync } from "child_process"
import { createClient } from "@supabase/supabase-js"
import { HARD_REFERENCES, SOFT_REFERENCES } from "./audit-duplicate-places.mjs"

const env = {}
for (const line of readFileSync("./.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "")
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const apply = process.argv.includes("--apply")
const hardDelete = process.argv.includes("--hard-delete")

/** 残す側が空なら消す側から引き継ぐ列。slug と facility_code は一意制約があるので除く。 */
const FILLABLE = [
  "description", "address", "latitude", "longitude", "city", "indoor_type",
  "target_ages", "price_type", "price_note", "opening_hours", "image_url",
  "google_map_url", "website_url", "image_storage_path", "image_source",
  "what_is_it", "why_go", "catchphrase", "short_description", "recommended_points",
  "precautions", "seasonal_information", "search_keywords", "official_instagram_url",
  "official_x_url", "reservation_url", "phone_number", "phone_note",
  "seo_title", "seo_description", "minimum_visit_minutes", "maximum_visit_minutes",
  "average_stay_minutes", "reservation_type", "mood_tags", "companion_types",
  "recommended_weather", "recommended_seasons", "recommended_time_of_day",
  "activity_level", "healing_score", "child_fun_score", "date_score", "photo_score",
  "rainy_day_score", "crowd_level", "price_min", "price_max",
  "recommended_age_min", "recommended_age_max", "last_verified_at",
]

/** 真偽の設備フラグは「どちらかが true なら true」に寄せる。 */
const OR_FLAGS = [
  "has_parking", "has_nursing_room", "has_diaper_space", "rainy_day_ok",
  "reservation_required", "same_day_booking", "stroller_accessible",
  "barrier_free", "pet_friendly", "meal_available",
]

const isEmpty = (value) =>
  value === null || value === undefined || value === "" ||
  (Array.isArray(value) && value.length === 0)

/**
 * 名前が完全一致する重複は監査スクリプトが自動で見つける。
 * 表記が違うものは自動判定できないので、目視で確認した組だけをここに置く。
 * rename は、残す側の名前が不自然なときに消す側の表記へ寄せるためのもの。
 */
const MANUAL_GROUPS = [
  { name: "江崎グリコ工場見学", keep: "f4a3fb05-ca8c-4b70-8228-a004355443df", drop: ["70df0d88-0e27-427d-b67a-47842929ea09"] },
  { name: "清水焼の郷 陶芸体験", keep: "0a0f1abf-475d-49a4-ac85-8b73db826b12", drop: ["48d33d7b-e2f4-41e8-90da-9a937afe503c"] },
  { name: "ボウケンノモリ OJI", keep: "2e55a88d-df94-4a3b-87db-72ea71b5f490", drop: ["71df7008-c9ed-424e-ad6e-d99e4240bb82"], rename: "ボウケンノモリ OJI 王寺店" },
  { name: "滋賀県立希望が丘文化公園", keep: "20f4d9ad-f6ef-4b63-824e-8c7b2aee3705", drop: ["30adb5ae-4bc3-4039-8093-1a0d7bda8815"] },
  { name: "VS PARK EXPOCITY店", keep: "9ec69d43-907f-442a-bd97-f2d8264d3683", drop: ["a161c31a-fa3a-403f-b8a6-9bf95cb9268e"] },
  { name: "コナモンミュージアム 道頓堀", keep: "b5fa1f4e-26b0-46d3-9d2b-f7d9486181bc", drop: ["2aa81969-da61-4ebd-8687-91e934425fa0"] },
  { name: "ボウケンノモリ BAMPAKU", keep: "cf6ab71f-dcfe-425e-bd43-82f88e08d7bb", drop: ["e31a2c2d-9d21-44ff-a378-de3327997e48"] },
  { name: "大泉緑地", keep: "857f5201-3b12-4ab8-834f-88a3f7d9607a", drop: ["c998d1d7-a5dc-4403-8867-6df61a670455"] },
  // 記事が参照しているのは「ゾーンB」側なので残し、表記だけ整える
  { name: "服部緑地 子供の楽園", keep: "5bda9cf2-98bd-469c-a3b9-6d48981d0913", drop: ["59efe56d-f654-4383-a59a-79d1fcd052a8"], rename: "服部緑地 子供の楽園" },
  { name: "梅小路公園", keep: "9f36043e-4e95-476f-883c-52ea4e2c60da", drop: ["bd2a3048-7904-4ef8-8189-a8f47c39c871"] },
]

const autoGroups = JSON.parse(
  execFileSync("node", ["scripts/audit-duplicate-places.mjs", "--json"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }),
)
const groups = [...autoGroups, ...MANUAL_GROUPS]

const dropIds = groups.flatMap((g) => g.drop)
const keepIds = groups.map((g) => g.keep)

// 安全確認: 記事が参照しているIDが消す側に入っていないこと
const { data: articleRefs, error: articleError } = await supabase.from("article_places").select("place_id")
if (articleError) {
  console.error(`中止: 記事の参照を確認できませんでした: ${articleError.message}`)
  process.exit(1)
}
const dropSet = new Set(dropIds)
const conflicting = (articleRefs ?? []).filter((r) => dropSet.has(r.place_id))
if (conflicting.length > 0) {
  console.error(`中止: 記事が参照している施設が統合対象に含まれています (${conflicting.length}件)`)
  conflicting.forEach((r) => console.error(`  ${r.place_id}`))
  process.exit(1)
}
if (keepIds.some((id) => dropIds.includes(id))) {
  console.error("中止: 残す側と消す側に同じIDが含まれています")
  process.exit(1)
}

// UUIDを数百件 .in() に詰めるとURL長の上限に当たるので、必ず分割して引く
async function selectByIds(table, column, ids, columns = "*") {
  const rows = []
  for (let i = 0; i < ids.length; i += 50) {
    const { data, error } = await supabase.from(table).select(columns).in(column, ids.slice(i, i + 50))
    if (error) throw new Error(`${table}.${column}: ${error.message}`)
    rows.push(...(data ?? []))
  }
  return rows
}

const allPlaces = await selectByIds("places", "id", [...keepIds, ...dropIds])
const byId = new Map(allPlaces.map((p) => [p.id, p]))
if (byId.size !== keepIds.length + dropIds.length) {
  console.error(`中止: 施設を引けませんでした (期待 ${keepIds.length + dropIds.length} / 取得 ${byId.size})`)
  process.exit(1)
}

let filledFields = 0
let movedRows = 0
let skippedRows = 0
let removedSoft = 0
const plannedFills = []

for (const group of groups) {
  const keep = byId.get(group.keep)
  if (!keep) continue
  const patch = {}

  for (const dropId of group.drop) {
    const drop = byId.get(dropId)
    if (!drop) continue
    for (const column of FILLABLE) {
      if (isEmpty(keep[column]) && isEmpty(patch[column]) && !isEmpty(drop[column])) {
        patch[column] = drop[column]
      }
    }
    for (const flag of OR_FLAGS) {
      if (drop[flag] === true && keep[flag] !== true) patch[flag] = true
    }
  }

  if (group.rename && keep.name !== group.rename) patch.name = group.rename

  if (Object.keys(patch).length > 0) {
    filledFields += Object.keys(patch).length
    plannedFills.push({ name: keep.name, columns: Object.keys(patch) })
    if (apply) {
      const { error } = await supabase.from("places").update(patch).eq("id", keep.id)
      if (error) console.error(`FAIL fill ${keep.name}: ${error.message}`)
    }
  }

  for (const table of HARD_REFERENCES) {
    const { data: rows, error } = await supabase.from(table).select("*").in("place_id", group.drop)
    if (error) continue
    if (!rows || rows.length === 0) continue
    // 残す側に同じ内容の行が既にあるなら移さず捨てる (複合主キーの衝突回避)
    const { data: existing } = await supabase.from(table).select("*").eq("place_id", keep.id)
    const signature = (row) => JSON.stringify(
      Object.entries(row)
        .filter(([k]) => !["id", "place_id", "created_at", "updated_at"].includes(k))
        .sort(([a], [b]) => a.localeCompare(b)),
    )
    const known = new Set((existing ?? []).map(signature))
    for (const row of rows) {
      // id を持たない中間テーブル (複合主キー・place_id主キー) は
      // place_id 単位でしか指定できない
      const scoped = (query) => row.id ? query.eq("id", row.id) : query.eq("place_id", row.place_id)

      if (known.has(signature(row))) {
        skippedRows += 1
        if (apply) {
          const { error: deleteError } = await scoped(supabase.from(table).delete())
          if (deleteError) console.error(`FAIL drop ${table} ${row.id ?? row.place_id}: ${deleteError.message}`)
        }
        continue
      }
      known.add(signature(row))
      if (!apply) { movedRows += 1; continue }

      const { error: moveError } = await scoped(supabase.from(table).update({ place_id: keep.id }))
      if (!moveError) { movedRows += 1; continue }

      // 残す側に同じ主キーが既にある場合。中身は違っても重複なので捨てる
      if (moveError.code === "23505") {
        skippedRows += 1
        const { error: deleteError } = await scoped(supabase.from(table).delete())
        if (deleteError) console.error(`FAIL clean ${table} ${row.id ?? row.place_id}: ${deleteError.message}`)
      } else {
        console.error(`FAIL move ${table} ${row.id ?? row.place_id}: ${moveError.message}`)
      }
    }
  }
}

// 自動生成の参照は作り直せるので、消す側から落とす
for (const table of SOFT_REFERENCES) {
  for (let i = 0; i < dropIds.length; i += 50) {
    const chunk = dropIds.slice(i, i + 50)
    const { data, error } = await supabase.from(table).select("place_id").in("place_id", chunk)
    if (error) { console.error(`FAIL count ${table}: ${error.message}`); break }
    removedSoft += data?.length ?? 0
    if (apply && data && data.length > 0) {
      const { error: deleteError } = await supabase.from(table).delete().in("place_id", chunk)
      if (deleteError) console.error(`FAIL clean ${table}: ${deleteError.message}`)
    }
  }
}

console.log(`グループ ${groups.length} 件 / 統合対象 ${dropIds.length} 件`)
console.log(`残す側に引き継ぐ項目: ${filledFields}`)
plannedFills.slice(0, 8).forEach((f) => console.log(`   ${f.name}: ${f.columns.join(", ")}`))
if (plannedFills.length > 8) console.log(`   ...ほか ${plannedFills.length - 8} 件`)
console.log(`付け替える参照行: ${movedRows} / 重複のため捨てる行: ${skippedRows}`)
console.log(`消す側から削除する自動生成の参照: ${removedSoft}`)

if (apply) {
  for (let i = 0; i < dropIds.length; i += 50) {
    const { error } = await supabase
      .from("places")
      .update({ is_published: false, publication_status: "archived" })
      .in("id", dropIds.slice(i, i + 50))
    if (error) {
      console.error(`FAIL 非公開化: ${error.message}`)
      process.exit(1)
    }
  }
  console.log(`\n${dropIds.length} 件を非公開(archived)にしました`)

  if (hardDelete) {
    for (let i = 0; i < dropIds.length; i += 50) {
      const { error } = await supabase.from("places").delete().in("id", dropIds.slice(i, i + 50))
      if (error) {
        console.error(`物理削除は失敗しました (非公開化は完了しています): ${error.message}`)
        process.exit(1)
      }
    }
    console.log(`${dropIds.length} 件を物理削除しました`)
  } else {
    console.log("物理削除はしていません。確認後 --hard-delete で削除できます")
  }
} else {
  console.log("\n(確認モード) --apply で実行します")
}
