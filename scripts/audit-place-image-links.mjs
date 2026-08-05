import { readFileSync } from "fs"
import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.cjs"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const environment = {}
for (const line of readFileSync(resolve(scriptDirectory, "../.env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (match) environment[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "")
}

const supabase = createClient(
  environment.NEXT_PUBLIC_SUPABASE_URL,
  environment.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

function sourceKind(value) {
  if (!value) return "missing"
  if (/^https:\/\/places\.googleapis\.com\/v1\/places\/[A-Za-z0-9_-]+$/.test(value)) return "verified-google"
  try {
    const url = new URL(value)
    if (url.hostname === "upload.wikimedia.org" || url.hostname.endsWith(".supabase.co")) return "trusted-static"
  } catch {
    return "invalid"
  }
  return "legacy-untrusted"
}

const { data, error } = await supabase
  .from("places")
  .select("id,name,city,prefecture,image_url")
  .eq("is_published", true)
  .order("name", { ascending: true })

if (error) throw new Error(error.message)

const counts = new Map()
for (const place of data ?? []) {
  const kind = sourceKind(place.image_url)
  counts.set(kind, (counts.get(kind) ?? 0) + 1)
}

console.log(`Published: ${data.length}`)
for (const kind of ["verified-google", "trusted-static", "legacy-untrusted", "missing", "invalid"]) {
  console.log(`${kind}: ${counts.get(kind) ?? 0}`)
}

const byResource = new Map()
for (const place of data.filter((item) => sourceKind(item.image_url) === "verified-google")) {
  const group = byResource.get(place.image_url) ?? []
  group.push(place)
  byResource.set(place.image_url, group)
}
const duplicates = [...byResource.values()].filter((group) => group.length > 1)
console.log(`Duplicate verified Place ID groups: ${duplicates.length}`)
for (const group of duplicates.slice(0, 20)) {
  console.log(`  ${group.map((place) => `${place.name} (${place.city})`).join(" | ")}`)
}

const checks = ["こども科学館", "子ども未来館", "新庄総合公園", "田辺市総合運動公園", "VS PARK", "こどもっちパーク", "こどもの館"]
console.log("Targeted checks:")
for (const query of checks) {
  const matches = data.filter((place) => place.name.includes(query))
  for (const place of matches) {
    const duplicateCount = place.image_url ? (byResource.get(place.image_url)?.length ?? 0) : 0
    console.log(`  ${place.name} (${place.city}): ${sourceKind(place.image_url)}, same ID count ${duplicateCount}`)
  }
}
