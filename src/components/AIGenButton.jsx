import { Sparkles, Loader2 } from 'lucide-react'

export default function AIGenButton({ onClick, loading, label = "Générer avec l'IA", disabled }) {
  return (
    <button className="btn btn-ai" onClick={onClick} disabled={loading || disabled}>
      {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
      {loading ? "Génération..." : label}
    </button>
  )
}
