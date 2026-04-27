import type { Metadata } from "next"
import "./globals.css"
import Header from "@/components/Header"

export const metadata: Metadata = {
  metadataBase: new URL("https://kansai.asobi.nexia-llc.jp"),
  title: {
    default: "あそびば関西 | 関西の子連れ遊び場を探す",
    template: "%s | あそびば関西",
  },
  description:
    "大阪・兵庫・京都・奈良・滋賀・和歌山の子ども向け遊び場を検索。雨の日OK・無料・屋内など条件で絞り込み。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "あそびば関西",
    title: "あそびば関西 | 関西の子連れ遊び場を探す",
    description:
      "大阪・兵庫・京都・奈良・滋賀・和歌山の子ども向け遊び場を検索。雨の日OK・無料・屋内など条件で絞り込み。",
    url: "https://kansai.asobi.nexia-llc.jp",
  },
  twitter: {
    card: "summary_large_image",
    title: "あそびば関西 | 関西の子連れ遊び場を探す",
    description:
      "大阪・兵庫・京都・奈良・滋賀・和歌山の子ども向け遊び場を検索。雨の日OK・無料・屋内など条件で絞り込み。",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ja"
      className="h-full antialiased"
      style={
        {
          "--font-body":
            '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Yu Gothic", Meiryo, sans-serif',
          "--font-display":
            '"Yu Mincho", "Hiragino Mincho ProN", "BIZ UDPMincho", "Times New Roman", serif',
        } as React.CSSProperties
      }
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <div className="flex-1">{children}</div>
          <footer className="mt-20 border-t border-border/80 bg-white/70 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.28em] text-muted-foreground">
                  Kansai Family Guide
                </p>
                <p className="mt-2 flex items-baseline gap-2 text-lg font-semibold tracking-tight text-foreground">
                  <span>あそびば</span>
                  <span className="font-heading text-xl text-[var(--brand-clay)]">
                    関西
                  </span>
                </p>
                <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                  関西エリアの子ども向け遊び場情報を、週末の動きやすさを軸にまとめた検索サイトです。
                </p>
              </div>
              <div className="max-w-sm text-sm leading-6 text-muted-foreground sm:text-right">
                <p>雨の日、無料、屋内、年齢別などの条件で絞り込みできます。</p>
                <p className="mt-2 text-xs">
                  掲載情報はサンプルデータです。営業時間・料金は各施設にご確認ください。
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
