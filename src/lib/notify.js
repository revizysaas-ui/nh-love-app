import { supabase } from './supabase'

export async function notify(roomId, type, message, author) {
  try {
    await supabase.from('notifications').insert({ room_id: roomId, type, message, author })
  } catch {}
}
