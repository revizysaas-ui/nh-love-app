import { useState } from 'react'
import { Heart, Mail, Lock, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { COUPLE } from '../config'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fn = isSignUp ? supabase.auth.signUp : supabase.auth.signInWithPassword
    const { error: err } = await fn({ email, password })
    if (err) setError(err.message)
    setLoading(false)
  }

  async function handleGuest() {
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: 'guest@nh.app',
      password: 'guest123456',
    })
    if (err) {
      const { error: signUpErr } = await supabase.auth.signUp({
        email: 'guest@nh.app',
        password: 'guest123456',
      })
      if (signUpErr) setError(signUpErr.message)
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Heart size={48} className="login-heart" />
            <Sparkles size={20} className="login-sparkle" />
          </div>
          <h1>{COUPLE.name1} & {COUPLE.name2}</h1>
          <p>Notre espace secret</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <Mail size={18} />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <Lock size={18} />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? '...' : isSignUp ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>
        <div className="login-footer">
          <button className="btn-link" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Déjà un compte ? Connecte-toi' : 'Pas de compte ? Crée-le'}
          </button>
          <button className="btn-link" onClick={handleGuest}>
            Mode invité
          </button>
        </div>
      </div>
    </div>
  )
}
