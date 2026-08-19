import { useEffect, lazy, useState, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { RoomProvider, useRoom } from './context/RoomContext'
import { NotificationProvider, useNotifications } from './context/NotificationContext'
import { ToastProvider } from './context/ToastContext'
import { PlayerProvider } from './context/PlayerContext'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import Join from './components/Join'
import Home from './components/Home'
import Settings from './components/Settings'
import AppLock from './components/AppLock'

const Messages = lazy(() => import('./components/Messages'))
const Gallery = lazy(() => import('./components/Gallery'))
const MapView = lazy(() => import('./components/MapView'))
const DrawingBoard = lazy(() => import('./components/DrawingBoard'))
const Games = lazy(() => import('./components/Games'))
const Widgets = lazy(() => import('./components/Widgets'))
const Stats = lazy(() => import('./components/Stats'))
const Wishlist = lazy(() => import('./components/Wishlist'))
const Counters = lazy(() => import('./components/Counters'))
const Playlist = lazy(() => import('./components/Playlist'))
const Objectives = lazy(() => import('./components/Objectives'))
import './index.css'

function ProtectedRoute({ children }) {
  const { room, loading } = useRoom()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!room) return <Navigate to="/join" replace />
  return children
}

function AppRoutes() {
  const { room, loading } = useRoom()
  const { setRoomId } = useNotifications()

  useEffect(() => {
    if (room) setRoomId(room.id)
  }, [room])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  return (
    <Routes>
      <Route path="/join" element={room ? <Navigate to="/" replace /> : <Join />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Home />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/galerie" element={<Gallery />} />
        <Route path="/carte" element={<MapView />} />
        <Route path="/dessin" element={<DrawingBoard />} />
        <Route path="/jeux" element={<Games />} />
        <Route path="/widgets" element={<Widgets />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/souhaits" element={<Wishlist />} />
        <Route path="/compteurs" element={<Counters />} />
        <Route path="/playlist" element={<Playlist />} />
        <Route path="/objectifs" element={<Objectives />} />
        <Route path="/parametres" element={<Settings />} />
      </Route>
    </Routes>
  )
}

const hasNotification = typeof Notification !== 'undefined'

function GameInviteWatcher() {
  const { room, username } = useRoom()
  const { showToast } = useNotifications()
  const prevRef = useRef(null)

  useEffect(() => {
    const g = room?.active_game
    const isInvite = g && g.mode === 'duo' && g.status === 'waiting' && g.by !== username
    const sig = isInvite ? `${g.by}|${g.game}|${g.status}` : null

    if (sig && sig !== prevRef.current) {
      showToast('game', `t'invite à jouer à ${g.label} 💕`, g.by)
      if (hasNotification && Notification.permission === 'granted' && document.hidden) {
        new Notification('N&H - ' + g.by, { body: `t'invite à jouer à ${g.label} 💕`, icon: '/icon-192.svg' })
      }
    }
    prevRef.current = sig
  }, [room?.active_game, username])

  return null
}

function AppShell() {
  const { room } = useRoom()
  const [locked, setLocked] = useState(() => !!room?.app_lock)
  const hasLock = !!room?.app_lock

  useEffect(() => {
    if (room && room.app_lock) setLocked(true)
  }, [room?.app_lock])

  useEffect(() => {
    const handler = () => setLocked(true)
    window.addEventListener('nh-lock-app', handler)
    return () => window.removeEventListener('nh-lock-app', handler)
  }, [])

  if (hasLock && locked) {
    return <AppLock onUnlock={() => setLocked(false)} />
  }

  return <AppRoutes />
}

export default function App() {
  useEffect(() => {
    const splash = document.getElementById('splash')
    if (splash) {
      splash.style.transition = 'opacity 0.3s'
      splash.style.opacity = '0'
      setTimeout(() => splash.remove(), 300)
    }
  }, [])
  return (
    <ErrorBoundary>
      <RoomProvider>
        <NotificationProvider>
          <ToastProvider>
            <PlayerProvider>
              <GameInviteWatcher />
              <AppShell />
            </PlayerProvider>
          </ToastProvider>
        </NotificationProvider>
      </RoomProvider>
    </ErrorBoundary>
  )
}
