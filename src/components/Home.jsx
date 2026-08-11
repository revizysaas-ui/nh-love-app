import { useEffect, useState } from 'react'
import { Heart, Calendar, MapPin, MessageCircle, Image, PenLine, Gamepad2, Sparkles, MessageCircleQuestion, LayoutDashboard, BarChart3, Gift, Hash, Music, Send, Flame } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRoom } from '../context/RoomContext'
import { useToast } from '../context/ToastContext'
import { getDailyQuestion } from '../data/daily-questions'
import { supabase } from '../lib/supabase'
import { vibrate } from '../lib/haptics'

function todayStr() { return new Date().toISOString().slice(0, 10) }

export default function Home() {
  const navigate = useNavigate()
  const { room, username } = useRoom()
  const { showToast } = useToast()
  const [days, setDays] = useState(0)
  const [untilDays, setUntilDays] = useState(0)
  const [dailyQ, setDailyQ] = useState('')
  const [todayAnswer, setTodayAnswer] = useState('')
  const [streak, setStreak] = useState(0)
  const [answerText, setAnswerText] = useState('')
  const [answering, setAnswering] = useState(false)

  useEffect(() => {
    if (!room) return
    const start = new Date(room.start_date)
    const meeting = new Date(room.next_meeting)
    const now = new Date()
    setDays(Math.floor((now - start) / (1000 * 60 * 60 * 24)))
    setUntilDays(Math.floor((meeting - now) / (1000 * 60 * 60 * 24)))
    setDailyQ(getDailyQuestion())
    loadSpark()
  }, [room])

  async function loadSpark() {
    if (!room) return
    const today = todayStr()
    const { data: todayRow } = await supabase
      .from('daily_answers').select('*').eq('room_id', room.id).eq('date', today).maybeSingle()
    setTodayAnswer(todayRow?.answer || '')

    const { data: rows } = await supabase
      .from('daily_answers').select('date').eq('room_id', room.id).order('date', { ascending: false }).limit(400)
    if (!rows) return

    const dates = [...new Set(rows.map(r => r.date))].sort().reverse()
    let s = 0
    let cursor = new Date()
    cursor.setDate(cursor.getDate() - (todayRow ? 0 : 1))
    while (dates.some(d => d === cursor.toISOString().slice(0, 10))) {
      s++
      cursor.setDate(cursor.getDate() - 1)
    }
    setStreak(s)
  }

  async function submitAnswer() {
    const text = answerText.trim()
    if (!text) return
    await supabase.from('daily_answers').insert({
      room_id: room.id,
      date: todayStr(),
      question: dailyQ,
      answer: text,
      author: username,
    })
    setTodayAnswer(text)
    setAnswerText('')
    setAnswering(false)
    loadSpark()
    vibrate(30)
    showToast('Réponse partagée 💜')
  }

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

      {dailyQ && (
        <div className="daily-question-card">
          <div className="daily-q-badge">
            <MessageCircleQuestion size={14} />
            <span>Question du Jour {todayAnswer && '· répondu ✓'}</span>
          </div>
          <p className="daily-q-text">{dailyQ}</p>
          {!todayAnswer ? (
            !answering ? (
              <button className="daily-q-reply" onClick={() => setAnswering(true)}>
                Répondre →
              </button>
            ) : (
              <div className="daily-q-input">
                <input
                  autoFocus
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitAnswer() }}
                  placeholder="Ta réponse..."
                />
                <button className="btn btn-sm" onClick={submitAnswer} disabled={!answerText.trim()}><Send size={16} /></button>
              </div>
            )
          ) : (
            <p className="daily-q-answered">
              <Flame size={14} />
              Streak actuel : {streak} jour{streak > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

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
