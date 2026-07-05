import { useEffect, useState } from 'react'
import { Heart, Calendar, MapPin, MessageCircle, Image, PenLine, Gamepad2, Sparkles, MessageCircleQuestion, LayoutDashboard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRoom } from '../context/RoomContext'
import { getDailyQuestion } from '../data/daily-questions'

const cards = [
  { to: '/messages', icon: MessageCircle, label: 'Messages', desc: 'Boîte aux lettres', color: '#ff6b9d' },
  { to: '/galerie', icon: Image, label: 'Galerie', desc: 'Nos souvenirs', color: '#c084fc' },
  { to: '/carte', icon: MapPin, label: 'Carte', desc: 'La distance', color: '#60a5fa' },
  { to: '/dessin', icon: PenLine, label: 'Dessin', desc: 'Dessine-moi', color: '#34d399' },
  { to: '/jeux', icon: Gamepad2, label: 'Jeux', desc: 'Vérité ou action', color: '#f472b6' },
  { to: '/widgets', icon: LayoutDashboard, label: 'Widgets', desc: 'Nos stats en direct', color: '#f59e0b' },
]

export default function Home() {
  const navigate = useNavigate()
  const { room } = useRoom()
  const [days, setDays] = useState(0)
  const [untilDays, setUntilDays] = useState(0)
  const [dailyQ, setDailyQ] = useState('')

  useEffect(() => {
    if (!room) return
    const start = new Date(room.start_date)
    const meeting = new Date(room.next_meeting)
    const now = new Date()
    setDays(Math.floor((now - start) / (1000 * 60 * 60 * 24)))
    setUntilDays(Math.floor((meeting - now) / (1000 * 60 * 60 * 24)))

    setDailyQ(getDailyQuestion())
  }, [room])

  if (!room) return null

  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-badge">
          <Sparkles size={14} />
          <span>Notre histoire</span>
        </div>
        <h1 className="hero-title">
          <Heart size={32} className="hero-heart" fill="#e25555" />
          <span>{room.name1} & {room.name2}</span>
        </h1>
        <div className="hero-counters">
          <div className="hero-stat">
            <span className="hero-num">{days}</span>
            <span className="hero-label">Jours d&apos;amour</span>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <span className="hero-num">{untilDays > 0 ? untilDays : 0}</span>
            <span className="hero-label">Avant les retrouvailles</span>
          </div>
        </div>
        <div className="hero-date">
          <Calendar size={14} />
          <span>Depuis le {room.start_date}</span>
        </div>
      </div>

      {dailyQ && (
        <div className="daily-question-card" onClick={() => navigate('/jeux')}>
          <div className="daily-q-badge">
            <MessageCircleQuestion size={14} />
            <span>Question du Jour</span>
          </div>
          <p className="daily-q-text">{dailyQ}</p>
        </div>
      )}

      <div className="quick-grid">
        {cards.map(c => (
          <button key={c.to} className="quick-card" style={{ '--accent': c.color }} onClick={() => navigate(c.to)}>
            <div className="quick-icon"><c.icon size={24} /></div>
            <div className="quick-info">
              <strong>{c.label}</strong>
              <span>{c.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
