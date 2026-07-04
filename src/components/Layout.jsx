import { NavLink, Outlet } from 'react-router-dom'
import { Heart, MessageCircle, Image, MapPin, PenLine, Gamepad2, Settings, Menu, X, LogOut, Moon, Sun } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRoom } from '../context/RoomContext'

const links = [
  { to: '/', icon: Heart, label: 'Accueil' },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/galerie', icon: Image, label: 'Galerie' },
  { to: '/carte', icon: MapPin, label: 'Carte' },
  { to: '/dessin', icon: PenLine, label: 'Dessin' },
  { to: '/jeux', icon: Gamepad2, label: 'Jeux' },
]

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('nh_dark') === 'true')
  const { room, leaveRoom } = useRoom()

  useEffect(() => {
    document.body.classList.toggle('dark', dark)
    localStorage.setItem('nh_dark', dark)
  }, [dark])

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Heart size={28} className="sidebar-icon" />
          <span className="sidebar-title">{room?.name1 || 'N'}&{room?.name2 || 'H'}</span>
        </div>
        <nav className="sidebar-nav">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <l.icon size={20} />
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <NavLink to="/parametres" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Settings size={20} />
          <span>Paramètres</span>
        </NavLink>
        <button className="nav-item" onClick={() => setDark(!dark)}>
          {dark ? <Sun size={20} /> : <Moon size={20} />}
          <span>{dark ? 'Mode clair' : 'Mode sombre'}</span>
        </button>
        <button className="nav-item logout-btn" onClick={leaveRoom}>
          <LogOut size={20} />
          <span>Changer d&apos;espace</span>
        </button>
      </aside>

      <header className="mobile-header">
        <button onClick={() => setMenuOpen(true)} className="menu-btn">
          <Menu size={24} />
        </button>
        <span className="mobile-title">{room?.name1 || 'N'}&{room?.name2 || 'H'}</span>
        <NavLink to="/parametres" className="menu-btn">
          <Settings size={20} />
        </NavLink>
      </header>

      {menuOpen && (
        <div className="drawer-overlay" onClick={() => setMenuOpen(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <Heart size={24} />
              <span>{room?.name1 || 'N'}&{room?.name2 || 'H'}</span>
              <button onClick={() => setMenuOpen(false)}><X size={24} /></button>
            </div>
            <nav className="drawer-nav">
              {links.map(l => (
                <NavLink key={l.to} to={l.to} className="drawer-item" onClick={() => setMenuOpen(false)}>
                  <l.icon size={20} />
                  <span>{l.label}</span>
                </NavLink>
              ))}
              <NavLink to="/parametres" className="drawer-item" onClick={() => setMenuOpen(false)}>
                <Settings size={20} />
                <span>Paramètres</span>
              </NavLink>
              <button className="drawer-item" onClick={() => setDark(!dark)}>
                {dark ? <Sun size={20} /> : <Moon size={20} />}
                <span>{dark ? 'Mode clair' : 'Mode sombre'}</span>
              </button>
              <button className="drawer-item logout-btn" onClick={leaveRoom}>
                <LogOut size={20} />
                <span>Changer d&apos;espace</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => isActive ? 'bottom-item active' : 'bottom-item'}>
            <l.icon size={20} />
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
