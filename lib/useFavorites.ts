"use client"

import { useCallback, useEffect, useState } from "react"

const KEY = "kansai-asobi-favorites"

function load(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

export function useFavorites() {
  const [ids, setIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setIds(load())
  }, [])

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      localStorage.setItem(KEY, JSON.stringify([...next]))
      return next
    })
  }, [])

  const isFavorite = useCallback((id: string) => ids.has(id), [ids])

  return { isFavorite, toggle, count: ids.size }
}
