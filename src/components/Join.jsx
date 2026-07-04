import { useState } from 'react'
import { Heart, LogIn, UserPlus, Key, Sparkles } from 'lucide-react'
import { useRoom } from '../context/RoomContext'
import { useNavigate } from 'react-router-dom'

export default function Join() {
  const { createRoom, joinRoom } = useRoom()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    setLoading(true)
    setError('')
    const room = await createRoom()
    setLoading(false)
    if (room) navigate('/')
    else setError('Erreur lors de la création')
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError('')
    const room = await joinRoom(code.trim())
    setLoading(false)
    if (room) navigate('/')
    else setError('Code invalide. Vérifie avec ta moitié !')
  }

  return (
    <div className="join-page">
      <div className="join-card">
        <div className="join-logo">
          <Heart size={48} className="join-heart" />
          <Sparkles size={20} className="join-sparkle" />
        </div>
        <h1>N&H</h1>
        <p className="join-sub">Créez ou rejoignez votre espace à deux</p>

        <button className="btn btn-primary btn-full btn-lg" onClick={handleCreate} disabled={loading}>
          <UserPlus size={20} />
          Créer un nouvel espace
        </button>

        <div className="join-divider"><span>ou</span></div>

        <form onSubmit={handleJoin} className="join-form">
          <div className="input-group">
            <Key size={18} />
            <input
              placeholder="Entre le code à 6 lettres"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
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
