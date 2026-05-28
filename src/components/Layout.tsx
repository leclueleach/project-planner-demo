import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Settings, History, BarChart2, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LayoutDashboard, Settings, History, BarChart2, ChevronRight, UserCircle } from 'lucide-react'

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const fetchNextReset = async () => {
      const { data } = await supabase
        .from('reset_log')
        .select('next_reset_at')
        .order('reset_at', { ascending: false })
        .limit(1)
        .single()

      if (!data) return

      const tick = () => {
        const now = new Date().getTime()
        const reset = new Date(data.next_reset_at).getTime()
        const diff = reset - now
        if (diff <= 0) { setTimeLeft('Resetting...'); return }
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
      }

      tick()
      const interval = setInterval(tick, 1000)
      return () => clearInterval(interval)
    }

    fetchNextReset()
  }, [])

  return timeLeft
}

function WelcomeModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'white', borderRadius: '20px', maxWidth: '560px', width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #ed1c24, #fcaf17)', padding: '32px 32px 28px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '24px' }}>📋</span>
            </div>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'white', margin: 0 }}>Project Planner</h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: 0 }}>Interactive Demo</p>
            </div>
          </div>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.95)', lineHeight: '1.6', margin: 0 }}>
            Welcome! This is a fully interactive demo of Project Planner — a project management tool built for teams to track work across departments, components and tasks.
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '28px 32px' }}>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px', lineHeight: '1.6' }}>
            Everything you see here is real data you can interact with. Feel free to explore, add projects, update statuses and see how the progress tracking works.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {[
              { icon: '📊', title: 'Dashboard', desc: 'See overall progress across all departments and projects' },
              { icon: '🏢', title: 'Departments', desc: 'Browse departments and drill into individual projects' },
              { icon: '✅', title: 'Projects', desc: 'Manage components, issues and track dates and statuses' },
              { icon: '⚙️', title: 'Settings', desc: 'Configure statuses, staff and non-working days' },
              { icon: '📜', title: 'History', desc: 'See a full audit log of all changes made in the app' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#2c2c2b', marginBottom: '2px' }}>{item.title}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fef3c7', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px', fontSize: '13px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⏱️</span>
            <span>All demo data resets every 24 hours so feel free to make any changes!</span>
          </div>

          <button onClick={onClose}
            style={{ width: '100%', background: '#ed1c24', color: 'white', fontSize: '15px', fontWeight: '600', padding: '13px', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit' }}>
            Start Exploring <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Layout() {
  const timeLeft = useCountdown()
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    const seen = sessionStorage.getItem('demo-welcome-seen')
    if (!seen) {
      setShowWelcome(true)
    }
  }, [])

  const handleClose = () => {
    sessionStorage.setItem('demo-welcome-seen', 'true')
    setShowWelcome(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {showWelcome && <WelcomeModal onClose={handleClose} />}

      {/* Demo Banner */}
      <div style={{ background: 'linear-gradient(135deg, #ed1c24, #fcaf17)', padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>🎮 Demo Mode</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>— Feel free to explore and interact. All data resets every 24 hours.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {timeLeft && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>Resets in:</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'white', fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '6px' }}>{timeLeft}</span>
            </div>
          )}
          <button onClick={() => setShowWelcome(true)}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '12px', fontWeight: '500', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>
            ? Help
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', color: 'white', letterSpacing: '-0.5px' }}>PP</div>
          <span className="nav-title">Project Planner</span>
        </div>
        <div className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <BarChart2 size={16} />
            Dashboard
          </NavLink>
          <NavLink to="/departments" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <LayoutDashboard size={16} />
            Departments
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Settings size={16} />
            Settings
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <History size={16} />
            History
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
  <UserCircle size={16} />
  Profile
</NavLink>
        </div>
      </nav>

      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}
