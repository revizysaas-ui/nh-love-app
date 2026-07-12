import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { RoomProvider, useRoom } from './context/RoomContext'
import { NotificationProvider, useNotifications } from './context/NotificationContext'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import Join from './components/Join'
import Home from './components/Home'
import Settings from './components/Settings'

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
        <Route path="/parametres" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <RoomProvider>
      <NotificationProvider>
        <AppRoutes />
      </NotificationProvider>
    </RoomProvider>
  )
}
