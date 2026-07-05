import { useState, useEffect } from 'react'
import { Gift, Plus, Trash2, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'

export default function Wishlist() {
  const { room, username } = useRoom()
  const [items, setItems] = useState([])
  const [newItem, setNewItem] = useState('')

  useEffect(() => {
    if (!room) return
    load()
    const sub = supabase.channel('wishlist-' + room.id).on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist', filter: `room_id=eq.${room.id}` }, () => load()).subscribe()
    return () => supabase.removeChannel(sub)
  }, [room])

  async function load() {
    const { data } = await supabase.from('wishlist').select('*').eq('room_id', room.id).order('created_at', { ascending: false })
    if (data) setItems(data)
  }

  async function add() {
    if (!newItem.trim()) return
    await supabase.from('wishlist').insert({ room_id: room.id, author: username, item: newItem.trim() })
    setNewItem('')
  }

  async function toggle(id, current) {
    await supabase.from('wishlist').update({ done: !current }).eq('id', id)
  }

  async function remove(id) {
    await supabase.from('wishlist').delete().eq('id', id)
  }

  return (
    <div className="page wishlist-page">
      <div className="page-header"><Gift size={24} /><h2>Liste de Souhaits</h2></div>
      <div className="wishlist-input">
        <input placeholder="Ajouter une idée..." value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button className="btn btn-sm" onClick={add} disabled={!newItem.trim()}><Plus size={16} /></button>
      </div>
      <div className="wishlist-list">
        {items.length === 0 && <p className="empty-text">Aucune idée pour l'instant</p>}
        {items.map(item => (
          <div key={item.id} className={`wishlist-item ${item.done ? 'done' : ''}`}>
            <button className="wishlist-check" onClick={() => toggle(item.id, item.done)}>
              {item.done ? <Check size={18} color="#34d399" /> : <X size={18} color="var(--muted-foreground)" />}
            </button>
            <div className="wishlist-body">
              <span>{item.item}</span>
              <small>{item.author} · {new Date(item.created_at).toLocaleDateString('fr-FR')}</small>
            </div>
            <button className="btn-icon" onClick={() => remove(item.id)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
