"use client"

import { useCallback, useEffect, useState } from "react"
import { trackEvent } from "@/lib/analytics"

/**
 * 行きたい (want) / 行った (visited) の2軸トラッキング (Atlas Obscura型)。
 * localStorage 保持。旧キーからの初回移行を行う (旧キーは残置)。
 *  - want:    旧 "kansai-asobi-favorites" (string[])
 *  - visited: 旧 "kyodokoiko-outing-history" の visited:true レコード
 */
const WANT_KEY = "kansai-asobi:want"
const VISITED_KEY = "kansai-asobi:visited"
const LEGACY_FAVORITES_KEY = "kansai-asobi-favorites"
const LEGACY_HISTORY_KEY = "kyodokoiko-outing-history"

export interface VisitedRecord {
  id: string
  visitedOn: string // ISO date
}

function loadWant(): Set<string> {
  try {
    const raw = window.localStorage.getItem(WANT_KEY)
    if (raw) return new Set(JSON.parse(raw) as string[])
    // 初回移行: 旧お気に入り
    const legacy = window.localStorage.getItem(LEGACY_FAVORITES_KEY)
    const migrated = new Set(legacy ? (JSON.parse(legacy) as string[]) : [])
    if (migrated.size > 0) window.localStorage.setItem(WANT_KEY, JSON.stringify([...migrated]))
    return migrated
  } catch {
    return new Set()
  }
}

function loadVisited(): Map<string, VisitedRecord> {
  try {
    const raw = window.localStorage.getItem(VISITED_KEY)
    if (raw) {
      const records = JSON.parse(raw) as VisitedRecord[]
      return new Map(records.map((record) => [record.id, record]))
    }
    // 初回移行: 旧おでかけ記録の visited:true
    const legacy = window.localStorage.getItem(LEGACY_HISTORY_KEY)
    const map = new Map<string, VisitedRecord>()
    if (legacy) {
      const records = JSON.parse(legacy) as Array<{ placeId?: string; decidedAt?: string; visited?: boolean }>
      for (const record of records) {
        if (record.visited && record.placeId) {
          map.set(record.placeId, { id: record.placeId, visitedOn: record.decidedAt ?? new Date().toISOString() })
        }
      }
      if (map.size > 0) window.localStorage.setItem(VISITED_KEY, JSON.stringify([...map.values()]))
    }
    return map
  } catch {
    return new Map()
  }
}

function persistVisited(map: Map<string, VisitedRecord>) {
  window.localStorage.setItem(VISITED_KEY, JSON.stringify([...map.values()]))
}

export function useSpotTracking() {
  const [want, setWant] = useState<Set<string>>(new Set())
  const [visited, setVisited] = useState<Map<string, VisitedRecord>>(new Map())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setWant(loadWant())
    setVisited(loadVisited())
    setReady(true)
  }, [])

  const toggleWant = useCallback((id: string) => {
    setWant((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else {
        next.add(id)
        trackEvent("favorite_added", { place_id: id, source: "spot_tracking" })
      }
      window.localStorage.setItem(WANT_KEY, JSON.stringify([...next]))
      // 旧キーも同期して既存 useFavorites 利用箇所と齟齬を出さない
      window.localStorage.setItem(LEGACY_FAVORITES_KEY, JSON.stringify([...next]))
      return next
    })
  }, [])

  const toggleVisited = useCallback((id: string) => {
    setVisited((previous) => {
      const next = new Map(previous)
      if (next.has(id)) next.delete(id)
      else {
        next.set(id, { id, visitedOn: new Date().toISOString() })
        trackEvent("outing_record_created", { place_id: id, source: "spot_tracking" })
      }
      persistVisited(next)
      return next
    })
  }, [])

  const isWant = useCallback((id: string) => want.has(id), [want])
  const isVisited = useCallback((id: string) => visited.has(id), [visited])

  return {
    ready,
    wantIds: want,
    visitedIds: visited,
    isWant,
    isVisited,
    toggleWant,
    toggleVisited,
    wantCount: want.size,
    visitedCount: visited.size,
  }
}
