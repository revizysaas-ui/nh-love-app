import { useState, useEffect, useRef } from 'react'
import { Send, MessageCircle, Heart, Trash2, Camera, FolderOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'
import { notify } from '../lib/notify'

export default function Messages() {
  const { room, username } = useRoom()
  const [messages, setMessages] = useState([])
  const [reactions, setReactions] = useState({})
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const endRef = useRef(null)
  const cameraRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!room) return
    loadMessages()
    loadReactions()
    const sub = supabase
      .channel('messages-' + room.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${room.id}` }, payload => {
        setMessages(prev => [...prev, payload.new])
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions', filter: `message_id=in.(select id from messages where room_id=eq.${room.id})` }, () => loadReactions())
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [room])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: true })
    if (data) {
      setMessages(data)
      loadReactionsFor(data)
    }
    setLoading(false)
  }

  async function loadReactions() {
    loadReactionsFor(messages)
  }

  async function loadReactionsFor(msgs) {
    const mids = msgs.map(m => m.id)
    if (mids.length === 0) return
    const { data } = await supabase.from('reactions').select('*').in('message_id', mids)
    if (data) {
      const grouped = {}
      data.forEach(r => {
        if (!grouped[r.message_id]) grouped[r.message_id] = []
        grouped[r.message_id].push(r)
      })
      setReactions(grouped)
    }
  }

  async function toggleReaction(messageId) {
    const existing = reactions[messageId]?.find(r => r.author === username)
    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('reactions').insert({ message_id: messageId, author: username })
    }
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!text.trim()) return
    const { data } = await supabase
      .from('messages')
      .insert({ room_id: room.id, author: username || 'Anonyme', text: text.trim() })
      .select()
      .single()
    setText('')
    if (data) {
      notify(room.id, 'message', 'a envoyé un message 💬', username || 'Anonyme')
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `${room.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('photos').upload(path, file)
    if (uploadError) { setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)

    const { data } = await supabase
      .from('messages')
      .insert({ room_id: room.id, author: username || 'Anonyme', text: '', image_url: publicUrl })
      .select()
      .single()

    await supabase.from('photos')
      .insert({ room_id: room.id, storage_path: path, caption: '' })

    setUploading(false)
    if (data) {
      notify(room.id, 'photo', 'a partagé une photo 📷', username || 'Anonyme')
    }
    fileRef.current.value = ''
  }

  async function deleteMessage(id) {
    await supabase.from('messages').delete().eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="page messages-page">
      <div className="page-header">
        <MessageCircle size={24} />
        <h2>Nos Messages</h2>
      </div>

      <div className="messages-container">
        {loading ? (
          <div className="loading-messages"><div className="spinner" /></div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <Heart size={48} />
            <p>Pas encore de messages</p>
            <span style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>Écris le premier mot doux</span>
          </div>
        ) : (
          <div className="messages-list custom-scrollbar">
            {messages.map(m => {
              const msgReactions = reactions[m.id] || []
              const hasLiked = msgReactions.some(r => r.author === username)
              return (
                <div key={m.id} className={`msg-bubble ${m.author === username ? 'own' : ''}`}>
                  <div className="msg-meta">
                    <strong>{m.author}</strong>
                    <small>{new Date(m.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
                    <button className="btn-icon" onClick={() => deleteMessage(m.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {m.text && <p>{m.text}</p>}
                  {m.image_url && (
                    <img src={m.image_url} alt="photo" className="msg-image" loading="lazy" />
                  )}
                  <div className="msg-reactions">
                    <button className={`reaction-btn ${hasLiked ? 'liked' : ''}`} onClick={() => toggleReaction(m.id)}>
                      ❤️ {msgReactions.length > 0 && <span>{msgReactions.length}</span>}
                    </button>
                  </div>
                </div>
              )
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form className="msg-input-bar" onSubmit={sendMessage}>
        <button type="button" className="msg-photo-btn" onClick={() => cameraRef.current?.click()} disabled={uploading}>
          <Camera size={20} />
        </button>
        <button type="button" className="msg-photo-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <FolderOpen size={20} />
        </button>
        <input type="file" ref={cameraRef} accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
        <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        <input
          placeholder="Écris un message..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button type="submit" className="btn-send" disabled={!text.trim()}>
          {uploading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <Send size={18} />}
        </button>
      </form>
    </div>
  )
}
