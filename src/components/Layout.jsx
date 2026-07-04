import { Outlet, NavLink } from 'react-router-dom'
import { Settings, Sun, Moon, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRoom } from '../context/RoomContext'
import ExpandableTabs from './ui/ExpandableTabs'

export default function Layout() {
  const { room, leaveRoom } = useRoom()
  const [dark, setDark] = useState(() => localStorage.getItem('nh_dark') === 'true')

  useEffect(() => {
    document.body.classList.toggle('dark', dark)
    localStorage.setItem('nh_dark', dark)
  }, [dark])

  return (
    <div className="app-layout">
      <header className="app-header">
        <span className="app-title">{room?.name1 || 'N'}&{room?.name2 || 'H'}</span>
        <NavLink to="/parametres" className="header-settings">
          <Settings size={20} />
        </NavLink>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <div className="bottom-nav-blur">
        <div className="bottom-actions">
          <button className="bottom-action-btn" onClick={() => setDark(!dark)} title={dark ? 'Mode clair' : 'Mode sombre'}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <ExpandableTabs />
        <div className="bottom-actions right">
          <button className="bottom-action-btn" onClick={leaveRoom} title="Changer d'espace">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
