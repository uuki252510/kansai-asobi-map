import type { Metadata } from "next"
import VoteClient from "@/components/VoteClient"

export const metadata: Metadata = {
  title: "みんなで投票",
  description: "おでかけ候補を共有して、みんなで行き先を決めます。",
  robots: { index: false, follow: false },
}

export default async function VotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <VoteClient token={id} />
}
