"use client"

import Link from "next/link"
import { Compass, House, Map, Search, UserRound } from "lucide-react"
import { usePathname } from "next/navigation"

const leftItems = [
  { href: "/", label: "ホーム", Icon: House, exact: true },
  { href: "/spots", label: "さがす", Icon: Search, exact: false },
]

const rightItems = [
  { href: "/map", label: "マップ", Icon: Map, exact: false },
  { href: "/mypage", label: "マイページ", Icon: UserRound, exact: false },
]

function NavLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string
  label: string
  Icon: typeof House
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`grid min-w-0 justify-items-center gap-0.5 rounded-xl px-1 py-1.5 text-[0.6875rem] font-bold transition-colors duration-150 ${
        active ? "text-accent-strong" : "text-ink-soft"
      }`}
    >
      <Icon className="size-5 transition-transform duration-150 active:scale-90" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
      <span className={active ? "font-black" : undefined}>{label}</span>
    </Link>
  )
}

export default function MobileBottomNav() {
  const pathname = usePathname()
  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav
      aria-label="モバイルナビゲーション"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-line bg-surface/95 pb-[max(4px,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5">
        {leftItems.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href, item.exact)} />
        ))}

        {/* 中央FAB: 当日意思決定への最短導線 */}
        <div className="relative flex justify-center">
          <Link
            href="/today"
            aria-current={isActive("/today", false) ? "page" : undefined}
            className="btn-primary fab-breathe absolute -top-7 grid !min-h-0 size-14 place-items-center rounded-full !p-0 shadow-[var(--shadow-overlay)]"
            aria-label="今日どこ？ 診断"
          >
            <Compass className="size-6" aria-hidden />
          </Link>
          <Link href="/today" tabIndex={-1} aria-hidden className="mt-7 pb-1.5 text-[0.6875rem] font-bold text-ink-soft">今日どこ？</Link>
        </div>

        {rightItems.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href, item.exact)} />
        ))}
      </div>
    </nav>
  )
}
