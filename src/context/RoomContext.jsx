import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase, setRoomToken } from '../lib/supabase'
import { hashPin } from '../lib/crypto'

const RoomContext = createContext(null)

function generateToken() {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function ensureSession(roomId, displayName) {
  let token = localStorage.getItem('nh_room_token_' + roomId)
  if (!token) {
    token = generateToken()
    localStorage.setItem('nh_room_token_' + roomId, token)
  }
  setRoomToken(token)
  try {
    const { data: existing } = await supabase
      .from('room_sessions')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_token', token)
      .maybeSingle()
    if (!existing) {
      await supabase.from('room_sessions').insert({
        room_id: roomId,
        user_token: token,
        display_name: displayName || 'Anonyme',
      })
    }
  } catch (e) {
    setRoomToken(token)
  }
}

export function RoomProvider({ children }) {
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(() => !!localStorage.getItem('nh_room'))
  const [username, setUsernameState] = useState(() => localStorage.getItem('nh_username') || '')

  const roomRef = useRef(room)
  roomRef.current = room

  const setUsername = useCallback((name) => {
    setUsernameState(name)
    localStorage.setItem('nh_username', name)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('nh_room')
    if (!saved) { setLoading(false); return }
    const token = localStorage.getItem('nh_room_token_' + saved)
    if (token) setRoomToken(token)

    async function loadRoom(retries = 3) {
      for (let i = 0; i < retries; i++) {
        const { data, error } = await supabase
          .from('rooms').select('*').eq('id', saved).single()
        if (data) {
          const uname = localStorage.getItem('nh_username') || ''
          await ensureSession(data.id, uname)
          setRoom(data)
          setLoading(false)
          return
        }
        if (error && error.code === 'PGRST116') {
          localStorage.removeItem('nh_room')
          setRoomToken(null)
          setLoading(false)
          return
        }
        if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)))
      }
      setLoading(false)
    }
    loadRoom()

    const sub = supabase
      .channel('room-sync-' + saved)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${saved}` }, (payload) => {
        if (payload.new) setRoom(prev => ({ ...prev, ...payload.new }))
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  const createRoom = useCallback(async (name) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data, error } = await supabase.from('rooms').insert({
      code,
      name1: name || 'Toi',
    }).select().single()
    if (error) {
      console.error('Erreur création room:', error)
      return null
    }
    if (data) {
      localStorage.setItem('nh_room', data.id)
      await ensureSession(data.id, name)
      setRoom(data)
    }
    return data
  }, [])

  const joinRoom = useCallback(async (code, password) => {
    let query = supabase.from('rooms').select('*').eq('code', code.toUpperCase())
    if (password) {
      query = query.eq('room_password', password)
    } else {
      query = query.is('room_password', null)
    }
    const { data, error } = await query.single()
    if (data) {
      localStorage.setItem('nh_room', data.id)
      const uname = localStorage.getItem('nh_username') || ''
      await ensureSession(data.id, uname)
      setRoom(data)
    }
    return { data, error }
  }, [])

  const updateRoom = useCallback(async (updates) => {
    const current = roomRef.current
    if (!current) return
    const { data } = await supabase.from('rooms').update(updates).eq('id', current.id).select().single()
    if (data) setRoom(data)
  }, [])

  const setRoomPassword = useCallback(async (password) => {
    const current = roomRef.current
    if (!current) return
    const { data, error } = await supabase.from('rooms').update({ room_password: password || null }).eq('id', current.id).select().single()
    if (data) setRoom(data)
    return { error }
  }, [])

  const setAppLock = useCallback(async (pin) => {
    const current = roomRef.current
    if (!current) return
    const hashed = pin ? await hashPin(pin) : null
    const { data, error } = await supabase.from('rooms').update({ app_lock: hashed }).eq('id', current.id).select().single()
    if (data) setRoom(data)
    return { error }
  }, [])

  const updateGameState = useCallback(async (gameState) => {
    const current = roomRef.current
    if (!current) return
    const cur = current.active_game || {}
    const merged = { ...cur, ...gameState }
    const payload = Object.keys(merged).length === 0 || (Object.keys(merged).length === 1 && merged.game === undefined) ? null : merged
    const { data } = await supabase.from('rooms').update({ active_game: payload }).eq('id', current.id).select().single()
    if (data) setRoom(data)
  }, [])

  const leaveRoom = useCallback(() => {
    const current = roomRef.current
    const roomId = current?.id
    if (roomId) {
      localStorage.removeItem('nh_room_token_' + roomId)
    }
    setRoomToken(null)
    localStorage.removeItem('nh_room')
    localStorage.removeItem('nh_username')
    setRoom(null)
  }, [])

  return (
    <RoomContext.Provider value={{ room, loading, createRoom, joinRoom, updateRoom, setRoomPassword, setAppLock, updateGameState, leaveRoom, username, setUsername }}>
      {children}
    </RoomContext.Provider>
  )
}

export const useRoom = () => useContext(RoomContext)
