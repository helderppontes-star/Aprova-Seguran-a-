import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// A chave anon é pública por definição; nunca coloque a service_role no frontend.
export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const isSupabaseConfigured = Boolean(supabase)
