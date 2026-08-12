export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const KEY = process.env.DEEPSEEK_API_KEY
  if (!KEY) return res.status(500).json({ error: 'DEEPSEEK_API_KEY non configurée' })

  const { system, prompt, temperature = 0.9, maxTokens = 1200 } = req.body || {}
  if (!prompt) return res.status(400).json({ error: 'Champ prompt requis' })

  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: (system || 'Tu réponds toujours en JSON.') + ' Réponds UNIQUEMENT en JSON valide, sans markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    })
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Erreur DeepSeek' })
    res.status(200).json({ text: data?.choices?.[0]?.message?.content ?? '' })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
