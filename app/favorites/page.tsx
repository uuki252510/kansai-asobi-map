import { redirect } from "next/navigation"

// マイページの「行きたい」タブへ統合 (URL互換のため残置)
export default function FavoritesPage() {
  redirect("/mypage?tab=want")
}
