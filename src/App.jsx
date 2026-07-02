import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './components/Home'
import Messages from './components/Messages'
import Gallery from './components/Gallery'
import MapView from './components/MapView'
import DrawingBoard from './components/DrawingBoard'
import Games from './components/Games'
import './index.css'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/galerie" element={<Gallery />} />
        <Route path="/carte" element={<MapView />} />
        <Route path="/dessin" element={<DrawingBoard />} />
        <Route path="/jeux" element={<Games />} />
      </Route>
    </Routes>
  )
}
