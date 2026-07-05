import { useState, useEffect } from 'react'
import { Plus, Minus, Trash2, Hash } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'

export default function Counters() {
  const { room, username } = useRoom()
  const [counters, setCounters] = useState([])
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('❤️')

  useEffect(() => {
    if (!room) return
    load()
    const sub = supabase.channel('counters-' + room.id).on('postgres_changes', { event: '*', schema: 'public', table: 'counters', filter: `room_id=eq.${room.id}` }, () => load()).subscribe()
    return () => supabase.removeChannel(sub)
  }, [room])

  async function load() {
    const { data } = await supabase.from('counters').select('*').eq('room_id', room.id).order('created_at', { ascending: true })
    if (data) setCounters(data)
  }

  async function add() {
    if (!name.trim()) return
    await supabase.from('counters').insert({ room_id: room.id, name: name.trim(), emoji, value: 0 })
    setName('')
  }

  async function update(id, delta) {
    const c = counters.find(c => c.id === id)
    if (!c) return
    await supabase.from('counters').update({ value: Math.max(0, c.value + delta) }).eq('id', id)
    load()
  }

  async function remove(id) {
    await supabase.from('counters').delete().eq('id', id)
  }

  return (
    <div className="page counters-page">
      <div className="page-header"><Hash size={24} /><h2>Compteurs</h2></div>
      <div className="wishlist-input">
        <input placeholder="Nouveau compteur..." value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} />
        <input placeholder="❤️" value={emoji} onChange={e => setEmoji(e.target.value)} style={{ width: 50, textAlign: 'center' }} maxLength={2} />
        <button className="btn btn-sm" onClick={add} disabled={!name.trim()}><Plus size={16} /></button>
      </div>
      <div className="counters-list">
        {counters.length === 0 && <p className="empty-text">Aucun compteur</p>}
        {counters.map(c => (
          <div key={c.id} className="counter-card">
            <span className="counter-emoji">{c.emoji}</span>
            <div className="counter-body">
              <span className="counter-name">{c.name}</span>
              <span className="counter-value">{c.value}</span>
            </div>
            <div className="counter-actions">
              <button className="btn-icon" onClick={() => update(c.id, -1)}><Minus size={16} /></button>
              <button className="btn-icon" onClick={() => update(c.id, 1)}><Plus size={16} /></button>
              <button className="btn-icon btn-danger-icon" onClick={() => remove(c.id)}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
