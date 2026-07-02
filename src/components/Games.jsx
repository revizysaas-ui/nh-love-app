import { useState, useEffect } from 'react'
import { Gamepad2, Heart, Sparkles, Shuffle, RotateCcw, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const DIFFICULTIES = [
  { key: 'soft', label: 'Tendre', emoji: '🌸', color: '#34d399' },
  { key: 'medium', label: 'Épicé', emoji: '🌶️', color: '#f59e0b' },
  { key: 'hot', label: 'Chaud', emoji: '🔥', color: '#ef4444' },
]

export default function Games() {
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(null)
  const [type, setType] = useState('truth')
  const [difficulty, setDifficulty] = useState('soft')
  const [used, setUsed] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    loadQuestions()
  }, [])

  async function loadQuestions() {
    const { data } = await supabase.from('questions').select('*')
    if (data) setQuestions(data)
    setLoading(false)
  }

  function pickRandom() {
    const filtered = questions.filter(q =>
      q.type === type && q.difficulty === difficulty && !used.has(q.id)
    )
    if (filtered.length === 0) {
      setUsed(new Set())
      const fallback = questions.filter(q => q.type === type && q.difficulty === difficulty)
      if (fallback.length > 0) {
        const pick = fallback[Math.floor(Math.random() * fallback.length)]
        setCurrent(pick)
      }
      return
    }
    const pick = filtered[Math.floor(Math.random() * filtered.length)]
    setCurrent(pick)
    setUsed(prev => new Set([...prev, pick.id]))
    setRevealed(false)
  }

  return (
    <div className="page games-page">
      <div className="page-header">
        <Gamepad2 size={24} />
        <h2>Vérité ou Action</h2>
      </div>

      <div className="game-controls">
        <div className="toggle-group">
          <button
            className={`toggle-btn ${type === 'truth' ? 'active' : ''}`}
            onClick={() => { setType('truth'); setCurrent(null) }}
          >
            <AlertCircle size={16} />
            Vérité
          </button>
          <button
            className={`toggle-btn ${type === 'dare' ? 'active' : ''}`}
            onClick={() => { setType('dare'); setCurrent(null) }}
          >
            <Sparkles size={16} />
            Action
          </button>
        </div>
        <div className="difficulty-group">
          {DIFFICULTIES.map(d => (
            <button
              key={d.key}
              className={`diff-btn ${difficulty === d.key ? 'active' : ''}`}
              style={{ borderColor: difficulty === d.key ? d.color : 'transparent', background: difficulty === d.key ? `${d.color}15` : '' }}
              onClick={() => { setDifficulty(d.key); setCurrent(null) }}
            >
              <span>{d.emoji}</span>
              <span>{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="game-card-wrapper">
        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : current ? (
          <div className={`game-card ${revealed ? 'revealed' : ''}`} onClick={() => setRevealed(true)}>
            {!revealed ? (
              <div className="game-card-front">
                <Heart size={40} />
                <p>Clique pour découvrir</p>
                <small>{type === 'truth' ? 'Vérité' : 'Action'} · {DIFFICULTIES.find(d => d.key === difficulty)?.label}</small>
              </div>
            ) : (
              <div className="game-card-back">
                <div className="game-badge" style={{ background: DIFFICULTIES.find(d => d.key === difficulty)?.color }}>
                  {DIFFICULTIES.find(d => d.key === difficulty)?.emoji}
                  {type === 'truth' ? ' Vérité' : ' Action'}
                </div>
                <p className="game-question">{current.question}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="game-card idle">
            <Heart size={48} />
            <p>Prêt à jouer ?</p>
            <span>Choisis le niveau et lance-toi</span>
          </div>
        )}
      </div>

      <div className="game-actions">
        <button className="btn btn-primary btn-lg" onClick={pickRandom}>
          <Shuffle size={20} />
          {current ? 'Suivant' : 'Commencer'}
        </button>
        {current && (
          <button className="btn btn-secondary" onClick={() => { setCurrent(null); setRevealed(false) }}>
            <RotateCcw size={18} />
            Changer de niveau
          </button>
        )}
      </div>
    </div>
  )
}
