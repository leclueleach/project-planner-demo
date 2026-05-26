import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Missing environment variables' })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const { name, email, role, invitedBy, tempPassword } = req.body

    if (!name || !email || !tempPassword) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Create auth user with service role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true
    })

    if (authError) {
      return res.status(400).json({ error: authError.message })
    }

    // Create app_users record
    const { error: dbError } = await supabase.from('app_users').insert({
      name,
      email,
      role: role || 'member',
      status: 'active',
      auth_id: authData.user.id,
      invited_by: invitedBy || null,
      invited_at: new Date().toISOString(),
      must_change_password: true
    })

    if (dbError) {
      return res.status(400).json({ error: dbError.message })
    }

    return res.status(200).json({ success: true })
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Unknown error' })
  }
}




