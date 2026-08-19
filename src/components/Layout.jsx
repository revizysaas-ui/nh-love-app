import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Settings, Sun, Moon, Lock, Heart, Play, Pause, SkipForward, X, Music, ChevronDown, Share2 } from 'lucide-react'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRoom } from '../context/RoomContext'
import { usePlayer } from '../context/PlayerContext'
import ExpandableTabs from './ui/ExpandableTabs'

export default function Layout() {
  const { room } = useRoom()
  const location = useLocation()
  const navigate = useNavigate()
  const { currentSong, playing, togglePlay, nextSong, stop, shareCurrentSong, incomingShare, acceptShare, dismissShare } = usePlayer()
  const [dark, setDark] = useState(() => localStorage.getItem('nh_dark') === 'true')
  const [showExitPopup, setShowExitPopup] = useState(false)
  const [miniCollapsed, setMiniCollapsed] = useState(() => {
    try { return localStorage.getItem('nh_mini_collapsed') === '1' } catch { return false }
  })
  const wasOnPlaylist = useRef(false)

  useEffect(() => {
    document.body.classList.toggle('mini-open', !!currentSong && location.pathname !== '/playlist' && !miniCollapsed)
    try { localStorage.setItem('nh_mini_collapsed', miniCollapsed ? '1' : '0') } catch {}
  }, [currentSong, location.pathname, miniCollapsed])

  useEffect(() => {
    document.body.classList.toggle('dark', dark)
    localStorage.setItem('nh_dark', dark)
  }, [dark])

  useEffect(() => {
    const onPlaylist = location.pathname === '/playlist'
    if (wasOnPlaylist.current && !onPlaylist && currentSong) {
      setShowExitPopup(true)
    }
    wasOnPlaylist.current = onPlaylist
  }, [location.pathname])

  const hasLock = !!room?.app_lock
  const showMiniPlayer = !!currentSong && location.pathname !== '/playlist'

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
          <div key={location.pathname} className="page-route">
            <Outlet />
          </div>
        </Suspense>
      </main>

      {showMiniPlayer && !miniCollapsed && (
        <div className="mini-player" onClick={() => navigate('/playlist')}>
          <Music size={16} className="mini-player-icon" />
          <span className="mini-player-title">{currentSong.title}</span>
          <div className="mini-player-actions" onClick={e => e.stopPropagation()}>
            <button className="mini-player-btn" onClick={togglePlay} title={playing ? 'Pause' : 'Lecture'}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button className="mini-player-btn" onClick={nextSong} title="Suivant"><SkipForward size={16} /></button>
            <button className="mini-player-btn mini-player-share" onClick={shareCurrentSong} title="Partager la musique"><Share2 size={16} /></button>
            <button className="mini-player-btn mini-player-stop" onClick={stop} title="Arrêter"><X size={16} /></button>
            <button className="mini-player-btn mini-player-collapse" onClick={() => setMiniCollapsed(true)} title="Réduire le lecteur">
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      )}

      {showMiniPlayer && miniCollapsed && (
        <button className="mini-player-fab" onClick={() => setMiniCollapsed(false)} title="Afficher le lecteur">
          <Music size={18} />
        </button>
      )}

      {incomingShare && (
        <div className="share-toast">
          <Music size={18} className="share-toast-icon" />
          <div className="share-toast-body">
            <strong>{incomingShare.from}</strong> partage « {incomingShare.song?.title} »
          </div>
          <button className="btn btn-primary btn-sm" onClick={acceptShare}>Écouter</button>
          <button className="btn btn-sm" onClick={dismissShare}><X size={14} /></button>
        </div>
      )}

      {showExitPopup && (
        <div className="modal-overlay" onClick={() => setShowExitPopup(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px' }}>La musique continue 🎵</h3>
            <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 14 }}>
              « {currentSong?.title} » continue de jouer en arrière-plan pendant que tu explores l'application.
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => { stop(); setShowExitPopup(false) }}>Arrêter la musique</button>
              <button className="btn btn-primary" onClick={() => setShowExitPopup(false)}>D'accord</button>
            </div>
          </div>
        </div>
      )}

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
