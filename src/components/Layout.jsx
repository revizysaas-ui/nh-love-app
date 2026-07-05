import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Settings, Sun, Moon, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRoom } from '../context/RoomContext'
import ExpandableTabs from './ui/ExpandableTabs'

export default function Layout() {
  const { room, leaveRoom } = useRoom()
  const [dark, setDark] = useState(() => localStorage.getItem('nh_dark') === 'true')
  const location = useLocation()

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
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="bottom-nav-blur">
        <div className="bottom-actions">
          <button className="bottom-action-btn" onClick={() => setDark(!dark)} title={dark ? 'Mode clair' : 'Mode sombre'}>
            {dark ? <Sun size={22} /> : <Moon size={22} />}
          </button>
        </div>
        <ExpandableTabs />
        <div className="bottom-actions right">
          <button className="bottom-action-btn" onClick={leaveRoom} title="Changer d'espace">
            <LogOut size={22} />
          </button>
        </div>
      </div>
    </div>
  )
}
