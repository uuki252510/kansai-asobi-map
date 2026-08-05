import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "デカケル",
    short_name: "デカケル",
    description: "関西のおでかけスポットを、天気・エリア・誰と行くかで探せるポータル。",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f6",
    theme_color: "#ef6248",
    lang: "ja",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
