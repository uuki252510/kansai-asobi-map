import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // /api を塞ぎつつ、スポット画像だけは許可する。
        // OGP と構造化データの image が /api/place-image/{id} を指しており、
        // 塞いだままだと検索結果にサムネイルが出ない
        allow: ["/", "/api/place-image/"],
        // 個人化ページはクロール対象から外す
        disallow: ["/admin", "/api", "/vote", "/mypage", "/favorites", "/history"],
      },
    ],
    sitemap: "https://kansai.asobi.nexia-llc.jp/sitemap.xml",
    host: "https://kansai.asobi.nexia-llc.jp",
  }
}
