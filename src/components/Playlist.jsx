import { useState, useEffect, useRef } from 'react'
import { Music, Plus, Trash2, Play, Pause, Video, SkipBack, SkipForward, Repeat, Repeat1, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'
import { useToast } from '../context/ToastContext'

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

function loadYouTubeAPI() {
  return new Promise(resolve => {
    if (window.YT && window.YT.Player) return resolve(window.YT)
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      resolve(window.YT)
      if (prev) prev()
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
}

export default function Playlist() {
  const { room, username } = useRoom()
  const { showToast } = useToast()
  const [songs, setSongs] = useState([])
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [currentId, setCurrentId] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [loop, setLoop] = useState(false)
  const [repeat, setRepeat] = useState(false)

  const audioRef = useRef(null)
  const ytRef = useRef(null)
  const ytReadyRef = useRef(false)
  const pendingVidRef = useRef(null)
  const actionsRef = useRef({})

  const songsRef = useRef(songs)
  const currentIdRef = useRef(currentId)
  const loopRef = useRef(loop)
  const repeatRef = useRef(repeat)
  useEffect(() => { songsRef.current = songs }, [songs])
  useEffect(() => { currentIdRef.current = currentId }, [currentId])
  useEffect(() => { loopRef.current = loop }, [loop])
  useEffect(() => { repeatRef.current = repeat }, [repeat])

  const currentIdx = currentId ? songs.findIndex(s => s.id === currentId) : -1
  const currentSong = currentIdx >= 0 ? songs[currentIdx] : null
  const currentType = currentSong ? getSongType(currentSong.url) : null

  function advance() {
    const list = songsRef.current
    if (!list.length) return
    const idx = currentIdRef.current ? list.findIndex(s => s.id === currentIdRef.current) : -1
    let next = idx + 1
    if (next >= list.length) {
      if (loopRef.current) {
        next = 0
      } else {
        setCurrentId(null)
        setPlaying(false)
        return
      }
    }
    setCurrentId(list[next].id)
  }

  function handlePlayerState(e) {
    setPlaying(e.data === 1)
    if (e.data === 0) {
      if (repeatRef.current) {
        ytRef.current?.seekTo(0)
        ytRef.current?.playVideo()
      } else {
        actionsRef.current.advance()
      }
    }
  }

  function handlePlayerError() {
    showToast('Vidéo indisponible, passage à la suivante...')
    actionsRef.current.advance()
  }

  actionsRef.current = { advance, handlePlayerState, handlePlayerError }

  useEffect(() => {
    let alive = true
    loadYouTubeAPI().then(YT => {
      if (!alive || ytRef.current) return
      ytRef.current = new YT.Player('yt-host', {
        width: '100%',
        height: '100%',
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            ytReadyRef.current = true
            if (pendingVidRef.current) {
              ytRef.current.loadVideoById(pendingVidRef.current)
              pendingVidRef.current = null
            }
          },
          onStateChange: e => actionsRef.current.handlePlayerState(e),
          onError: () => actionsRef.current.handlePlayerError(),
        },
      })
    })
    return () => {
      alive = false
      if (ytRef.current && ytRef.current.destroy) ytRef.current.destroy()
      ytRef.current = null
      ytReadyRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!currentSong || currentType !== 'youtube') return
    const vid = extractYouTubeId(currentSong.url)
    if (!vid) return
    if (ytReadyRef.current && ytRef.current) {
      ytRef.current.loadVideoById({ videoId: vid })
    } else {
      pendingVidRef.current = vid
    }
  }, [currentId])

  async function load() {
    if (!room) return
    const { data } = await supabase.from('playlist').select('*').eq('room_id', room.id).order('created_at', { ascending: false })
    if (data) {
      setSongs(data)
      if (currentId && !data.some(s => s.id === currentId)) setCurrentId(null)
    }
  }

  useEffect(() => {
    if (!room) return
    load()
    const sub = supabase.channel('playlist-' + room.id).on('postgres_changes', { event: '*', schema: 'public', table: 'playlist', filter: `room_id=eq.${room.id}` }, () => load()).subscribe()
    return () => supabase.removeChannel(sub)
  }, [room])

  async function add() {
    if (!url.trim()) return
    await supabase.from('playlist').insert({ room_id: room.id, author: username, url: url.trim(), title: title.trim() || url.trim() })
    setUrl('')
    setTitle('')
  }

  async function remove(id) {
    await supabase.from('playlist').delete().eq('id', id)
    if (currentId === id) {
      setCurrentId(null)
      setPlaying(false)
    }
  }

  function playSong(idx) {
    const song = songs[idx]
    if (!song) return
    if (song.id === currentId) {
      togglePlay()
    } else {
      setCurrentId(song.id)
    }
  }

  function togglePlay() {
    if (playing) {
      ytRef.current?.pauseVideo()
      audioRef.current?.pause()
      setPlaying(false)
    } else {
      ytRef.current?.playVideo()
      audioRef.current?.play()
      setPlaying(true)
    }
  }

  function nextSong() {
    actionsRef.current.advance()
  }

  function prevSong() {
    const list = songsRef.current
    if (!list.length) return
    const idx = currentIdRef.current ? list.findIndex(s => s.id === currentIdRef.current) : -1
    if (idx <= 0) {
      if (loopRef.current && list.length) setCurrentId(list[list.length - 1].id)
      return
    }
    setCurrentId(list[idx - 1].id)
  }

  function handleNativeEnded() {
    if (repeatRef.current) {
      const el = audioRef.current
      if (el) {
        el.currentTime = 0
        el.play()
      }
    } else {
      actionsRef.current.advance()
    }
  }

  function renderNative() {
    if (currentType === 'spotify') {
      const s = extractSpotifyId(currentSong.url)
      return s ? (
        <iframe
          src={`https://open.spotify.com/embed/${s.type}/${s.id}?utm_source=generator&theme=0`}
          width="100%"
          height="80"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ border: 'none', borderRadius: 'var(--radius)' }}
          title={currentSong.title}
        />
      ) : null
    }
    if (currentType === 'video') {
      return (
        <div className="video-wrapper">
          <video
            ref={audioRef}
            src={currentSong.url}
            controls
            autoPlay
            playsInline
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={handleNativeEnded}
          />
        </div>
      )
    }
    return (
      <audio
        ref={audioRef}
        key={currentSong.id}
        src={currentSong.url}
        controls
        autoPlay
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={handleNativeEnded}
        style={{ width: '100%' }}
      />
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

      <div className="playlist-player">
        <span className="player-title">{currentSong ? currentSong.title : 'Prêt à jouer 🎵'}</span>
        <div className={`yt-host ${currentType === 'youtube' ? 'visible' : ''}`}>
          <div id="yt-host" />
        </div>
        {currentSong && currentType !== 'youtube' && renderNative()}
      </div>

      <div className="playlist-controls">
        <button className="ctrl-btn" onClick={prevSong} disabled={!currentSong} title="Précédent"><SkipBack size={18} /></button>
        <button className="ctrl-btn ctrl-main" onClick={togglePlay} disabled={!currentSong} title={playing ? 'Pause' : 'Lecture'}>
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button className="ctrl-btn" onClick={nextSong} disabled={!currentSong} title="Suivant"><SkipForward size={18} /></button>
        <button className={`ctrl-btn ${loop ? 'active' : ''}`} onClick={() => { setRepeat(false); setLoop(l => !l) }} title="Boucler la playlist"><Repeat size={16} /></button>
        <button className={`ctrl-btn ${repeat ? 'active' : ''}`} onClick={() => { setLoop(false); setRepeat(r => !r) }} title="Répéter la musique"><Repeat1 size={16} /></button>
        <button className="ctrl-btn" onClick={() => { setCurrentId(null); setPlaying(false) }} disabled={!currentSong} title="Arrêter"><X size={16} /></button>
      </div>

      <div className="playlist-list">
        {songs.length === 0 && <p className="empty-text">Aucune musique partagée</p>}
        {songs.map((s, idx) => {
          const type = getSongType(s.url)
          const isActive = currentSong?.id === s.id
          return (
            <div key={s.id} className={`playlist-item ${isActive ? 'playlist-item-active' : ''}`} onClick={() => playSong(idx)}>
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
              <button className="btn-icon btn-danger-icon" onClick={e => { e.stopPropagation(); remove(s.id) }}><Trash2 size={14} /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
