// Appelle la fonction serverless Vercel /api/generate-questions (clé côté serveur).
export async function generateWithAI({ system, prompt, temperature = 0.9, maxTokens = 1200 }) {
  const res = await fetch('/api/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, prompt, temperature, maxTokens }),
  })
  if (!res.ok) {
    let msg = 'Erreur de génération IA'
    try { const d = await res.json(); if (d?.error) msg = d.error } catch {}
    throw new Error(msg)
  }
  const data = await res.json()
  const text = data?.text
  if (!text) throw new Error('Réponse IA vide')
  return parseJSON(text)
}

// Extrait un JSON même si le modèle renvoie du markdown ou du texte autour.
export function parseJSON(text) {
  let t = (text || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) t = fence[1].trim()
  try {
    return JSON.parse(t)
  } catch {
    const start = t.indexOf('{')
    const end = t.lastIndexOf('}')
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(t.slice(start, end + 1))
      } catch {
        // ignore
      }
    }
    throw new Error('Réponse IA non analysable')
  }
}
