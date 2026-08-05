import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * service role 専用クライアント。RLSをバイパスするため、
 * 必ず admin 認証 (lib/admin-auth.ts) を通過したサーバーコードからのみ呼ぶこと。
 * anon key へのフォールバックは意図的に行わない。
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}
