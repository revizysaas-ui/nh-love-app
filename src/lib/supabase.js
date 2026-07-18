import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let _token = null

const customFetch = (url, options = {}) => {
  if (_token) {
    options.headers = { ...options.headers, 'x-room-token': _token }
  }
  return fetch(url, options)
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: customFetch }
})

export function setRoomToken(token) {
  _token = token
}
