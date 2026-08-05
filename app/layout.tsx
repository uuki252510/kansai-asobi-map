import type { Metadata } from "next"
import { M_PLUS_Rounded_1c, Noto_Sans_JP } from "next/font/google"
import "./globals.css"

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
  variable: "--font-noto-sans-jp",
})

const mPlusRounded = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["700", "900"],
  display: "swap",
  variable: "--font-m-plus-rounded",
})
import Header from "@/components/Header"
import MobileBottomNav from "@/components/MobileBottomNav"
import BrandMark from "@/components/BrandMark"

export const metadata: Metadata = {
  metadataBase: new URL("https://kansai.asobi.nexia-llc.jp"),
  applicationName: "デカケル",
  manifest: "/manifest.webmanifest",
  title: {
    default: "デカケル｜関西のおでかけスポットを今日からさがせる",
    template: "%s｜デカケル",
  },
  description:
    "関西6府県のおでかけスポットを、天気・エリア・誰と行くかで探せるポータル。今日行ける場所、雨の日OK、無料スポットもすぐ見つかります。",
  keywords: ["関西", "おでかけ", "遊び場", "デート", "子ども", "雨の日", "今日行ける", "大阪", "兵庫", "京都", "奈良", "滋賀", "和歌山"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "デカケル",
    title: "デカケル｜関西のおでかけが、今日決まる。",
    description:
      "天気・エリア・気分から、関西のおでかけ先がすぐ決まるポータルサイトです。",
    url: "https://kansai.asobi.nexia-llc.jp",
  },
  twitter: {
    card: "summary_large_image",
    title: "デカケル｜関西のおでかけスポットを今日からさがせる",
    description: "関西のおでかけが、今日決まる。天気とエリアからすぐ探せます。",
  },
  // icon.tsx / apple-icon.tsx (file convention) が自動でリンクされる
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`h-full antialiased ${notoSansJP.variable} ${mPlusRounded.variable}`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">
        {/* JSがある環境だけスクロールRevealの初期非表示を有効化 (no-JS/SEO安全) */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <a href="#main-content" className="site-skip-link">
          メインコンテンツへ移動
        </a>
        <div className="relative flex min-h-screen flex-col pb-24 md:pb-0">
          <Header />
          <div id="main-content" tabIndex={-1} className="flex-1">{children}</div>
          <footer className="mt-16 hidden border-t border-line bg-surface md:block">
            <div className="page-shell flex flex-col gap-7 py-10 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <BrandMark />
                <p className="mt-4 max-w-lg text-sm leading-7 text-ink-soft">
                  関西6府県のスポット情報から、今日の天気や気分に合うおでかけ先を選びやすくします。
                </p>
              </div>
              <div className="text-xs leading-6 text-ink-soft lg:text-right">
                <p>営業時間・料金・設備は情報確認日をご確認ください。</p>
                <p>不明な情報は推測せず「要確認」と表示します。</p>
              </div>
            </div>
          </footer>
          <MobileBottomNav />
        </div>
      </body>
    </html>
  )
}
