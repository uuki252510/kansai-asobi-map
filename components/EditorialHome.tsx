"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Bike,
  Camera,
  CloudRain,
  Coffee,
  MapPin,
  Search,
  UsersRound,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import CountUp from "@/components/CountUp"
import PlaceImage from "@/components/PlaceImage"
import { trackEvent } from "@/lib/analytics"
import {
  ARTICLE_TYPE_LABELS,
  articleCoverUrl,
  type Article,
} from "@/lib/articles"
import {
  eventCoverUrl,
  eventHref,
  eventPeriodLabel,
  type PublicEvent,
} from "@/lib/events"
import { JST_WEEKDAYS, jstParts } from "@/lib/jst"
import type { PlaceWithAvgRating } from "@/lib/places"
import type { HomeRow } from "@/components/HomeExperience"
import styles from "./EditorialHome.module.css"

const areas = [
  { slug: "osaka", prefecture: "大阪府", label: "大阪", number: "01", x: 56, y: 42 },
  { slug: "hyogo", prefecture: "兵庫県", label: "兵庫", number: "02", x: 30, y: 28 },
  { slug: "kyoto", prefecture: "京都府", label: "京都", number: "03", x: 60, y: 21 },
  { slug: "nara", prefecture: "奈良県", label: "奈良", number: "04", x: 66, y: 52 },
  { slug: "shiga", prefecture: "滋賀県", label: "滋賀", number: "05", x: 81, y: 18 },
  { slug: "wakayama", prefecture: "和歌山県", label: "和歌山", number: "06", x: 47, y: 74 },
] as const

type MoodKey = "relax" | "active" | "kids" | "rain" | "food" | "photo"

const moods: Array<{
  key: MoodKey
  label: string
  note: string
  Icon: LucideIcon
  matches: (place: PlaceWithAvgRating) => boolean
}> = [
  {
    key: "relax",
    label: "のんびり",
    note: "深呼吸できる場所",
    Icon: Coffee,
    matches: (place) =>
      place.mood_tags.includes("relax") ||
      place.mood_tags.includes("healing") ||
      (place.healing_score ?? 0) >= 70,
  },
  {
    key: "active",
    label: "からだを動かす",
    note: "外へ飛び出したい",
    Icon: Bike,
    matches: (place) =>
      place.mood_tags.includes("active") || (place.activity_level ?? 0) >= 70,
  },
  {
    key: "kids",
    label: "子どもと",
    note: "家族みんなで",
    Icon: UsersRound,
    matches: (place) =>
      place.mood_tags.includes("kids") ||
      place.companion_types.includes("family") ||
      (place.child_fun_score ?? 0) >= 70,
  },
  {
    key: "rain",
    label: "雨でも",
    note: "予定は変えない",
    Icon: CloudRain,
    matches: (place) => place.rainy_day_ok,
  },
  {
    key: "food",
    label: "おいしいもの",
    note: "食べることが目的",
    Icon: UtensilsCrossed,
    matches: (place) => place.mood_tags.includes("food") || place.meal_available === true,
  },
  {
    key: "photo",
    label: "写真を撮る",
    note: "景色を持ち帰る",
    Icon: Camera,
    matches: (place) =>
      place.mood_tags.includes("photo") || (place.photo_score ?? 0) >= 70,
  },
]

function CoverImage({
  src,
  alt,
  className,
  eager = false,
}: {
  src: string | null
  alt: string
  className: string
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [src])

  if (!src || failed) {
    return (
      <span className={[className, styles.imageFallback].join(" ")} role="img" aria-label={alt}>
        <span>KANSAI</span>
        <strong>週末を、あそぼう。</strong>
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      width={960}
      height={640}
      className={className}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}

function SectionHeading({
  number,
  eyebrow,
  title,
  description,
  href,
  linkLabel = "すべて見る",
  inverse = false,
}: {
  number: string
  eyebrow: string
  title: string
  description?: string
  href?: string
  linkLabel?: string
  inverse?: boolean
}) {
  return (
    <div className={[styles.sectionHeading, inverse ? styles.sectionHeadingInverse : ""].join(" ")}>
      <div className={styles.sectionIndex}>{number}</div>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2>{title}</h2>
        {description ? <p className={styles.sectionDescription}>{description}</p> : null}
      </div>
      {href ? (
        <Link href={href} className={styles.textLink}>
          {linkLabel}
          <ArrowRight aria-hidden />
        </Link>
      ) : null}
    </div>
  )
}

function PlaceCard({
  place,
  rank,
  compact = false,
}: {
  place: PlaceWithAvgRating
  rank?: number
  compact?: boolean
}) {
  const description = place.short_description ?? place.catchphrase ?? place.description

  return (
    <Link
      href={"/places/" + place.id}
      className={[styles.placeCard, compact ? styles.placeCardCompact : ""].join(" ")}
    >
      <div className={styles.placeMedia}>
        <PlaceImage place={place} alt={place.name} className={styles.cover} />
        {rank ? <span className={styles.rank}>0{rank}</span> : null}
        <span className={styles.placeArea}>{place.prefecture.replace("府", "").replace("県", "")}</span>
      </div>
      <div className={styles.placeBody}>
        <p className={styles.microLabel}>{place.city} / {place.indoor_type === "indoor" ? "INDOOR" : "OUTDOOR"}</p>
        <h3>{place.name}</h3>
        {!compact && description ? <p className={styles.cardDescription}>{description}</p> : null}
        <div className={styles.cardMeta}>
          <span>{place.price_type === "free" ? "無料" : place.price_type === "mixed" ? "一部有料" : "有料"}</span>
          {place.average_stay_minutes ? <span>約{place.average_stay_minutes}分</span> : null}
          {place.rainy_day_ok ? <span>雨の日OK</span> : null}
        </div>
      </div>
    </Link>
  )
}

function formatArticleDate(value: string | null) {
  if (!value) return "FEATURE"
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value))
}

export default function EditorialHome({
  spots,
  totalSpotCount,
  countsByPrefecture,
  rainyCount,
  freeCount,
  weatherCondition = "sunny",
  weatherLabel = null,
  rows = [],
  articles = [],
  weekendEvents = [],
}: {
  spots: PlaceWithAvgRating[]
  totalSpotCount: number
  countsByPrefecture: Record<string, number>
  rainyCount: number
  freeCount: number
  weatherCondition?: "sunny" | "cloudy" | "rainy" | "any"
  weatherLabel?: string | null
  rows?: HomeRow[]
  articles?: Article[]
  weekendEvents?: PublicEvent[]
}) {
  const router = useRouter()
  const [locating, setLocating] = useState(false)
  const [selectedMood, setSelectedMood] = useState<MoodKey>("relax")
  const [hoveredArea, setHoveredArea] = useState<string | null>(null)

  /* 写真が無い施設は地図の代替画像になる。ランキングや特集の「顔」の位置に
     代替画像が並ぶと未完成に見えるため、同スコア帯では写真持ちを先に出す */
  const preferPhotos = (list: PlaceWithAvgRating[]) => {
    // image_url は期限切れのGoogle写真URLが混ざっており、実際は代替画像に
    // 落ちることがある。確実に表示できるのは Storage 取り込み済みだけなので
    // Storage > URLのみ > なし の順で安定ソートする
    const photoRank = (place: PlaceWithAvgRating) =>
      place.image_storage_path ? 2 : place.image_url ? 1 : 0
    return [...list].sort((a, b) => photoRank(b) - photoRank(a))
  }

  const rankingRow = rows.find((row) => row.key === "ranking")
  const rainyRow = rows.find((row) => row.key === "rainy")
  const heroSpot =
    spots.find((place) => place.prefecture === "兵庫県" && place.city.includes("神戸")) ??
    spots[0]
  const recommendations = preferPhotos(rankingRow?.places.length ? rankingRow.places : spots).slice(0, 3)
  const rainyPlaces = preferPhotos(
    rainyRow?.places.length ? rainyRow.places : spots.filter((place) => place.rainy_day_ok),
  ).slice(0, 2)

  const selectedMoodConfig = moods.find((mood) => mood.key === selectedMood) ?? moods[0]
  const moodPlaces = useMemo(() => {
    const moodIndex = moods.findIndex((mood) => mood.key === selectedMood)
    const scored = spots.map((place, index) => {
      let score = selectedMoodConfig.matches(place) ? 100 : 0

      if (selectedMood === "relax") {
        score += place.healing_score ?? 0
        score += place.crowd_level === "quiet" ? 24 : 0
        score += place.activity_level !== null ? Math.max(0, 40 - place.activity_level) : 0
      } else if (selectedMood === "active") {
        score += place.activity_level ?? 0
        score += place.indoor_type === "outdoor" ? 28 : 0
      } else if (selectedMood === "kids") {
        score += place.child_fun_score ?? 0
        score += place.companion_types.includes("children") ? 36 : 0
        score += place.companion_types.includes("family") ? 28 : 0
      } else if (selectedMood === "rain") {
        score += place.rainy_day_score ?? 0
        score += place.indoor_type === "indoor" ? 36 : 0
      } else if (selectedMood === "food") {
        score += place.meal_available ? 70 : 0
      } else if (selectedMood === "photo") {
        score += place.photo_score ?? 0
        score += place.indoor_type === "outdoor" ? 18 : 0
      }

      const rotation = (index - moodIndex * 3 + spots.length) % Math.max(spots.length, 1)
      // 同スコア帯では実写真が確実にある施設を先に (地図の代替画像を顔にしない)
      const photoRank = place.image_storage_path ? 2 : place.image_url ? 1 : 0
      return { place, score, rotation, photoRank }
    })

    if (!scored.some((entry) => entry.score > 0)) {
      const start = (moodIndex * 3) % Math.max(spots.length, 1)
      return [...spots.slice(start), ...spots.slice(0, start)].slice(0, 3)
    }

    return scored
      .sort((left, right) => right.score - left.score || right.photoRank - left.photoRank || left.rotation - right.rotation)
      .slice(0, 3)
      .map((entry) => entry.place)
  }, [selectedMood, selectedMoodConfig, spots])

  // 選択中の気分に合う総数 (リードカードでデータとして見せる)
  const moodMatchCount = useMemo(
    () => spots.filter((place) => selectedMoodConfig.matches(place)).length,
    [selectedMoodConfig, spots],
  )

  const durationPhotoRank = (place: PlaceWithAvgRating) =>
    place.image_storage_path ? 2 : place.image_url ? 1 : 0
  const preferDurationPhotos = (list: PlaceWithAvgRating[]) =>
    [...list].sort((a, b) => durationPhotoRank(b) - durationPhotoRank(a))

  const durationGroups = [
    {
      label: "60–90 MIN",
      title: "近場でさくっと",
      places: preferDurationPhotos(spots.filter((place) => (place.average_stay_minutes ?? 999) <= 90)).slice(0, 3),
    },
    {
      label: "HALF DAY",
      title: "半日でちょうど",
      places: preferDurationPhotos(
        spots.filter((place) => {
          const minutes = place.average_stay_minutes ?? 0
          return minutes > 90 && minutes <= 240
        }),
      ).slice(0, 3),
    },
    {
      label: "ONE DAY",
      title: "一日じっくり",
      places: preferDurationPhotos(spots.filter((place) => (place.average_stay_minutes ?? 0) > 240)).slice(0, 3),
    },
  ].map((group, index) => ({
    ...group,
    places: group.places.length ? group.places : spots.slice(index * 3, index * 3 + 3),
  }))

  const nowParts = jstParts()
  const todayLabel =
    nowParts.year +
    "." +
    String(nowParts.month).padStart(2, "0") +
    "." +
    String(nowParts.day).padStart(2, "0") +
    " " +
    JST_WEEKDAYS[nowParts.weekday]

  function findNearby() {
    trackEvent("map_opened", { source: "editorial_home_hero" })
    if (!navigator.geolocation) {
      router.push("/spots")
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const params = new URLSearchParams({
          sort: "distance",
          lat: String(coords.latitude),
          lng: String(coords.longitude),
        })
        router.push("/spots?" + params.toString())
      },
      () => {
        setLocating(false)
        router.push("/spots")
      },
      { timeout: 8000 },
    )
  }

  const featureArticle = articles[0]

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.folio} aria-hidden>
            <span>01</span>
            <i />
            <span>KANSAI / 2026</span>
          </div>

          <div className={styles.heroTopline}>
            <p>KANSAI WEEKEND GUIDE</p>
            <span>{todayLabel}</span>
          </div>

          <h1>今日の「どこ行く？」を、<br />3つまで。</h1>
          <p className={styles.heroLead}>
            天気・気分・移動時間をまとめて比べて、
            <br className={styles.desktopBreak} />
            家を出る前の迷う時間を短くします。
          </p>

          <div className={styles.heroStatus}>
            <span className={styles.statusDot} data-weather={weatherCondition} />
            <strong>{weatherLabel ?? "関西の天気を確認"}</strong>
            <span>掲載 {totalSpotCount.toLocaleString("ja-JP")} 件</span>
          </div>

          <div className={styles.heroActions}>
            <Link
              href="/today"
              className={styles.primaryAction}
              onClick={() => trackEvent("recommendation_started", { source: "editorial_home_hero" })}
            >
              3つから選ぶ
              <ArrowRight aria-hidden />
            </Link>
            <button type="button" onClick={findNearby} disabled={locating} className={styles.secondaryAction}>
              <MapPin aria-hidden />
              {locating ? "現在地を取得中…" : "近い順で見る"}
            </button>
          </div>
        </div>

        <div className={styles.heroVisual}>
          {heroSpot ? (
            <PlaceImage place={heroSpot} alt={heroSpot.name} className={styles.heroImage} loading="eager" />
          ) : (
            <CoverImage src={null} alt="関西のおでかけ" className={styles.heroImage} eager />
          )}
          <div className={styles.heroVisualShade} />
          <div className={styles.heroPlace}>
            <span>EDITOR'S VIEW</span>
            <strong>{heroSpot?.name ?? "関西のおでかけ"}</strong>
            <small>{heroSpot ? heroSpot.city + ", " + heroSpot.prefecture : "KANSAI"}</small>
          </div>
        </div>

        <div className={styles.heroWeather}>
          <span>LIVE</span>
          <strong>{weatherLabel ?? "天気を確認"}</strong>
          <small>{weatherCondition === "rainy" ? "屋内候補を優先中" : "今日のおでかけ候補"}</small>
        </div>
      </section>

      <section className={styles.utilityStrip} aria-label="すぐ探す">
        <form action="/spots" method="get" className={styles.searchForm}>
          <Search aria-hidden />
          <label htmlFor="home-search" className="sr-only">スポットを検索</label>
          <input id="home-search" type="search" name="search" placeholder="スポット名・エリアから探す" />
          <button type="submit" aria-label="検索する">
            <ArrowRight aria-hidden />
          </button>
        </form>
        <Link href="/spots?rainy_day_ok=true">
          <span>雨の日OK</span>
          <strong><CountUp value={rainyCount} /> <small>SPOTS</small></strong>
        </Link>
        <Link href="/spots?price_type=free">
          <span>無料で遊べる</span>
          <strong><CountUp value={freeCount} /> <small>SPOTS</small></strong>
        </Link>
        <Link href="/areas">
          <span>関西6府県</span>
          <strong>06 <small>AREAS</small></strong>
        </Link>
      </section>

      <main>
        <section className={styles.section}>
          <SectionHeading
            number="02"
            eyebrow="TODAY'S THREE"
            title="きょうの3候補"
            description="人気と季節を手がかりに、いま選びやすい場所を3つ。"
            href="/ranking"
            linkLabel="ランキングを見る"
          />
          <div className={styles.threeGrid}>
            {recommendations.map((place, index) => (
              <PlaceCard key={place.id} place={place} rank={index + 1} />
            ))}
          </div>
        </section>

        <section className={[styles.section, styles.areaSection].join(" ")}>
          <SectionHeading
            number="03"
            eyebrow="AREA MAP"
            title="エリアから見つける"
            description="関西6府県。気になる方角から、週末をひらく。"
            href="/map"
            linkLabel="地図をひらく"
          />
          <div className={styles.areaLayout}>
            <div className={styles.areaList}>
              {areas.map((area) => (
                <Link
                  key={area.slug}
                  href={"/areas/" + area.slug}
                  onMouseEnter={() => setHoveredArea(area.slug)}
                  onMouseLeave={() => setHoveredArea(null)}
                  onFocus={() => setHoveredArea(area.slug)}
                  onBlur={() => setHoveredArea(null)}
                >
                  <span>{area.number}</span>
                  <strong>{area.label}</strong>
                  <small>{countsByPrefecture[area.prefecture] ?? 0} SPOTS</small>
                  <ArrowRight aria-hidden />
                </Link>
              ))}
            </div>
            <div className={styles.mapPanel}>
              <Image
                src="/home/kansai-map-editorial.png"
                alt="関西6府県のおでかけエリアマップ"
                fill
                sizes="(max-width: 768px) 100vw, 58vw"
                className={styles.mapImage}
              />
              {/* リストと連動する府県マーカー。ホバー中の府県が点灯する */}
              {areas.map((area) => (
                <Link
                  key={area.slug}
                  href={"/areas/" + area.slug}
                  className={styles.mapMarker}
                  style={{ left: area.x + "%", top: area.y + "%" }}
                  data-active={hoveredArea === area.slug || undefined}
                  onMouseEnter={() => setHoveredArea(area.slug)}
                  onMouseLeave={() => setHoveredArea(null)}
                  aria-label={area.label + "のスポット一覧"}
                >
                  <i aria-hidden />
                  <span>{area.label}</span>
                  <small>{countsByPrefecture[area.prefecture] ?? 0}</small>
                </Link>
              ))}
              <Link
                href="/map"
                className={styles.mapCta}
                onClick={() => trackEvent("map_opened", { source: "editorial_home_map" })}
              >
                MAPで探す
                <ArrowRight aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        <section className={[styles.section, styles.moodSection].join(" ")}>
          <SectionHeading
            number="04"
            eyebrow="MOOD SELECTOR"
            title="いまの気分で選ぶ"
            description="予定より先に、気持ちを決める。"
            href="/spots"
          />
          <div className={styles.moodTabs} role="tablist" aria-label="気分を選択">
            {moods.map(({ key, label, note, Icon }) => {
              const selected = key === selectedMood
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={selected ? styles.moodActive : ""}
                  onClick={() => setSelectedMood(key)}
                >
                  <Icon aria-hidden />
                  <strong>{label}</strong>
                  <span>{note}</span>
                </button>
              )
            })}
          </div>
          <div className={styles.moodResults} role="tabpanel">
            <div className={styles.moodResultLead}>
              <p><span>SELECTED MOOD</span><strong>{selectedMoodConfig.label}</strong></p>
              <p className={styles.moodCount}>
                <b>{moodMatchCount.toLocaleString("ja-JP")}</b>
                <span>件から、この3つ</span>
              </p>
            </div>
            {moodPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} compact />
            ))}
          </div>
        </section>

        <section className={[styles.section, styles.eventSection].join(" ")}>
          <SectionHeading
            number="05"
            eyebrow="THIS WEEKEND"
            title="今週末のイベント"
            description="土曜と日曜、関西で起きていること。"
            href="/events"
            linkLabel="イベント一覧"
          />
          {weekendEvents.length ? (
            <div className={styles.eventGrid}>
              {weekendEvents.slice(0, 3).map((event, index) => (
                <Link key={event.id} href={eventHref(event)} className={styles.eventCard}>
                  <div className={styles.eventMedia}>
                    <CoverImage
                      src={eventCoverUrl(event)}
                      alt={event.name}
                      className={styles.cover}
                    />
                    <span>{eventPeriodLabel(event)}</span>
                  </div>
                  <div className={styles.eventBody}>
                    <p>{event.prefecture ?? "関西"} / {event.event_category ?? "EVENT"}</p>
                    <h3>{event.name}</h3>
                    {event.summary ? <small>{event.summary}</small> : null}
                    <div><span>{index === 0 ? "PICK UP" : "WEEKEND"}</span><ArrowRight aria-hidden /></div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Link href="/events" className={styles.emptyEvent}>
              <span>WEEKEND CALENDAR</span>
              <strong>開催中のイベントを<br />日付から探す</strong>
              <ArrowRight aria-hidden />
            </Link>
          )}
        </section>

        <section className={styles.rainSection}>
          <div className={styles.rainInner}>
            <SectionHeading
              number="06"
              eyebrow="RAINY DAY"
              title="雨の日こそ、出かけよう。"
              description={"屋内で楽しめる候補を " + rainyCount + " 件掲載しています。"}
              href="/spots?rainy_day_ok=true"
              linkLabel="雨の日の候補"
              inverse
            />
            <div className={styles.rainGrid}>
              <div className={styles.rainStatement}>
                <CloudRain aria-hidden />
                <span>NO PLAN<br />CHANGE.</span>
                <p>雨音も、今日の景色にする。</p>
              </div>
              {rainyPlaces.map((place) => (
                <PlaceCard key={place.id} place={place} compact />
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeading
            number="07"
            eyebrow="TIME TO SPEND"
            title="使える時間から選ぶ"
            description="距離のかわりに、滞在時間で週末を組み立てる。"
            href="/spots"
          />
          <div className={styles.durationGrid}>
            {durationGroups.map((group, groupIndex) => (
              <article key={group.label} className={styles.durationColumn}>
                <div className={styles.durationHead}>
                  <span>{group.label}</span>
                  <h3>{group.title}</h3>
                </div>
                <ol>
                  {group.places.map((place, index) => (
                    <li key={place.id}>
                      <Link href={"/places/" + place.id}>
                        <span>0{groupIndex * 3 + index + 1}</span>
                        <PlaceImage place={place} alt="" className={styles.durationImage} />
                        <p>
                          <strong>{place.name}</strong>
                          <small>
                            {place.city}
                            {place.average_stay_minutes ? " ・ 約" + (place.average_stay_minutes >= 60 ? Math.round(place.average_stay_minutes / 60 * 10) / 10 + "時間" : place.average_stay_minutes + "分") : ""}
                          </small>
                        </p>
                        <ArrowRight aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>

        {articles.length > 1 ? (
          <section className={[styles.section, styles.articleSection].join(" ")}>
            <SectionHeading
              number="08"
              eyebrow="STORIES"
              title="おでかけの読みもの"
              description="場所の先にある、季節と街の話。"
              href="/articles"
              linkLabel="読みもの一覧"
            />
            <div className={styles.articleGrid}>
              {articles.slice(1, 4).map((article) => (
                <Link key={article.id} href={"/articles/" + article.slug} className={styles.articleCard}>
                  <CoverImage
                    src={articleCoverUrl(article)}
                    alt={article.title}
                    className={styles.articleImage}
                  />
                  <div>
                    <p>{formatArticleDate(article.published_at)} / {ARTICLE_TYPE_LABELS[article.article_type]}</p>
                    <h3>{article.title}</h3>
                    {article.excerpt ? <span>{article.excerpt}</span> : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.closingSection}>
          <div className={styles.closingMedia}>
            {featureArticle ? (
              <CoverImage
                src={articleCoverUrl(featureArticle)}
                alt={featureArticle.title}
                className={styles.closingImage}
              />
            ) : heroSpot ? (
              <PlaceImage place={heroSpot} alt={heroSpot.name} className={styles.closingImage} />
            ) : (
              <CoverImage src={null} alt="関西の週末" className={styles.closingImage} />
            )}
          </div>
          <div className={styles.closingCopy}>
            <p className={styles.eyebrow}>THE NEXT WEEKEND</p>
            <h2>{featureArticle?.title ?? "次の週末を、もう楽しみにしている。"}</h2>
            <p>
              {featureArticle?.excerpt ??
                "知らなかった場所がひとつ増えると、いつもの土日が少しだけ広くなる。関西の次の行き先を見つけよう。"}
            </p>
            <Link href={featureArticle ? "/articles/" + featureArticle.slug : "/spots"}>
              続きを見る
              <ArrowRight aria-hidden />
            </Link>
          </div>
        </section>

        <section className={styles.finalCta}>
          <div>
            <p>まだ決まらないなら</p>
            <h2>3つまで、絞ります。</h2>
          </div>
          <Link href="/today" className={styles.primaryAction}>
            今日の候補を見る
            <ArrowRight aria-hidden />
          </Link>
        </section>
      </main>
    </div>
  )
}
