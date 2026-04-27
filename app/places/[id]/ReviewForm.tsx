"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@supabase/supabase-js"
import { ImagePlus, X } from "lucide-react"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getVisitMonthOptions() {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}年${d.getMonth() + 1}月`
    options.push({ value, label: value })
  }
  return options
}

interface Props {
  placeId: string
}

export default function ReviewForm({ placeId }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [userName, setUserName] = useState("")
  const [childAge, setChildAge] = useState("")
  const [visitedAt, setVisitedAt] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError("画像は5MB以下にしてください")
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError("")
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function uploadImage(file: File): Promise<string | null> {
    const ext = file.name.split(".").pop() ?? "jpg"
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from("review-images")
      .upload(fileName, file, { contentType: file.type })
    if (uploadError) return null
    const { data } = supabase.storage.from("review-images").getPublicUrl(fileName)
    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userName.trim()) {
      setError("お名前を入力してください")
      return
    }
    setLoading(true)
    setError("")

    let imageUrl: string | null = null
    if (imageFile) {
      imageUrl = await uploadImage(imageFile)
      if (!imageUrl) {
        setError("画像のアップロードに失敗しました")
        setLoading(false)
        return
      }
    }

    const { error: err } = await supabase.from("reviews").insert({
      place_id: placeId,
      rating,
      comment: comment.trim() || null,
      user_name: userName.trim(),
      child_age: childAge.trim() || null,
      visited_at: visitedAt || null,
      image_url: imageUrl,
    })

    setLoading(false)
    if (err) {
      setError("投稿に失敗しました。しばらく待ってから再試行してください。")
      return
    }
    setSubmitted(true)
    router.refresh()
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
        <p className="text-2xl mb-2">🎉</p>
        <p className="text-sm font-medium text-green-700">口コミを投稿しました！次に行くママの参考になります。ありがとうございます。</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-sm">
      {/* 星評価 */}
      <div>
        <p className="text-sm font-medium text-foreground mb-2">この場所はどうでしたか？</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`text-2xl transition-transform hover:scale-110 ${n <= rating ? "text-yellow-400" : "text-gray-200"}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* お名前 */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-1">
          お名前 <span className="text-primary">*</span>
        </label>
        <Input
          value={userName}
          onChange={e => setUserName(e.target.value)}
          placeholder="例：ゆきママ"
          maxLength={20}
          className="rounded-xl"
        />
      </div>

      {/* 子どもの年齢 + 訪問時期 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            お子さんの年齢
            <span className="ml-1 text-[0.68rem] text-muted-foreground">（任意）</span>
          </label>
          <Input
            value={childAge}
            onChange={e => setChildAge(e.target.value)}
            placeholder="例：3歳・6歳"
            maxLength={20}
            className="rounded-xl"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            訪問時期
            <span className="ml-1 text-[0.68rem] text-muted-foreground">（任意）</span>
          </label>
          <select
            value={visitedAt}
            onChange={e => setVisitedAt(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">選択してください</option>
            {getVisitMonthOptions().map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* コメント */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-1">
          コメント
          <span className="ml-1 text-[0.68rem] text-muted-foreground">（任意）</span>
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="混雑具合、ベビーカーで回れたか、駐車場の空き具合など、次に行くママへのひと言を！"
          maxLength={300}
          rows={3}
          className="w-full text-sm border border-input rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      {/* 画像アップロード */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">
          写真
          <span className="ml-1 text-[0.68rem] text-muted-foreground">（任意・5MBまで）</span>
        </label>
        {imagePreview ? (
          <div className="relative w-full max-w-xs">
            <img
              src={imagePreview}
              alt="プレビュー"
              className="w-full h-40 object-cover rounded-xl border border-border"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow hover:bg-white transition-colors"
            >
              <X className="size-4 text-foreground" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 border-2 border-dashed border-border rounded-xl px-4 py-4 w-full text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <ImagePlus className="size-5" />
            写真を追加する
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-primary hover:bg-primary/90"
      >
        {loading ? "投稿中..." : "口コミを投稿する"}
      </Button>
    </form>
  )
}
