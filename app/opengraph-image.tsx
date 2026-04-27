import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "あそびば関西"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 40%, #80deea 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 80, marginBottom: 24 }}>🌳</div>
        <div
          style={{
            fontSize: 58,
            fontWeight: "bold",
            color: "#0a3d52",
            marginBottom: 20,
            letterSpacing: "-1px",
          }}
        >
          あそびば関西
        </div>
        <div style={{ fontSize: 30, color: "#0e6080", marginBottom: 12 }}>
          週末、子どもとどこ行く？
        </div>
        <div
          style={{
            fontSize: 22,
            color: "#1a7a9e",
            background: "rgba(255,255,255,0.5)",
            borderRadius: 40,
            padding: "10px 28px",
            marginTop: 8,
          }}
        >
          関西6府県の子連れ遊び場を検索
        </div>
      </div>
    ),
    { ...size }
  )
}
