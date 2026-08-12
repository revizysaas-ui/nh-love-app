// Prompts et schémas de parsing pour chaque jeu "à questions".
// Tout est en français, orienté couple (souvent à distance).

const TONE = "Tué pour un couple amoureux (souvent en relation à distance). Ton ludique, tendre, complice, parfois coquin mais toujours respectueux."

export function truthOrDarePrompt(difficulty = "soft", count = 12) {
  const diffLabel = difficulty === "hot" ? "chaud/suggestif" : difficulty === "medium" ? "épicé" : "tendre"
  return {
    system: `Tu crées des cartes "Vérité ou Action" pour un couple. ${TONE}`,
    prompt: `Génère ${count} cartes de niveau "${diffLabel}" (difficulty=${difficulty}).
Réponds en JSON: {"cards":[{"type":"truth","question":"..."},{"type":"dare","question":"..."}]}.
Les "truth" = questions intimes/amusantes à se poser. Les "dare" = actions ludiques à faire (description courte). En français.`,
  }
}

export function quizPrompt(count = 8) {
  return {
    system: `Tu crées un quiz sur la vie de couple pour deviner ce que l'autre pense. ${TONE}`,
    prompt: `Génère ${count} questions du type "Quiz Amour" où l'un doit deviner la réponse de l'autre.
Réponds en JSON: {"questions":[{"q":"...","a":["option A","option B","option C","option D"]}]}.
4 options par question, sans indiquer la bonne réponse. En français, thème couple/relation.`,
  }
}

export function dailyPrompt() {
  return {
    system: `Tu proposes une "Question du Jour" pour un couple. ${TONE}`,
    prompt: `Donne UNE question tendre et stimulante à se poser ensemble aujourd'hui.
Réponds en JSON: {"question":"..."}. En français.`,
  }
}

export function defisPrompt(count = 8) {
  return {
    system: `Tu proposes des "Défis à distance" pour un couple. ${TONE}`,
    prompt: `Génère ${count} petits défis que deux personnes en couple (souvent éloignées) peuvent faire ensemble ou l'un pour l'autre.
Réponds en JSON: {"defis":[{"defi":"..."}]}. Défis courts, réalisables, mignons. En français.`,
  }
}

export function culturePrompt(count = 8) {
  return {
    system: `Tu crées des questions de "Culture G" (culture générale) pour un couple. ${TONE}`,
    prompt: `Génère ${count} questions de culture générale auxquelles le couple répondra "Vrai" ou "Faux".
Réponds en JSON: {"questions":[{"q":"...","answer":true}]} où answer est un booléen.
En français, niveaux variés.`,
  }
}

export function wyrPrompt(count = 8) {
  return {
    system: `Tu crées des dilemmes "Tu préfères" pour un couple. ${TONE}`,
    prompt: `Génère ${count} dilemmes impossibles et amusants pour un couple.
Réponds en JSON: {"pairs":[{"a":"...","b":"..."}]}. Les deux options doivent être tentantes. En français.`,
  }
}

export function rouePrompt(count = 6) {
  return {
    system: `Tu proposes des idées d'activités pour un couple. ${TONE}`,
    prompt: `Génère ${count} idées d'activités courtes (une à quelques mots) qu'un couple peut faire ensemble (en visio ou en vrai).
Réponds en JSON: {"choices":["...","..."]}. En français, mots-clés concis.`,
  }
}

export function drawWordsPrompt(count = 10) {
  return {
    system: `Tu proposes des mots à faire deviner en dessin pour un couple. ${TONE}`,
    prompt: `Génère ${count} mots simples et reconnaissables (objets, animaux, sentiments) faciles à dessiner.
Réponds en JSON: {"words":["...","..."]}. En français, un seul mot ou courte expression par entrée.`,
  }
}
