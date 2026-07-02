import { useState, useEffect, useRef } from 'react'
import { Send, MessageCircle, Heart, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Messages() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const endRef = useRef(null)

  useEffect(() => {
    loadMessages()
    const sub = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
    setLoading(false)
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!text.trim()) return
    const { error } = await supabase
      .from('messages')
      .insert({ user_id: user.id, author: user.email?.split('@')[0] || 'Anonyme', text: text.trim() })
    if (!error) setText('')
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
            <span>Écris le premier mot doux</span>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map(m => (
              <div key={m.id} className={`msg-bubble ${m.user_id === user.id ? 'mine' : 'theirs'}`}>
                <div className="msg-meta">
                  <strong>{m.author}</strong>
                  <small>{new Date(m.created_at).toLocaleString('fr-FR')}</small>
                  {m.user_id === user.id && (
                    <button className="btn-icon" onClick={() => deleteMessage(m.id)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <p>{m.text}</p>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form className="msg-input-bar" onSubmit={sendMessage}>
        <input
          placeholder="Écris un message..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button type="submit" className="btn-send" disabled={!text.trim()}>
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}
