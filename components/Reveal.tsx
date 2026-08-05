"use client"

import { useEffect, useRef, type ReactNode } from "react"

/**
 * スクロールReveal (脇役モーション)。IntersectionObserverで一度だけ発火。
 * `.js` クラスがhtmlに無い環境 (JS無効) では何も隠さないため、SEO・no-JSに安全。
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: "div" | "section" | "li" | "span"
}) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.classList.add("is-in")
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in")
            observer.unobserve(entry.target)
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    )
    observer.observe(element)
    // セーフティネット: IOが発火しない環境 (バックグラウンドタブ等) でも
    // コンテンツが隠れたままにならないようにする
    const fallback = window.setTimeout(() => element.classList.add("is-in"), 1800)
    return () => {
      observer.disconnect()
      window.clearTimeout(fallback)
    }
  }, [])

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      data-reveal
      className={className}
      style={delay > 0 ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  )
}
