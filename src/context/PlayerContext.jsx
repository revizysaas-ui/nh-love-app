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
  const pendingSeekRef = useRef(null)
  const pendingPauseRef = useRef(false)
  const playingRef = useRef(false)
  const currentTypeRef = useRef(null)
  const syncChannelRef = useRef(null)

  const ytRef = useRef(null)           // YT.Player instance (persiste entre les pages)
  const ytReadyRef = useRef(false)
  const pendingVidRef = useRef(null)
  const nativeElRef = useRef(null)     // élément audio/vidéo/spotify actuel
  const nativeVisibleRef = useRef(false)
  const harborRef = useRef(null)       // conteneur hors-page pour garder la lecture en vie
  const screenRef = useRef(null)       // conteneur vidéo persistant (enfant direct de body, jamais déplacé)
  const screenAnchorRef = useRef(null) // élément de la page sur lequel aligner l'overlay vidéo
  const screenVisibleRef = useRef(false)
  const actionsRef = useRef({})

  const songsRef = useRef(songs)
  const currentIdRef = useRef(currentId)
  const loopRef = useRef(loop)
  const repeatRef = useRef(repeat)
  useEffect(() => { songsRef.current = songs }, [songs])
  useEffect(() => { currentIdRef.current = currentId }, [currentId])
  useEffect(() => { loopRef.current = loop }, [loop])
  useEffect(() => { repeatRef.current = repeat }, [repeat])
  useEffect(() => { playingRef.current = playing }, [playing])

  const currentIdx = currentId ? songs.findIndex(s => s.id === currentId) : -1
  const currentSong = currentIdx >= 0 ? songs[currentIdx] : null
  const currentType = currentSong ? getSongType(currentSong.url) : null
  useEffect(() => { currentTypeRef.current = currentType }, [currentType])

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

  // Conteneur d'affichage permanent pour la vidéo YouTube : il reste un enfant
  // direct de <body>, jamais déplacé ni supprimé, pour ne jamais faire recharger
  // l'iframe (un simple reparent réinitialise le lecteur). On l'aligne par-dessus
  // l'emplacement prévu sur la page (position: fixed) et on le masque ailleurs.
  function getScreen() {
    if (!screenRef.current) {
      const div = document.createElement('div')
      div.setAttribute('data-yt-screen', '')
      div.style.cssText = 'position:fixed;left:-9999px;top:0;width:640px;height:360px;display:block;z-index:45;background:#000;overflow:hidden'
      document.body.appendChild(div)
      screenRef.current = div
    }
    return screenRef.current
  }

  // Une fois le lecteur créé, YT.Player remplace le div par l'iframe directement
  // dans <body> : c'est cet élément vivant qu'on positionne/masque.
  function getScreenEl() {
    if (ytRef.current) {
      const iframe = ytRef.current.getIframe()
      if (iframe && iframe.parentElement) {
        iframe.setAttribute('data-yt-screen', '')
        return iframe
      }
    }
    return getScreen()
  }

  // Masque la vidéo hors écran tout en gardant une taille réelle : un display:none
  // ferait ignorer loadVideoById à YouTube et casserait le passage automatique à
  // la chanson suivante pendant que le mini-player est affiché.
  function hideScreen() {
    const screen = getScreenEl()
    screen.style.display = 'block'
    screen.style.left = '-9999px'
    screen.style.top = '0'
    screen.style.width = '640px'
    screen.style.height = '360px'
    screenVisibleRef.current = false
  }

  function positionScreen(anchor) {
    const screen = getScreenEl()
    if (!anchor || !anchor.isConnected) {
      hideScreen()
      return
    }
    const r = anchor.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const x = Math.max(0, r.left)
    const y = Math.max(0, r.top)
    const w = Math.min(vw, r.right) - x
    const h = Math.min(vh, r.bottom) - y
    if (w < 4 || h < 4) {
      hideScreen()
      return
    }
    screen.style.display = 'block'
    screen.style.left = x + 'px'
    screen.style.top = y + 'px'
    screen.style.width = w + 'px'
    screen.style.height = h + 'px'
    screenVisibleRef.current = true
  }

  function destroyScreen() {
    const el = getScreenEl()
    if (el && el.parentElement) el.remove()
    screenRef.current = null
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
        sendSync()
        return
      }
    }
    applyState({ currentId: list[next].id, playing: true, pos: 0 }, { broadcast: true })
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
    screenAnchorRef.current = hostEl
    if (ytRef.current) {
      positionScreen(hostEl)
      clearHarbor()
      return
    }
    loadYouTubeAPI().then(YT => {
      if (ytRef.current) {
        positionScreen(hostEl)
        clearHarbor()
        return
      }
      const opts = {
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
              ytRef.current.loadVideoById({ videoId: pendingVidRef.current, startSeconds: pendingSeekRef.current != null ? pendingSeekRef.current : undefined })
              pendingSeekRef.current = null
              pendingVidRef.current = null
              if (pendingPauseRef.current) {
                pendingPauseRef.current = false
                setTimeout(() => { try { ytRef.current?.pauseVideo() } catch {} }, 350)
              }
            }
            positionScreen(hostEl)
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
      }
      if (pendingVidRef.current) opts.videoId = pendingVidRef.current
      ytRef.current = new YT.Player(getScreen(), opts)
    })
  }

  function releasePlayer() {
    const harbor = getHarbor()
    if (nativeElRef.current && nativeElRef.current.parentElement) {
      harbor.appendChild(nativeElRef.current)
    }
    nativeVisibleRef.current = false
    if (screenRef.current || ytRef.current) hideScreen()
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
    const onMove = () => {
      if (!screenRef.current && !ytRef.current) return
      positionScreen(screenAnchorRef.current)
    }
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [])

  useEffect(() => {
    if (!room) return
    load()
    const sub = supabase.channel('playlist-' + room.id).on('postgres_changes', { event: '*', schema: 'public', table: 'playlist', filter: `room_id=eq.${room.id}` }, () => load()).subscribe()
    const pollId = setInterval(() => load(), 5000)
    return () => {
      supabase.removeChannel(sub)
      clearInterval(pollId)
    }
  }, [room?.id])

  useEffect(() => {
    if (!room) return
    const ch = supabase.channel('music-sync-' + room.id)
      .on('broadcast', { event: 'sync' }, ({ payload }) => { applyState(payload, { broadcast: false }) })
      .subscribe()
    syncChannelRef.current = ch
    return () => {
      supabase.removeChannel(ch)
      syncChannelRef.current = null
    }
  }, [room?.id])

  useEffect(() => {
    if (!room) return
    const id = setInterval(() => {
      if (playingRef.current && currentIdRef.current && syncChannelRef.current) sendSync()
    }, 5000)
    return () => clearInterval(id)
  }, [room?.id])

  function currentPos() {
    if (currentTypeRef.current === 'youtube') {
      try { return ytRef.current?.getCurrentTime?.() || 0 } catch { return 0 }
    }
    if (nativeElRef.current) return nativeElRef.current.currentTime || 0
    return 0
  }

  function sendSync() {
    const ch = syncChannelRef.current
    if (!ch) return
    ch.send({ type: 'broadcast', event: 'sync', payload: { currentId: currentIdRef.current, playing: playingRef.current, pos: currentPos(), t: Date.now() } })
  }

  function doSeek(pos) {
    if (currentTypeRef.current === 'youtube') {
      try { ytRef.current?.seekTo(pos, true) } catch {}
    } else if (nativeElRef.current) {
      nativeElRef.current.currentTime = pos
    }
  }

  function doPlay() {
    if (currentTypeRef.current === 'youtube') { try { ytRef.current?.playVideo() } catch {} }
    else if (nativeElRef.current) { nativeElRef.current.play().catch(() => {}) }
    setPlaying(true)
  }

  function doPause() {
    if (currentTypeRef.current === 'youtube') { try { ytRef.current?.pauseVideo() } catch {} }
    else if (nativeElRef.current) { try { nativeElRef.current.pause() } catch {} }
    setPlaying(false)
  }

  // Applique un état de lecture. broadcast:true => émis vers le partenaire.
  function applyState(state, opts = {}) {
    if (!state) return
    const cid = state.currentId ?? null
    const pl = !!state.playing
    const pos = (typeof state.pos === 'number') ? state.pos : null
    const isRemote = !opts.broadcast

    if (isRemote && !cid && currentIdRef.current) return
    if (isRemote && cid && currentIdRef.current && cid !== currentIdRef.current) {
      pendingSeekRef.current = (pl && pos != null) ? pos : null
      pendingPauseRef.current = !pl
      setCurrentId(cid)
    } else if (isRemote && cid === currentIdRef.current) {
      if (pl && !playingRef.current) doPlay()
      else if (!pl && playingRef.current) doPause()
      if (pl && playingRef.current && pos != null) {
        if (Math.abs(currentPos() - pos) > 3) doSeek(pos)
      }
    }

    if (!isRemote) {
      if (cid !== currentIdRef.current) {
        pendingSeekRef.current = (pl && pos != null) ? pos : null
        pendingPauseRef.current = !pl
        setCurrentId(cid)
      }
      if (pl && !playingRef.current) doPlay()
      else if (!pl && playingRef.current) doPause()
    }

    if (opts.broadcast) sendSync()
  }

  useEffect(() => {
    setCurrentId(null)
    setPlaying(false)
    ytReadyRef.current = false
    if (nativeElRef.current) {
      try { nativeElRef.current.pause() } catch {}
      nativeElRef.current = null
    }
    clearHarbor()
    destroyScreen()
    ytRef.current = null
    screenAnchorRef.current = null
    screenVisibleRef.current = false
  }, [room?.id])

  useEffect(() => {
    if (!currentSong) {
      if (screenRef.current || ytRef.current) hideScreen()
      return
    }
    if (currentType === 'youtube') {
      const vid = extractYouTubeId(currentSong.url)
      if (!vid) return
      if (ytReadyRef.current && ytRef.current) {
        ytRef.current.loadVideoById({ videoId: vid, startSeconds: pendingSeekRef.current != null ? pendingSeekRef.current : undefined })
        pendingSeekRef.current = null
        if (pendingPauseRef.current) {
          pendingPauseRef.current = false
          setTimeout(() => { try { ytRef.current?.pauseVideo() } catch {} }, 350)
        }
      } else {
        pendingVidRef.current = vid
      }
      if (screenAnchorRef.current) positionScreen(screenAnchorRef.current)
      return
    }
    if (currentType === 'audio' || currentType === 'video') {
      if (screenRef.current || ytRef.current) hideScreen()
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
        if (pendingSeekRef.current != null) { el.currentTime = pendingSeekRef.current; pendingSeekRef.current = null }
        if (pendingPauseRef.current) { pendingPauseRef.current = false; el.pause() }
      }
    }
  }, [currentId])

  async function add(url, title) {
    if (!url) return
    await supabase.from('playlist').insert({ room_id: room.id, author: username, url: url.trim(), title: (title || '').trim() || url.trim() })
    await load()
  }

  async function remove(id) {
    await supabase.from('playlist').delete().eq('id', id)
    await load()
    if (currentId === id) {
      setCurrentId(null)
      setPlaying(false)
    }
  }

  function playSong(idx) {
    const song = songs[idx]
    if (!song) return
    if (song.id === currentIdRef.current) {
      togglePlay()
    } else {
      applyState({ currentId: song.id, playing: true, pos: 0 }, { broadcast: true })
    }
  }

  function togglePlay() {
    if (!currentSong) return
    if (playing) {
      applyState({ currentId: currentIdRef.current, playing: false }, { broadcast: true })
    } else {
      applyState({ currentId: currentIdRef.current, playing: true, pos: currentPos() }, { broadcast: true })
    }
  }

  function nextSong() {
    const list = songsRef.current
    if (!list.length) return
    const idx = currentIdRef.current ? list.findIndex(s => s.id === currentIdRef.current) : -1
    let next = idx + 1
    if (next >= list.length) {
      if (loopRef.current) next = 0
      else { applyState({ currentId: null, playing: false }, { broadcast: true }); return }
    }
    applyState({ currentId: list[next].id, playing: true, pos: 0 }, { broadcast: true })
  }

  function prevSong() {
    const list = songsRef.current
    if (!list.length) return
    const idx = currentIdRef.current ? list.findIndex(s => s.id === currentIdRef.current) : -1
    if (idx <= 0) {
      if (loopRef.current && list.length) applyState({ currentId: list[list.length - 1].id, playing: true, pos: 0 }, { broadcast: true })
      return
    }
    applyState({ currentId: list[idx - 1].id, playing: true, pos: 0 }, { broadcast: true })
  }

  function stop() {
    setCurrentId(null)
    setPlaying(false)
    if (nativeElRef.current) {
      try { nativeElRef.current.pause() } catch {}
      nativeElRef.current = null
    }
    try { ytRef.current?.pauseVideo() } catch {}
    sendSync()
  }

  const [incomingShare, setIncomingShare] = useState(null)
  const shareChannelRef = useRef(null)
  useEffect(() => {
    if (!room) return
    const ch = supabase.channel('music-share-' + room.id)
      .on('broadcast', { event: 'share' }, ({ payload }) => {
        if (payload?.from && payload.from !== username) {
          setIncomingShare({ from: payload.from, song: payload.song })
        }
      })
      .subscribe()
    shareChannelRef.current = ch
    return () => {
      supabase.removeChannel(ch)
      shareChannelRef.current = null
    }
  }, [room?.id])

  function shareCurrentSong() {
    if (!currentSong) return
    shareChannelRef.current?.send({ type: 'broadcast', event: 'share', payload: { from: username, song: { id: currentSong.id, url: currentSong.url, title: currentSong.title } } })
    showToast('Musique partagée 🎵')
  }

  async function acceptShare() {
    const sh = incomingShare
    if (!sh) return
    const list = songsRef.current
    const idx = list.findIndex(s => s.id === sh.song.id)
    if (idx >= 0) {
      playSong(idx)
    } else {
      await add(sh.song.url, sh.song.title)
      setTimeout(() => {
        const i = songsRef.current.findIndex(s => s.url === sh.song.url)
        if (i >= 0) playSong(i)
      }, 400)
    }
    setIncomingShare(null)
  }

  function dismissShare() {
    setIncomingShare(null)
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
    shareCurrentSong,
    incomingShare,
    acceptShare,
    dismissShare,
  }

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}
