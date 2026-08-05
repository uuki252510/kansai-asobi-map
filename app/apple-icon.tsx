import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

/**
 * デカケルのアイコン: 4色ドット + 出発の黄三角 (フォント非依存のモチーフ)。
 */
export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", borderRadius: 40 }}>
      <div style={{ position: "relative", display: "flex", flexWrap: "wrap", width: 104, height: 104, gap: 12 }}>
        <div style={{ width: 46, height: 46, background: "#2B9FE8", borderRadius: "58% 42% 55% 45%" }} />
        <div style={{ width: 46, height: 46, background: "#F0782C", borderRadius: "45% 55% 48% 52%" }} />
        <div style={{ width: 46, height: 46, background: "#54B838", borderRadius: "52% 48% 45% 55%" }} />
        <div style={{ width: 46, height: 46, background: "#FFC212", borderRadius: "48% 52% 58% 42%" }} />
        <div
          style={{
            position: "absolute",
            top: -22,
            right: -18,
            width: 0,
            height: 0,
            borderLeft: "16px solid transparent",
            borderBottom: "26px solid #FFC212",
            transform: "rotate(38deg)",
          }}
        />
      </div>
    </div>,
    { ...size },
  )
}
