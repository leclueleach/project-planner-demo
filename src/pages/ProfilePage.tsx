import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { User } from 'lucide-react'

export default function ProfilePage({ mustChange = false }: { mustChange?: boolean }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('app_users').select('*').eq('auth_id', user.id).single()
      if (data) {
        setName(data.name)
        setEmail(data.email)
        setUserId(data.id)
      }
    }
    loadUser()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validate password if changing
    if (newPassword) {
      if (newPassword.length < 8) {
        setError('New password must be at least 8 characters.')
        setLoading(false)
        return
      }
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match.')
        setLoading(false)
        return
      }
      if (mustChange && !newPassword) {
        setError('You must set a new password before continuing.')
        setLoading(false)
        return
      }
    }

    if (mustChange && !newPassword) {
      setError('You must set a new password before continuing.')
      setLoading(false)
      return
    }

    try {
      // Update name and email in app_users
      const { error: dbError } = await supabase.from('app_users').update({ name, email }).eq('id', userId)
      if (dbError) throw dbError

      // Update email in auth if changed
      const { data: { user } } = await supabase.auth.getUser()
      if (user && email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email })
        if (emailError) throw emailError
      }

      // Update password if provided
      if (newPassword) {
        const { error: passError } = await supabase.auth.updateUser({ password: newPassword })
        if (passError) throw passError

        // Clear must_change_password flag
        await supabase.from('app_users').update({ must_change_password: false }).eq('id', userId)
      }

      setSuccess('Profile updated successfully!')
      setNewPassword('')
      setConfirmPassword('')

      if (mustChange) {
        setTimeout(() => navigate('/'), 1500)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile. Please try again.')
    }

    setLoading(false)
  }

  return (
    <div>
      {mustChange && (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', fontSize: '14px', color: '#92400e' }}>
          <strong>Welcome!</strong> Please update your profile and set a new password before continuing.
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Update your personal details and password</p>
        </div>
      </div>

      <div style={{ maxWidth: '500px' }}>
        <form onSubmit={handleSave}>
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #ed1c24, #fcaf17)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', color: 'white' }}>
              {name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : <User size={24} />}
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#2c2c2b' }}>{name}</div>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>{email}</div>
            </div>
          </div>

          {/* Name */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#2c2c2b', marginBottom: '16px' }}>Personal Details</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                style={{ width: '100%', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = '#ed1c24')}
                onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width: '100%', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = '#ed1c24')}
                onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
            </div>
          </div>

          {/* Password */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#2c2c2b', marginBottom: '4px' }}>
              {mustChange ? 'Set New Password' : 'Change Password'}
            </h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px' }}>
              {mustChange ? 'You must set a new password to continue.' : 'Leave blank to keep your current password.'}
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                required={mustChange} minLength={8} placeholder="Minimum 8 characters"
                style={{ width: '100%', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = '#ed1c24')}
                onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                required={mustChange} placeholder="Repeat new password"
                style={{ width: '100%', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = '#ed1c24')}
                onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#ef4444' }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#16a34a' }}>
              {success}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : mustChange ? 'Save & Continue' : 'Save Changes'}
            </button>
            {!mustChange && (
              <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}