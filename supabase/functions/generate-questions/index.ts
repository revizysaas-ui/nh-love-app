// Supabase Edge Function : proxy vers l'API DeepSeek
// La clé API reste côté secret (DEEPSEEK_API_KEY), jamais exposée au client.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY") || ""
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    if (!DEEPSEEK_API_KEY) {
      return new Response(
        JSON.stringify({ error: "DEEPSEEK_API_KEY non configurée sur le serveur" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const {
      system,
      prompt,
      temperature = 0.9,
      maxTokens = 1200,
      model = "deepseek-chat",
    } = await req.json()

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Champ 'prompt' requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              (system ||
                "Tu es une IA utile qui répond toujours en format JSON.") +
              " Réponds UNIQUEMENT avec du JSON valide, sans texte autour, sans markdown.",
          },
          { role: "user", content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data?.error?.message || "Erreur DeepSeek" }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const text = data?.choices?.[0]?.message?.content ?? ""
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
