import { useEffect, useState } from 'react'
import { DATES } from '../config'

const LABELS = ['jour', 'heure', 'minute', 'seconde']

function calcDiff(from, to) {
  let diff = Math.max(0, to - from)
  return [
    Math.floor(diff / (1000 * 60 * 60 * 24)),
    Math.floor((diff / (1000 * 60 * 60)) % 24),
    Math.floor((diff / (1000 * 60)) % 60),
    Math.floor((diff / 1000) % 60),
  ]
}

export default function DayCounter() {
  const [since, setSince] = useState(() => calcDiff(new Date(DATES.start), new Date()))
  const [until, setUntil] = useState(() => calcDiff(new Date(), new Date(DATES.nextMeeting)))

  useEffect(() => {
    const timer = setInterval(() => {
      setSince(calcDiff(new Date(DATES.start), new Date()))
      setUntil(calcDiff(new Date(), new Date(DATES.nextMeeting)))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="page">
      <h2 className="page-title">❤️ Notre Compteur</h2>
      <div className="counter-section">
        <h3>Ensemble depuis le {DATES.start}</h3>
        <div className="counter-grid">
          {since.map((v, i) => (
            <div key={i} className="counter-box">
              <span className="counter-num">{v}</span>
              <span className="counter-label">{LABELS[i]}{v > 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="counter-section">
        <h3>Prochaines retrouvailles</h3>
        <div className="counter-grid">
          {until.map((v, i) => (
            <div key={i} className="counter-box">
              <span className="counter-num">{v}</span>
              <span className="counter-label">{LABELS[i]}{v > 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
