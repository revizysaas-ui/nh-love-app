// Pool de générations IA en arrière-plan.
// Au démarrage de l'app, warmupAIPool() pré-remplit tous les lots.
// Chaque jeu consomme via takeX() (synchrone depuis le cache, avec repli statique)
// et le cache se regarnit automatiquement quand il est bas.

import { generateWithAI } from './ai'
import {
  truthOrDarePrompt, quizPrompt, dailyPrompt, defisPrompt,
  culturePrompt, wyrPrompt, rouePrompt, drawWordsPrompt,
} from './aiPrompts'

// Caches persistants (survivent aux démontages de composants)
const pools = {
  truthdare: { items: [], inflight: null, min: 4 },
  quiz: { items: [], inflight: null, min: 4 },
  daily: { items: [], inflight: null, min: 1 },
  defis: { items: [], inflight: null, min: 3 },
  culture: { items: [], inflight: null, min: 4 },
  wyr: { items: [], inflight: null, min: 2 },
  roue: { items: [], inflight: null, min: 1 },
  draw: { items: [], inflight: null, min: 3 },
}

async function grow(key, promptFn, count, extract) {
  const p = pools[key]
  if (p.inflight) return p.inflight
  p.inflight = (async () => {
    try {
      const res = await generateWithAI(promptFn(count))
      const items = extract(res) || []
      p.items.push(...items)
    } catch {
      // silence : le repli statique est géré par les appelants
    } finally {
      p.inflight = null
    }
  })()
  return p.inflight
}

function refillIfLow(key, promptFn, count, extract) {
  const p = pools[key]
  if (p.items.length < p.min) grow(key, promptFn, count, extract)
}

// --- Vérité ou Action ---
function extractTruthDare(r, diff) {
  return (r?.cards || [])
    .filter(c => c && c.question && (c.type === 'truth' || c.type === 'dare'))
    .map(c => ({ id: `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`, type: c.type, difficulty: diff, question: c.question }))
}
export function takeTruthDare(diff, n = 6) {
  const p = pools.truthdare
  const matching = p.items.filter(i => i.difficulty === diff)
  const out = matching.slice(0, n)
  const taken = new Set(out.map(i => i.id))
  p.items = p.items.filter(i => !taken.has(i.id))
  if (p.items.filter(i => i.difficulty === diff).length < p.min) {
    grow('truthdare', c => truthOrDarePrompt(diff, c), 12, r => extractTruthDare(r, diff))
  }
  return out
}

// --- Quiz Amour ---
export function takeQuiz(n = 8) {
  refillIfLow('quiz', c => quizPrompt(c), 8, r => r?.questions || [])
  const out = pools.quiz.items.splice(0, n)
  return out
}

// --- Question du Jour ---
export function takeDaily() {
  refillIfLow('daily', () => dailyPrompt(), 1, r => (r?.question ? [r.question] : []))
  return pools.daily.items.splice(0, 1)
}

// --- Défis ---
function extractDefis(r) {
  return (r?.defis || []).map(d => ({ defi: d.defi })).filter(d => d.defi)
}
export function takeDefis(n = 6) {
  refillIfLow('defis', c => defisPrompt(c), 8, extractDefis)
  return pools.defis.items.splice(0, n)
}

// --- Culture G ---
export function takeCulture(n = 8) {
  refillIfLow('culture', c => culturePrompt(c), 8, r => (r?.questions || []).filter(q => q && q.q))
  return pools.culture.items.splice(0, n)
}

// --- Tu Préfères ---
function extractWYR(r) {
  return (r?.pairs || []).map(p => ({ a: p.a, b: p.b })).filter(p => p.a && p.b)
}
export function takeWYR() {
  refillIfLow('wyr', c => wyrPrompt(c), 8, extractWYR)
  return pools.wyr.items.splice(0, 1)
}

// --- Roue ---
function extractRoue(r) {
  return (r?.choices || []).map(c => String(c).trim()).filter(Boolean)
}
export function takeRoue(n = 6) {
  refillIfLow('roue', c => rouePrompt(c), 6, extractRoue)
  return pools.roue.items.splice(0, n)
}

// --- Dessin à deviner ---
function extractDraw(r) {
  return (r?.words || []).map(w => String(w).trim()).filter(Boolean)
}
export function takeDrawWord() {
  refillIfLow('draw', c => drawWordsPrompt(c), 10, extractDraw)
  return pools.draw.items.splice(0, 1)
}

// Pré-remplissage global au démarrage de l'app
export function warmupAIPool() {
  takeTruthDare('soft', 6)
  takeTruthDare('medium', 6)
  takeTruthDare('hot', 6)
  takeQuiz(8)
  takeDaily()
  takeDefis(6)
  takeCulture(8)
  takeWYR()
  takeRoue(6)
  takeDrawWord()
}
