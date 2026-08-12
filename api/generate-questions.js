export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const KEY = process.env.GEMINI_API_KEY
  if (!KEY) return res.status(500).json({ error: 'GEMINI_API_KEY non configurée' })

  const MODEL = 'gemini-2.0-flash'
  const { system, prompt, temperature = 0.9, maxTokens = 1200 } = req.body || {}
  if (!prompt) return res.status(400).json({ error: 'Champ prompt requis' })

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system || 'Tu réponds toujours en JSON.'}\n\n${prompt}` }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          responseMimeType: 'application/json',
        },
      }),
    })
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Erreur Gemini' })
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    res.status(200).json({ text })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
