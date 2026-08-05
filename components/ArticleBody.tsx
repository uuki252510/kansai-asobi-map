import ArticleSpotCard from "@/components/ArticleSpotCard"
import { parseArticleBody } from "@/lib/article-body"
import { countHeadings, renderSafeMarkdown } from "@/lib/safe-markdown"
import type { PlaceWithAvgRating } from "@/lib/places"

/**
 * 記事本文。Markdown と、本文中に埋め込まれたスポットカードを交互に描画する。
 * 見出しの通し番号はセグメントをまたいで連続させ、目次のアンカーと一致させる。
 */
export default function ArticleBody({
  body,
  places,
}: {
  body: string
  places: Map<string, PlaceWithAvgRating>
}) {
  const segments = parseArticleBody(body)
  let headingOffset = 0

  return (
    <div className="article-body">
      {segments.map((segment, index) => {
        if (segment.type === "spot") {
          const place = places.get(segment.placeId)
          // 参照先が非公開/削除済みなら、その行は無かったことにする
          if (!place) return null
          return <ArticleSpotCard key={`spot-${segment.placeId}-${index}`} place={place} />
        }
        const html = renderSafeMarkdown(segment.content, headingOffset)
        headingOffset += countHeadings(segment.content)
        return <div key={`md-${index}`} dangerouslySetInnerHTML={{ __html: html }} />
      })}
    </div>
  )
}
