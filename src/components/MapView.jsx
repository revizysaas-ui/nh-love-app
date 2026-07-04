import { useEffect, useRef, useState } from 'react'
import { MapPin, Heart } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useRoom } from '../context/RoomContext'

function deg2rad(deg) { return deg * (Math.PI / 180) }
function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export default function MapView() {
  const { room } = useRoom()
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const lineRef = useRef(null)

  const city1 = room ? { name: room.city1_name, coords: [room.city1_lat, room.city1_lng] } : null
  const city2 = room ? { name: room.city2_name, coords: [room.city2_lat, room.city2_lng] } : null
  const [dist, setDist] = useState(city1 ? calcDistance(...city1.coords, ...city2.coords) : 0)

  useEffect(() => {
    if (!city1 || !city2 || mapInstance.current) return
    const map = L.map(mapRef.current, { zoomControl: false }).setView(
      [(city1.coords[0] + city2.coords[0]) / 2, (city1.coords[1] + city2.coords[1]) / 2], 3
    )
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null }
  }, [])

  useEffect(() => {
    const map = mapInstance.current
    if (!map || !city1 || !city2) return

    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []

    const icon = L.divIcon({ className: '', html: '<div class="map-marker">❤️</div>', iconSize: [36, 36] })

    const m1 = L.marker(city1.coords, { icon }).addTo(map).bindPopup(city1.name)
    const m2 = L.marker(city2.coords, { icon }).addTo(map).bindPopup(city2.name)
    markersRef.current = [m1, m2]

    if (lineRef.current) map.removeLayer(lineRef.current)
    lineRef.current = L.polyline([city1.coords, city2.coords], {
      color: '#e25555', weight: 3, dashArray: '10 10',
    }).addTo(map)

    map.fitBounds([city1.coords, city2.coords], { padding: [60, 60] })
    setDist(calcDistance(...city1.coords, ...city2.coords))
  }, [city1?.coords[0], city1?.coords[1], city2?.coords[0], city2?.coords[1]])

  if (!room || !city1 || !city2) return null

  return (
    <div className="page map-page">
      <div className="page-header">
        <MapPin size={24} />
        <h2>La Distance</h2>
      </div>

      <div className="distance-card">
        <div className="distance-cities">
          <div className="city-tag">{city1.name}</div>
          <div className="dist-value">
            <Heart size={16} fill="#e25555" />
            <span className="dist-num">{dist.toLocaleString()}</span>
            <span className="dist-unit">km</span>
            <Heart size={16} fill="#e25555" />
          </div>
          <div className="city-tag">{city2.name}</div>
        </div>
        <p className="dist-hint">Modifie les villes dans les Paramètres</p>
      </div>

      <div ref={mapRef} className="map-container" />
    </div>
  )
}
