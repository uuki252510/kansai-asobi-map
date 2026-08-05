import Link from "next/link"

/**
 * デカケル 4色ワードマーク (青デ/橙カ/緑ケ/黄ル + 黄三角 + 橙スウッシュ)。
 * ユーザー支給ロゴをHTML+SVGで再現 (拡大縮小に強く、フォント読込後は常に鮮明)。
 */
const LOGO_COLORS = {
  de: "#2B9FE8",
  ka: "#F0782C",
  ke: "#54B838",
  ru: "#FFC212",
  swoosh: "#F9A825",
} as const

export function DekakeruWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display relative inline-flex items-end font-black leading-none tracking-tight ${className}`} aria-hidden>
      {/* 黄色い三角 (出発の矢印) */}
      <svg viewBox="0 0 24 24" className="absolute -top-[0.55em] left-[0.05em] size-[0.42em] rotate-[18deg]" aria-hidden>
        <path d="M3 20 L21 10 L6 3 Z" fill={LOGO_COLORS.ru} />
      </svg>
      <span style={{ color: LOGO_COLORS.de }}>デ</span>
      <span style={{ color: LOGO_COLORS.ka }}>カ</span>
      <span style={{ color: LOGO_COLORS.ke }}>ケ</span>
      <span className="relative" style={{ color: LOGO_COLORS.ru }}>
        ル
        {/* スウッシュ */}
        <svg viewBox="0 0 60 12" className="absolute -bottom-[0.28em] -right-[0.3em] w-[1.2em]" aria-hidden>
          <path d="M2 10 Q30 14 58 2 Q34 10 4 8 Z" fill={LOGO_COLORS.swoosh} />
        </svg>
      </span>
    </span>
  )
}

export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex min-w-0 items-center gap-2" aria-label="デカケル ホーム">
      <DekakeruWordmark className="text-2xl transition-transform duration-150 group-active:scale-95" />
      <span className="sr-only">デカケル</span>
      {!compact && (
        <span className="mt-1 hidden truncate text-[0.6875rem] font-bold text-ink-soft lg:block">
          関西のおでかけが、今日決まる。
        </span>
      )}
    </Link>
  )
}
