import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Navigation, Coffee, TreePine, Utensils, Users, RotateCcw, Loader, Share2, Locate, Target, Footprints } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useRoom } from '../context/RoomContext'
import { supabase } from '../lib/supabase'

function deg2rad(d) { return d * Math.PI / 180 }
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = deg2rad(lat2 - lat1), dLon = deg2rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const CATEGORIES = [
  { key: 'restaurant', label: 'Restaurant', icon: Utensils, query: 'node["amenity"="restaurant"]', color: '#e25555' },
  { key: 'cafe', label: 'Café', icon: Coffee, query: 'node["amenity"="cafe"]', color: '#c084fc' },
  { key: 'park', label: 'Parc', icon: TreePine, query: 'node["leisure"="park"]', color: '#22c55e' },
  { key: 'bar', label: 'Bar', icon: Users, query: 'node["amenity"="bar"]', color: '#f59e0b' },
]

function makeIcon(emoji, size = 32) {
  return L.divIcon({ className: '', html: `<div style="font-size:${size - 4}px;line-height:${size}px;text-align:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3))">${emoji}</div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}

export default function MapView() {
  const { room, username } = useRoom()
  const mapRef = useRef(null)
  const mapInst = useRef(null)
  const meMarkerRef = useRef(null)
  const partnerMarkerRef = useRef(null)
  const poiMarkersRef = useRef([])
  const lineRef = useRef(null)
  const watchIdRef = useRef(null)
  const channelRef = useRef(null)
  const sentRef = useRef(0)

  const [myPos, setMyPos] = useState(null)
  const [partnerPos, setPartnerPos] = useState(null)
  const [partnerName, setPartnerName] = useState('')
  const [geoStatus, setGeoStatus] = useState('idle')
  const [category, setCategory] = useState(null)
  const [pois, setPois] = useState([])
  const [poiLoading, setPoiLoading] = useState(false)
  const [dist, setDist] = useState(null)

  const otherName = room ? (username === room.name1 ? room.name2 : room.name1) : ''

  const addPoiMarkers = useCallback((map, items, cat) => {
    poiMarkersRef.current.forEach(m => map.removeLayer(m))
    poiMarkersRef.current = []
    const color = cat?.color || '#888'
    items.forEach(p => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
        iconSize: [18, 18], iconAnchor: [9, 9],
      })
      const m = L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(`<b>${p.name}</b><br>${p.type}`)
      poiMarkersRef.current.push(m)
    })
  }, [])

  useEffect(() => {
    if (mapInst.current || !mapRef.current) return
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([48.85, 2.35], 6)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map)
    mapInst.current = map
    return () => { map.remove(); mapInst.current = null }
  }, [])

  useEffect(() => {
    if (!room) return
    const ch = supabase.channel('map-location-' + room.id)
      .on('broadcast', { event: 'position' }, ({ payload }) => {
        if (payload.from !== username) {
          setPartnerPos({ lat: payload.lat, lng: payload.lng })
          setPartnerName(payload.from)
        }
      })
      .subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch); channelRef.current = null }
  }, [room?.id, username])

  useEffect(() => {
    if (!room) return
    if (!navigator.geolocation) { setGeoStatus('unsupported'); return }
    setGeoStatus('requesting')
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setMyPos(p)
        setGeoStatus('active')
        const now = Date.now()
        if (now - sentRef.current > 4000 && channelRef.current) {
          sentRef.current = now
          channelRef.current.send({ type: 'broadcast', event: 'position', payload: { from: username, lat: p.lat, lng: p.lng } })
        }
      },
      (err) => {
        console.error('Geolocation:', err)
        setGeoStatus('error')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    )
    watchIdRef.current = id
    return () => { navigator.geolocation.clearWatch(id); watchIdRef.current = null }
  }, [room?.id, username])

  useEffect(() => {
    const map = mapInst.current
    if (!map) return
    if (myPos) {
      const icon = makeIcon('📍', 36)
      if (!meMarkerRef.current) {
        meMarkerRef.current = L.marker(myPos, { icon, zIndexOffset: 1000 }).addTo(map).bindPopup('Toi')
      } else {
        meMarkerRef.current.setLatLng(myPos)
      }
    }
    if (partnerPos) {
      const icon = makeIcon('💕', 36)
      if (!partnerMarkerRef.current) {
        partnerMarkerRef.current = L.marker(partnerPos, { icon, zIndexOffset: 1000 }).addTo(map).bindPopup(partnerName || 'Partenaire')
      } else {
        partnerMarkerRef.current.setLatLng(partnerPos)
        partnerMarkerRef.current.setPopupContent(partnerName || 'Partenaire')
      }
    }
    if (lineRef.current) { map.removeLayer(lineRef.current); lineRef.current = null }
    if (myPos && partnerPos) {
      lineRef.current = L.polyline([myPos, partnerPos], { color: '#e25555', weight: 3, dashArray: '8 6', opacity: 0.8 }).addTo(map)
      map.fitBounds([myPos, partnerPos], { padding: [80, 80], maxZoom: 14 })
      setDist(haversine(myPos.lat, myPos.lng, partnerPos.lat, partnerPos.lng))
    } else if (myPos && !partnerPos) {
      map.setView(myPos, 14)
    }
  }, [myPos, partnerPos, partnerName])

  useEffect(() => {
    const map = mapInst.current
    if (!map || !category) return
    const center = myPos && partnerPos
      ? [(myPos.lat + partnerPos.lat) / 2, (myPos.lng + partnerPos.lng) / 2]
      : myPos || [48.85, 2.35]
    const radius = myPos && partnerPos
      ? Math.max(haversine(myPos.lat, myPos.lng, partnerPos.lat, partnerPos.lng) * 0.6 * 1000, 3000)
      : 5000
    setPoiLoading(true)
    setPois([])
    const query = `[out:json][timeout:10];(${category.query}(around:${Math.round(radius)},${center[0]},${center[1]}););out body 30;`
    fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      signal: AbortSignal.timeout(12000),
    })
      .then(r => r.json())
      .then(data => {
        const items = (data.elements || []).map(el => ({
          id: el.id,
          lat: el.lat,
          lng: el.lon,
          name: el.tags?.name || el.tags?.['name:fr'] || '',
          type: category.label,
        })).filter(p => p.name)
        setPois(items)
        addPoiMarkers(map, items, category)
        setPoiLoading(false)
      })
      .catch(() => setPoiLoading(false))
  }, [category, myPos, partnerPos])

  function clearPois() {
    setCategory(null)
    setPois([])
    const map = mapInst.current
    if (map) { poiMarkersRef.current.forEach(m => map.removeLayer(m)); poiMarkersRef.current = [] }
  }

  const midPoint = myPos && partnerPos ? [(myPos.lat + partnerPos.lat) / 2, (myPos.lng + partnerPos.lng) / 2] : null

  function goToMidpoint() {
    if (!midPoint || !mapInst.current) return
    mapInst.current.setView(midPoint, 14)
    const icon = makeIcon('🎯', 32)
    L.marker(midPoint, { icon }).addTo(mapInst.current).bindPopup('Point milieu 🎯').openPopup()
  }

  function recenter() {
    if (!mapInst.current) return
    if (myPos && partnerPos) mapInst.current.fitBounds([myPos, partnerPos], { padding: [80, 80], maxZoom: 14 })
    else if (myPos) mapInst.current.setView(myPos, 14)
  }

  const displayDist = dist ? (dist < 1 ? `${Math.round(dist * 1000)} m` : `${Math.round(dist)} km`) : null

  if (!room) return null

  return (
    <div className="page map-page map-live-page">
      <div className="page-header">
        <MapPin size={24} />
        <h2>Carte en Direct</h2>
      </div>

      {geoStatus === 'error' && (
        <div className="map-geo-alert">
          <Locate size={16} />
          <span>Active la géolocalisation pour partager ta position</span>
        </div>
      )}

      {geoStatus === 'unsupported' && (
        <div className="map-geo-alert">
          <Locate size={16} />
          <span>Ta navigateur ne supporte pas la géolocalisation</span>
        </div>
      )}

      <div className="map-status-bar">
        <div className="map-status-my">
          <span className="map-dot map-dot-me" />
          <span>{username || 'Toi'}</span>
          {myPos && <span className="map-status-ok">✓</span>}
        </div>
        <div className="map-status-dist">
          {displayDist ? (
            <>
              <span className="dist-num">{displayDist}</span>
              <span className="map-dist-label">entre vous</span>
            </>
          ) : (
            <span className="map-dist-waiting">En attente du partenaire…</span>
          )}
        </div>
        <div className="map-status-partner">
          <span className="map-dot map-dot-partner" />
          <span>{otherName || 'Partenaire'}</span>
          {partnerPos ? <span className="map-status-ok">✓</span> : <span className="map-status-waiting">···</span>}
        </div>
      </div>

      <div ref={mapRef} className="map-container map-container-live" />

      <div className="map-actions-row">
        <button className="map-action-btn" onClick={recenter} title="Recentrer"><RotateCcw size={16} /></button>
        {midPoint && <button className="map-action-btn map-action-mid" onClick={goToMidpoint} title="Point milieu"><Target size={16} /></button>}
      </div>

      <div className="map-poi-section">
        <div className="map-poi-header">
          <Footprints size={16} />
          <span>Explorer autour de nous</span>
        </div>
        <div className="map-poi-categories">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              className={`map-poi-btn ${category?.key === c.key ? 'active' : ''}`}
              onClick={() => { if (category?.key === c.key) clearPois(); else { setCategory(c); setPois([]) } }}
              style={category?.key === c.key ? { borderColor: c.color, color: c.color } : {}}
            >
              <c.icon size={14} />
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {poiLoading && (
          <div className="map-poi-loading">
            <Loader size={16} className="spin" />
            <span>Recherche en cours…</span>
          </div>
        )}

        {!poiLoading && pois.length > 0 && (
          <div className="map-poi-list">
            {pois.map(p => {
              const d = myPos ? haversine(myPos.lat, myPos.lng, p.lat, p.lng) : null
              return (
                <button key={p.id} className="map-poi-item" onClick={() => mapInst.current?.setView([p.lat, p.lng], 16)}>
                  <div className="map-poi-item-name">{p.name}</div>
                  {d != null && <div className="map-poi-item-dist">{d < 1 ? `${Math.round(d * 1000)} m` : `${Math.round(d)} km`}</div>}
                </button>
              )
            })}
          </div>
        )}

        {!poiLoading && category && pois.length === 0 && (
          <p className="map-poi-empty">Aucun lieu trouvé autour de vous</p>
        )}
      </div>
    </div>
  )
}
