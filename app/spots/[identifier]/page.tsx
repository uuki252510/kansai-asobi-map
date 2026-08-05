import { permanentRedirect } from "next/navigation"
import { AREA_SLUGS } from "@/lib/places"

/**
 * 互換URL:
 * - 府県スラッグ (/spots/osaka) → エリアハブ (/areas/osaka) へ301
 * - UUID (/spots/{id}) → 詳細 (/places/{id}) へ301
 */
export default async function SpotIdentifierPage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params
  if (AREA_SLUGS[identifier]) permanentRedirect(`/areas/${identifier}`)
  permanentRedirect(`/places/${identifier}`)
}
