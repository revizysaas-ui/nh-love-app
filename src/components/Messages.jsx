import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, MessageCircle, Heart, Trash2, Camera, FolderOpen, Search, Smile, ArrowDown, X, Palette } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'
import { useToast } from '../context/ToastContext'
import { notify } from '../lib/notify'
import { compressImage } from '../lib/image'

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
  const { room, username, updateRoom } = useRoom()
  const { showToast } = useToast()
  const [messages, setMessages] = useState([])
  const [reactions, setReactions] = useState({})
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [showBgMenu, setShowBgMenu] = useState(false)
  const endRef = useRef(null)
  const scrollRef = useRef(null)
  const cameraRef = useRef(null)
  const fileRef = useRef(null)
  const bgFileRef = useRef(null)

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

  async function handleBgUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setShowBgMenu(false)
    showToast('Envoi de la photo...')
    const blob = await compressImage(file, 1600, 0.8)
    const path = `${room.id}/chat-bg-${Date.now()}`
    const { error: uploadError } = await supabase.storage.from('photos').upload(path, blob, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
    })
    if (uploadError) { showToast('Impossible de charger la photo 😕'); return }
    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
    await updateRoom({ chat_bg: publicUrl })
    showToast('Fond mis à jour 💜')
    bgFileRef.current.value = ''
  }

  async function removeBg() {
    await updateRoom({ chat_bg: null })
    setShowBgMenu(false)
    showToast('Fond retiré')
  }

  async function deleteMessage(id) {
    await supabase.from('messages').delete().eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => (m.text || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  const chatBg = room?.chat_bg || ''
  const initials = `${(room.name1 || 'N').charAt(0)}${(room.name2 || 'H').charAt(0)}`.toUpperCase()

  return (
    <div className="page messages-page">
      <div className="chat-header">
        <div className="chat-avatar">{initials}</div>
        <div className="chat-meta">
          <strong>{room.name1} & {room.name2}</strong>
          <span>{messages.length} message{messages.length > 1 ? 's' : ''} 💬</span>
        </div>
        <div className="chat-actions">
          <button className={`chat-icon-btn ${showSearch ? 'active' : ''}`} onClick={() => setShowSearch(!showSearch)} title="Rechercher">
            <Search size={18} />
          </button>
          <button className={`chat-icon-btn ${showBgMenu ? 'active' : ''}`} onClick={() => setShowBgMenu(!showBgMenu)} title="Fond du chat">
            <Palette size={18} />
          </button>
        </div>
      </div>

      {showBgMenu && (
        <div className="chat-bg-menu">
          <button onClick={() => bgFileRef.current?.click()}>
            <Camera size={16} /> Choisir une photo de fond
          </button>
          {chatBg && (
            <button onClick={removeBg}>
              <X size={16} /> Retirer le fond
            </button>
          )}
          <small>La photo de fond sera visible par vous deux.</small>
        </div>
      )}
      <input type="file" ref={bgFileRef} accept="image/*" style={{ display: 'none' }} onChange={handleBgUpload} />

      <div
        className={`messages-container ${chatBg ? 'has-bg' : ''}`}
        style={chatBg ? { backgroundImage: `url(${chatBg})` } : undefined}
      >
        {chatBg && <div className="chat-bg-overlay" />}

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
                    <div className={`msg-bubble ${isMe ? 'own' : ''} ${m.image_url ? 'img-msg' : ''}`}>
                      {!isMe && <p className="msg-author">{m.author}</p>}
                      {m.image_url && (
                        <img src={m.image_url} alt="photo" className="msg-image" loading="lazy" />
                      )}
                      {m.text && <p>{m.text}</p>}
                      <span className="msg-time">{new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {msgReactions.length > 0 && (
                      <span className="msg-reaction-badge">❤️ {msgReactions.length}</span>
                    )}
                    <div className="msg-actions">
                      <button className="msg-reaction-trigger" onClick={() => toggleReaction(m.id)} title="J'aime">
                        <Heart size={14} fill={hasLiked ? 'currentColor' : 'none'} />
                      </button>
                      <button className="msg-delete-trigger" onClick={() => deleteMessage(m.id)} title="Supprimer">
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

        {showScrollBtn && (
          <button className="scroll-to-bottom" onClick={scrollToBottom}>
            <ArrowDown size={16} />
          </button>
        )}
      </div>

      {showEmojis && (
        <div className="msg-emoji-bar">
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setText(prev => prev + e)} className="msg-emoji-btn">{e}</button>
          ))}
        </div>
      )}

      <div className="msg-input-bar">
        <button type="button" className="msg-photo-btn" onClick={() => cameraRef.current?.click()} disabled={uploading} title="Prendre une photo">
          <Camera size={20} />
        </button>
        <button type="button" className="msg-photo-btn" onClick={() => fileRef.current?.click()} disabled={uploading} title="Choisir une photo">
          <FolderOpen size={20} />
        </button>
        <input type="file" ref={cameraRef} accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
        <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        <button type="button" className="msg-photo-btn" onClick={() => setShowEmojis(!showEmojis)} title="Émojis">
          <Smile size={20} />
        </button>
        <input
          placeholder="Écris un message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(e)}
        />
        <button type="submit" className="btn-send" disabled={!text.trim()} onClick={sendMessage} title="Envoyer">
          {uploading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  )
}
