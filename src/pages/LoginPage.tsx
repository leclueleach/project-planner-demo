import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
  
   
const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })


    if (authError) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

    if (data.user) {
        const { data: appUser, error: appUserError } = await supabase
          .from('app_users')
          .select('status, deleted_at')
          .eq('auth_id', data.user.id)
          .single()
      
        
      
        if (appUserError || !appUser) {
          await supabase.auth.signOut()
          setError('Your account was not found. Please contact your administrator.')
          setLoading(false)
          return
        }
      
        if (appUser.deleted_at) {
          await supabase.auth.signOut()
          setError('Your account has been removed. Please contact your administrator.')
          setLoading(false)
          return
        }
      
        if (appUser.status === 'suspended') {
          await supabase.auth.signOut()
          setError('Your account has been suspended. Please contact your administrator.')
          setLoading(false)
          return
        }
      
        onLogin()
      }

    setLoading(false)
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
  
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://project-planner-ashy.vercel.app',
    })
  
    if (resetError) {
      setError(resetError.message)
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '40px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #ed1c24, #fcaf17)' }} />
          <span style={{ fontSize: '22px', fontWeight: '700', color: '#2c2c2b', letterSpacing: '-0.3px' }}>Project Planner</span>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e5e7eb', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {resetMode ? (
            <>
              <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2c2c2b', marginBottom: '4px' }}>Reset password</h1>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
                Enter your email and we'll send you a reset link
              </p>

              {resetSent ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', fontSize: '14px', color: '#16a34a', marginBottom: '16px' }}>
                  Reset email sent! Check your inbox.
                </div>
              ) : (
                <form onSubmit={handleReset}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Email</label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" required
                      style={{ width: '100%', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      onFocus={e => (e.target.style.borderColor = '#ed1c24')}
                      onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                    />
                  </div>

                  {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#ef4444' }}>
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    style={{ width: '100%', background: loading ? '#9ca3af' : '#ed1c24', color: 'white', fontSize: '14px', fontWeight: '600', padding: '11px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {loading ? 'Sending...' : 'Send reset email'}
                  </button>
                </form>
              )}

              <button onClick={() => { setResetMode(false); setResetSent(false); setError('') }}
                style={{ width: '100%', marginTop: '12px', background: 'none', border: 'none', fontSize: '13px', color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>
                ← Back to sign in
              </button>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2c2c2b', marginBottom: '4px' }}>Welcome back</h1>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>Sign in to your account</p>

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required
                    style={{ width: '100%', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    onFocus={e => (e.target.style.borderColor = '#ed1c24')}
                    onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                  />
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    style={{ width: '100%', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    onFocus={e => (e.target.style.borderColor = '#ed1c24')}
                    onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                  />
                </div>

                <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                  <button type="button" onClick={() => { setResetMode(true); setError('') }}
                    style={{ background: 'none', border: 'none', fontSize: '13px', color: '#ed1c24', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Forgot password?
                  </button>
                </div>

                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#ef4444' }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  style={{ width: '100%', background: loading ? '#9ca3af' : '#ed1c24', color: 'white', fontSize: '14px', fontWeight: '600', padding: '11px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#9ca3af', marginTop: '24px' }}>
          PawPaw Creative School of Business
        </p>
      </div>
    </div>
  )
}