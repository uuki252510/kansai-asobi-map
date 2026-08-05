"use client"

import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import type { ReactNode } from "react"

/**
 * ボトムシート (モバイル) / センターダイアログ (デスクトップ)。
 * @base-ui/react の Dialog を薄くラップする。
 */
export default function Sheet({
  open,
  onOpenChange,
  title,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" />
        <Dialog.Popup className="sheet-panel md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:max-h-[80dvh] md:w-[560px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-surface px-5 py-4">
            <Dialog.Title className="text-base font-black text-ink">{title}</Dialog.Title>
            <Dialog.Close className="btn-ghost !min-h-10 !px-2" aria-label="閉じる">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <div className="px-5 py-4">{children}</div>
          {footer && (
            <div className="sticky bottom-0 border-t border-line bg-surface px-5 py-3">{footer}</div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
