import { useEffect, useState } from 'react'
import { Heart, MessageCircle, Image, Calendar, BarChart3 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'

export default function Stats() {
  const { room } = useRoom()
  const [stats, setStats] = useState({ messages: 0, photos: 0, drawings: 0, days: 0 })

  useEffect(() => {
    if (!room) return
    loadCounts()
    setStats(s => ({ ...s, days: Math.floor((Date.now() - new Date(room.start_date)) / (1000 * 60 * 60 * 24)) }))
  }, [room])

  async function loadCounts() {
    const [{ count: msgs }, { count: photos }, { count: drawings }] = await Promise.all([
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('room_id', room.id),
      supabase.from('photos').select('*', { count: 'exact', head: true }).eq('room_id', room.id),
      supabase.from('drawings').select('*', { count: 'exact', head: true }).eq('room_id', room.id),
    ])
    setStats(s => ({ ...s, messages: msgs || 0, photos: photos || 0, drawings: drawings || 0 }))
  }

  if (!room) return null

  const items = [
    { icon: Heart, label: "Jours d'amour", value: stats.days, color: '#ff6b9d' },
    { icon: MessageCircle, label: 'Messages', value: stats.messages, color: '#60a5fa' },
    { icon: Image, label: 'Photos', value: stats.photos, color: '#34d399' },
    { icon: BarChart3, label: 'Dessins', value: stats.drawings, color: '#c084fc' },
  ]

  return (
    <div className="page stats-page">
      <div className="page-header"><Heart size={24} /><h2>Nos Stats</h2></div>
      <div className="stats-grid">
        {items.map(item => (
          <div key={item.label} className="stat-card">
            <div className="stat-icon" style={{ background: item.color }}><item.icon size={24} /></div>
            <span className="stat-value">{item.value}</span>
            <span className="stat-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
