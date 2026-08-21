import { useEffect, useRef, useState } from 'react'
import { MapPin, Coffee, TreePine, Utensils, Users, RotateCcw, Loader, Locate, Target, Footprints, Satellite, Map, Crosshair, Maximize2, Minimize2 } from 'lucide-react'
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

const STREET_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const SAT_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

function makeIcon(emoji, size = 40) {
  return L.divIcon({
    className: '',
    html: '<div style="font-size:' + (size - 8) + 'px;line-height:' + size + 'px;text-align:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,.35))">' + emoji + '</div>',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export default function MapView() {
  const { room, username } = useRoom()
  const mapRef = useRef(null)
  const mapInst = useRef(null)
  const meMarkerRef = useRef(null)
  const partnerMarkerRef = useRef(null)
  const poiMarkersRef = useRef([])
  const midMarkerRef = useRef(null)
  const lineRef = useRef(null)
  const channelRef = useRef(null)
  const myPosRef = useRef(null)
  const streetRef = useRef(null)
  const satRef = useRef(null)
  const didInitialFit = useRef(false)
  const watchIdRef = useRef(null)

  const [myPos, setMyPos] = useState(null)
  const [partnerPos, setPartnerPos] = useState(null)
  const [partnerName, setPartnerName] = useState('')
  const [geoStatus, setGeoStatus] = useState('idle')
  const [isSatellite, setIsSatellite] = useState(false)
  const [category, setCategory] = useState(null)
  const [pois, setPois] = useState([])
  const [poiLoading, setPoiLoading] = useState(false)
  const [dist, setDist] = useState(null)
  const [poiOpen, setPoiOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const otherName = room ? (username === room.name1 ? room.name2 : room.name1) : ''

  function sendPosition(pos) {
    const ch = channelRef.current
    if (!ch || !username || !pos) return
    ch.send({
      type: 'broadcast',
      event: 'position',
      payload: { from: username, lat: pos.lat, lng: pos.lng },
    }).catch(() => {})
  }

  function startGeo() {
    if (watchIdRef.current) return
    if (!navigator.geolocation) { setGeoStatus('unsupported'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        myPosRef.current = p
        setMyPos(p)
        setGeoStatus('active')
        sendPosition(p)
        const id = navigator.geolocation.watchPosition(
          (pos2) => {
            const p2 = { lat: pos2.coords.latitude, lng: pos2.coords.longitude }
            myPosRef.current = p2
            setMyPos(p2)
            sendPosition(p2)
          },
          () => {},
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
        )
        watchIdRef.current = id
      },
      (err) => {
        console.error('Geolocation:', err)
        if (err.code === 1) setGeoStatus('denied')
        else setGeoStatus('error')
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  useEffect(() => {
    if (mapInst.current || !mapRef.current) return
    const blank = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      maxZoom: 19,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 40,
    }).setView([48.85, 2.35], 6)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    const street = L.tileLayer(STREET_URL, { attribution: '© OpenStreetMap', maxZoom: 19, errorTileUrl: blank, keepBuffer: 2 })
    const sat = L.tileLayer(SAT_URL, { attribution: '© Esri', maxZoom: 19, errorTileUrl: blank, keepBuffer: 2 })
    street.addTo(map)
    streetRef.current = street
    satRef.current = sat
    mapInst.current = map
    return () => { map.remove(); mapInst.current = null }
  }, [])

  useEffect(() => {
    if (!room) return
    const ch = supabase.channel('map-location-' + room.id)
      .on('broadcast', { event: 'position' }, ({ payload }) => {
        if (payload && payload.from !== username) {
          setPartnerPos({ lat: payload.lat, lng: payload.lng })
          setPartnerName(payload.from)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && myPosRef.current) {
          sendPosition(myPosRef.current)
        }
      })
    channelRef.current = ch
    return () => { supabase.removeChannel(ch); channelRef.current = null }
  }, [room?.id, username])

  useEffect(() => {
    if (!room || !myPos) return
    const id = setInterval(() => {
      if (myPosRef.current) sendPosition(myPosRef.current)
    }, 8000)
    return () => clearInterval(id)
  }, [room?.id, myPos])

  useEffect(() => {
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  useEffect(() => {
    const map = mapInst.current
    if (map) setTimeout(() => map.invalidateSize(), 150)
  }, [fullscreen])

  useEffect(() => {
    if (fullscreen) document.body.classList.add('map-fullscreen-active')
    else document.body.classList.remove('map-fullscreen-active')
    return () => document.body.classList.remove('map-fullscreen-active')
  }, [fullscreen])

  useEffect(() => {
    const map = mapInst.current
    if (!map) return

    if (myPos) {
      const icon = makeIcon('\uD83D\uDCCD', 44)
      if (!meMarkerRef.current) {
        meMarkerRef.current = L.marker(myPos, { icon, zIndexOffset: 1000 }).addTo(map).bindPopup('<b>' + (username || 'Toi') + '</b>')
      } else {
        meMarkerRef.current.setLatLng(myPos)
        meMarkerRef.current.setIcon(icon)
      }
    }
    if (partnerPos) {
      const icon = makeIcon('\uD83D\uDC95', 44)
      if (!partnerMarkerRef.current) {
        partnerMarkerRef.current = L.marker(partnerPos, { icon, zIndexOffset: 1000 }).addTo(map).bindPopup('<b>' + (partnerName || 'Partenaire') + '</b>')
      } else {
        partnerMarkerRef.current.setLatLng(partnerPos)
        partnerMarkerRef.current.setIcon(icon)
        partnerMarkerRef.current.setPopupContent('<b>' + (partnerName || 'Partenaire') + '</b>')
      }
    }

    if (lineRef.current) { map.removeLayer(lineRef.current); lineRef.current = null }
    if (myPos && partnerPos) {
      lineRef.current = L.polyline([myPos, partnerPos], {
        color: '#e25555', weight: 3, dashArray: '10 6', opacity: 0.7,
      }).addTo(map)
      setDist(haversine(myPos.lat, myPos.lng, partnerPos.lat, partnerPos.lng))
      if (!didInitialFit.current) {
        map.fitBounds([myPos, partnerPos], { padding: [80, 80], maxZoom: 14 })
        didInitialFit.current = true
      }
    } else if (myPos && !didInitialFit.current) {
      map.setView(myPos, 14)
      didInitialFit.current = true
    }
  }, [myPos, partnerPos])

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
    const query = '[out:json][timeout:10];(' + category.query + '(around:' + Math.round(radius) + ',' + center[0] + ',' + center[1] + '););out body 30;'
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
          color: category.color,
        })).filter(p => p.name)
        setPois(items)
        poiMarkersRef.current.forEach(m => map.removeLayer(m))
        poiMarkersRef.current = []
        items.forEach(p => {
          const icon = L.divIcon({
            className: '',
            html: '<div style="width:14px;height:14px;border-radius:50%;background:' + category.color + ';border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>',
            iconSize: [14, 14], iconAnchor: [7, 7],
          })
          const m = L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup('<b>' + p.name + '</b><br>' + p.type)
          poiMarkersRef.current.push(m)
        })
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

  function toggleSatellite() {
    const map = mapInst.current
    if (!map) return
    if (isSatellite) {
      map.removeLayer(satRef.current)
      streetRef.current.addTo(map)
    } else {
      map.removeLayer(streetRef.current)
      satRef.current.addTo(map)
    }
    setIsSatellite(!isSatellite)
  }

  const midPoint = myPos && partnerPos ? [(myPos.lat + partnerPos.lat) / 2, (myPos.lng + partnerPos.lng) / 2] : null

  function goToMidpoint() {
    if (!midPoint || !mapInst.current) return
    mapInst.current.setView(midPoint, 14)
    if (midMarkerRef.current) mapInst.current.removeLayer(midMarkerRef.current)
    const icon = makeIcon('\uD83C\uDFAF', 36)
    midMarkerRef.current = L.marker(midPoint, { icon }).addTo(mapInst.current).bindPopup('<b>Point milieu</b>').openPopup()
  }

  function recenter() {
    if (!mapInst.current) return
    if (myPos && partnerPos) mapInst.current.fitBounds([myPos, partnerPos], { padding: [80, 80], maxZoom: 14 })
    else if (myPos) mapInst.current.setView(myPos, 14)
  }

  function toggleFullscreen() {
    const next = !fullscreen
    setFullscreen(next)
    if (next && screen.orientation?.lock) {
      screen.orientation.lock('landscape').catch(() => {})
    } else if (!next && screen.orientation?.unlock) {
      screen.orientation.unlock()
    }
  }

  const displayDist = dist ? (dist < 1 ? Math.round(dist * 1000) + ' m' : Math.round(dist) + ' km') : null

  if (!room) return null

  return (
    <div className="page map-page map-live-page">
      {!fullscreen && (
        <>
          <div className="page-header">
            <MapPin size={24} />
            <h2>Carte en Direct</h2>
          </div>

          {geoStatus === 'error' && (
            <div className="map-geo-alert">
              <Locate size={15} />
              <span>Active la géolocalisation dans les réglages de ton appareil</span>
            </div>
          )}

          {geoStatus === 'unsupported' && (
            <div className="map-geo-alert">
              <Locate size={15} />
              <span>Ta navigateur ne supporte pas la géolocalisation</span>
            </div>
          )}

          <div className="map-status-bar">
            <div className="map-status-left">
              <div className="map-user-dot map-dot-me" />
              <span className="map-user-name">{username || 'Toi'}</span>
              {myPos && <span className="map-status-ok">&#10003;</span>}
            </div>
            <div className="map-status-center">
              {displayDist ? (
                <div className="map-dist-pill">{displayDist}</div>
              ) : (
                <div className="map-waiting-dots"><span /><span /><span /></div>
              )}
            </div>
            <div className="map-status-right">
              <span className="map-user-name">{otherName || 'Partenaire'}</span>
              <div className={'map-user-dot map-dot-partner' + (partnerPos ? ' connected' : '')} />
              {partnerPos ? <span className="map-status-ok">&#10003;</span> : <span className="map-status-wait">···</span>}
            </div>
          </div>
        </>
      )}

      <div className={'map-canvas-wrap' + (fullscreen ? ' fullscreen' : '')}>
        <div ref={mapRef} className="map-canvas" />

        {(geoStatus === 'idle' || geoStatus === 'requesting') && (
          <div className="map-geo-overlay">
            <button className="map-geo-btn" onClick={startGeo}>
              <Crosshair size={20} />
              <span>Activer le partage de position</span>
            </button>
          </div>
        )}

        {geoStatus === 'denied' && (
          <div className="map-geo-overlay">
            <div className="map-geo-denied">
              <Locate size={20} />
              <span>Localisation désactivée</span>
              <span className="map-geo-hint">Active-la dans : Réglages → Confidentialité → Services de localisation → Safari</span>
            </div>
          </div>
        )}

        {geoStatus === 'requesting' && false && (
          <div className="map-geo-overlay">
            <div className="map-geo-waiting">
              <Loader size={20} className="spin" />
              <span>Activation en cours…</span>
            </div>
          </div>
        )}

        <button className="map-btn-tl" onClick={toggleSatellite} title="Satellite">
          {isSatellite ? <Map size={16} /> : <Satellite size={16} />}
        </button>

        <button className="map-btn-tr" onClick={toggleFullscreen} title={fullscreen ? 'Quitter plein écran' : 'Plein écran'}>
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>

        <div className="map-float-actions">
          <button className="map-fab" onClick={recenter} title="Recentrer"><RotateCcw size={15} /></button>
          {midPoint && <button className="map-fab map-fab-accent" onClick={goToMidpoint} title="Point milieu"><Target size={15} /></button>}
        </div>
      </div>

      {!fullscreen && (
      <div className="map-poi-panel">
        <button className="map-poi-toggle" onClick={() => setPoiOpen(o => !o)}>
          <Footprints size={16} />
          <span>Explorer autour de nous</span>
          <span className={'map-poi-chevron' + (poiOpen ? ' open' : '')}>&#9660;</span>
        </button>

        {poiOpen && (
          <div className="map-poi-content">
            <div className="map-poi-cats">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  className={'map-poi-cat' + (category?.key === c.key ? ' active' : '')}
                  onClick={() => { if (category?.key === c.key) clearPois(); else { setCategory(c); setPois([]) } }}
                  style={category?.key === c.key ? { borderColor: c.color, color: c.color, background: c.color + '12' } : {}}
                >
                  <c.icon size={14} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            {poiLoading && (
              <div className="map-poi-loading">
                <Loader size={15} className="spin" />
                <span>Recherche en cours…</span>
              </div>
            )}

            {!poiLoading && pois.length > 0 && (
              <div className="map-poi-list">
                {pois.map(p => {
                  const d = myPos ? haversine(myPos.lat, myPos.lng, p.lat, p.lng) : null
                  return (
                    <button key={p.id} className="map-poi-item" onClick={() => mapInst.current?.setView([p.lat, p.lng], 16)}>
                      <div className="map-poi-dot" style={{ background: p.color }} />
                      <div className="map-poi-info">
                        <span className="map-poi-name">{p.name}</span>
                        {d != null && <span className="map-poi-dist">{d < 1 ? Math.round(d * 1000) + ' m' : Math.round(d) + ' km'}</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {!poiLoading && category && pois.length === 0 && (
              <p className="map-poi-empty">Aucun lieu trouvé autour de vous</p>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  )
}
