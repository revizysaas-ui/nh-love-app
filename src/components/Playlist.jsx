import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { Music, Plus, Trash2, Play, Pause, Video, SkipBack, SkipForward, Repeat, Repeat1, X } from 'lucide-react'
import { usePlayer, getSongType, spotifyEmbedUrl } from '../context/PlayerContext'

export default function Playlist() {
  const {
    songs,
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
  } = usePlayer()

  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const hostRef = useRef(null)

  useLayoutEffect(() => {
    if (hostRef.current) ensurePlayer(hostRef.current)
    return () => releasePlayer()
  }, [])

  async function handleRemove(id) {
    await remove(id)
  }

  return (
    <div className="page playlist-page">
      <div className="page-header"><Music size={24} /><h2>Notre Playlist</h2></div>
      <div className="wishlist-input" style={{ flexDirection: 'column', gap: 8 }}>
        <input placeholder="Titre de la musique..." value={title} onChange={e => setTitle(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Lien YouTube, Spotify, vidéo ou audio..." value={url} onChange={e => setUrl(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-sm" onClick={() => { add(url, title); setUrl(''); setTitle('') }} disabled={!url.trim()}><Plus size={16} /></button>
        </div>
      </div>

      <div className="playlist-player">
        <span className="player-title">{currentSong ? currentSong.title : 'Prêt à jouer 🎵'}</span>
        <div className={`yt-host ${currentType === 'youtube' ? 'visible' : ''}`}>
          <div ref={hostRef} id="yt-host" />
        </div>
        {currentSong && currentType === 'audio' && (
          <audio
            ref={registerNativeEl}
            key={currentSong.id}
            src={currentSong.url}
            controls
            autoPlay
            onPlay={() => syncPlaying(true)}
            onPause={() => syncPlaying(false)}
            onEnded={handleNativeEnded}
            style={{ width: '100%' }}
          />
        )}
        {currentSong && currentType === 'video' && (
          <div className="video-wrapper">
            <video
              ref={registerNativeEl}
              src={currentSong.url}
              controls
              autoPlay
              playsInline
              onPlay={() => syncPlaying(true)}
              onPause={() => syncPlaying(false)}
              onEnded={handleNativeEnded}
            />
          </div>
        )}
        {currentSong && currentType === 'spotify' && spotifyEmbedUrl(currentSong.url) && (
          <iframe
            ref={registerNativeEl}
            src={spotifyEmbedUrl(currentSong.url)}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ border: 'none', borderRadius: 'var(--radius)' }}
            title={currentSong.title}
          />
        )}
      </div>

      <div className="playlist-controls">
        <button className="ctrl-btn" onClick={prevSong} disabled={!currentSong} title="Précédent"><SkipBack size={18} /></button>
        <button className="ctrl-btn ctrl-main" onClick={togglePlay} disabled={!currentSong} title={playing ? 'Pause' : 'Lecture'}>
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button className="ctrl-btn" onClick={nextSong} disabled={!currentSong} title="Suivant"><SkipForward size={18} /></button>
        <button className={`ctrl-btn ${loop ? 'active' : ''}`} onClick={() => { setRepeat(false); setLoop(l => !l) }} title="Boucler la playlist"><Repeat size={16} /></button>
        <button className={`ctrl-btn ${repeat ? 'active' : ''}`} onClick={() => { setLoop(false); setRepeat(r => !r) }} title="Répéter la musique"><Repeat1 size={16} /></button>
        <button className="ctrl-btn" onClick={stop} disabled={!currentSong} title="Arrêter"><X size={16} /></button>
      </div>

      <div className="playlist-list">
        {songs.length === 0 && <p className="empty-text">Aucune musique partagée</p>}
        {songs.map((s, idx) => {
          const isActive = currentSong?.id === s.id
          const type = getSongType(s.url)
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
              <button className="btn-icon btn-danger-icon" onClick={e => { e.stopPropagation(); handleRemove(s.id) }}><Trash2 size={14} /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
