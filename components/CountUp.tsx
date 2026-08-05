"use client"

import { useEffect, useRef, useState } from "react"

/**
 * 数字のカウントアップ (Data Poetry)。ビューに入ったら一度だけ800msで駆け上がる。
 * SSRでは最終値を出力するためSEONumberはそのまま (JSが来たら0から演出)。
 * reduced-motion環境では即座に最終値。
 */
export default function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const element = ref.current
    if (!element || value <= 0) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let raf = 0
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        const start = performance.now()
        const duration = 800
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration)
          // ease-out-expo
          const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
          setDisplay(Math.round(value * eased))
          if (progress < 1) raf = requestAnimationFrame(tick)
        }
        setDisplay(0)
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value])

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {display.toLocaleString("ja-JP")}
    </span>
  )
}
