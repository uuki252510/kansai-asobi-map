"use client"

import { Check, Link2, MessageCircle, Share2 } from "lucide-react"
import { useState } from "react"
import { trackEvent } from "@/lib/analytics"

interface Props {
  name: string
  url: string
  compact?: boolean
}

export default function ShareButtons({ name, url, compact = false }: Props) {
  const [copied, setCopied] = useState(false)
  const message = `${name}を「デカケル」でチェック`
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`

  const registerShare = (channel: string) => trackEvent("recommendations_shared", { channel, place_name: name })
  const copyLink = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    registerShare("copy")
    window.setTimeout(() => setCopied(false), 2000)
  }

  const controls = (
    <div className="flex flex-wrap gap-2">
      <a href={xUrl} target="_blank" rel="noopener noreferrer" onClick={() => registerShare("x")} className="pill"><Share2 className="size-4" />Xで共有</a>
      <a href={lineUrl} target="_blank" rel="noopener noreferrer" onClick={() => registerShare("line")} className="pill text-[#058f3f]"><MessageCircle className="size-4" />LINE</a>
      <button type="button" onClick={() => void copyLink()} className="pill">{copied ? <Check className="size-4 text-positive" /> : <Link2 className="size-4" />}{copied ? "コピー済み" : "リンク"}</button>
    </div>
  )

  if (compact) return controls
  return <section className="mb-8"><p className="mb-3 text-xs font-bold tracking-[0.16em] text-ink-soft">共有</p>{controls}</section>
}
