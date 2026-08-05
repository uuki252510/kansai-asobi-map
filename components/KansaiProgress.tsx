"use client"

import { useMemo } from "react"
import CountUp from "@/components/CountUp"
import { useSpotTracking } from "@/lib/useSpotTracking"

const PREFECTURE_ORDER = ["大阪府", "兵庫県", "京都府", "奈良県", "滋賀県", "和歌山県"] as const
const shortName: Record<string, string> = {
  大阪府: "大阪",
  兵庫県: "兵庫",
  京都府: "京都",
  奈良県: "奈良",
  滋賀県: "滋賀",
  和歌山県: "和歌山",
}

/**
 * 関西制覇プログレス (Atlas Obscura型ゲーミフィケーション)。
 * countsByPrefecture: サーバ集計の府県別掲載数
 * placePrefectures: placeId → 府県 のマップ (visited集計用)
 */
export default function KansaiProgress({
  countsByPrefecture,
  placePrefectures,
}: {
  countsByPrefecture: Record<string, number>
  placePrefectures: Record<string, string>
}) {
  const { visitedIds, visitedCount, ready } = useSpotTracking()

  const visitedByPrefecture = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const id of visitedIds.keys()) {
      const prefecture = placePrefectures[id]
      if (prefecture) counts[prefecture] = (counts[prefecture] ?? 0) + 1
    }
    return counts
  }, [visitedIds, placePrefectures])

  const total = Object.values(countsByPrefecture).reduce((sum, count) => sum + count, 0)
  const percent = total > 0 ? Math.min(100, Math.round((visitedCount / total) * 1000) / 10) : 0

  return (
    <section className="card-v2 p-5 sm:p-6" aria-label="関西制覇の進捗">
      <div className="flex items-center gap-5">
        {/* 達成率リング (conic-gradient) */}
        <div
          className="relative grid size-24 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--accent) ${percent * 3.6}deg, var(--line) 0deg)`,
          }}
          role="img"
          aria-label={`関西制覇率 ${percent}パーセント`}
        >
          <div className="grid size-[76px] place-items-center rounded-full bg-surface text-center">
            <div>
              <p className="text-xl font-black leading-none text-ink">
                {ready ? <CountUp value={visitedCount} /> : "–"}
              </p>
              <p className="mt-0.5 text-[0.625rem] font-bold text-ink-soft">スポット</p>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-ink">関西制覇</h2>
          <p className="mt-0.5 text-xs font-bold text-ink-soft">
            {total}スポット中 {ready ? visitedCount : 0}ヶ所制覇（{ready ? percent : 0}%）
          </p>
          <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-6">
            {PREFECTURE_ORDER.map((prefecture) => {
              const totalInPref = countsByPrefecture[prefecture] ?? 0
              const visitedInPref = visitedByPrefecture[prefecture] ?? 0
              const ratio = totalInPref > 0 ? Math.min(100, (visitedInPref / totalInPref) * 100) : 0
              return (
                <div key={prefecture}>
                  <p className="flex items-baseline justify-between text-[0.6875rem] font-bold text-ink-soft">
                    {shortName[prefecture]}
                    <span className="font-black text-ink">{visitedInPref}<span className="font-bold text-ink-faint">/{totalInPref}</span></span>
                  </p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-[250ms] ease-out"
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
