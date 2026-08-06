import { notFound, permanentRedirect } from "next/navigation"
import { AREA_SLUGS } from "@/lib/places"

/**
 * 互換URL:
 * - 府県スラッグ (/spots/osaka) → エリアハブ (/areas/osaka) へ301
 * - UUID (/spots/{id}) → 詳細 (/places/{id}) へ301
 */
export default async function SpotIdentifierPage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params
  if (AREA_SLUGS[identifier]) permanentRedirect(`/areas/${identifier}`)
  // 任意文字列を /places へ301すると 301→404 の連鎖になる。UUIDだけ転送する
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) permanentRedirect(`/places/${identifier}`)
  notFound()
}
