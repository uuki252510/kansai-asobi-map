/**
 * 既存 places を自動分類し、facility_categories / facility_tags /
 * facility_amenities / facility_age_suitability を一括生成する。
 * 推定ロジックは lib/facility-classify.ts (公開画面・adminと共有)。
 *
 * 既に分類が入っている施設はスキップ (--force で上書き)。
 *
 * Dry run: npx tsx scripts/classify-facilities.mjs --limit=20
 * Apply:   npx tsx scripts/classify-facilities.mjs --apply --all
 */

import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
import {
  inferAgeSuitability,
  inferAmenitySlugs,
  inferCategorySlugs,
  inferTagSlugs,
} from "../lib/facility-classify.ts"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const envVars = {}
for (const line of readFileSync(resolve(scriptDirectory, "../.env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (match) envVars[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "")
}

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const flags = new Set(process.argv.slice(2))
const apply = flags.has("--apply")
const all = flags.has("--all")
const force = flags.has("--force")
const limitArg = process.argv.find((value) => value.startsWith("--limit="))
const limit = all ? Number.POSITIVE_INFINITY : Math.max(1, Number(limitArg?.split("=")[1] ?? 20))

async function fetchAll(table, columns, tweak = (query) => query) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await tweak(supabase.from(table).select(columns)).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return rows
}

async function main() {
  const [places, categories, tags, amenities, existingCategoryLinks] = await Promise.all([
    fetchAll("places", "*"),
    fetchAll("categories", "id,slug"),
    fetchAll("tags", "id,slug,canonical_tag_id"),
    fetchAll("amenities", "id,slug"),
    fetchAll("facility_categories", "place_id"),
  ])

  if (categories.length === 0) {
    console.error("categories マスタが空です。migration 20260805100000 を先に適用してください。")
    process.exit(1)
  }

  const categoryBySlug = new Map(categories.map((row) => [row.slug, row.id]))
  // 同義語タグは正規タグへ寄せる
  const tagById = new Map(tags.map((row) => [row.id, row]))
  const tagBySlug = new Map(
    tags.map((row) => {
      const canonical = row.canonical_tag_id ? tagById.get(row.canonical_tag_id) : null
      return [row.slug, canonical?.id ?? row.id]
    }),
  )
  const amenityBySlug = new Map(amenities.map((row) => [row.slug, row.id]))
  const alreadyClassified = new Set(existingCategoryLinks.map((row) => row.place_id))

  const targets = places.filter((place) => force || !alreadyClassified.has(place.id)).slice(0, limit)
  console.log(`places: ${places.length} / targets: ${targets.length} (apply=${apply}, force=${force})`)

  const stats = { categories: 0, tags: 0, amenities: 0, ages: 0, skipped: 0 }

  for (const place of targets) {
    const categorySlugs = inferCategorySlugs(place)
    const tagSlugs = inferTagSlugs(place)
    const amenitySlugs = inferAmenitySlugs(place)
    const ageBands = inferAgeSuitability(place)

    const categoryRows = categorySlugs
      .map((slug, index) => ({ place_id: place.id, category_id: categoryBySlug.get(slug), is_primary: index === 0 }))
      .filter((row) => row.category_id)
    const tagRows = [...new Set(tagSlugs.map((slug) => tagBySlug.get(slug)).filter(Boolean))]
      .map((tagId) => ({ place_id: place.id, tag_id: tagId }))
    const amenityRows = amenitySlugs
      .map((slug) => ({ place_id: place.id, amenity_id: amenityBySlug.get(slug), available: true }))
      .filter((row) => row.amenity_id)
    const ageRows = ageBands.map((band) => ({ place_id: place.id, ...band }))

    if (categoryRows.length === 0) {
      stats.skipped += 1
      continue
    }

    if (apply) {
      if (force) {
        await supabase.from("facility_categories").delete().eq("place_id", place.id)
        await supabase.from("facility_tags").delete().eq("place_id", place.id)
        await supabase.from("facility_amenities").delete().eq("place_id", place.id)
        await supabase.from("facility_age_suitability").delete().eq("place_id", place.id)
      }
      const results = await Promise.all([
        categoryRows.length ? supabase.from("facility_categories").upsert(categoryRows, { onConflict: "place_id,category_id" }) : { error: null },
        tagRows.length ? supabase.from("facility_tags").upsert(tagRows, { onConflict: "place_id,tag_id" }) : { error: null },
        amenityRows.length ? supabase.from("facility_amenities").upsert(amenityRows, { onConflict: "place_id,amenity_id" }) : { error: null },
        ageRows.length ? supabase.from("facility_age_suitability").upsert(ageRows, { onConflict: "place_id,age_band" }) : { error: null },
      ])
      const failure = results.find((result) => result.error)
      if (failure) {
        console.log(`FAIL ${place.name}: ${failure.error.message}`)
        continue
      }
    }

    stats.categories += categoryRows.length
    stats.tags += tagRows.length
    stats.amenities += amenityRows.length
    stats.ages += ageRows.length
    console.log(`OK   ${place.name}\n     cat=[${categorySlugs.join(",")}] tag=${tagSlugs.length} amenity=${amenitySlugs.length} age=${ageBands.length}`)
  }

  console.log(
    `\nDONE: categories ${stats.categories}, tags ${stats.tags}, amenities ${stats.amenities}, ages ${stats.ages}, skipped ${stats.skipped}${apply ? "" : " (dry run)"}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
