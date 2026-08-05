import type { Metadata } from "next"
import TodayForm from "@/components/TodayForm"

export const metadata: Metadata = {
  title: "今日のおすすめ条件",
  description: "同行者、気分、予算、移動時間をタップして、関西で今日行けるおすすめスポットを3つに絞ります。",
  alternates: { canonical: "/today" },
}

export default function TodayPage() {
  return <TodayForm />
}
