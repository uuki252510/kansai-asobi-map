import { ImageResponse } from "next/og"

export const size = { width: 512, height: 512 }
export const contentType = "image/png"

/**
 * デカケルのアイコン: 4色ドット + 出発の黄三角 (フォント非依存のモチーフ)。
 */
export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", borderRadius: 96 }}>
      <div style={{ position: "relative", display: "flex", flexWrap: "wrap", width: 288, height: 288, gap: 32 }}>
        <div style={{ width: 128, height: 128, background: "#2B9FE8", borderRadius: "58% 42% 55% 45%" }} />
        <div style={{ width: 128, height: 128, background: "#F0782C", borderRadius: "45% 55% 48% 52%" }} />
        <div style={{ width: 128, height: 128, background: "#54B838", borderRadius: "52% 48% 45% 55%" }} />
        <div style={{ width: 128, height: 128, background: "#FFC212", borderRadius: "48% 52% 58% 42%" }} />
        <div
          style={{
            position: "absolute",
            top: -58,
            right: -46,
            width: 0,
            height: 0,
            borderLeft: "44px solid transparent",
            borderBottom: "72px solid #FFC212",
            transform: "rotate(38deg)",
          }}
        />
      </div>
    </div>,
    { ...size },
  )
}
