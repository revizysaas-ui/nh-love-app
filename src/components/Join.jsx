import { useState, useMemo } from 'react'
import { Heart, LogIn, UserPlus, Key, Sparkles, Lock } from 'lucide-react'
import { useRoom } from '../context/RoomContext'
import { useNavigate } from 'react-router-dom'

function FloatingHearts() {
  const hearts = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: `${10 + Math.random() * 80}%`,
      top: `${10 + Math.random() * 80}%`,
      size: 16 + Math.random() * 24,
      delay: `${i * 0.4}s`,
      duration: `${2 + Math.random() * 2}s`,
    })), [])

  return (
    <div className="join-floating-hearts">
      {hearts.map(h => (
        <Heart
          key={h.id}
          className="floating-heart"
          size={h.size}
          fill="currentColor"
          style={{
            left: h.left,
            top: h.top,
            animationDelay: h.delay,
            animationDuration: h.duration,
          }}
        />
      ))}
    </div>
  )
}

export default function Join() {
  const { createRoom, joinRoom, username, setUsername } = useRoom()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [roomPassword, setRoomPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [localName, setLocalName] = useState(username)
  const [nameError, setNameError] = useState('')

  const nameValid = localName.trim().length >= 2

  async function handleCreate() {
    if (!nameValid) { setNameError('Entre ton prénom (min. 2 lettres)'); return }
    setNameError('')
    setUsername(localName.trim())
    setLoading(true)
    setError('')
    const room = await createRoom(localName.trim())
    setLoading(false)
    if (room) navigate('/')
    else setError('Erreur lors de la création')
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!nameValid) { setNameError('Entre ton prénom (min. 2 lettres)'); return }
    setNameError('')
    if (!code.trim()) return
    setUsername(localName.trim())
    setLoading(true)
    setError('')
    const { data, error: joinError } = await joinRoom(code.trim(), roomPassword.trim() || null)
    setLoading(false)
    if (data) navigate('/')
    else if (joinError?.message?.includes('row')) setError('Code invalide. Vérifie avec ta moitié !')
    else if (roomPassword) setError('Mot de passe incorrect. Vérifie avec ta moitié !')
    else setError('Code invalide ou mot de passe requis. Vérifie avec ta moitié !')
  }

  return (
    <div className="join-page">
      <FloatingHearts />
      <div className="join-card">
        <div className="join-logo">
          <Heart size={36} className="join-heart" fill="currentColor" />
          <Sparkles size={18} className="join-sparkle" />
        </div>
        <h1>N&H</h1>
        <p className="join-sub">Créez ou rejoignez votre espace à deux</p>

        <div className="join-name-field">
          <label>Ton prénom</label>
          <input
            placeholder="Entre ton prénom..."
            value={localName}
            onChange={e => { setLocalName(e.target.value); setNameError('') }}
            maxLength={20}
            autoFocus
          />
          {nameError && <p className="join-error">{nameError}</p>}
        </div>

        <button className="btn btn-primary btn-full btn-lg" onClick={handleCreate} disabled={loading}>
          <UserPlus size={20} />
          Créer un nouvel espace
        </button>

        <div className="join-divider"><span>ou</span></div>

        <form onSubmit={handleJoin} className="join-form">
          <div className="input-group">
            <Key size={18} />
            <input
              placeholder="Code à 6 lettres"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
          </div>
          <div className="input-group">
            <Lock size={18} />
            <input
              type="password"
              placeholder="Mot de passe (si défini)"
              value={roomPassword}
              onChange={e => setRoomPassword(e.target.value)}
            />
          </div>
          {error && <p className="join-error">{error}</p>}
          <button type="submit" className="btn btn-secondary btn-full" disabled={loading || code.length < 4}>
            <LogIn size={20} />
            Rejoindre
          </button>
        </form>
      </div>
    </div>
  )
}
