import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase, setAuditUser } from './lib/supabase'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DepartmentsPage from './pages/DepartmentsPage'
import DepartmentPage from './pages/DepartmentPage'
import ProjectPage from './pages/ProjectPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import HistoryPage from './pages/HistoryPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'

function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [isPasswordReset, setIsPasswordReset] = useState(false)

  const checkMustChange = async (authId: string) => {
    await setAuditUser(authId)
    const { data, error } = await supabase
      .from('app_users')
      .select('must_change_password')
      .eq('auth_id', authId)
      .single()
    console.log('checkMustChange:', { authId, data, error })
    setMustChangePassword(data?.must_change_password || false)
  }

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordReset(true)
        setLoading(false)
        return
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setIsPasswordReset(false)
        setSession(session)
        if (session) checkMustChange(session.user.id)
        setLoading(false)
      }
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setIsPasswordReset(false)
        setLoading(false)
      }
    })
  
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkMustChange(session.user.id)
      setLoading(false)
    })
  }, [])

  const handleLogin = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setSession(session)
    if (session) checkMustChange(session.user.id)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (isPasswordReset) return <ResetPasswordPage onComplete={() => setIsPasswordReset(false)} />
  if (!session) return <LoginPage onLogin={handleLogin} />

  if (mustChangePassword) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <nav className="nav">
          <div className="nav-brand">
            <div className="nav-logo" />
            <span className="nav-title">Project Planner</span>
          </div>
        </nav>
        <main className="page">
          <ProfilePage mustChange={true} />
        </main>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DepartmentsPage />} />
        <Route path="departments/:id" element={<DepartmentPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="projects/:id" element={<ProjectPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="history" element={<HistoryPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App