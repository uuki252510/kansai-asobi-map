"use client"

import Link from "next/link"
import { Compass, House, Map, Search, UserRound } from "lucide-react"
import { usePathname } from "next/navigation"
import styles from "./EditorialHeader.module.css"

const items = [
  { href: "/", label: "ホーム", Icon: House, exact: true },
  { href: "/spots", label: "探す", Icon: Search, exact: false },
  { href: "/today", label: "3つから", Icon: Compass, exact: false, primary: true },
  { href: "/map", label: "地図", Icon: Map, exact: false },
  { href: "/mypage", label: "マイページ", Icon: UserRound, exact: false },
]

export default function EditorialMobileNav() {
  const pathname = usePathname()

  return (
    <nav className={styles.mobileNav} aria-label="モバイルナビゲーション">
      {items.map(({ href, label, Icon, exact, primary }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/")
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            data-active={active || undefined}
            data-primary={primary || undefined}
          >
            <Icon aria-hidden />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
