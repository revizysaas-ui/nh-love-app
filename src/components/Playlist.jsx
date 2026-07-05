import { useState, useEffect } from 'react'
import { Music, Plus, Trash2, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'

export default function Playlist() {
  const { room, username } = useRoom()
  const [songs, setSongs] = useState([])
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!room) return
    load()
    const sub = supabase.channel('playlist-' + room.id).on('postgres_changes', { event: '*', schema: 'public', table: 'playlist', filter: `room_id=eq.${room.id}` }, () => load()).subscribe()
    return () => supabase.removeChannel(sub)
  }, [room])

  async function load() {
    const { data } = await supabase.from('playlist').select('*').eq('room_id', room.id).order('created_at', { ascending: false })
    if (data) setSongs(data)
  }

  async function add() {
    if (!url.trim()) return
    await supabase.from('playlist').insert({ room_id: room.id, author: username, url: url.trim(), title: title.trim() || url.trim() })
    setUrl('')
    setTitle('')
  }

  async function remove(id) {
    await supabase.from('playlist').delete().eq('id', id)
  }

  return (
    <div className="page playlist-page">
      <div className="page-header"><Music size={24} /><h2>Notre Playlist</h2></div>
      <div className="wishlist-input" style={{ flexDirection: 'column', gap: 8 }}>
        <input placeholder="Titre de la musique..." value={title} onChange={e => setTitle(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Lien YouTube/Spotify..." value={url} onChange={e => setUrl(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-sm" onClick={add} disabled={!url.trim()}><Plus size={16} /></button>
        </div>
      </div>
      <div className="playlist-list">
        {songs.length === 0 && <p className="empty-text">Aucune musique partagée</p>}
        {songs.map(s => (
          <div key={s.id} className="playlist-item">
            <Music size={18} />
            <div className="playlist-body">
              <span>{s.title}</span>
              <small>{s.author} · {new Date(s.created_at).toLocaleDateString('fr-FR')}</small>
            </div>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="btn-icon"><ExternalLink size={16} /></a>
            <button className="btn-icon btn-danger-icon" onClick={() => remove(s.id)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
