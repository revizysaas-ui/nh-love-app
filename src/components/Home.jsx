import { useEffect, useState } from 'react'
import { Heart, Calendar, MapPin, MessageCircle, Image, PenLine, Gamepad2, Sparkles, MessageCircleQuestion, LayoutDashboard, BarChart3, Gift, Hash, Music, Target, HelpCircle, Cherry, Grid3X3, BookOpen, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRoom } from '../context/RoomContext'
import { getDailyQuestion } from '../data/daily-questions'

const GAMES = [
  { key: 'truthdare', icon: Heart, label: 'Vérité ou Action', color: '#e74c8b' },
  { key: 'quiz', icon: HelpCircle, label: 'Quiz Amour', color: '#8a79ab' },
  { key: 'defis', icon: Target, label: 'Défis', color: '#e74c3c' },
  { key: 'culture', icon: BookOpen, label: 'Culture G', color: '#4a90d9' },
  { key: 'roue', icon: Cherry, label: 'Roue', color: '#34d399' },
  { key: 'morpion', icon: Grid3X3, label: 'Morpion', color: '#22d3ee' },
  { key: 'preferes', icon: Zap, label: 'Tu Préfères', color: '#f97316' },
]

const quickGames = GAMES.slice(0, 4)

export default function Home() {
  const navigate = useNavigate()
  const { room, username } = useRoom()
  const [days, setDays] = useState(0)
  const [untilDays, setUntilDays] = useState(0)
  const [dailyQ, setDailyQ] = useState('')
  const [activeGame, setActiveGame] = useState(null)

  useEffect(() => {
    if (!room) return
    const start = new Date(room.start_date)
    const meeting = new Date(room.next_meeting)
    const now = new Date()
    setDays(Math.floor((now - start) / (1000 * 60 * 60 * 24)))
    setUntilDays(Math.floor((meeting - now) / (1000 * 60 * 60 * 24)))
    setDailyQ(getDailyQuestion())
  }, [room])

  const partnerGame = room?.active_game && room.active_game.by !== username ? room.active_game : null

  if (!room) return null

  const cards = [
    { to: '/messages', icon: MessageCircle, label: 'Messages', desc: 'Boîte aux lettres', color: '#ff6b9d' },
    { to: '/galerie', icon: Image, label: 'Galerie', desc: 'Nos souvenirs', color: '#c084fc' },
    { to: '/carte', icon: MapPin, label: 'Carte', desc: 'La distance', color: '#60a5fa' },
    { to: '/dessin', icon: PenLine, label: 'Dessin', desc: 'Dessine-moi', color: '#34d399' },
    { to: '/jeux', icon: Gamepad2, label: 'Jeux', desc: '8 jeux en duo', color: '#f472b6' },
    { to: '/widgets', icon: LayoutDashboard, label: 'Widgets', desc: 'Nos stats en direct', color: '#f59e0b' },
    { to: '/stats', icon: BarChart3, label: 'Stats', desc: 'Messages, photos...', color: '#ef4444' },
    { to: '/souhaits', icon: Gift, label: 'Souhaits', desc: 'Idées cadeaux', color: '#ec4899' },
    { to: '/compteurs', icon: Hash, label: 'Compteurs', desc: 'Tout comptabiliser', color: '#14b8a6' },
    { to: '/playlist', icon: Music, label: 'Playlist', desc: 'Nos sons', color: '#f97316' },
  ]

  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-badge">
          <Sparkles size={14} />
          <span>Notre histoire</span>
        </div>
        <h1 className="hero-title">
          <Heart size={32} className="hero-heart" fill="currentColor" />
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

      {partnerGame && (
        <div className="active-game-banner" onClick={() => navigate('/jeux')}>
          <Gamepad2 size={18} />
          <span><strong>{partnerGame.by}</strong> joue à <strong>{partnerGame.label}</strong></span>
          <span className="active-game-join">Rejoindre →</span>
        </div>
      )}

      {dailyQ && (
        <div className="daily-question-card" onClick={() => navigate('/jeux')}>
          <div className="daily-q-badge">
            <MessageCircleQuestion size={14} />
            <span>Question du Jour</span>
          </div>
          <p className="daily-q-text">{dailyQ}</p>
        </div>
      )}

      <div className="home-section">
        <div className="home-section-header">
          <Gamepad2 size={18} />
          <span>Nos Jeux</span>
          <button className="home-see-all" onClick={() => navigate('/jeux')}>Voir tout</button>
        </div>
        <div className="home-games-grid">
          {quickGames.map(g => (
            <button key={g.key} className="home-game-btn" style={{ '--gc': g.color }} onClick={() => navigate('/jeux')}>
              <div className="home-game-icon" style={{ background: `${g.color}18`, color: g.color }}>
                <g.icon size={20} />
              </div>
              <span>{g.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="home-section">
        <div className="home-section-header">
          <Sparkles size={18} />
          <span>Accès rapide</span>
        </div>
        <div className="quick-grid">
          {cards.map(c => (
            <button key={c.to} className="quick-card" style={{ '--accent': c.color }} onClick={() => navigate(c.to)}>
              <div className="quick-icon" style={{ background: `${c.color}20`, color: c.color }}><c.icon size={24} /></div>
              <div className="quick-info">
                <strong>{c.label}</strong>
                <span>{c.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
