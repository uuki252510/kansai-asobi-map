export const revalidate = 600

import HomeExperience, { type HomeRow } from "@/components/HomeExperience"
import { getPublishedArticles } from "@/lib/articles"
import { getWeekendEvents } from "@/lib/events"
import { getAllPlaces, getRecommendedPlaces, type PlaceWithAvgRating } from "@/lib/places"
import { getRanking } from "@/lib/rankings"
import { SEASON_LABELS, currentSeason, seasonalRows } from "@/lib/seasonal"
import { getWeatherSnapshot } from "@/lib/weather"

function uniquePlaces(places: PlaceWithAvgRating[]) {
  const seen = new Set<string>()
  return places.filter((place) => {
    if (seen.has(place.id)) return false
    seen.add(place.id)
    return true
  })
}

export default async function Home() {
  const [featured, all, weather, articles, weekendEvents] = await Promise.all([
    getRecommendedPlaces().catch(() => []),
    getAllPlaces().catch(() => []),
    getWeatherSnapshot().catch(() => null),
    getPublishedArticles(6).catch(() => []),
    getWeekendEvents(12).catch(() => []),
  ])
  const spots = uniquePlaces([...featured, ...all.filter((place) => place.image_url)]).slice(0, 36)
  const totalSpotCount = all.length
  const countsByPrefecture = Object.fromEntries(
    all.reduce((counts, place) => {
      counts.set(place.prefecture, (counts.get(place.prefecture) ?? 0) + 1)
      return counts
    }, new Map<string, number>()),
  )

  // ---- ホームの横スクロール行を組み立てる ----
  const withPhoto = all.filter((place) => place.image_url)
  const ranking = await getRanking(withPhoto, { window: "month", limit: 12 })
  const rankedIds = new Set(ranking.map((entry) => entry.place.id))
  const season = currentSeason()

  const rows: HomeRow[] = [
    {
      key: "ranking",
      title: "いま人気のスポット ランキング",
      href: "/ranking",
      places: ranking.map((entry) => entry.place),
      ranked: true,
    },
    // 季節のテーマ (該当が6件以上ある行だけ出る)
    ...seasonalRows(withPhoto.filter((place) => !rankedIds.has(place.id))).map((row) => ({
      key: `season-${row.theme.key}`,
      title: `${SEASON_LABELS[season]}｜${row.theme.title}`,
      href: row.theme.href,
      places: row.places,
    })),
    {
      key: "rainy",
      title: "雨でも楽しめるスポット",
      href: "/spots?rainy_day_ok=true",
      places: withPhoto.filter((place) => place.rainy_day_ok).slice(0, 12),
    },
    {
      key: "free",
      title: "無料で遊べるスポット",
      href: "/spots?price_type=free",
      places: withPhoto.filter((place) => place.price_type === "free").slice(0, 12),
    },
  ].filter((row) => row.places.length >= 4)

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "デカケル",
    alternateName: ["きょうどこいこ？", "関西遊びマップ"],
    url: "https://kansai.asobi.nexia-llc.jp",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    description:
      "関西6府県のおでかけスポットを、天気・エリア・誰と行くかで探せるポータルサイト。今日行ける場所の提案にも対応。",
    areaServed: ["大阪府", "兵庫県", "京都府", "奈良県", "滋賀県", "和歌山県"],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomeExperience
        spots={spots}
        totalSpotCount={totalSpotCount}
        countsByPrefecture={countsByPrefecture}
        rainyCount={all.filter((place) => place.rainy_day_ok).length}
        freeCount={all.filter((place) => place.price_type === "free").length}
        weatherCondition={weather?.available ? weather.condition : "sunny"}
        weatherLabel={weather?.available ? `${weather.conditionLabel}${weather.temperature !== null ? ` ${Math.round(weather.temperature)}℃` : ""}` : null}
        rows={rows}
        articles={articles}
        weekendEvents={weekendEvents}
      />
    </>
  )
}
