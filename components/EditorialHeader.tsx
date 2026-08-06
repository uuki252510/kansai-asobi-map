"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import WeatherSummary from "@/components/WeatherSummary"
import styles from "./EditorialHeader.module.css"

const navItems = [
  { href: "/today", label: "3つから選ぶ" },
  { href: "/map", label: "地図で探す" },
  { href: "/spots", label: "スポット" },
  { href: "/events", label: "イベント" },
  { href: "/articles", label: "読みもの" },
]

export default function EditorialHeader() {
  const pathname = usePathname()

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand} aria-label="デカケル ホーム">
          <strong>DEKAKERU</strong>
          <span>KANSAI WEEKEND GUIDE</span>
        </Link>

        <nav className={styles.desktopNav} aria-label="メインナビゲーション">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-active={active || undefined}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className={styles.headerTools}>
          <div className={styles.weather}><WeatherSummary compact /></div>
          <Link href="/mypage" className={styles.myPage}>MY PAGE</Link>
        </div>
      </div>
    </header>
  )
}
