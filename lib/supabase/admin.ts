import 'server-only'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

// Service-role client that bypasses RLS. Used for billing writes (Stripe
// webhook/checkout) — end users must never be able to edit their own
// plan/stripe columns (enforced by RLS in migration 0003).
let admin: SupabaseClient | null = null

export function getAdminSupabase(): SupabaseClient {
  if (admin) return admin
  admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  )
  return admin
}
