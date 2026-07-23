import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Gamepad2, Heart, Sparkles, Shuffle, RotateCcw, AlertCircle, HelpCircle, MessageCircle, Target, BookOpen, Camera, CheckCircle2, XCircle, UserCheck, Cherry, Grid3X3, ArrowLeft, User, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'
import { notify } from '../lib/notify'
import QUIZ_QUESTIONS from '../data/quiz-questions'
import { getDailyQuestion } from '../data/daily-questions'
import CULTURE_QUESTIONS from '../data/culture-questions'
import DEFIS_DATA from '../data/defis'

const GAMES_LIST = [
  { key: 'truthdare', icon: Heart, label: 'Vérité ou Action', color: '#e74c8b', desc: 'Osez tout vous dire !' },
  { key: 'quiz', icon: HelpCircle, label: 'Quiz Amour', color: '#8a79ab', desc: 'Combien vous connaissez-vous ?' },
  { key: 'daily', icon: Sparkles, label: 'Question du Jour', color: '#d4a843', desc: 'Un moment de partage quotidien' },
  { key: 'defis', icon: Target, label: 'Défis', color: '#e74c3c', desc: 'Relevez des défis ensemble !' },
  { key: 'culture', icon: BookOpen, label: 'Culture G', color: '#4a90d9', desc: 'Culture générale en duo' },
  { key: 'roue', icon: Cherry, label: 'Roue de la Chance', color: '#34d399', desc: 'Laissez le hasard décider' },
  { key: 'morpion', icon: Grid3X3, label: 'Morpion', color: '#22d3ee', desc: 'Le classique revisité' },
  { key: 'preferes', icon: Gamepad2, label: 'Tu Préfères', color: '#f97316', desc: 'Choix impossibles en couple' },
]

const WYR_QUESTIONS = [
  { a: "Pouvoir se téléporter l'un chez l'autre", b: "Avoir un revenu infini pour se voir" },
  { a: "Vivre dans la même ville", b: "Voyager le monde ensemble 3 mois/an" },
  { a: "Se parler 24h/24 mais jamais se voir", b: "Se voir 1 semaine/an sans contact" },
  { a: "Partager tous ses pensées", b: "Garder quelques secrets mais plus de surprises" },
  { a: "Revivre votre premier rendez-vous", b: "Vivre votre premier rendez-vous du futur" },
  { a: "Ne plus jamais se disputer", b: "Toujours se réconcilier immédiatement" },
  { a: "Avoir le même prénom", b: "Avoir la même date d'anniversaire" },
  { a: "Être célèbre ensemble", b: "Être anonymes mais infiniment heureux" },
  { a: "Pouvoir lire les pensées de l'autre", b: "Toujours savoir exactement quoi offrir" },
  { a: "Vivre 100 ans ensemble", b: "Vivre 10 ans intenses ensemble" },
]

const DIFFICULTIES = [
  { key: 'soft', label: 'Tendre', emoji: '🌸', color: '#34d399' },
  { key: 'medium', label: 'Épicé', emoji: '🌶️', color: '#f59e0b' },
  { key: 'hot', label: 'Chaud', emoji: '🔥', color: '#ef4444' },
]

const ROULETTE_COLORS = ['#8a79ab', '#e8b4c8', '#c4a8d8', '#b8a5d4', '#d47a9e', '#9b8ec4', '#f0a0c0', '#a690c0', '#d4b0d0', '#c090b0', '#e0a0d0', '#b0a0d0']

function TruthOrDare() {
  const { room, username, updateGameState } = useRoom()
  const gs = room?.active_game?.state || {}

  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [usedIds, setUsedIds] = useState([])
  const notifiedRef = useRef(false)

  const currentCard = gs.currentCard || null
  const cardType = gs.type || 'truth'
  const cardDifficulty = gs.difficulty || 'soft'
  const revealed = gs.revealed || false
  const picker = gs.picker || null

  useEffect(() => { loadQuestions() }, [])

  async function loadQuestions() {
    const { data } = await supabase.from('questions').select('*')
    if (data) setQuestions(data)
    setLoading(false)
  }

  function pick() {
    if (!notifiedRef.current && room) {
      notify(room.id, 'game', 'a lancé Vérité ou Action 🎮', username)
      notifiedRef.current = true
    }
    const filtered = questions.filter(q => q.type === cardType && q.difficulty === cardDifficulty && !usedIds.includes(q.id))
    let pool = filtered.length > 0 ? filtered : questions.filter(q => q.type === cardType && q.difficulty === cardDifficulty)
    if (pool.length === 0) return
    const p = pool[Math.floor(Math.random() * pool.length)]
    setUsedIds(prev => [...prev, p.id])
    updateGameState({ state: { currentCard: p, type: cardType, difficulty: cardDifficulty, revealed: false, picker: username } })
  }

  function reveal() {
    updateGameState({ state: { ...gs, revealed: true } })
  }

  const diff = DIFFICULTIES.find(d => d.key === cardDifficulty)

  return (
    <>
      <div className="game-controls">
        <div className="toggle-group">
          {['truth', 'dare'].map(t => (
            <button key={t} className={`toggle-btn ${cardType === t ? 'active' : ''}`} onClick={() => updateGameState({ state: { ...gs, type: t, currentCard: null, revealed: false } })}>
              {t === 'truth' ? <AlertCircle size={16} /> : <Sparkles size={16} />}
              {t === 'truth' ? 'Vérité' : 'Action'}
            </button>
          ))}
        </div>
        <div className="difficulty-group">
          {DIFFICULTIES.map(d => (
            <button key={d.key} className={`diff-btn ${cardDifficulty === d.key ? 'active' : ''}`}
              style={{ borderColor: cardDifficulty === d.key ? d.color : 'transparent', background: cardDifficulty === d.key ? `${d.color}15` : '' }}
              onClick={() => updateGameState({ state: { ...gs, difficulty: d.key, currentCard: null, revealed: false } })}>
              <span>{d.emoji}</span><span>{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      {picker && !revealed && (
        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 12 }}>
          {picker} a tiré une carte...
        </p>
      )}

      <div className="game-card-wrapper">
        {loading ? <div className="loading-screen"><div className="spinner" /></div>
        : currentCard ? (
          <div className="flip-card">
            <div className={`flip-card-inner ${revealed ? 'flipped' : ''}`}>
              <div className="flip-card-face flip-card-front">
                <Heart size={40} />
                <p style={{ marginTop: 12, fontSize: 16 }}>
                  {!revealed ? 'Clique pour révéler' : `${picker} a tiré une carte...`}
                </p>
                <small style={{ fontSize: 13, opacity: 0.8, marginTop: 8 }}>
                  {cardType === 'truth' ? 'Vérité' : 'Action'} · {diff?.label}
                </small>
              </div>
              <div className="flip-card-face flip-card-back">
                <div className="game-badge" style={{ background: diff?.color }}>
                  {diff?.emoji} {cardType === 'truth' ? 'Vérité' : 'Action'}
                </div>
                <p>{currentCard.question}</p>
              </div>
            </div>
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
        <button className="btn btn-primary btn-lg" onClick={!revealed ? reveal : pick}>
          <Shuffle size={20} />
          {revealed ? 'Suivant' : 'Révéler'}
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
    if (!room) return
    const { data } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
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
    notify(room.id, 'game', 'a lancé le Quiz Amour 🧠', username)

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
  const [q, setQ] = useState('')
  useEffect(() => { setQ(getDailyQuestion()) }, [])

  return (
    <div className="game-card-wrapper">
      <div className="game-card revealed" style={{ cursor: 'default', maxWidth: 440 }}>
        <MessageCircle size={32} />
        <p className="game-question" style={{ textAlign: 'center', marginTop: 12 }}>{q}</p>
      </div>
    </div>
  )
}

function DefisGame() {
  const { room, username, updateGameState } = useRoom()
  const gs = room?.active_game?.state || {}
  const fileRef = useRef(null)
  const notifiedRef = useRef(false)

  const currentDefi = gs.currentDefi || null
  const defiIndex = gs.defiIndex ?? null

  function pick() {
    if (!notifiedRef.current && room) {
      notify(room.id, 'game', 'a lancé les Défis 🎯', username)
      notifiedRef.current = true
    }
    let idx
    do {
      idx = Math.floor(Math.random() * DEFIS_DATA.length)
    } while (idx === defiIndex && DEFIS_DATA.length > 1)
    updateGameState({ state: { currentDefi: DEFIS_DATA[idx], defiIndex: idx, completedBy: null } })
  }

  function complete() {
    updateGameState({ state: { ...gs, completedBy: username } })
  }

  return (
    <>
      <div className="game-card-wrapper">
        {currentDefi ? (
          <div className="game-card revealed" style={{ cursor: 'default', maxWidth: 440 }}>
            <Target size={32} />
            <p className="game-question" style={{ textAlign: 'center', marginTop: 12 }}>{currentDefi.defi}</p>
            {gs.completedBy && (
              <p style={{ textAlign: 'center', color: '#34d399', fontSize: 14, marginTop: 8, fontWeight: 600 }}>
                ✅ Fait par {gs.completedBy}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
              {!gs.completedBy && (
                <button className="btn btn-primary btn-sm" onClick={complete}>
                  <CheckCircle2 size={14} /> C&apos;est fait !
                </button>
              )}
              {currentDefi.photo && (
                <button className="btn btn-sm" style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}
                  onClick={() => fileRef.current?.click()}>
                  <Camera size={14} /> Photo
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    notify(room?.id, 'defi', `a relevé le défi "${currentDefi.defi}" 📸`, username)
                  }
                }} />
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
          {currentDefi ? 'Nouveau défi' : 'Un défi !'}
        </button>
      </div>
    </>
  )
}

function CultureGame() {
  const { room, username, updateGameState } = useRoom()
  const gs = room?.active_game?.state || {}

  const questions = gs.questions || []
  const index = gs.index ?? null
  const myAnswer = gs[`answer_${username}`] || null
  const partnerKey = Object.keys(gs).find(k => k.startsWith('answer_') && k !== `answer_${username}`)
  const partnerAnswer = partnerKey ? gs[partnerKey] : null
  const done = gs.done || false
  const started = gs.started || false

  const bothAnswered = myAnswer !== null && partnerAnswer !== null

  function start() {
    const s = [...CULTURE_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 8)
    updateGameState({ state: { questions: s, index: 0, done: false, started: true } })
    notify(room.id, 'game', 'a lancé Culture G 📚', username)
  }

  function handleAnswer(val) {
    updateGameState({ state: { ...gs, [`answer_${username}`]: val } })
  }

  function next() {
    const nextIndex = index + 1
    if (nextIndex < questions.length) {
      const clean = { ...gs }
      delete clean[`answer_${username}`]
      delete clean[partnerKey]
      updateGameState({ state: { ...clean, index: nextIndex } })
    } else {
      const clean = { ...gs }
      delete clean[`answer_${username}`]
      delete clean[partnerKey]
      updateGameState({ state: { ...clean, done: true } })
    }
  }

  if (done || (started && index === null)) {
    return (
      <div className="game-card-wrapper">
        <div className="game-card revealed" style={{ cursor: 'default' }}>
          <Sparkles size={48} />
          <p className="game-question" style={{ marginTop: 16, textAlign: 'center' }}>
            Terminé ! Discutez de vos réponses ensemble 💬
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

  if (!started || index === null) {
    return (
      <div className="game-card-wrapper">
        <div className="game-card idle" onClick={start}>
          <BookOpen size={48} />
          <p>Culture G</p>
          <span>Répondez ensemble aux mêmes questions !</span>
        </div>
      </div>
    )
  }

  const q = questions[index]
  const showResult = bothAnswered
  const isCorrect = showResult ? myAnswer === q.answer : null

  return (
    <div className="game-card-wrapper">
      <div className="game-card revealed" style={{ cursor: 'default', maxWidth: 400 }}>
        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 12 }}>
          Question {index + 1}/{questions.length} · {myAnswer !== null ? '✅ Tu as répondu' : '❓ Ta réponse ?'}
        </p>
        <p className="game-question" style={{ textAlign: 'center', marginBottom: 20 }}>{q.q}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          {['Vrai', 'Faux'].map((label, i) => {
            const val = i === 0
            return (
              <button key={label} className="btn btn-full btn-lg"
                style={{
                  flex: 1,
                  background: myAnswer === null ? 'var(--secondary)' :
                    showResult && val === q.answer ? '#34d399' :
                    myAnswer === val && !isCorrect ? '#ef4444' :
                    myAnswer === val ? 'var(--primary)' : 'var(--secondary)',
                  color: myAnswer !== null && (val === q.answer || val === myAnswer) ? 'white' : 'var(--foreground)',
                }}
                onClick={() => myAnswer === null && handleAnswer(val)}
                disabled={myAnswer !== null}>
                {label}
              </button>
            )
          })}
        </div>
        {showResult && partnerAnswer !== null && (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted-foreground)', marginTop: 12 }}>
            {partnerKey?.replace('answer_', '')} a répondu : {partnerAnswer ? 'Vrai' : 'Faux'} · {partnerAnswer === q.answer ? '✅' : '❌'}
          </p>
        )}
        {myAnswer !== null && (
          <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={next}>
            {index < questions.length - 1 ? 'Suivante' : 'Terminer'}
          </button>
        )}
      </div>
    </div>
  )
}

function RoueGame() {
  const { room, username, updateGameState } = useRoom()
  const gs = room?.active_game?.state || {}

  const choices = gs.choices || ['Film', 'Resto', 'Balade', 'Jeu', 'Série', 'Cuisine']
  const result = gs.result || null
  const spinning = gs.spinning || false
  const [input, setInput] = useState('')
  const [rotation, setRotation] = useState(0)
  const notifiedRef = useRef(false)

  function addChoice() {
    if (!input.trim() || choices.length >= 8) return
    updateGameState({ state: { ...gs, choices: [...choices, input.trim()], result: null } })
    setInput('')
  }

  function removeChoice(i) {
    if (choices.length <= 2) return
    updateGameState({ state: { ...gs, choices: choices.filter((_, idx) => idx !== i), result: null } })
  }

  function spin() {
    if (spinning) return
    if (!notifiedRef.current && room) {
      notify(room.id, 'game', 'a lancé la Roue de la Chance 🎡', username)
      notifiedRef.current = true
    }
    updateGameState({ state: { ...gs, spinning: true, result: null } })
    const newRotation = rotation + 1440 + Math.random() * 720
    setRotation(newRotation)
    const selected = choices[Math.floor(Math.random() * choices.length)]
    setTimeout(() => {
      updateGameState({ state: { ...gs, spinning: false, result: selected, choices } })
    }, 3000)
  }

  return (
    <>
      <div className="game-card-wrapper">
        <div className="game-card revealed" style={{ cursor: 'default', maxWidth: 440, flexDirection: 'column' }}>
          <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto 16px' }}>
            <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }}>
              {choices.map((_, i) => {
                const angle = (i * 360) / choices.length
                const rad = (angle * Math.PI) / 180
                const nextRad = ((angle + 360 / choices.length) * Math.PI) / 180
                return (
                  <path key={i}
                    d={`M100,100 L${100 + 90 * Math.cos(rad)},${100 + 90 * Math.sin(rad)} A90,90 0 0,1 ${100 + 90 * Math.cos(nextRad)},${100 + 90 * Math.sin(nextRad)} Z`}
                    fill={ROULETTE_COLORS[i % ROULETTE_COLORS.length]} stroke="white" strokeWidth="1" />
                )
              })}
            </svg>
            <div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
              <div style={{ width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '14px solid var(--foreground)' }} />
            </div>
          </div>

          {result ? (
            <p className="game-question" style={{ textAlign: 'center', fontSize: 22, color: spinning ? 'var(--muted-foreground)' : 'var(--primary)', marginBottom: 8 }}>
              {result}
            </p>
          ) : (
            <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', fontSize: 14, marginBottom: 8 }}>
              Ajoute des choix et lance la roue !
            </p>
          )}

          <div className="roue-choices">
            {choices.map((c, i) => (
              <span key={i} className="roue-tag">{c}<button className="roue-tag-remove" onClick={() => removeChoice(i)}>×</button></span>
            ))}
          </div>
          <div className="roue-input">
            <input placeholder="Nouveau choix..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChoice()} />
            <button className="btn btn-sm" onClick={addChoice} disabled={!input.trim() || choices.length >= 8}>+</button>
          </div>
        </div>
      </div>
      <div className="game-actions">
        <button className="btn btn-primary btn-lg" onClick={spin} disabled={spinning || choices.length < 2}>
          <Shuffle size={20} /> {spinning ? '...' : 'Lancer la roue !'}
        </button>
      </div>
    </>
  )
}

function calculateMorpionWinner(squares) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
  for (const [a,b,c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a]
  }
  if (squares.every(s => s)) return 'draw'
  return null
}

function MorpionGame() {
  const { room, username } = useRoom()
  const [board, setBoard] = useState(Array(9).fill(null))
  const [xIsNext, setXIsNext] = useState(true)
  const [winner, setWinner] = useState(null)
  const [scores, setScores] = useState({ 'X': 0, 'O': 0 })
  const [gameId, setGameId] = useState(null)
  const notifiedRef = useRef(false)
  const gameIdRef = useRef(null)
  const [players, setPlayers] = useState({ x: null, o: null })

  useEffect(() => { gameIdRef.current = gameId }, [gameId])

  useEffect(() => {
    if (!room) return
    loadGame()
    const sub = supabase
      .channel('morpion-' + room.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_morpion', filter: `room_id=eq.${room.id}` }, (payload) => {
        if (payload.new) {
          const newBoard = Array.isArray(payload.new.board) ? payload.new.board : (typeof payload.new.board === 'string' ? JSON.parse(payload.new.board) : Array(9).fill(null))
          setBoard(newBoard)
          setXIsNext(payload.new.x_is_next)
          setScores(payload.new.scores || { 'X': 0, 'O': 0 })
          setWinner(calculateMorpionWinner(newBoard))
          if (payload.new.players) setPlayers(payload.new.players)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') loadGame()
      })
    return () => supabase.removeChannel(sub)
  }, [room?.id])

  async function loadGame() {
    if (!room) return
    const { data } = await supabase
      .from('game_morpion')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) {
      const b = Array.isArray(data.board) ? data.board : (typeof data.board === 'string' ? JSON.parse(data.board) : Array(9).fill(null))
      setBoard(b)
      setXIsNext(data.x_is_next)
      setScores(data.scores || { 'X': 0, 'O': 0 })
      setGameId(data.id)
      setWinner(calculateMorpionWinner(b))
      if (data.players) setPlayers(data.players)
    }
  }

  async function syncGame(newBoard, newXIsNext, newScores, newPlayers) {
    const currentGameId = gameIdRef.current
    const payload = { board: newBoard, x_is_next: newXIsNext, scores: newScores, updated_at: new Date().toISOString() }
    if (newPlayers) payload.players = newPlayers
    if (currentGameId) {
      await supabase.from('game_morpion').update(payload).eq('id', currentGameId)
    } else {
      const { data } = await supabase.from('game_morpion').insert({
        room_id: room.id, ...payload,
      }).select().single()
      if (data) { gameIdRef.current = data.id; setGameId(data.id) }
    }
  }

  function assignSymbol() {
    if (players.x && players.o) return players
    const newPlayers = { ...players }
    if (!newPlayers.x) newPlayers.x = username
    else if (!newPlayers.o && newPlayers.x !== username) newPlayers.o = username
    return newPlayers
  }

  const mySymbol = players.x === username ? 'X' : players.o === username ? 'O' : null

  function handleClick(i) {
    if (board[i] || winner) return
    if (!notifiedRef.current && room) {
      notify(room.id, 'game', 'a lancé le Morpion ❌⭕', username)
      notifiedRef.current = true
    }
    const newPlayers = assignSymbol()
    setPlayers(newPlayers)
    const symbol = xIsNext ? 'X' : 'O'
    const newBoard = [...board]
    newBoard[i] = symbol
    const newXIsNext = !xIsNext
    const w = calculateMorpionWinner(newBoard)
    let newScores = { ...scores }
    if (w && w !== 'draw') newScores = { ...scores, [symbol]: (scores[symbol] || 0) + 1 }
    setBoard(newBoard)
    setXIsNext(newXIsNext)
    if (w) setWinner(w)
    setScores(newScores)
    syncGame(newBoard, newXIsNext, newScores, newPlayers)
  }

  async function reset() {
    const fresh = Array(9).fill(null)
    setBoard(fresh)
    setXIsNext(true)
    setWinner(null)
    syncGame(fresh, true, scores, players)
  }

  const w = calculateMorpionWinner(board)
  const status = w === 'draw' ? 'Match nul !' : w ? `${w} a gagné !` : xIsNext ? 'Tour de X' : 'Tour de O'

  return (
    <>
      <div className="game-card-wrapper">
        <div className="game-card revealed" style={{ cursor: 'default', flexDirection: 'column', maxWidth: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 12, fontSize: 14, color: 'var(--muted-foreground)' }}>
            <span>X: {scores['X']}</span>
            <span style={{ fontWeight: 700, color: w ? 'var(--primary)' : 'var(--foreground)' }}>{status}</span>
            <span>O: {scores['O']}</span>
          </div>
          <div className="morpion-board">
            {board.map((cell, i) => (
              <button key={i} className={`morpion-cell ${cell ? 'taken' : ''}`} onClick={() => handleClick(i)}>
                {cell && <span style={{ fontSize: 28 }}>{cell}</span>}
              </button>
            ))}
          </div>
          {(w || board.every(s => s)) && (
            <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={reset}><RotateCcw size={14} /> Rejouer</button>
          )}
        </div>
      </div>
    </>
  )
}

function WouldYouRather() {
  const { room, username, updateGameState } = useRoom()
  const gs = room?.active_game?.state || {}
  const notifiedRef = useRef(false)

  const questionIndex = gs.questionIndex ?? null
  const myChoice = gs[`choice_${username}`] || null
  const partnerKey = Object.keys(gs).find(k => k.startsWith('choice_') && k !== `choice_${username}`)
  const partnerChoice = partnerKey ? gs[partnerKey] : null
  const revealed = gs.revealed || false

  const bothChose = myChoice !== null && partnerChoice !== null

  function start() {
    if (!notifiedRef.current && room) {
      notify(room.id, 'game', 'a lancé Tu Préfères ⚡', username)
      notifiedRef.current = true
    }
    let idx
    do {
      idx = Math.floor(Math.random() * WYR_QUESTIONS.length)
    } while (idx === questionIndex && WYR_QUESTIONS.length > 1)
    const clean = {}
    Object.keys(gs).forEach(k => { if (!k.startsWith('choice_') && k !== 'revealed') clean[k] = gs[k] })
    updateGameState({ state: { ...clean, questionIndex: idx, revealed: false } })
  }

  function choose(val) {
    updateGameState({ state: { ...gs, [`choice_${username}`]: val } })
  }

  function showReveal() {
    updateGameState({ state: { ...gs, revealed: true } })
  }

  const q = questionIndex !== null ? WYR_QUESTIONS[questionIndex] : null

  if (!q) {
    return (
      <div className="game-card-wrapper">
        <div className="game-card idle" onClick={start}>
          <Gamepad2 size={48} />
          <p>Tu Préfères</p>
          <span>Choix impossibles en couple</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="game-card-wrapper">
        <div className="game-card revealed" style={{ cursor: 'default', maxWidth: 440 }}>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 12 }}>
            {revealed ? 'Voici les choix !' : myChoice ? 'Tu as choisi !' : 'Choisis ton option'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-full btn-lg"
              style={{
                textAlign: 'center', height: 'auto', padding: '16px 20px',
                background: revealed && myChoice === 'a' ? (partnerChoice === 'a' ? '#34d399' : 'var(--primary)') :
                  myChoice === 'a' ? 'var(--primary)' : 'var(--secondary)',
                color: (myChoice === 'a' || (revealed && partnerChoice === 'a')) ? 'var(--primary-foreground)' : 'var(--foreground)',
                border: myChoice === 'a' ? '2px solid var(--primary)' : '2px solid var(--input)',
                opacity: revealed && myChoice !== 'a' && partnerChoice !== 'a' ? 0.5 : 1,
              }}
              onClick={() => !myChoice && choose('a')}>
              {q.a}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)' }}>OU</p>
            <button
              className="btn btn-full btn-lg"
              style={{
                textAlign: 'center', height: 'auto', padding: '16px 20px',
                background: revealed && myChoice === 'b' ? (partnerChoice === 'b' ? '#34d399' : 'var(--accent)') :
                  myChoice === 'b' ? 'var(--accent)' : 'var(--secondary)',
                color: (myChoice === 'b' || (revealed && partnerChoice === 'b')) ? 'var(--primary-foreground)' : 'var(--foreground)',
                border: myChoice === 'b' ? '2px solid var(--accent)' : '2px solid var(--input)',
                opacity: revealed && myChoice !== 'b' && partnerChoice !== 'b' ? 0.5 : 1,
              }}
              onClick={() => !myChoice && choose('b')}>
              {q.b}
            </button>
          </div>
          {myChoice && !revealed && !bothChose && (
            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted-foreground)', marginTop: 12 }}>
              ⏳ En attente de {partnerKey?.replace('choice_', '') || 'ton partenaire'}...
            </p>
          )}
          {bothChose && !revealed && (
            <button className="btn btn-primary btn-full" style={{ marginTop: 12 }} onClick={showReveal}>
              Voir les choix 🎭
            </button>
          )}
          {revealed && (
            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted-foreground)', marginTop: 12 }}>
              {myChoice === partnerChoice ? 'Vous avez choisi la même chose ! 💕' : 'Vous êtes en désaccord ! 😱'}
            </p>
          )}
        </div>
      </div>
      <div className="game-actions">
        <button className="btn btn-sm" onClick={start}>
          <RotateCcw size={14} /> Suivante
        </button>
      </div>
    </>
  )
}

const GAME_COMPONENTS = {
  truthdare: TruthOrDare,
  quiz: QuizGame,
  daily: DailyGame,
  defis: DefisGame,
  culture: CultureGame,
  roue: RoueGame,
  morpion: MorpionGame,
  preferes: WouldYouRather,
}

export default function Games() {
  const { room, username, updateRoom } = useRoom()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlGame = searchParams.get('game')
  const [active, setActive] = useState(urlGame || null)
  const [creating, setCreating] = useState(false)
  const [createMode, setCreateMode] = useState(null)

  useEffect(() => {
    if (urlGame && urlGame !== active) setActive(urlGame)
  }, [urlGame])

  function openGame(key, mode) {
    setActive(key)
    setSearchParams({ game: key })
    const game = GAMES_LIST.find(g => g.key === key)
    updateRoom({ active_game: { game: key, by: username, label: game?.label, mode: mode || 'solo', state: {} } })
  }

  function closeGame() {
    setActive(null)
    setSearchParams({})
    if (room?.active_game?.by === username) {
      updateRoom({ active_game: null })
    }
  }

  function handleCreateSelect(gameKey) {
    if (createMode === 'duo' || createMode === 'solo') {
      openGame(gameKey, createMode)
      setCreating(false)
      setCreateMode(null)
    }
  }

  if (active) {
    const game = GAMES_LIST.find(g => g.key === active)
    const GameComponent = GAME_COMPONENTS[active]
    const gameMode = room?.active_game?.mode || 'solo'
    return (
      <div className="page games-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn-icon" onClick={closeGame}>
            <ArrowLeft size={22} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <div style={{ display: 'inline-flex', padding: 8, borderRadius: 'var(--radius)', background: `${game?.color}18`, color: game?.color }}>
              {game && <game.icon size={20} />}
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{game?.label}</h2>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>
                {gameMode === 'solo' ? 'Solo' : 'En couple'}
              </p>
            </div>
          </div>
        </div>
        <GameComponent />
      </div>
    )
  }

  if (creating && !createMode) {
    return (
      <div className="page games-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn-icon" onClick={() => setCreating(false)}>
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Créer une partie</h2>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginBottom: 24, fontSize: 14 }}>Comment veux-tu jouer ?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => setCreateMode('solo')}
            className="btn btn-full btn-lg"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '20px 16px', background: 'var(--card)', border: '1.5px solid var(--border)', color: 'var(--foreground)' }}
          >
            <User size={22} /> Solo
          </button>
          <button
            onClick={() => setCreateMode('duo')}
            className="btn btn-full btn-lg"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '20px 16px', background: 'var(--card)', border: '1.5px solid var(--border)', color: 'var(--foreground)' }}
          >
            <Users size={22} /> En couple
          </button>
        </div>
      </div>
    )
  }

  if (creating && createMode) {
    return (
      <div className="page games-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn-icon" onClick={() => setCreateMode(null)}>
            <ArrowLeft size={22} />
          </button>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            {createMode === 'solo' ? 'Choisir un jeu solo' : 'Choisir un jeu en couple'}
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {GAMES_LIST.map(game => (
            <button
              key={game.key}
              onClick={() => handleCreateSelect(game.key)}
              style={{
                background: 'var(--card)',
                borderRadius: 'calc(var(--radius) * 1.5)',
                padding: 16,
                border: '1px solid var(--border)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transition: 'all 0.2s',
                minWidth: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(138, 121, 171, 0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(138, 121, 171, 0.12)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
            >
              <div style={{ display: 'inline-flex', padding: 8, borderRadius: 'var(--radius)', background: `${game.color}15`, color: game.color, alignSelf: 'flex-start' }}>
                <game.icon size={22} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>{game.label}</p>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.3, margin: 0 }}>{game.desc}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page games-page">
      <div className="page-header">
        <Gamepad2 size={24} />
        <h2>Nos Jeux</h2>
      </div>
      <button
        onClick={() => setCreating(true)}
        className="btn btn-primary btn-full btn-lg"
        style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <Sparkles size={20} />
        Créer une partie
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {GAMES_LIST.map(game => (
          <button
            key={game.key}
            onClick={() => openGame(game.key, 'solo')}
            style={{
              background: 'var(--card)',
              borderRadius: 'calc(var(--radius) * 1.5)',
              padding: 16,
              border: '1px solid var(--border)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              transition: 'all 0.2s',
              minWidth: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(138, 121, 171, 0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(138, 121, 171, 0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
          >
            <div style={{ display: 'inline-flex', padding: 8, borderRadius: 'var(--radius)', background: `${game.color}15`, color: game.color, alignSelf: 'flex-start' }}>
              <game.icon size={22} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>{game.label}</p>
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.3, margin: 0 }}>{game.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
