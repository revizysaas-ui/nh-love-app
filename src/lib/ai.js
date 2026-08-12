import { supabase } from './supabase'

// Appelle l'Edge Function Supabase qui proxyfie DeepSeek (clé côté serveur).
export async function generateWithAI({ system, prompt, temperature = 0.9, maxTokens = 1200 }) {
  const { data, error } = await supabase.functions.invoke('generate-questions', {
    body: { system, prompt, temperature, maxTokens },
  })
  if (error) throw new Error(error.message || "Erreur de génération IA")
  const text = data?.text
  if (!text) throw new Error("Réponse IA vide")
  return parseJSON(text)
}

// Extrait un JSON même si le modèle renvoie du markdown ou du texte autour.
export function parseJSON(text) {
  let t = (text || "").trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) t = fence[1].trim()
  try {
    return JSON.parse(t)
  } catch {
    const start = t.indexOf("{")
    const end = t.lastIndexOf("}")
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(t.slice(start, end + 1))
      } catch {
        // ignore
      }
    }
    throw new Error("Réponse IA non analysable")
  }
}
