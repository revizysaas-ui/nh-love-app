import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, MessageCircle, Heart, Trash2, Camera, FolderOpen, Search, Smile, ArrowDown, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'
import { notify } from '../lib/notify'

const EMOJIS = ['❤️', '😘', '🥰', '💕', '💗', '🫶', '💋', '🌙', '✨', '🎉']

function getDateKey(dateStr) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function getDateLabel(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (msgDate.getTime() === today.getTime()) return "Aujourd'hui"
  if (msgDate.getTime() === yesterday.getTime()) return 'Hier'
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Messages() {
  const { room, username } = useRoom()
  const [messages, setMessages] = useState([])
  const [reactions, setReactions] = useState({})
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const endRef = useRef(null)
  const scrollRef = useRef(null)
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

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollBtn(distFromBottom > 100)
  }, [])

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

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
      setReactions(prev => ({
        ...prev,
        [messageId]: (prev[messageId] || []).filter(r => r.id !== existing.id)
      }))
    } else {
      const { data } = await supabase.from('reactions').insert({ message_id: messageId, author: username }).select().single()
      if (data) {
        setReactions(prev => ({
          ...prev,
          [messageId]: [...(prev[messageId] || []), data]
        }))
      }
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
    setShowEmojis(false)
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

  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => (m.text || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  return (
    <div className="page messages-page">
      <div className="page-header">
        <MessageCircle size={24} />
        <h2>Nos Messages</h2>
      </div>

      <div className="messages-container">
        {/* Search bar */}
        {showSearch && (
          <div className="msg-search-bar">
            <Search size={16} />
            <input
              placeholder="Rechercher un message..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button className="btn-icon" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="loading-messages"><div className="spinner" /></div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <MessageCircle size={48} />
              <Heart size={20} className="heart-pulse" fill="currentColor" />
            </div>
            <p>Votre conversation vous attend</p>
            <span style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
              Écris le premier mot doux ✨
            </span>
          </div>
        ) : filteredMessages.length === 0 && searchQuery ? (
          <div className="empty-state">
            <Search size={48} />
            <p>Aucun message trouvé</p>
          </div>
        ) : (
          <div className="messages-list custom-scrollbar" ref={scrollRef} onScroll={handleScroll}>
            {filteredMessages.map((m, index) => {
              const isMe = m.author === username
              const msgReactions = reactions[m.id] || []
              const hasLiked = msgReactions.some(r => r.author === username)
              const showDate = index === 0 || getDateKey(m.created_at) !== getDateKey(filteredMessages[index - 1].created_at)
              return (
                <div key={m.id}>
                  {showDate && (
                    <div className="msg-date-separator">
                      <div className="msg-date-line" />
                      <span>{getDateLabel(m.created_at)}</span>
                      <div className="msg-date-line" />
                    </div>
                  )}
                  <div className={`msg-row ${isMe ? 'own' : ''}`}>
                    <div className={`msg-bubble ${isMe ? 'own' : ''}`}>
                      {!isMe && <p className="msg-author">{m.author}</p>}
                      {m.text && <p>{m.text}</p>}
                      {m.image_url && (
                        <img src={m.image_url} alt="photo" className="msg-image" loading="lazy" />
                      )}
                      <p className="msg-time">{new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                      {msgReactions.length > 0 && (
                        <div className="msg-reactions">
                          <span className="msg-reaction-badge">❤️ {msgReactions.length}</span>
                        </div>
                      )}
                    </div>
                    <div className="msg-actions">
                      <button className="msg-reaction-trigger" onClick={() => toggleReaction(m.id)}>
                        <Heart size={14} fill={hasLiked ? 'currentColor' : 'none'} />
                      </button>
                      <button className="msg-delete-trigger" onClick={() => deleteMessage(m.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={endRef} />
          </div>
        )}

        {/* Scroll to bottom */}
        {showScrollBtn && (
          <button className="scroll-to-bottom" onClick={scrollToBottom}>
            <ArrowDown size={16} />
          </button>
        )}
      </div>

      {/* Emoji picker */}
      {showEmojis && (
        <div className="msg-emoji-bar">
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setText(prev => prev + e)} className="msg-emoji-btn">{e}</button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="msg-input-bar">
        <button type="button" className="msg-photo-btn" onClick={() => cameraRef.current?.click()} disabled={uploading}>
          <Camera size={20} />
        </button>
        <button type="button" className="msg-photo-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <FolderOpen size={20} />
        </button>
        <input type="file" ref={cameraRef} accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
        <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        <button type="button" className="msg-photo-btn" onClick={() => setShowEmojis(!showEmojis)}>
          <Smile size={20} />
        </button>
        <input
          placeholder="Écris un message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(e)}
        />
        <button type="submit" className="btn-send" disabled={!text.trim()} onClick={sendMessage}>
          {uploading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  )
}
