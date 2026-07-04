import { useState, useEffect, useRef } from 'react'
import { Gamepad2, Heart, Sparkles, Shuffle, RotateCcw, AlertCircle, HelpCircle, MessageCircle, Target, BookOpen, Camera, Send, CheckCircle2, XCircle, UserCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'
import { notify } from '../lib/notify'
import QUIZ_QUESTIONS from '../data/quiz-questions'
import DAILY_QUESTIONS from '../data/daily-questions'
import CULTURE_QUESTIONS from '../data/culture-questions'
import DEFIS_DATA from '../data/defis'

const GAMES = [
  { key: 'truthdare', icon: Sparkles, label: 'Vérité ou Action' },
  { key: 'quiz', icon: HelpCircle, label: 'Quiz Amour' },
  { key: 'daily', icon: MessageCircle, label: 'Question du Jour' },
  { key: 'defis', icon: Target, label: 'Défis' },
  { key: 'culture', icon: BookOpen, label: 'Culture G' },
]

const DIFFICULTIES = [
  { key: 'soft', label: 'Tendre', emoji: '🌸', color: '#34d399' },
  { key: 'medium', label: 'Épicé', emoji: '🌶️', color: '#f59e0b' },
  { key: 'hot', label: 'Chaud', emoji: '🔥', color: '#ef4444' },
]

function TruthOrDare() {
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(null)
  const [type, setType] = useState('truth')
  const [difficulty, setDifficulty] = useState('soft')
  const [used, setUsed] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => { loadQuestions() }, [])

  async function loadQuestions() {
    const { data } = await supabase.from('questions').select('*')
    if (data) setQuestions(data)
    setLoading(false)
  }

  function pick() {
    const filtered = questions.filter(q => q.type === type && q.difficulty === difficulty && !used.has(q.id))
    if (filtered.length === 0) {
      setUsed(new Set())
      const fallback = questions.filter(q => q.type === type && q.difficulty === difficulty)
      if (fallback.length > 0) {
        setCurrent(fallback[Math.floor(Math.random() * fallback.length)])
      }
      return
    }
    const pick = filtered[Math.floor(Math.random() * filtered.length)]
    setCurrent(pick)
    setUsed(prev => new Set([...prev, pick.id]))
    setRevealed(false)
  }

  return (
    <>
      <div className="game-controls">
        <div className="toggle-group">
          {['truth', 'dare'].map(t => (
            <button key={t} className={`toggle-btn ${type === t ? 'active' : ''}`} onClick={() => { setType(t); setCurrent(null) }}>
              {t === 'truth' ? <AlertCircle size={16} /> : <Sparkles size={16} />}
              {t === 'truth' ? 'Vérité' : 'Action'}
            </button>
          ))}
        </div>
        <div className="difficulty-group">
          {DIFFICULTIES.map(d => (
            <button key={d.key} className={`diff-btn ${difficulty === d.key ? 'active' : ''}`}
              style={{ borderColor: difficulty === d.key ? d.color : 'transparent', background: difficulty === d.key ? `${d.color}15` : '' }}
              onClick={() => { setDifficulty(d.key); setCurrent(null) }}>
              <span>{d.emoji}</span><span>{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="game-card-wrapper">
        {loading ? <div className="loading-screen"><div className="spinner" /></div>
        : current ? (
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
                  {DIFFICULTIES.find(d => d.key === difficulty)?.emoji} {type === 'truth' ? 'Vérité' : 'Action'}
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
        <button className="btn btn-primary btn-lg" onClick={pick}>
          <Shuffle size={20} />
          {current ? 'Suivant' : 'Commencer'}
        </button>
      </div>
    </>
  )
}

function QuizGame() {
  const { room, username } = useRoom()
  const [session, setSession] = useState(null)
  const [phase, setPhase] = useState('loading')
  const [shuffled, setShuffled] = useState([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [partnerAnswers, setPartnerAnswers] = useState([])

  useEffect(() => {
    if (!room) return
    loadActiveSession()
    const sub = supabase
      .channel('quiz-' + room.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_sessions', filter: `room_id=eq.${room.id}` }, () => loadActiveSession())
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [room])

  async function loadActiveSession() {
    const { data } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (!data) { setPhase('idle'); return }
    setSession(data)

    if (data.completed) {
      if (data.creator_answers && data.partner_answers) {
        setShuffled(data.questions)
        setAnswers(data.creator_answers)
        setPartnerAnswers(data.partner_answers)
        const s = data.creator_answers.reduce((acc, a, i) => acc + (a === data.partner_answers[i] ? 1 : 0), 0)
        setScore(s)
        setPhase('results')
      } else {
        setPhase('idle')
      }
    } else if (!data.creator_answers) {
      if (data.creator === username) {
        setShuffled(data.questions)
        setPhase('answering')
      } else {
        setPhase('waiting_creator')
      }
    } else {
      if (data.creator === username) {
        setPhase('waiting_partner')
      } else if (!data.partner_answers) {
        setShuffled(data.questions)
        setPhase('guessing')
      } else {
        setPhase('waiting_partner')
      }
    }
  }

  async function startSession() {
    const picked = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 8)
    setShuffled(picked)
    setIndex(0)
    setAnswers([])
    setPhase('answering')

    const { data } = await supabase.from('quiz_sessions').insert({
      room_id: room.id,
      creator: username,
      questions: picked,
    }).select().single()

    setSession(data)
  }

  function handleCreatorAnswer(choiceIndex) {
    const newAnswers = [...answers, choiceIndex]
    setAnswers(newAnswers)

    if (newAnswers.length === shuffled.length) {
      finishCreatorAnswers(newAnswers)
    } else {
      setIndex(i => i + 1)
    }
  }

  async function finishCreatorAnswers(newAnswers) {
    await supabase.from('quiz_sessions').update({ creator_answers: newAnswers }).eq('id', session.id)
    notify(room.id, 'quiz', 'a répondu au quiz Amour, à toi de deviner ! ❤️', username)
    setPhase('waiting_partner')
  }

  function handlePartnerAnswer(choiceIndex) {
    const newAnswers = [...answers, choiceIndex]
    setAnswers(newAnswers)

    if (newAnswers.length === shuffled.length) {
      finishPartnerAnswers(newAnswers)
    } else {
      setIndex(i => i + 1)
    }
  }

  async function finishPartnerAnswers(newAnswers) {
    const s = session.creator_answers.reduce((acc, a, i) => acc + (a === newAnswers[i] ? 1 : 0), 0)
    setScore(s)
    setPartnerAnswers(newAnswers)
    await supabase.from('quiz_sessions').update({ partner_answers: newAnswers, score: s, completed: true }).eq('id', session.id)
    setPhase('results')
    setShowResults(true)
  }

  async function cleanup() {
    await supabase.from('quiz_sessions').delete().eq('id', session.id)
    setSession(null)
    setPhase('idle')
    setShuffled([])
    setAnswers([])
    setPartnerAnswers([])
    setIndex(0)
    setScore(0)
    setShowResults(false)
  }

  if (phase === 'loading') {
    return <div className="game-card-wrapper"><div className="loading-screen"><div className="spinner" /></div></div>
  }

  if (phase === 'results') {
    const isCreator = session?.creator === username
    return (
      <div className="game-card-wrapper">
        <div className="game-card revealed" style={{ cursor: 'default', maxWidth: 480, padding: '24px 20px' }}>
          <Sparkles size={48} />
          <p className="game-question" style={{ marginTop: 16, textAlign: 'center' }}>
            Score : {score}/{shuffled.length}
          </p>
          <p style={{ color: 'var(--muted-foreground)', marginTop: 8, textAlign: 'center', marginBottom: 16 }}>
            {score === shuffled.length ? "Parfait·e ! Tu me connais par cœur ❤️" :
             score >= Math.ceil(shuffled.length * 0.75) ? "Bravo ! Tu me connais super bien !" :
             score >= Math.ceil(shuffled.length * 0.5) ? "Pas mal ! On continue d'apprendre !" :
             "On rejoue pour mieux me connaître ?"}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginBottom: 16 }}>
            {shuffled.map((q, i) => {
              const creatorAns = session.creator_answers[i]
              const partnerAns = partnerAnswers[i]
              const match = creatorAns === partnerAns
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: match ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                  {match ? <CheckCircle2 size={14} color="#34d399" /> : <XCircle size={14} color="#ef4444" />}
                  <span style={{ flex: 1, color: 'var(--foreground)' }}>{q.q}</span>
                  <small style={{ color: 'var(--muted-foreground)' }}>
                    {isCreator ? `${q.a[creatorAns]} → ${q.a[partnerAns]}` : `${q.a[partnerAns]} → ${q.a[creatorAns]}`}
                  </small>
                </div>
              )
            })}
          </div>
          <div className="game-actions">
            <button className="btn btn-primary" onClick={cleanup}><RotateCcw size={18} /> Nouveau Quiz</button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'idle') {
    return (
      <div className="game-card-wrapper">
        <div className="game-card idle" onClick={startSession}>
          <HelpCircle size={48} />
          <p>Quiz Amour</p>
          <span>8 questions pour deviner ce que je pense</span>
        </div>
      </div>
    )
  }

  if (phase === 'waiting_creator') {
    return (
      <div className="game-card-wrapper">
        <div className="game-card revealed" style={{ cursor: 'default' }}>
          <UserCheck size={40} />
          <p className="game-question" style={{ textAlign: 'center', marginTop: 12, fontSize: 17 }}>
            {session?.creator} répond aux questions...
          </p>
          <p style={{ color: 'var(--muted-foreground)', marginTop: 8, textAlign: 'center', fontSize: 14 }}>
            Sois patient·e, tu seras notifié·e dès que ce sera ton tour !
          </p>
        </div>
      </div>
    )
  }

  if (phase === 'waiting_partner') {
    return (
      <div className="game-card-wrapper">
        <div className="game-card revealed" style={{ cursor: 'default' }}>
          <UserCheck size={40} />
          <p className="game-question" style={{ textAlign: 'center', marginTop: 12, fontSize: 17 }}>
            En attente de {session?.creator === username ? 'ta moitié' : session?.creator}...
          </p>
          <p style={{ color: 'var(--muted-foreground)', marginTop: 8, textAlign: 'center', fontSize: 14 }}>
            Les résultats arrivent bientôt !
          </p>
        </div>
      </div>
    )
  }

  if (phase === 'guessing') {
    const q = shuffled[index]
    return (
      <div className="game-card-wrapper">
        <div className="game-card revealed" style={{ cursor: 'default', maxWidth: 440 }}>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 12 }}>
            Question {index + 1}/{shuffled.length} · Devine la réponse de {session?.creator}
          </p>
          <p className="game-question" style={{ textAlign: 'center', marginBottom: 20 }}>{q.q}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {q.a.map((opt, i) => (
              <button key={i} className="btn btn-full" style={{ textAlign: 'left', background: 'var(--secondary)', color: 'var(--foreground)' }}
                onClick={() => handlePartnerAnswer(i)}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const q = shuffled[index]
  return (
    <div className="game-card-wrapper">
      <div className="game-card revealed" style={{ cursor: 'default', maxWidth: 440 }}>
        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 12 }}>
          Question {index + 1}/{shuffled.length} · Choisis ta réponse
        </p>
        <p className="game-question" style={{ textAlign: 'center', marginBottom: 20 }}>{q.q}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {q.a.map((opt, i) => (
            <button key={i} className="btn btn-full" style={{ textAlign: 'left', background: 'var(--secondary)', color: 'var(--foreground)' }}
              onClick={() => handleCreatorAnswer(i)}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function DailyGame() {
  const [q, setQ] = useState(null)
  const [used, setUsed] = useState(new Set())

  function pick() {
    const available = DAILY_QUESTIONS.filter((_, i) => !used.has(i))
    if (available.length === 0) { setUsed(new Set()); return }
    const idx = DAILY_QUESTIONS.indexOf(available[Math.floor(Math.random() * available.length)])
    setQ(DAILY_QUESTIONS[idx])
    setUsed(prev => new Set([...prev, idx]))
  }

  return (
    <>
      <div className="game-card-wrapper">
        {q ? (
          <div className="game-card revealed" style={{ cursor: 'default', maxWidth: 440 }}>
            <MessageCircle size={32} />
            <p className="game-question" style={{ textAlign: 'center', marginTop: 12 }}>{q}</p>
          </div>
        ) : (
          <div className="game-card idle" onClick={pick}>
            <MessageCircle size={48} />
            <p>Question du Jour</p>
            <span>Un sujet pour nourrir votre conversation</span>
          </div>
        )}
      </div>
      <div className="game-actions">
        <button className="btn btn-primary btn-lg" onClick={pick}>
          <Shuffle size={20} />
          {q ? 'Nouvelle question' : 'Découvrir'}
        </button>
      </div>
    </>
  )
}

function DefisGame() {
  const { room, username } = useRoom()
  const [defi, setDefi] = useState(null)
  const [used, setUsed] = useState(new Set())
  const [showNsfw, setShowNsfw] = useState(false)
  const fileRef = useRef(null)

  function pick() {
    const available = DEFIS_DATA.filter((_, i) => !used.has(i))
    if (available.length === 0) { setUsed(new Set()); return }
    const idx = DEFIS_DATA.indexOf(available[Math.floor(Math.random() * available.length)])
    setDefi(DEFIS_DATA[idx])
    setUsed(prev => new Set([...prev, idx]))
    setShowNsfw(false)
  }

  return (
    <>
      <div className="game-card-wrapper">
        {defi ? (
          <div className="game-card revealed" style={{ cursor: 'default', maxWidth: 440 }}>
            <Target size={32} />
            <p className="game-question" style={{ textAlign: 'center', marginTop: 12 }}>{defi.defi}</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
              {defi.photo && (
                <>
                  <button className="btn btn-sm" style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}
                    onClick={() => fileRef.current?.click()}>
                    <Camera size={14} /> Prendre une photo
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        notify(room?.id, 'defi', `a relevé le défi "${defi.defi}" 📸`, username)
                      }
                    }} />
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="game-card idle" onClick={pick}>
            <Target size={48} />
            <p>Défis à Distance</p>
            <span>Des petits challenges pour rester connectés</span>
          </div>
        )}
      </div>
      <div className="game-actions">
        <button className="btn btn-primary btn-lg" onClick={pick}>
          <Shuffle size={20} />
          {defi ? 'Nouveau défi' : 'Un défi !'}
        </button>
      </div>
    </>
  )
}

function CultureGame() {
  const [index, setIndex] = useState(null)
  const [answer, setAnswer] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [shuffled, setShuffled] = useState([])

  function start() {
    const s = [...CULTURE_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 8)
    setShuffled(s)
    setIndex(0)
    setAnswer(null)
    setScore(0)
    setDone(false)
  }

  function handleAnswer(val) {
    setAnswer(val)
    if (val === shuffled[index].answer) setScore(s => s + 1)
  }

  function next() {
    if (index < shuffled.length - 1) {
      setIndex(i => i + 1)
      setAnswer(null)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="game-card-wrapper">
        <div className="game-card revealed" style={{ cursor: 'default' }}>
          <Sparkles size={48} />
          <p className="game-question" style={{ marginTop: 16, textAlign: 'center' }}>
            Score : {score}/{shuffled.length}
          </p>
          <p style={{ color: 'var(--muted-foreground)', marginTop: 8, textAlign: 'center' }}>
            {score === shuffled.length ? 'Génie ! 10/10 ! 🧠' :
             score >= 6 ? 'Bien joué ! Bonne culture G !' :
             'On apprend en s\'amusant !'}
          </p>
          <div className="game-actions">
            <button className="btn btn-primary" onClick={start}>
              <RotateCcw size={18} /> Rejouer
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (index === null) {
    return (
      <div className="game-card-wrapper">
        <div className="game-card idle" onClick={start}>
          <BookOpen size={48} />
          <p>Culture G</p>
          <span>8 questions de culture générale vrai/faux</span>
        </div>
      </div>
    )
  }

  const q = shuffled[index]
  return (
    <div className="game-card-wrapper">
      <div className="game-card revealed" style={{ cursor: 'default', maxWidth: 400 }}>
        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 12 }}>
          Question {index + 1}/{shuffled.length}
        </p>
        <p className="game-question" style={{ textAlign: 'center', marginBottom: 20 }}>{q.q}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          {['Vrai', 'Faux'].map((label, i) => {
            const val = i === 0
            return (
              <button key={label} className="btn btn-full btn-lg"
                style={{
                  flex: 1,
                  background: answer === null ? 'var(--secondary)' :
                    val === q.answer ? '#34d399' :
                    val === answer ? '#ef4444' : 'var(--secondary)',
                  color: answer !== null && (val === q.answer || val === answer) ? 'white' : 'var(--foreground)',
                }}
                onClick={() => answer === null && handleAnswer(val)}
                disabled={answer !== null}>
                {label}
              </button>
            )
          })}
        </div>
        {answer !== null && (
          <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={next}>
            {index < shuffled.length - 1 ? 'Suivante' : 'Voir mon score'}
          </button>
        )}
      </div>
    </div>
  )
}

const GAME_COMPONENTS = {
  truthdare: TruthOrDare,
  quiz: QuizGame,
  daily: DailyGame,
  defis: DefisGame,
  culture: CultureGame,
}

export default function Games() {
  const [active, setActive] = useState('truthdare')
  const GameComponent = GAME_COMPONENTS[active]

  return (
    <div className="page games-page">
      <div className="page-header">
        <Gamepad2 size={24} />
        <h2>Nos Jeux</h2>
      </div>

      <div className="games-menu">
        {GAMES.map(g => (
          <button key={g.key}
            className={`games-menu-btn ${active === g.key ? 'active' : ''}`}
            onClick={() => setActive(g.key)}>
            <g.icon size={18} />
            <span>{g.label}</span>
          </button>
        ))}
      </div>

      <GameComponent />
    </div>
  )
}
