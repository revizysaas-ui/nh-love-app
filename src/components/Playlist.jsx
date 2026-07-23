import { useState, useEffect, useRef, useCallback } from 'react'
import { Music, Plus, Trash2, Play, Pause, Video, Shuffle, Repeat, Repeat1 } from 'lucide-react'
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

function isVideoFile(url) {
  return /\.(mp4|webm|mov|avi)(\?|$)/i.test(url)
}

function getSongType(url) {
  if (extractYouTubeId(url)) return 'youtube'
  if (extractSpotifyId(url)) return 'spotify'
  if (isVideoFile(url)) return 'video'
  return 'audio'
}

export default function Playlist() {
  const { room, username } = useRoom()
  const [songs, setSongs] = useState([])
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [shuffle, setShuffle] = useState(false)
  const [repeatMode, setRepeatMode] = useState('none')
  const playerRef = useRef(null)

  const currentSong = currentIdx >= 0 ? songs[currentIdx] : null
  const currentType = currentSong ? getSongType(currentSong.url) : null

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
      return
    }
    setCurrentIdx(idx)
  }, [currentIdx])

  const getNextIdx = useCallback((fromIdx) => {
    if (songs.length === 0) return -1
    if (repeatMode === 'one') return fromIdx
    if (shuffle) {
      if (songs.length <= 1) return 0
      let r
      do { r = Math.floor(Math.random() * songs.length) } while (r === fromIdx)
      return r
    }
    const next = fromIdx + 1
    if (next >= songs.length) return repeatMode === 'all' ? 0 : -1
    return next
  }, [songs.length, shuffle, repeatMode])

  const handleEnded = useCallback(() => {
    const next = getNextIdx(currentIdx)
    if (next === -1) return
    setCurrentIdx(next)
  }, [currentIdx, getNextIdx])

  function renderPlayer() {
    if (!currentSong) return null

    if (currentType === 'youtube') {
      const vid = extractYouTubeId(currentSong.url)
      return vid ? (
        <div className="playlist-player playlist-player-video">
          <span className="player-title">{currentSong.title}</span>
          <div className="video-wrapper">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${vid}?modestbranding=1&rel=0&iv_load_policy=3&fs=0&enablejsapi=1`}
              title={currentSong.title}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen={false}
            />
          </div>
        </div>
      ) : null
    }

    if (currentType === 'spotify') {
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
    }

    if (currentType === 'video') {
      return (
        <div className="playlist-player playlist-player-video">
          <span className="player-title">{currentSong.title}</span>
          <div className="video-wrapper">
            <video
              ref={playerRef}
              src={currentSong.url}
              controls
              autoPlay
              onEnded={handleEnded}
              playsInline
            />
          </div>
        </div>
      )
    }

    return (
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
    )
  }

  return (
    <div className="page playlist-page">
      <div className="page-header"><Music size={24} /><h2>Notre Playlist</h2></div>
      <div className="wishlist-input" style={{ flexDirection: 'column', gap: 8 }}>
        <input placeholder="Titre de la musique..." value={title} onChange={e => setTitle(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Lien YouTube, Spotify, vidéo ou audio..." value={url} onChange={e => setUrl(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-sm" onClick={add} disabled={!url.trim()}><Plus size={16} /></button>
        </div>
      </div>

      {songs.length > 1 && (
        <div className="playlist-modes">
          <button className={`playlist-mode-btn ${shuffle ? 'active' : ''}`} onClick={() => setShuffle(s => !s)}>
            <Shuffle size={16} /> Aléatoire
          </button>
          <button className={`playlist-mode-btn ${repeatMode === 'all' ? 'active' : ''}`} onClick={() => setRepeatMode(r => r === 'all' ? 'none' : 'all')}>
            <Repeat size={16} /> Tout
          </button>
          <button className={`playlist-mode-btn ${repeatMode === 'one' ? 'active' : ''}`} onClick={() => setRepeatMode(r => r === 'one' ? 'none' : 'one')}>
            <Repeat1 size={16} /> 1
          </button>
        </div>
      )}

      {renderPlayer()}

      <div className="playlist-list">
        {songs.length === 0 && <p className="empty-text">Aucune musique partagée</p>}
        {songs.map((s, idx) => {
          const type = getSongType(s.url)
          const isActive = currentSong?.id === s.id
          return (
            <div key={s.id} className={`playlist-item ${isActive ? 'playlist-item-active' : ''}`} role="button" tabIndex={0} onClick={(e) => { e.preventDefault(); e.stopPropagation(); playSong(idx) }} onKeyDown={(e) => { if (e.key === 'Enter') playSong(idx) }}>
              {isActive ? (
                <Pause size={18} className="playlist-play-icon" />
              ) : type === 'video' ? (
                <Video size={18} className="playlist-play-icon" />
              ) : (
                <Play size={18} className="playlist-play-icon" />
              )}
              <div className="playlist-body">
                <span>{s.title}</span>
                <small>{s.author} · {new Date(s.created_at).toLocaleDateString('fr-FR')} · {type === 'youtube' ? 'YouTube' : type === 'spotify' ? 'Spotify' : type === 'video' ? 'Vidéo' : 'Audio'}</small>
              </div>
              <span className="playlist-idx">{idx + 1}</span>
              <button className="btn-icon btn-danger-icon" onClick={e => { e.stopPropagation(); remove(s.id) }}><Trash2 size={14} /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
