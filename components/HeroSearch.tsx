"use client"

import { ArrowRight, Navigation, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function HeroSearch() {
  const router = useRouter()
  const [query, setQuery] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/places?search=${encodeURIComponent(query.trim())}`)
      return
    }
    router.push("/places")
  }

  function handleCurrentLocation() {
    if (!navigator.geolocation) {
      alert("お使いのブラウザは現在地取得に対応していません。")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        router.push(
          `/places?lat=${position.coords.latitude}&lng=${position.coords.longitude}&sort=distance`
        )
      },
      () => {
        alert("現在地の取得に失敗しました。位置情報の許可を確認してください。")
      }
    )
  }

  return (
    <div className="surface-card rounded-[28px] p-3 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
      >
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例：「梅田 屋内」「京都 無料」「授乳室」"
            autoComplete="off"
            className="h-14 rounded-[20px] border-0 bg-[#f9f7f3] pl-11 pr-4 text-base shadow-none ring-1 ring-black/4 placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-[var(--brand-clay)]/25"
          />
        </label>
        <Button
          type="submit"
          className="h-14 rounded-[20px] bg-[var(--brand-ink)] px-6 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_18px_40px_-24px_rgba(24,28,43,0.85)] transition-transform duration-200 hover:-translate-y-px hover:bg-[#253248]"
        >
          探す
          <ArrowRight className="size-4" />
        </Button>
      </form>

      <button
        type="button"
        onClick={handleCurrentLocation}
        className="mt-3 flex w-full items-center justify-between rounded-[20px] border border-border/80 bg-white/70 px-4 py-3 text-left transition-colors hover:border-[var(--brand-clay)]/35"
      >
        <span className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-ink)]/5 text-[var(--brand-ink)]">
            <Navigation className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-foreground">
              今いる場所から近い順で探す
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              外出直前でも OK。移動しやすい順にならびます。
            </span>
          </span>
        </span>
        <ArrowRight className="size-4 text-muted-foreground" />
      </button>
    </div>
  )
}
