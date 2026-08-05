import { ImageResponse } from "next/og"

export const alt = "デカケル｜関西のおでかけが、今日決まる。"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const COLORS = { de: "#2B9FE8", ka: "#F0782C", ke: "#54B838", ru: "#FFC212" }

export default async function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg, #c3e9f4, #d9f4e6)", fontFamily: "sans-serif", padding: 64 }}>
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#ffffff", borderRadius: 48, padding: 60 }}>
        <div style={{ display: "flex", fontSize: 148, fontWeight: 900, letterSpacing: "-4px", lineHeight: 1 }}>
          <span style={{ color: COLORS.de }}>デ</span>
          <span style={{ color: COLORS.ka }}>カ</span>
          <span style={{ color: COLORS.ke }}>ケ</span>
          <span style={{ color: COLORS.ru }}>ル</span>
        </div>
        <div style={{ display: "flex", width: 420, height: 14, marginTop: 6, background: "linear-gradient(90deg, transparent, #F9A825)", borderRadius: 999, transform: "rotate(-2deg)" }} />
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#12383c", marginTop: 44 }}>関西のおでかけが、今日決まる。</div>
        <div style={{ display: "flex", fontSize: 26, color: "#4c7276", marginTop: 18 }}>天気・エリア・気分から、行き先がすぐ見つかる</div>
      </div>
    </div>,
    { ...size },
  )
}
