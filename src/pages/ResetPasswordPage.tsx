import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage({ onComplete }: { onComplete?: () => void }) {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: resetError } = await supabase.auth.updateUser({ password: newPassword })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      if (onComplete) onComplete()
      navigate('/')
    }, 2000)
    setLoading(false)
  }

  const handleBack = () => {
    if (onComplete) onComplete()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '40px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #ed1c24, #fcaf17)' }} />
          <span style={{ fontSize: '22px', fontWeight: '700', color: '#2c2c2b', letterSpacing: '-0.3px' }}>Project Planner</span>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e5e7eb', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2c2c2b', marginBottom: '4px' }}>Set new password</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>Choose a strong password for your account</p>

          {success ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', fontSize: '14px', color: '#16a34a', textAlign: 'center' }}>
              Password updated! Redirecting you to the app...
            </div>
          ) : (
            <form onSubmit={handleReset}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters" required minLength={8}
                  style={{ width: '100%', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  onFocus={e => (e.target.style.borderColor = '#ed1c24')}
                  onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password" required
                  style={{ width: '100%', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  onFocus={e => (e.target.style.borderColor = '#ed1c24')}
                  onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#ef4444' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ width: '100%', background: loading ? '#9ca3af' : '#ed1c24', color: 'white', fontSize: '14px', fontWeight: '600', padding: '11px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '16px' }}>
            <button onClick={handleBack}
              style={{ background: 'none', border: 'none', fontSize: '13px', color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>
              ← Back to sign in
            </button>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#9ca3af', marginTop: '24px' }}>
          PawPaw Creative School of Business
        </p>
      </div>
    </div>
  )
}