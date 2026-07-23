import { useState, useEffect, useRef, useCallback } from 'react'
import { Music, Plus, Trash2, Play, Pause } from 'lucide-react'
import ReactAudioPlayer from 'react-h5-audio-player'
import 'react-h5-audio-player/lib/styles.css'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'

function extractYouTubeId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?#]+)/)
  return m ? m[1] : null
}

function extractSpotifyId(url) {
  const m = url.match(/spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/)
  return m ? { type: m[1], id: m[2] } : null
}

function getSongType(url) {
  if (extractYouTubeId(url)) return 'youtube'
  if (extractSpotifyId(url)) return 'spotify'
  return 'audio'
}

export default function Playlist() {
  const { room, username } = useRoom()
  const [songs, setSongs] = useState([])
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [currentIdx, setCurrentIdx] = useState(-1)
  const playerRef = useRef(null)

  const currentSong = currentIdx >= 0 ? songs[currentIdx] : null
  const playableCurrent = currentSong && getSongType(currentSong.url) === 'audio'

  useEffect(() => {
    if (!room) return
    load()
    const sub = supabase.channel('playlist-' + room.id).on('postgres_changes', { event: '*', schema: 'public', table: 'playlist', filter: `room_id=eq.${room.id}` }, () => load()).subscribe()
    return () => supabase.removeChannel(sub)
  }, [room])

  async function load() {
    if (!room) return
    const { data } = await supabase.from('playlist').select('*').eq('room_id', room.id).order('created_at', { ascending: false })
    if (data) setSongs(data)
  }

  async function add() {
    if (!url.trim()) return
    await supabase.from('playlist').insert({ room_id: room.id, author: username, url: url.trim(), title: title.trim() || url.trim() })
    setUrl('')
    setTitle('')
  }

  async function remove(id) {
    await supabase.from('playlist').delete().eq('id', id)
    if (currentSong?.id === id) setCurrentIdx(-1)
  }

  const playSong = useCallback((idx) => {
    if (idx === currentIdx) {
      const audio = playerRef.current?.audio?.current
      if (audio) audio.paused ? audio.play() : audio.pause()
    } else {
      setCurrentIdx(idx)
    }
  }, [currentIdx])

  const handleEnded = useCallback(() => {
    if (songs.length === 0) return
    setCurrentIdx(i => {
      let next = i + 1
      while (next < songs.length && getSongType(songs[next].url) !== 'audio') next++
      if (next >= songs.length) {
        next = 0
        while (next < i && getSongType(songs[next].url) !== 'audio') next++
      }
      return next < songs.length ? next : -1
    })
  }, [songs])

  return (
    <div className="page playlist-page">
      <div className="page-header"><Music size={24} /><h2>Notre Playlist</h2></div>
      <div className="wishlist-input" style={{ flexDirection: 'column', gap: 8 }}>
        <input placeholder="Titre de la musique..." value={title} onChange={e => setTitle(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Lien YouTube, Spotify ou fichier audio (.mp3, .wav...)" value={url} onChange={e => setUrl(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-sm" onClick={add} disabled={!url.trim()}><Plus size={16} /></button>
        </div>
      </div>

      {currentSong && getSongType(currentSong.url) === 'youtube' && (() => {
        const vid = extractYouTubeId(currentSong.url)
        return vid ? (
          <div className="playlist-player">
            <span className="player-title">{currentSong.title}</span>
            <iframe
              width="100%"
              height="80"
              src={`https://www.youtube.com/embed/${vid}?enablejsapi=1`}
              title={currentSong.title}
              allow="autoplay; encrypted-media"
              style={{ border: 'none', borderRadius: 'var(--radius)' }}
            />
          </div>
        ) : null
      })()}

      {currentSong && getSongType(currentSong.url) === 'spotify' && (() => {
        const s = extractSpotifyId(currentSong.url)
        return s ? (
          <div className="playlist-player">
            <span className="player-title">{currentSong.title}</span>
            <iframe
              src={`https://open.spotify.com/embed/${s.type}/${s.id}?utm_source=generator&theme=0`}
              width="100%"
              height="80"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              style={{ border: 'none', borderRadius: 'var(--radius)' }}
            />
          </div>
        ) : null
      })()}

      {playableCurrent && (
        <div className="playlist-player">
          <span className="player-title">{currentSong.title}</span>
          <ReactAudioPlayer
            ref={playerRef}
            src={currentSong.url}
            autoPlay
            onEnded={handleEnded}
            showJumpControls={false}
            layout="stacked"
            className="nh-audio-player"
          />
        </div>
      )}

      <div className="playlist-list">
        {songs.length === 0 && <p className="empty-text">Aucune musique partagée</p>}
        {songs.map((s, idx) => {
          const type = getSongType(s.url)
          const isActive = currentSong?.id === s.id
          return (
            <div key={s.id} className={`playlist-item ${isActive ? 'playlist-item-active' : ''}`} onClick={() => playSong(idx)}>
              {isActive ? (
                <Pause size={18} className="playlist-play-icon" />
              ) : (
                <Play size={18} className="playlist-play-icon" />
              )}
              <div className="playlist-body">
                <span>{s.title}</span>
                <small>{s.author} · {new Date(s.created_at).toLocaleDateString('fr-FR')} · {type === 'youtube' ? 'YouTube' : type === 'spotify' ? 'Spotify' : 'Audio'}</small>
              </div>
              <button className="btn-icon btn-danger-icon" onClick={e => { e.stopPropagation(); remove(s.id) }}><Trash2 size={14} /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
