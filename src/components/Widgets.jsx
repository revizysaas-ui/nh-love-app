import { useEffect, useState } from 'react'
import { Heart, Calendar, MapPin, PenLine, MessageCircleQuestion, Image } from 'lucide-react'
import { useRoom } from '../context/RoomContext'
import { getDailyQuestion } from '../data/daily-questions'
import { supabase } from '../lib/supabase'

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export default function Widgets() {
  const { room } = useRoom()
  const [days, setDays] = useState(0)
  const [untilDays, setUntilDays] = useState(0)
  const [distance, setDistance] = useState(0)
  const [dailyQ, setDailyQ] = useState('')
  const [lastDrawing, setLastDrawing] = useState(null)
  const [lastPhoto, setLastPhoto] = useState(null)

  useEffect(() => {
    if (!room) return
    const now = new Date()
    setDays(Math.floor((now - new Date(room.start_date)) / (1000 * 60 * 60 * 24)))
    setUntilDays(Math.floor((new Date(room.next_meeting) - now) / (1000 * 60 * 60 * 24)))
    if (room.city1_lat && room.city2_lat) {
      setDistance(haversineKm(room.city1_lat, room.city1_lng, room.city2_lat, room.city2_lng))
    }
    setDailyQ(getDailyQuestion())
    loadLastDrawing()
    loadLastPhoto()
  }, [room])

  async function loadLastDrawing() {
    const { data } = await supabase.from('drawings').select('*').eq('room_id', room.id).order('created_at', { ascending: false }).limit(1).single()
    if (data) setLastDrawing(data)
  }

  async function loadLastPhoto() {
    const { data } = await supabase.from('photos').select('*').eq('room_id', room.id).order('created_at', { ascending: false }).limit(1).single()
    if (data) setLastPhoto(data)
  }

  if (!room) return null

  return (
    <div className="page widgets-page">
      <div className="page-header">
        <Heart size={24} />
        <h2>Widgets</h2>
      </div>

      <div className="widgets-grid">
        <div className="widget-card">
          <div className="widget-icon" style={{ background: 'linear-gradient(135deg, #ff6b9d, #e8b4c8)' }}><Calendar size={22} /></div>
          <div className="widget-body">
            <span className="widget-label">Jours d'amour</span>
            <span className="widget-value">{days}</span>
          </div>
        </div>

        <div className="widget-card">
          <div className="widget-icon" style={{ background: 'linear-gradient(135deg, #60a5fa, #4a90d9)' }}><MapPin size={22} /></div>
          <div className="widget-body">
            <span className="widget-label">Distance</span>
            <span className="widget-value">{distance.toLocaleString('fr-FR')} km</span>
          </div>
        </div>

        <div className="widget-card">
          <div className="widget-icon" style={{ background: 'linear-gradient(135deg, #34d399, #2ecc71)' }}><Calendar size={22} /></div>
          <div className="widget-body">
            <span className="widget-label">Avant retrouvailles</span>
            <span className="widget-value">{untilDays > 0 ? `${untilDays} jours` : "C'est bientôt ! ❤️"}</span>
          </div>
        </div>

        <div className="widget-card" style={{ gridColumn: '1 / -1' }}>
          <div className="widget-icon" style={{ background: 'linear-gradient(135deg, #c084fc, #9b59b6)' }}><MessageCircleQuestion size={22} /></div>
          <div className="widget-body">
            <span className="widget-label">Question du Jour</span>
            <span className="widget-desc">{dailyQ}</span>
          </div>
        </div>

        {lastDrawing && (
          <div className="widget-card" style={{ gridColumn: '1 / -1' }}>
            <div className="widget-icon" style={{ background: 'linear-gradient(135deg, #f472b6, #e8b4c8)' }}><PenLine size={22} /></div>
            <div className="widget-body">
              <span className="widget-label">Dernier dessin</span>
              <img src={lastDrawing.data_url} alt="" className="widget-thumb" />
            </div>
          </div>
        )}

        {lastPhoto && (
          <div className="widget-card" style={{ gridColumn: '1 / -1' }}>
            <div className="widget-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #f0c88d)' }}><Image size={22} /></div>
            <div className="widget-body">
              <span className="widget-label">Dernière photo</span>
              <img src={supabase.storage.from('photos').getPublicUrl(lastPhoto.storage_path).data.publicUrl} alt="" className="widget-thumb" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
