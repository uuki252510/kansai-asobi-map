import { permanentRedirect } from "next/navigation"

/**
 * 旧一覧URL。/spots とほぼ同一内容の重複ページだったため、
 * クエリを引き継いで /spots へ301する (詳細 /places/[id] はそのまま)。
 * 内部リンクはすべて /spots を向いており、ここに来るのは旧URL経由のみ。
 */
export default async function PlacesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) query.set(key, value)
  }
  const suffix = query.toString()
  permanentRedirect(suffix ? `/spots?${suffix}` : "/spots")
}
