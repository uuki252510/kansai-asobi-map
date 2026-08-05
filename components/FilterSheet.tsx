"use client"

import { useEffect, useMemo, useState } from "react"
import Sheet from "@/components/ui/sheet"
import type { PlaceWithAvgRating } from "@/lib/places"
import { PREFECTURES } from "@/lib/places"
import {
  applySpotFilters,
  COMPANION_OPTIONS,
  EMPTY_FILTERS,
  type SpotFilterState,
} from "@/lib/spot-filters"

const prefectureShort: Record<string, string> = {
  大阪府: "大阪",
  兵庫県: "兵庫",
  京都府: "京都",
  奈良県: "奈良",
  滋賀県: "滋賀",
  和歌山県: "和歌山",
}

const indoorOptions = [
  { value: "", label: "すべて" },
  { value: "indoor", label: "屋内" },
  { value: "outdoor", label: "屋外" },
  { value: "both", label: "屋内外" },
]

const priceOptions = [
  { value: "", label: "すべて" },
  { value: "free", label: "無料" },
  { value: "paid", label: "有料" },
  { value: "mixed", label: "一部有料" },
]

const ageOptions = [
  { value: "", label: "すべて" },
  { value: "0-2", label: "0〜2歳" },
  { value: "3-5", label: "3〜5歳" },
  { value: "6-12", label: "小学生" },
]

const facilityOptions = [
  { key: "rainy_day_ok", label: "雨の日OK" },
  { key: "has_parking", label: "駐車場" },
  { key: "has_nursing_room", label: "授乳室" },
  { key: "has_diaper_space", label: "おむつ替え" },
] as const

function OptionGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <fieldset>
      <legend className="text-xs font-black tracking-wide text-ink-soft">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

/**
 * ボトムシート型フィルタ。適用ボタンに選択条件での件数を動的表示する
 * (「この条件で 37件 を見る」)。件数は places にクライアント側で
 * 絞り込みを仮適用して算出する。
 */
export default function FilterSheet({
  open,
  onOpenChange,
  value,
  onApply,
  places,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: SpotFilterState
  onApply: (next: SpotFilterState) => void
  places: PlaceWithAvgRating[]
}) {
  const [pending, setPending] = useState<SpotFilterState>(value)

  useEffect(() => {
    if (open) setPending(value)
  }, [open, value])

  const previewCount = useMemo(() => applySpotFilters(places, pending).length, [places, pending])

  function set<K extends keyof SpotFilterState>(key: K, next: SpotFilterState[K]) {
    setPending((current) => ({ ...current, [key]: next }))
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="条件を絞り込む"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button type="button" className="btn-ghost text-sm" onClick={() => setPending(EMPTY_FILTERS)}>
            リセット
          </button>
          <button
            type="button"
            className="btn-primary flex-1 sm:flex-none sm:min-w-64"
            disabled={previewCount === 0}
            onClick={() => {
              onApply(pending)
              onOpenChange(false)
            }}
          >
            {previewCount === 0 ? (
              "該当なし — 条件をゆるめてください"
            ) : (
              <>
                この条件で
                <span key={previewCount} className="count-pop mx-1 text-lg">
                  {previewCount}
                </span>
                件を見る
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <OptionGroup label="エリア">
          <button
            type="button"
            className={`pill${pending.prefecture === "" ? " is-active" : ""}`}
            aria-pressed={pending.prefecture === ""}
            onClick={() => set("prefecture", "")}
          >
            すべて
          </button>
          {PREFECTURES.map((prefecture) => (
            <button
              key={prefecture}
              type="button"
              className={`pill${pending.prefecture === prefecture ? " is-active" : ""}`}
              aria-pressed={pending.prefecture === prefecture}
              onClick={() => set("prefecture", pending.prefecture === prefecture ? "" : prefecture)}
            >
              {prefectureShort[prefecture]}
            </button>
          ))}
        </OptionGroup>

        <OptionGroup label="誰と行く？">
          {COMPANION_OPTIONS.map((option) => (
            <button
              key={option.value || "any"}
              type="button"
              className={`pill${pending.companion === option.value ? " is-active" : ""}`}
              aria-pressed={pending.companion === option.value}
              onClick={() => set("companion", option.value)}
            >
              {option.label}
            </button>
          ))}
        </OptionGroup>

        <OptionGroup label="屋内・屋外">
          {indoorOptions.map((option) => (
            <button
              key={option.value || "any"}
              type="button"
              className={`pill${pending.indoorType === option.value ? " is-active" : ""}`}
              aria-pressed={pending.indoorType === option.value}
              onClick={() => set("indoorType", option.value)}
            >
              {option.label}
            </button>
          ))}
        </OptionGroup>

        <OptionGroup label="料金">
          {priceOptions.map((option) => (
            <button
              key={option.value || "any"}
              type="button"
              className={`pill${pending.priceType === option.value ? " is-active" : ""}`}
              aria-pressed={pending.priceType === option.value}
              onClick={() => set("priceType", option.value)}
            >
              {option.label}
            </button>
          ))}
        </OptionGroup>

        <OptionGroup label="子どもの年齢">
          {ageOptions.map((option) => (
            <button
              key={option.value || "any"}
              type="button"
              className={`pill${pending.targetAge === option.value ? " is-active" : ""}`}
              aria-pressed={pending.targetAge === option.value}
              onClick={() => set("targetAge", option.value)}
            >
              {option.label}
            </button>
          ))}
        </OptionGroup>

        <OptionGroup label="設備・条件">
          {facilityOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`pill${pending[option.key] ? " is-active" : ""}`}
              aria-pressed={pending[option.key]}
              onClick={() => set(option.key, !pending[option.key])}
            >
              {option.label}
            </button>
          ))}
        </OptionGroup>
      </div>
    </Sheet>
  )
}
