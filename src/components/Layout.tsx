import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LayoutDashboard, Settings, LogOut, UserCircle, History, BarChart2 } from 'lucide-react'

export default function Layout() {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-logo" />
          <span className="nav-title">Project Planner</span>
        </div>
        <div className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <LayoutDashboard size={16} />
            Departments
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Settings size={16} />
            Settings
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <UserCircle size={16} />
            Profile
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
  <History size={16} />
  History
</NavLink>
<NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
  <BarChart2 size={16} />
  Dashboard
</NavLink>
          <button onClick={handleSignOut} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </nav>
      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}