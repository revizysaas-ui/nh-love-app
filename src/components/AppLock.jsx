import { useState, useRef, useEffect } from 'react'
import { Lock, Heart, Delete } from 'lucide-react'
import { hashPin } from '../lib/crypto'

export function getAppLockHash() {
  return localStorage.getItem('nh_app_lock')
}

export function setAppLockHash(hash) {
  if (hash) localStorage.setItem('nh_app_lock', hash)
  else localStorage.removeItem('nh_app_lock')
}

export default function AppLock({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const storedHash = getAppLockHash()
  const isSetup = !storedHash
  const [confirmPin, setConfirmPin] = useState(null)
  const dotsRef = useRef([])

  useEffect(() => {
    const idx = pin.length
    if (idx < 4) dotsRef.current[idx]?.focus()
  }, [pin])

  async function handleDigit(d) {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setError(false)

    if (next.length === 4) {
      if (isSetup) {
        if (confirmPin === null) {
          setTimeout(() => {
            setConfirmPin(next)
            setPin('')
          }, 200)
        } else {
          if (next === confirmPin) {
            const h = await hashPin(next)
            setAppLockHash(h)
            onUnlock()
          } else {
            setError(true)
            setTimeout(() => { setPin(''); setError(false) }, 800)
          }
        }
      } else {
        const h = await hashPin(next)
        if (h === storedHash) {
          onUnlock()
        } else {
          setError(true)
          setTimeout(() => { setPin(''); setError(false) }, 800)
        }
      }
    }
  }

  function handleDelete() {
    setPin(p => p.slice(0, -1))
    setError(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      handleDelete()
    } else if (/^\d$/.test(e.key)) {
      handleDigit(e.key)
    }
  }

  return (
    <div className="applock-screen" onClick={() => dotsRef.current[pin.length]?.focus()}>
      <div className="applock-logo">
        <Heart size={40} fill="currentColor" className="heart-pulse" />
        <h1>N&H</h1>
      </div>

      <div className="applock-content">
        <Lock size={28} style={{ color: 'var(--primary)', marginBottom: 16 }} />
        <h2 className="applock-title">
          {isSetup
            ? confirmPin === null
              ? 'Définis ton code'
              : 'Confirme ton code'
            : 'Entres ton code'}
        </h2>
        {error && <p className="applock-error">Code incorrect</p>}

        <div className="applock-dots" tabIndex={0} onKeyDown={handleKeyDown} ref={el => { dotsRef.current[0] = el }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`applock-dot ${pin.length > i ? 'filled' : ''} ${error ? 'shake' : ''}`} />
          ))}
        </div>

        <div className="applock-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((d, i) => {
            if (d === null) return <div key={i} />
            if (d === 'del') return (
              <button key={i} className="applock-key applock-key-del" onClick={handleDelete}>
                <Delete size={22} />
              </button>
            )
            return (
              <button key={i} className="applock-key" onClick={() => handleDigit(String(d))}>
                {d}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
