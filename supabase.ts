import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && anon && !url.includes('SEU-PROJETO'))
export const supabase = isConfigured
  ? createClient(url!, anon!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null

export type Profile = {
  id: string
  email: string | null
  is_admin: boolean
  premium_until: string | null
}

export type PremiumRequest = {
  id: string
  user_id: string
  email: string
  amount_cents: number
  status: 'pending' | 'approved' | 'rejected'
  transaction_reference: string | null
  created_at: string
  reviewed_at: string | null
}
