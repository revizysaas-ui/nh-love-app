import { Routes, Route, Navigate } from 'react-router-dom'
import { RoomProvider, useRoom } from './context/RoomContext'
import Layout from './components/Layout'
import Join from './components/Join'
import Home from './components/Home'
import Messages from './components/Messages'
import Gallery from './components/Gallery'
import MapView from './components/MapView'
import DrawingBoard from './components/DrawingBoard'
import Games from './components/Games'
import Settings from './components/Settings'
import './index.css'

function ProtectedRoute({ children }) {
  const { room, loading } = useRoom()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!room) return <Navigate to="/join" replace />
  return children
}

function AppRoutes() {
  const { room, loading } = useRoom()
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
        <Route path="/parametres" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <RoomProvider>
      <AppRoutes />
    </RoomProvider>
  )
}
