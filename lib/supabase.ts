import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

function makeClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => fn(),
      },
    }
  )
}

export const supabase = makeClient()

export function createClient() {
  return makeClient()
}
