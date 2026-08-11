import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRoom } from './RoomContext'
import { useToast } from './ToastContext'

const PlayerContext = createContext(null)
export const usePlayer = () => useContext(PlayerContext)

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

export function getSongType(url) {
  if (extractYouTubeId(url)) return 'youtube'
  if (extractSpotifyId(url)) return 'spotify'
  if (isVideoFile(url)) return 'video'
  return 'audio'
}

export function spotifyEmbedUrl(url) {
  const s = extractSpotifyId(url)
  return s ? `https://open.spotify.com/embed/${s.type}/${s.id}?utm_source=generator&theme=0` : null
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

export function PlayerProvider({ children }) {
  const { room, username } = useRoom()
  const { showToast } = useToast()
  const [songs, setSongs] = useState([])
  const [currentId, setCurrentId] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [loop, setLoop] = useState(false)
  const [repeat, setRepeat] = useState(false)

  const ytRef = useRef(null)           // YT.Player instance (persiste entre les pages)
  const ytReadyRef = useRef(false)
  const pendingVidRef = useRef(null)
  const nativeElRef = useRef(null)     // élément audio/vidéo/spotify actuel
  const nativeVisibleRef = useRef(false)
  const harborRef = useRef(null)       // conteneur hors-page pour garder la lecture en vie
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

  function getHarbor() {
    if (!harborRef.current) {
      const div = document.createElement('div')
      div.style.cssText = 'position:fixed;width:1px;height:1px;left:-9999px;top:0;opacity:0;pointer-events:none;overflow:hidden'
      document.body.appendChild(div)
      harborRef.current = div
    }
    return harborRef.current
  }

  function clearHarbor() {
    if (harborRef.current) harborRef.current.innerHTML = ''
  }

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

  function handlePlayerError() {
    showToast('Vidéo indisponible, passage à la suivante...')
    actionsRef.current.advance()
  }

  function handleNativeEnded() {
    if (repeatRef.current) {
      const el = nativeElRef.current
      if (el) {
        el.currentTime = 0
        el.play()
      }
    } else {
      actionsRef.current.advance()
    }
  }

  function syncPlaying(v) {
    setPlaying(v)
  }

  const registerNativeEl = useCallback(el => {
    nativeElRef.current = el
    nativeVisibleRef.current = !!el
  }, [])

  actionsRef.current = { advance }

  function ensurePlayer(hostEl) {
    if (!hostEl) return
    if (ytRef.current) {
      const iframe = ytRef.current.getIframe()
      if (iframe && iframe.parentElement !== hostEl) hostEl.appendChild(iframe)
      clearHarbor()
      return
    }
    loadYouTubeAPI().then(YT => {
      if (ytRef.current) {
        const iframe = ytRef.current.getIframe()
        if (iframe && iframe.parentElement !== hostEl) hostEl.appendChild(iframe)
        clearHarbor()
        return
      }
      ytRef.current = new YT.Player(hostEl, {
        videoId: pendingVidRef.current || undefined,
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
          onStateChange: e => {
            setPlaying(e.data === 1)
            if (e.data === 0) {
              if (repeatRef.current) {
                ytRef.current?.seekTo(0)
                ytRef.current?.playVideo()
              } else {
                actionsRef.current.advance()
              }
            }
          },
          onError: () => handlePlayerError(),
        },
      })
    })
  }

  function releasePlayer() {
    const harbor = getHarbor()
    if (ytRef.current) {
      const iframe = ytRef.current.getIframe()
      if (iframe && iframe.parentElement) harbor.appendChild(iframe)
    }
    if (nativeElRef.current && nativeElRef.current.parentElement) {
      harbor.appendChild(nativeElRef.current)
    }
    nativeVisibleRef.current = false
  }

  async function load() {
    if (!room) return
    const { data } = await supabase.from('playlist').select('*').eq('room_id', room.id).order('created_at', { ascending: false })
    if (data) {
      setSongs(data)
      if (currentIdRef.current && !data.some(s => s.id === currentIdRef.current)) setCurrentId(null)
    }
  }

  useEffect(() => {
    if (!room) return
    load()
    const sub = supabase.channel('playlist-' + room.id).on('postgres_changes', { event: '*', schema: 'public', table: 'playlist', filter: `room_id=eq.${room.id}` }, () => load()).subscribe()
    return () => supabase.removeChannel(sub)
  }, [room?.id])

  useEffect(() => {
    setCurrentId(null)
    setPlaying(false)
    ytReadyRef.current = false
    if (nativeElRef.current) {
      try { nativeElRef.current.pause() } catch {}
      nativeElRef.current = null
    }
    clearHarbor()
  }, [room?.id])

  useEffect(() => {
    if (!currentSong) return
    if (currentType === 'youtube') {
      const vid = extractYouTubeId(currentSong.url)
      if (!vid) return
      if (ytReadyRef.current && ytRef.current) {
        ytRef.current.loadVideoById({ videoId: vid })
      } else {
        pendingVidRef.current = vid
      }
      return
    }
    if (currentType === 'audio' || currentType === 'video') {
      if (!nativeVisibleRef.current) {
        if (nativeElRef.current) {
          try { nativeElRef.current.pause() } catch {}
          if (nativeElRef.current.parentElement) nativeElRef.current.remove()
          nativeElRef.current = null
        }
        const el = document.createElement(currentType === 'video' ? 'video' : 'audio')
        el.src = currentSong.url
        el.autoplay = true
        el.playsInline = true
        el.addEventListener('ended', () => actionsRef.current.advance())
        el.addEventListener('play', () => setPlaying(true))
        el.addEventListener('pause', () => setPlaying(false))
        nativeElRef.current = el
        getHarbor().appendChild(el)
        el.play().catch(() => {})
      }
    }
  }, [currentId])

  function add(url, title) {
    if (!url) return
    void supabase.from('playlist').insert({ room_id: room.id, author: username, url: url.trim(), title: (title || '').trim() || url.trim() })
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
      if (nativeElRef.current) nativeElRef.current.pause()
      setPlaying(false)
    } else {
      ytRef.current?.playVideo()
      if (nativeElRef.current) nativeElRef.current.play()
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

  function stop() {
    setCurrentId(null)
    setPlaying(false)
    if (nativeElRef.current) {
      try { nativeElRef.current.pause() } catch {}
      nativeElRef.current = null
    }
    try { ytRef.current?.pauseVideo() } catch {}
  }

  const value = {
    songs,
    currentId,
    currentSong,
    currentType,
    playing,
    loop,
    repeat,
    setLoop,
    setRepeat,
    playSong,
    togglePlay,
    nextSong,
    prevSong,
    stop,
    add,
    remove,
    ensurePlayer,
    releasePlayer,
    registerNativeEl,
    handleNativeEnded,
    syncPlaying,
  }

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}
