import Link from "next/link"
import { TIMEFRAMES, type TimeframeSlug } from "@/lib/timeframe"

/**
 * 時間軸ナビ (Time Out型): 今日行ける / 明日 / 今週末 / 今月
 * サーバーコンポーネント。/when/[timeframe] へのリンク。
 */
export default function TimeChips({ active }: { active?: TimeframeSlug }) {
  return (
    <nav aria-label="時期からさがす" className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
      {TIMEFRAMES.map((timeframe) => (
        <Link
          key={timeframe.slug}
          href={`/when/${timeframe.slug}`}
          aria-current={active === timeframe.slug ? "page" : undefined}
          className={`pill${active === timeframe.slug ? " is-active" : ""}`}
        >
          {timeframe.label}
        </Link>
      ))}
    </nav>
  )
}
