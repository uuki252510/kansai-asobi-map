"use client"

import Link from "next/link"
import { Menu, X } from "lucide-react"
import { useState } from "react"

const navItems = [
  { href: "/places", label: "遊び場を探す" },
  { href: "/places?rainy_day_ok=true", label: "雨の日OK" },
  { href: "/places?price_type=free", label: "無料スポット" },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-4"
          onClick={() => setMenuOpen(false)}
        >
          <div className="hidden h-11 w-px bg-border/90 sm:block" />
          <div className="min-w-0">
            <p className="truncate text-[0.64rem] font-semibold tracking-[0.22em] text-muted-foreground transition-colors group-hover:text-[var(--brand-clay)]">
              子連れおでかけ · 関西6府県
            </p>
            <p className="mt-1 flex items-baseline gap-2 truncate text-lg font-semibold tracking-tight text-foreground">
              <span>あそびば</span>
              <span className="font-heading text-xl text-[var(--brand-clay)]">関西</span>
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 sm:flex">
          {navItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                index === 0
                  ? "rounded-full bg-[var(--brand-ink)] px-4 py-2 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-px"
                  : "rounded-full border border-border/80 bg-white/72 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[var(--brand-clay)]/35 hover:text-[var(--brand-clay)]"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-white/74 text-foreground transition-colors hover:border-[var(--brand-clay)]/35 hover:text-[var(--brand-clay)] sm:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="メニューを開く"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-white/70 bg-white/86 px-4 py-4 shadow-[0_18px_36px_-28px_rgba(24,28,43,0.45)] backdrop-blur-xl sm:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-2">
            {navItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={
                  index === 0
                    ? "rounded-[18px] bg-[var(--brand-ink)] px-4 py-3 text-sm font-semibold text-white"
                    : "rounded-[18px] border border-border/80 bg-background/90 px-4 py-3 text-sm font-medium text-foreground"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
