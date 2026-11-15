import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useAccess(userId?: string) {
  const [premium, setPremium] = useState(false)
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase || !userId) { setPremium(false); setAdmin(false); return }
      const { data } = await supabase.from('profiles').select('role, premium').eq('id', userId).maybeSingle()
      if (active && data) { setPremium(data.premium === true); setAdmin(data.role === 'owner') }
    }
    void load()
    return () => { active = false }
  }, [userId])
  return { premium, admin }
}
