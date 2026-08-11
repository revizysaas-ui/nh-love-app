import { Outlet, NavLink } from 'react-router-dom'
import { Settings, Sun, Moon, Lock, Heart } from 'lucide-react'
import { useState, useEffect, Suspense } from 'react'
import { useRoom } from '../context/RoomContext'
import ExpandableTabs from './ui/ExpandableTabs'

export default function Layout() {
  const { room } = useRoom()
  const [dark, setDark] = useState(() => localStorage.getItem('nh_dark') === 'true')
  useEffect(() => {
    document.body.classList.toggle('dark', dark)
    localStorage.setItem('nh_dark', dark)
  }, [dark])

  const hasLock = !!room?.app_lock

  return (
    <div className="app-layout">
      <header className="app-header">
        <button className="header-theme" onClick={() => setDark(!dark)} title={dark ? 'Mode clair' : 'Mode sombre'}>
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <span className="header-brand">
          <Heart size={18} className="header-heart" fill="currentColor" />
          <span className="app-title">{room?.name1 || 'N'}&{room?.name2 || 'H'}</span>
        </span>
        <NavLink to="/parametres" className="header-settings">
          <Settings size={20} />
        </NavLink>
      </header>

      <main className="main-content">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>

      <div className="bottom-nav-blur">
        <div className="nav-pill">
          <ExpandableTabs />
          {hasLock && (
            <button
              className="nav-lock"
              onClick={() => window.dispatchEvent(new Event('nh-lock-app'))}
              title="Verrouiller"
            >
              <Lock size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
