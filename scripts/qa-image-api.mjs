import { readFileSync } from "fs"
import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.cjs"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const directory = dirname(fileURLToPath(import.meta.url))
const environment = {}
for (const line of readFileSync(resolve(directory, "../.env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (match) environment[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "")
}

const supabase = createClient(
  environment.NEXT_PUBLIC_SUPABASE_URL,
  environment.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const { data, error } = await supabase
  .from("places")
  .select("id,name,city,image_url")
  .eq("is_published", true)
  .order("name", { ascending: true })
if (error) throw new Error(error.message)

const verified = data.filter((place) => /^https:\/\/places\.googleapis\.com\/v1\/places\/[A-Za-z0-9_-]+$/.test(place.image_url ?? ""))
const targetedNames = [
  "新庄総合公園（和歌山市）",
  "田辺市総合運動公園",
  "VS PARK EXPOCITY店",
  "VS PARK 梅田店",
  "こどもっちパーク こうべパーク",
  "こどもの館（神戸市立）",
]
const targets = [...verified.slice(0, 6)]
for (const name of targetedNames) {
  const match = data.find((place) => place.name === name)
  if (match && !targets.some((place) => place.id === match.id)) targets.push(match)
}

for (const place of targets) {
  const response = await fetch(`http://localhost:3000/api/place-image/${place.id}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  })
  const contentType = response.headers.get("content-type") ?? ""
  const source = response.headers.get("x-place-image-source") ?? "unknown"
  const bytes = response.status === 200 ? (await response.arrayBuffer()).byteLength : 0
  const healthyImage = response.status === 200 && contentType.startsWith("image/") && bytes > 1_000
  const healthyFallback = response.status === 307 && source === "fallback"
  console.log(JSON.stringify({
    name: place.name,
    city: place.city,
    stored: verified.some((item) => item.id === place.id) ? "verified-google" : "unverified",
    status: response.status,
    source,
    contentType,
    bytes,
    passed: healthyImage || healthyFallback,
  }))
}
