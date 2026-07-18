import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, setRoomToken } from '../lib/supabase'

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
}

export function RoomProvider({ children }) {
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(() => !!localStorage.getItem('nh_room'))
  const [username, setUsernameState] = useState(() => localStorage.getItem('nh_username') || '')

  const setUsername = useCallback((name) => {
    setUsernameState(name)
    localStorage.setItem('nh_username', name)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('nh_room')
    if (!saved) { setLoading(false); return }
    const token = localStorage.getItem('nh_room_token_' + saved)
    if (token) setRoomToken(token)
    supabase.from('rooms').select('*').eq('id', saved).single().then(async ({ data, error }) => {
      if (data) {
        await ensureSession(data.id, username)
        setRoom(data)
      } else {
        localStorage.removeItem('nh_room')
        setRoomToken(null)
      }
      setLoading(false)
    })
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
  }, [username])

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
      await ensureSession(data.id, username)
      setRoom(data)
    }
    return { data, error }
  }, [username])

  const updateRoom = useCallback(async (updates) => {
    if (!room) return
    const { data } = await supabase.from('rooms').update(updates).eq('id', room.id).select().single()
    if (data) setRoom(data)
  }, [room])

  const setRoomPassword = useCallback(async (password) => {
    if (!room) return
    const { data, error } = await supabase.from('rooms').update({ room_password: password || null }).eq('id', room.id).select().single()
    if (data) setRoom(data)
    return { error }
  }, [room])

  const leaveRoom = useCallback(() => {
    const roomId = room?.id
    if (roomId) {
      localStorage.removeItem('nh_room_token_' + roomId)
    }
    setRoomToken(null)
    localStorage.removeItem('nh_room')
    localStorage.removeItem('nh_username')
    setRoom(null)
  }, [room])

  return (
    <RoomContext.Provider value={{ room, loading, createRoom, joinRoom, updateRoom, setRoomPassword, leaveRoom, username, setUsername }}>
      {children}
    </RoomContext.Provider>
  )
}

export const useRoom = () => useContext(RoomContext)
