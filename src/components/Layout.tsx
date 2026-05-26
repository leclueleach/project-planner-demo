import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Settings, History, BarChart2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

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

        if (diff <= 0) {
          setTimeLeft('Resetting...')
          return
        }

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

export default function Layout() {
  const timeLeft = useCountdown()

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Demo Banner */}
      <div style={{ background: 'linear-gradient(135deg, #ed1c24, #fcaf17)', padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>🎮 Demo Mode</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>— Feel free to explore and interact. All data resets every 24 hours.</span>
        </div>
        {timeLeft && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>Resets in:</span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'white', fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '6px' }}>{timeLeft}</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-logo" />
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
        </div>
      </nav>

      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}
