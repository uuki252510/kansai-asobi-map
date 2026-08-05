import {
  getCategories,
  getCategoryBySlug,
  getPlaceIdsForCategory,
  getPlaceIdsForTag,
  getTagBySlug,
  getTags,
} from "@/lib/facilities"
import type { PlaceWithAvgRating } from "@/lib/places"
import type { Category, Tag } from "@/lib/facility-types"

/**
 * 一覧ページの「スコープ」= カテゴリー / タグ による絞り込み。
 * クライアント側フィルタ (SpotFilterState) より一段上の概念で、
 * URLに載せてSEOリンクとして共有できる。
 * サーバー側で place_id 集合に解決し、初期データを絞ってから渡す。
 */
export interface FacilityScope {
  category: Category | null
  tag: Tag | null
  categories: Category[]
  tags: Tag[]
}

export const EMPTY_SCOPE: FacilityScope = { category: null, tag: null, categories: [], tags: [] }

export async function resolveScope(categorySlug?: string, tagSlug?: string): Promise<FacilityScope> {
  const [category, tag, categories, tags] = await Promise.all([
    categorySlug ? getCategoryBySlug(categorySlug) : Promise.resolve(null),
    tagSlug ? getTagBySlug(tagSlug) : Promise.resolve(null),
    getCategories(),
    getTags(),
  ])
  return { category, tag, categories, tags }
}

/** スコープに合致する施設だけに絞る。スコープ未指定なら素通し */
export async function applyScope(
  places: PlaceWithAvgRating[],
  scope: FacilityScope,
): Promise<PlaceWithAvgRating[]> {
  let result = places
  if (scope.category) {
    const ids = new Set(await getPlaceIdsForCategory(scope.category.id))
    result = result.filter((place) => ids.has(place.id))
  }
  if (scope.tag) {
    const ids = new Set(await getPlaceIdsForTag(scope.tag.id))
    result = result.filter((place) => ids.has(place.id))
  }
  return result
}
