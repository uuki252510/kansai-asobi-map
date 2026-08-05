import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/vote"] },
    ],
    sitemap: "https://kansai.asobi.nexia-llc.jp/sitemap.xml",
    host: "https://kansai.asobi.nexia-llc.jp",
  }
}
