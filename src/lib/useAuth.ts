import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type AppUser = { id: string; email: string }

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      const current = data.session?.user
      setUser(current ? { id: current.id, email: current.email ?? '' } : null)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = session?.user
      setUser(current ? { id: current.id, email: current.email ?? '' } : null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error('Configure o Supabase para habilitar o acesso à conta.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }
  async function signUp(email: string, password: string) {
    if (!supabase) throw new Error('Configure o Supabase para habilitar o cadastro.')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }
  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
  }
  return { user, loading, signIn, signUp, signOut }
}
