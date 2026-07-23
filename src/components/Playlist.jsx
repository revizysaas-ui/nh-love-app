import { useState, useEffect, useRef, useCallback } from 'react'
import { Music, Plus, Trash2, Play, Pause, Video, Shuffle, Repeat, Repeat1, SkipBack, SkipForward } from 'lucide-react'
import ReactPlayer from 'react-player'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'

function isVideoFile(url) {
  return /\.(mp4|webm|mov|avi)(\?|$)/i.test(url)
}

function getSongType(url) {
  if (/youtu(\.be|be\.com)/.test(url)) return 'youtube'
  if (/spotify\.com/.test(url)) return 'spotify'
  if (isVideoFile(url)) return 'video'
  return 'audio'
}

export default function Playlist() {
  const { room, username } = useRoom()
  const [songs, setSongs] = useState([])
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [repeatMode, setRepeatMode] = useState('none')
  const [playerKey, setPlayerKey] = useState(0)
  const audioRef = useRef(null)
  const videoRef = useRef(null)

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
    if (currentSong?.id === id) {
      setCurrentIdx(-1)
      setPlaying(false)
    }
  }

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

  const goNext = useCallback(() => {
    const next = getNextIdx(currentIdx)
    if (next === -1) { setPlaying(false); return }
    setCurrentIdx(next)
    setPlaying(true)
    setPlayerKey(k => k + 1)
  }, [currentIdx, getNextIdx])

  const goPrev = useCallback(() => {
    if (songs.length === 0) return
    const prev = currentIdx <= 0 ? songs.length - 1 : currentIdx - 1
    setCurrentIdx(prev)
    setPlaying(true)
    setPlayerKey(k => k + 1)
  }, [currentIdx, songs.length])

  const playSong = useCallback((idx) => {
    if (idx === currentIdx) {
      setPlaying(p => !p)
      return
    }
    setCurrentIdx(idx)
    setPlaying(true)
    setPlayerKey(k => k + 1)
  }, [currentIdx])

  useEffect(() => {
    const el = currentType === 'audio' ? audioRef.current : currentType === 'video' ? videoRef.current : null
    if (!el) return
    let cancelled = false
    if (playing) {
      el.play().catch(e => { if (!cancelled && e.name !== 'AbortError') console.warn(e) })
    } else {
      el.pause()
    }
    return () => { cancelled = true }
  }, [playing, currentIdx, currentType])

  function renderPlayer() {
    if (!currentSong) return null

    return (
      <div className={`playlist-player ${currentType === 'youtube' || currentType === 'video' ? 'playlist-player-video' : ''}`}>
        <span className="player-title">{currentSong.title}</span>

        {currentType === 'youtube' && (
          <div className="video-wrapper">
            <ReactPlayer
              key={playerKey}
              url={currentSong.url}
              playing={playing}
              onEnded={goNext}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => {}}
              width="100%"
              height="100%"
              style={{ position: 'absolute', top: 0, left: 0 }}
              config={{ youtube: { playerVars: { modestbranding: 1, rel: 0, iv_load_policy: 3, fs: 0, autoplay: 1 } } }}
            />
          </div>
        )}

        {currentType === 'spotify' && (
          <ReactPlayer
            key={playerKey}
            url={currentSong.url}
            playing={playing}
            onEnded={goNext}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => {}}
            width="100%"
            height="80"
            config={{ spotify: { width: '100%', height: '80' } }}
          />
        )}

        {currentType === 'video' && (
          <div className="video-wrapper">
            <video
              ref={videoRef}
              key={playerKey}
              src={currentSong.url}
              controls
              playsInline
              onEnded={goNext}
              onPause={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
            />
          </div>
        )}

        {currentType === 'audio' && (
          <div className="playlist-audio-player">
            <audio
              ref={audioRef}
              key={playerKey}
              src={currentSong.url}
              controls
              onEnded={goNext}
              onPause={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
              style={{ width: '100%' }}
            />
          </div>
        )}

        <div className="player-controls">
          <button className="btn-icon" onClick={goPrev}><SkipBack size={18} /></button>
          <button className="btn-icon player-play-btn" onClick={() => setPlaying(p => !p)}>
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button className="btn-icon" onClick={goNext}><SkipForward size={18} /></button>
        </div>
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
              {isActive && playing ? (
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
