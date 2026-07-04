import { useState, useEffect } from 'react'
import { Gamepad2, Heart, Sparkles, Shuffle, RotateCcw, AlertCircle, HelpCircle, MessageCircle, Target, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'

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

const QUIZ = [
  { q: 'Quelle est MA couleur préférée ?', a: ['Rouge', 'Bleu', 'Vert', 'Violet'], correct: 1 },
  { q: 'Quel est MON plat préféré ?', a: ['Pizza', 'Sushi', 'Pâtes', 'Tacos'], correct: 2 },
  { q: 'Quelle est MA saison préférée ?', a: ['Printemps', 'Été', 'Automne', 'Hiver'], correct: 0 },
  { q: 'Quel est MON film préféré ?', a: ['Comédie', 'Romance', 'Action', 'Science-fiction'], correct: 1 },
  { q: 'Où rêvé-je de voyager avec toi ?', a: ['Japon', 'Grèce', 'Italie', 'Canada'], correct: 2 },
  { q: 'Quel est MON animal préféré ?', a: ['Chat', 'Chien', 'Lapin', 'Panda'], correct: 3 },
  { q: 'Quelle boisson je préfère ?', a: ['Café', 'Thé', 'Chocolat chaud', 'Jus'], correct: 0 },
  { q: 'Quel est MON talent caché ?', a: ['Dessiner', 'Chanter', 'Danser', 'Cuisiner'], correct: 3 },
  { q: 'Comment j\'aime passer un dimanche ?', a: ['Grasses mat', 'Balade', 'Film', 'Sport'], correct: 2 },
  { q: 'Quel est MON parfum préféré ?', a: ['Vanille', 'Lavande', 'Agrumes', 'Boisé'], correct: 0 },
  { q: 'Quelle est MA plus grande qualité ?', a: ['Gentillesse', 'Humour', 'Intelligence', 'Patience'], correct: 1 },
  { q: 'Quel métier aurais-je aimé faire ?', a: ['Artiste', 'Médecin', 'Professeur', 'Chef'], correct: 0 },
  { q: 'Quel est MON pire défaut ?', a: ['Têtu', 'Impatient', 'Distrait', 'Râleur'], correct: 2 },
  { q: 'Quelle musique me fait danser ?', a: ['Pop', 'Rock', 'R&B', 'Classique'], correct: 0 },
  { q: 'Si j\'étais un super-héros, je serais...', a: ['Invisible', 'Voler', 'Force', 'Lire les pensées'], correct: 3 },
]

const DAILY = [
  'Quel est ton plus beau souvenir avec moi ?',
  'Si tu pouvais voyager n\'importe où avec moi demain, où irait-on ?',
  'Qu\'est-ce que tu aimes le plus chez nous ?',
  'Décris notre premier rendez-vous en 3 mots.',
  'Quelle chanson nous représente le mieux ?',
  'Quel est le petit geste qui me fait fondre chez toi ?',
  'Si on écrivait un livre ensemble, quel en serait le titre ?',
  'Qu\'est-ce qui te fait sourire quand tu penses à moi ?',
  'Quel est ton rêve pour nous dans 5 ans ?',
  'Qu\'est-ce que tu voudrais qu\'on apprenne à faire ensemble ?',
  'Quelle est la chose la plus drôle que tu aies faite pour moi ?',
  'Si on passait 24h ensemble, que ferait-on ?',
  'Qu\'est-ce que tu admires le plus chez moi ?',
  'Quel moment passé ensemble aimerais-tu revivre ?',
  'Qu\'est-ce qui te manque le plus quand on est loin ?',
  'Quelle est notre meilleure tradition ?',
  'Si tu pouvais me faire un cadeau infini, ce serait quoi ?',
  'Qu\'est-ce que notre relation t\'a appris sur toi-même ?',
  'Où est-ce qu\'on se voit dans 10 ans ?',
  'Quel est le message que tu relis le plus souvent ?',
  'Quelle est la plus belle preuve d\'amour que je t\'ai faite ?',
  'Si on créait une playlist de notre histoire, quelles chansons ?',
  'Qu\'est-ce qui a changé en toi depuis qu\'on est ensemble ?',
  'Décris notre relation en une phrase.',
  'Quel est ton plus grand projet pour nous ?',
  'Qu\'est-ce que tu voudrais que je sache en ce moment ?',
  'Si on pouvait remonter le temps, quel moment on revivrait ?',
  'Quelle est ta plus belle surprise que je t\'aie faite ?',
  'Qu\'est-ce qui te rassure quand tu doutes ?',
  'Quel conseil donnerais-tu à d\'autres couples à distance ?',
]

const DEFIS = [
  'Envoie-moi un vocal de 30 secondes avec ta voix douce',
  'Dessine quelque chose qui te fait penser à moi et prends-le en photo',
  'Écris un petit poème sur nous (même nul !)',
  'Prends une photo de là où tu es maintenant',
  'Chante notre chanson et envoie-moi un vocal',
  'Cherche une photo de nous et raconte-moi ce qui s\'est passé ce jour-là',
  'Prépare ta boisson préférée et trinque en photo avec moi',
  'Écris une liste de 5 choses que tu aimes chez moi',
  'Prends une photo de ton livre préféré et dis-moi pourquoi tu l\'aimes',
  'Envoie-moi un selfie avec ton plus beau sourire',
  'Cite trois souvenirs qu\'on doit absolument créer ensemble',
  'Écris-moi une lettre numérique de 100 mots',
  'Trouve une vidéo qui nous ressemble et partage-la',
  'Fais-moi découvrir ta chanson du moment',
  'Décris notre date idéale en détail',
  'Prends en photo ton objet fétiche du quotidien',
  'Dis-moi ce que tu ferais si j\'étais à côté de toi maintenant',
  'Envoie-moi une blague ou une histoire drôle',
  'Partage un rêve que tu as fait récemment',
  'Quelle série ou film devrions-nous regarder ensemble ?',
  'Écris-moi un message comme si c\'était notre premier jour',
  'Prends une photo de ton assiette préférée',
  'Dis-moi 3 choses que tu veux qu\'on fasse le mois prochain',
  'Partage ton plus grand secret (je garde tout pour moi)',
  'Envoie un message à mon meilleur ami avec un compliment sur moi',
]

const CULTURE = [
  { q: 'Je préfère les chats aux chiens', friend: true },
  { q: 'Je suis du matin', friend: false },
  { q: 'J\'aime faire la grasse matinée', friend: true },
  { q: 'Je suis plutôt salé que sucré', friend: false },
  { q: 'J\'ai peur des araignées', friend: true },
  { q: 'Je préfère l\'été à l\'hiver', friend: true },
  { q: 'Je sais cuisiner au moins 3 plats', friend: true },
  { q: 'J\'ai déjà pleuré devant un film', friend: true },
  { q: 'Je préfère le thé au café', friend: false },
  { q: 'Je parle souvent tout seul', friend: false },
  { q: 'Je suis plutôt montagne que plage', friend: true },
  { q: 'Je préfère les soirées aux matins', friend: true },
  { q: 'J\'ai déjà écrit un journal intime', friend: false },
  { q: 'Je suis plutôt jeux vidéo que lecture', friend: false },
  { q: 'Je préfère recevoir des fleurs qu\'un cadeau', friend: false },
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
  const [index, setIndex] = useState(null)
  const [answer, setAnswer] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [shuffled, setShuffled] = useState([])

  function start() {
    const s = [...QUIZ].sort(() => Math.random() - 0.5).slice(0, 8)
    setShuffled(s)
    setIndex(0)
    setAnswer(null)
    setScore(0)
    setDone(false)
  }

  function handleAnswer(i) {
    setAnswer(i)
    if (i === shuffled[index].correct) setScore(s => s + 1)
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
            {score === shuffled.length ? 'Parfait·e ! Tu me connais par cœur ❤️' :
             score >= shuffled.length * 0.7 ? 'Bravo ! Tu me connais bien !' :
             'On rejoue pour mieux me connaître ?'}
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
          <HelpCircle size={48} />
          <p>Quiz Amour</p>
          <span>8 questions pour tester si tu me connais vraiment</span>
        </div>
      </div>
    )
  }

  const q = shuffled[index]
  return (
    <div className="game-card-wrapper">
      <div className="game-card revealed" style={{ cursor: 'default', maxWidth: 440 }}>
        <div style={{ width: '100%' }}>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 12 }}>
            Question {index + 1}/{shuffled.length}
          </p>
          <p className="game-question" style={{ textAlign: 'center', marginBottom: 20 }}>{q.q}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {q.a.map((opt, i) => (
              <button key={i} className="btn btn-full"
                style={{
                  textAlign: 'left',
                  background: answer === null ? 'var(--secondary)' :
                    i === q.correct ? '#34d399' :
                    i === answer ? '#ef4444' : 'var(--secondary)',
                  color: answer !== null && (i === q.correct || i === answer) ? 'white' : 'var(--foreground)',
                }}
                onClick={() => answer === null && handleAnswer(i)}
                disabled={answer !== null}>
                {opt}
              </button>
            ))}
          </div>
          {answer !== null && (
            <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={next}>
              {index < shuffled.length - 1 ? 'Suivante' : 'Voir mon score'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function DailyGame() {
  const [q, setQ] = useState(null)
  const [used, setUsed] = useState(new Set())

  function pick() {
    const available = DAILY.filter((_, i) => !used.has(i))
    if (available.length === 0) { setUsed(new Set()); return }
    const idx = DAILY.indexOf(available[Math.floor(Math.random() * available.length)])
    setQ(DAILY[idx])
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
  const [defi, setDefi] = useState(null)
  const [used, setUsed] = useState(new Set())

  function pick() {
    const available = DEFIS.filter((_, i) => !used.has(i))
    if (available.length === 0) { setUsed(new Set()); return }
    const idx = DEFIS.indexOf(available[Math.floor(Math.random() * available.length)])
    setDefi(DEFIS[idx])
    setUsed(prev => new Set([...prev, idx]))
  }

  return (
    <>
      <div className="game-card-wrapper">
        {defi ? (
          <div className="game-card revealed" style={{ cursor: 'default', maxWidth: 440 }}>
            <Target size={32} />
            <p className="game-question" style={{ textAlign: 'center', marginTop: 12 }}>{defi}</p>
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
    const s = [...CULTURE].sort(() => Math.random() - 0.5).slice(0, 8)
    setShuffled(s)
    setIndex(0)
    setAnswer(null)
    setScore(0)
    setDone(false)
  }

  function handleAnswer(val) {
    setAnswer(val)
    if (val === shuffled[index].friend) setScore(s => s + 1)
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
            {score === shuffled.length ? 'Imbattable ! Tu me connais par cœur ❤️' :
             score >= shuffled.length * 0.7 ? 'Presque parfait !' :
             'On apprend à mieux se connaître ?'}
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
          <p>Culture G du Couple</p>
          <span>Vrai ou Faux ? Devine ce que je pense</span>
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
                    val === q.friend ? '#34d399' :
                    val === answer ? '#ef4444' : 'var(--secondary)',
                  color: answer !== null && (val === q.friend || val === answer) ? 'white' : 'var(--foreground)',
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
