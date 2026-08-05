"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import BrandMark from "@/components/BrandMark"
import WeatherSummary from "@/components/WeatherSummary"

const navItems = [
  { href: "/spots", label: "さがす" },
  { href: "/events", label: "イベント" },
  { href: "/articles", label: "読みもの" },
  { href: "/map", label: "マップ" },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-[60] border-b border-line bg-surface/95 backdrop-blur-md">
      <div className="page-shell flex h-16 items-center justify-between gap-4">
        <BrandMark />

        <nav className="hidden h-full items-center gap-1 md:flex" aria-label="メインナビゲーション">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative inline-flex h-full items-center px-3 text-sm font-bold transition-colors duration-150 ${
                  active ? "text-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" aria-hidden />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden lg:block">
            <WeatherSummary compact />
          </div>
          <Link href="/today" className="btn-primary !min-h-10 px-5 text-sm">
            今日どこ行く？
          </Link>
        </div>
      </div>
    </header>
  )
}
