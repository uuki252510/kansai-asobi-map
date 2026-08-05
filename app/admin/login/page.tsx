"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { LockKeyhole, ShieldCheck } from "lucide-react"

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      const from = params.get("from") ?? "/admin"
      router.push(from)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? "ログインに失敗しました")
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-page flex min-h-[calc(100dvh-9rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="admin-login-note">
          <ShieldCheck className="size-4" />
          <span>運営スタッフ専用エリア</span>
        </div>
        <section className="admin-login-card card-v2 rounded-[28px] p-7 sm:p-9" aria-labelledby="admin-login-title">
          <span className="admin-login-icon"><LockKeyhole className="size-5" /></span>
          <p className="section-kicker mt-5">Staff access</p>
          <h1 id="admin-login-title" className="mt-2 text-3xl font-black tracking-[-0.045em] text-foreground">管理画面</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">スポット情報を管理するため、パスワードを入力してください。</p>
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block text-sm font-black text-foreground" htmlFor="admin-password">
              パスワード
              <input
                id="admin-password"
                name="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                autoComplete="current-password"
                className="mt-2 h-12 w-full rounded-xl border border-input bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-destructive" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? "確認中…" : "ログイン"}
            </button>
          </form>
          <p className="mt-5 text-center text-[0.65rem] leading-5 text-muted-foreground">認証情報は暗号化されたCookieで確認されます。</p>
        </section>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
