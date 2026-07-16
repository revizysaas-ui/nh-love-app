import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const RoomContext = createContext(null)

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
    if (saved) {
      supabase.from('rooms').select('*').eq('id', saved).single().then(({ data }) => {
        if (data) setRoom(data)
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
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
      setRoom(data)
    }
    return data
  }, [])

  const joinRoom = useCallback(async (code) => {
    const { data } = await supabase.from('rooms').select('*').eq('code', code.toUpperCase()).single()
    if (data) {
      localStorage.setItem('nh_room', data.id)
      setRoom(data)
    }
    return data
  }, [])

  const updateRoom = useCallback(async (updates) => {
    if (!room) return
    const { data } = await supabase.from('rooms').update(updates).eq('id', room.id).select().single()
    if (data) setRoom(data)
  }, [room])

  const leaveRoom = useCallback(() => {
    localStorage.removeItem('nh_room')
    localStorage.removeItem('nh_username')
    setRoom(null)
  }, [])

  return (
    <RoomContext.Provider value={{ room, loading, createRoom, joinRoom, updateRoom, leaveRoom, username, setUsername }}>
      {children}
    </RoomContext.Provider>
  )
}

export const useRoom = () => useContext(RoomContext)
