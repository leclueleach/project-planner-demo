/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: import.meta.env.VITE_DEMO_MODE === 'true' ? 'demo' : 'public' }
})

export const setAuditUser = async (_authId: string) => {
  // No-op in demo mode
}
