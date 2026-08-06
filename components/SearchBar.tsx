"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, type FormEvent } from "react"
import { Search } from "lucide-react"

/**
 * 実在スポット名をローテ表示する検索バー (Headout型)。
 * SSR初期値は固定文字列にしてハイドレーション差分を出さない。
 */
const EXAMPLE_PLACEHOLDER = "スポット名・市区町村で検索"

export default function SearchBar({
  examples = [],
  basePath = "/spots",
  defaultValue = "",
  className = "",
  autoFocus = false,
}: {
  examples?: string[]
  basePath?: string
  defaultValue?: string
  className?: string
  autoFocus?: boolean
}) {
  const router = useRouter()
  const [query, setQuery] = useState(defaultValue)
  const [exampleIndex, setExampleIndex] = useState(-1)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (examples.length === 0) return
    const timer = window.setInterval(() => {
      setFading(true)
      window.setTimeout(() => {
        setExampleIndex((current) => (current + 1) % examples.length)
        setFading(false)
      }, 200)
    }, 4000)
    return () => window.clearInterval(timer)
  }, [examples.length])

  const placeholder =
    exampleIndex >= 0 && examples[exampleIndex]
      ? `例: ${examples[exampleIndex]}`
      : EXAMPLE_PLACEHOLDER

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const search = query.trim()
    router.push(search ? `${basePath}?search=${encodeURIComponent(search)}` : basePath)
  }

  return (
    <form onSubmit={submit} role="search" className={`relative flex items-center ${className}`}>
      <Search className="pointer-events-none absolute left-4 size-5 text-ink-faint" aria-hidden />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        enterKeyHint="search"
        aria-label="スポットを検索"
        className={`h-14 w-full rounded-[4px] border-2 border-ink bg-surface pl-12 pr-32 text-[0.9375rem] font-bold text-ink outline-none transition-opacity duration-200 placeholder:font-normal placeholder:text-ink-faint focus:border-ink-faint ${fading ? "placeholder:opacity-0" : "placeholder:opacity-100"}`}
      />
      <button type="submit" className="btn-primary absolute right-1.5 !min-h-11 px-5 text-sm">
        検索
      </button>
    </form>
  )
}
