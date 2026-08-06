import type { PublicEvent } from "@/lib/events"

/**
 * 写真が用意できないイベントのカバー。
 *
 * 花火大会の会場は河川敷・グラウンド・海上で、掲載できる写真が手に入らない。
 * 借り物の写真を置く代わりに、そのイベントが実際に持っている数字
 * (打ち上げ数など) を主役にした夜空を描く。飾りではなくデータの表示。
 *
 * 数字が無いイベントは日付を主役にする。
 */

/** 「約1万2000発」のような表記から発数を取り出す。演出の強さを決めるためだけに使う。 */
function scaleMagnitude(value: string | null): number {
  if (!value) return 0
  const normalized = value.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
  const man = normalized.match(/(\d+)\s*万\s*(\d*)/)
  if (man) return Number(man[1]) * 10000 + Number(man[2] || 0)
  const plain = normalized.match(/(\d[\d,]*)/)
  return plain ? Number(plain[1].replace(/,/g, "")) : 0
}

/**
 * 府県ごとに光の色を変える。一覧が同じ色で埋まらないようにするため。
 * glow は背景の光、ray は光条の線。
 */
const COLORS: Record<string, { glow: string; ray: string }> = {
  大阪府: { glow: "#8a4423", ray: "#ffc48a" },
  兵庫県: { glow: "#1d6b5f", ray: "#7fe3cf" },
  京都府: { glow: "#7a2a55", ray: "#ffa8d2" },
  奈良県: { glow: "#7d5a1c", ray: "#ffdb8a" },
  滋賀県: { glow: "#1d5175", ray: "#8fd0ff" },
  和歌山県: { glow: "#2f6b26", ray: "#a9e88f" },
}
const DEFAULT_COLOR = COLORS.兵庫県

export default function EventCover({ event }: { event: PublicEvent }) {
  const start = new Date(event.start_at)
  const magnitude = scaleMagnitude(event.highlight_value)
  const color = COLORS[event.prefecture ?? ""] ?? DEFAULT_COLOR

  // 発数が多いほど光条を増やす (8〜20本)。規模が視覚的にも伝わるようにする
  const rays = Math.min(20, Math.max(8, Math.round(8 + magnitude / 1000)))
  const radius = Math.min(30, Math.max(16, 16 + magnitude / 900))

  const value = event.highlight_value
  // 長い表記でも枠に収まるよう、文字数で段階的に縮める
  const valueSize = !value ? "" : value.length <= 6 ? "text-2xl" : value.length <= 10 ? "text-lg" : "text-sm"

  return (
    <div
      className="event-cover grid size-full place-items-center text-center"
      style={{ ["--cover-glow" as string]: color.glow, ["--cover-ray" as string]: color.ray }}
    >
      <svg className="event-cover__burst" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        {Array.from({ length: rays }, (_, index) => {
          const angle = (index / rays) * Math.PI * 2
          return (
            <line
              key={index}
              x1={50 + Math.cos(angle) * 4}
              y1={30 + Math.sin(angle) * 4}
              x2={50 + Math.cos(angle) * radius}
              y2={30 + Math.sin(angle) * radius}
              style={{ animationDelay: `${(index % 5) * 40}ms` }}
            />
          )
        })}
      </svg>

      {/* 花火は上、数字は下。重ねると両方読みにくくなる */}
      <div className="relative translate-y-5">
        {value ? (
          <>
            <p className={`font-display font-black leading-none text-white ${valueSize}`}>{value}</p>
            {event.highlight_label && (
              <p className="mt-1 text-[10px] font-bold tracking-wide text-white/70">{event.highlight_label}</p>
            )}
          </>
        ) : (
          <>
            <p className="font-display text-3xl font-black leading-none text-white">
              {start.getMonth() + 1}<span className="text-lg">/</span>{start.getDate()}
            </p>
            <p className="mt-1 text-[10px] font-bold text-white/70">
              {["日", "月", "火", "水", "木", "金", "土"][start.getDay()]}曜
            </p>
          </>
        )}
      </div>
    </div>
  )
}
