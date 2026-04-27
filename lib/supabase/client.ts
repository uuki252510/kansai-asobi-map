import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

let _supabase: ReturnType<typeof createClient<Database>> | null = null

export function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Supabase env vars not set')
    _supabase = createClient<Database>(url, key)
  }
  return _supabase
}

export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getSupabase() as any)[prop]
  },
})
