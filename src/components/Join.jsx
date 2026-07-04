import { useState } from 'react'
import { Heart, LogIn, UserPlus, Key, Sparkles } from 'lucide-react'
import { useRoom } from '../context/RoomContext'
import { useNavigate } from 'react-router-dom'

export default function Join() {
  const { createRoom, joinRoom, username, setUsername } = useRoom()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
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
    const room = await createRoom()
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
