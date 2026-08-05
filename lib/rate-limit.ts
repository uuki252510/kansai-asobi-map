/**
 * プロセス内メモリの簡易レート制限。
 * 注意: サーバーレスではインスタンスごとに独立するため厳密な制限にはならない。
 * スパムの一次防波堤として使い、恒久対策は Upstash 等の外部ストアに置き換える。
 */
type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const MAX_KEYS = 10_000

export function checkRateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    // メモリ肥大の抑制: 上限に達したら期限切れを掃除する
    if (buckets.size >= MAX_KEYS) {
      for (const [existingKey, existing] of buckets) {
        if (existing.resetAt <= now) buckets.delete(existingKey)
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSeconds: 0 }
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count += 1
  return { ok: true, retryAfterSeconds: 0 }
}

export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? ""
  const ip = forwarded.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown"
  return `${scope}:${ip}`
}
