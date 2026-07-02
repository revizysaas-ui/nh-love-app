import { NavLink, Outlet } from 'react-router-dom'
import { Heart, MessageCircle, Image, MapPin, PenLine, Gamepad2, Menu, X } from 'lucide-react'
import { useState } from 'react'

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

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Heart size={28} className="sidebar-icon" />
          <span className="sidebar-title">N&H</span>
        </div>
        <nav className="sidebar-nav">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <l.icon size={20} />
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <header className="mobile-header">
        <button onClick={() => setMenuOpen(true)} className="menu-btn">
          <Menu size={24} />
        </button>
        <span className="mobile-title">N&H</span>
        <div style={{ width: 40 }} />
      </header>

      {menuOpen && (
        <div className="drawer-overlay" onClick={() => setMenuOpen(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <Heart size={24} />
              <span>N&H</span>
              <button onClick={() => setMenuOpen(false)}><X size={24} /></button>
            </div>
            <nav className="drawer-nav">
              {links.map(l => (
                <NavLink key={l.to} to={l.to} className="drawer-item" onClick={() => setMenuOpen(false)}>
                  <l.icon size={20} />
                  <span>{l.label}</span>
                </NavLink>
              ))}
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
