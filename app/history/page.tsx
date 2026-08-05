import { redirect } from "next/navigation"

// マイページの「行った」タブへ統合 (URL互換のため残置)
export default function HistoryPage() {
  redirect("/mypage?tab=visited")
}
