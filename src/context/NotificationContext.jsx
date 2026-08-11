import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { X, Heart, MessageCircle, Camera, PenLine, Gamepad2, Target, HelpCircle } from 'lucide-react'

const NotificationContext = createContext(null)

const ICONS = {
  message: MessageCircle,
  photo: Camera,
  drawing: PenLine,
  game: Gamepad2,
  defi: Target,
  quiz: HelpCircle,
  default: Heart,
}

const hasNotification = typeof Notification !== 'undefined'

export function NotificationProvider({ children }) {
  const navigate = useNavigate()
  const [toasts, setToasts] = useState([])
  const [roomId, setRoomId] = useState(null)

  useEffect(() => {
    if (!roomId) return
    const sub = supabase
      .channel('notifications-' + roomId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `room_id=eq.${roomId}`,
      }, payload => {
        const n = payload.new
        showToast(n.type, n.message, n.author)
        if (hasNotification && Notification.permission === 'granted' && document.hidden) {
          new Notification('N&H - ' + n.author, { body: n.message, icon: '/icon-192.svg' })
        }
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [roomId])

  useEffect(() => {
    if (hasNotification && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  const showToast = useCallback((type, message, author) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message, author }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <NotificationContext.Provider value={{ showToast, setRoomId }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => {
          const Icon = ICONS[t.type] || ICONS.default
          return (
            <div
              key={t.id}
              className={`toast ${t.type === 'game' || t.type === 'defi' ? 'toast-game' : ''}`}
              onClick={() => {
                if (t.type === 'game' || t.type === 'defi' || t.type === 'quiz') navigate('/jeux')
                dismissToast(t.id)
              }}
            >
              <Icon size={18} />
              <div className="toast-body">
                <strong>{t.author}</strong>
                <span>{t.message}</span>
              </div>
              <button className="toast-close" onClick={(e) => { e.stopPropagation(); dismissToast(t.id) }}>
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
