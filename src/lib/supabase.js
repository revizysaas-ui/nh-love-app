import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export function setRoomToken(token) {
  if (token) {
    supabase.rest.setHeader('x-room-token', token)
  } else {
    supabase.rest.removeHeader('x-room-token')
  }
}
