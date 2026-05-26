import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export const setAuditUser = async (authId: string) => {
  const { data } = await supabase
    .from('app_users')
    .select('id')
    .eq('auth_id', authId)
    .single()
  if (data) {
    await supabase.rpc('set_current_user', { user_id: data.id })
  }
}