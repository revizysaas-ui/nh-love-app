import { useState, useEffect, useRef } from 'react'
import { Image, Camera, FolderOpen, X, Trash2, Heart, Send, MessageCircle, Upload, Eye, EyeOff, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'
import { notify } from '../lib/notify'

const SENSITIVE_EMOJIS = ['🎂', '🔒', '🙈', '🎁', '💝', '💐', '🌸', '🦋', '✨', '💫']

function getPhotoUrl(storagePath) {
  return supabase.storage.from('photos').getPublicUrl(storagePath).data.publicUrl
}

export default function Gallery() {
  const { room, username } = useRoom()
  const [photos, setPhotos] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadPreview, setUploadPreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [sensitive, setSensitive] = useState(false)
  const [sensitiveEmoji, setSensitiveEmoji] = useState('🎂')
  const [revealedPhotos, setRevealedPhotos] = useState({})
  const [revealedModal, setRevealedModal] = useState(false)
  const cameraRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!room) return
    loadPhotos()
    const sub = supabase
      .channel('photos-' + room.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos', filter: `room_id=eq.${room.id}` }, () => loadPhotos())
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [room])

  async function loadPhotos() {
    const { data } = await supabase
      .from('photos')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
    if (data) setPhotos(data)
    setLoading(false)
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = () => setUploadPreview(reader.result)
    reader.readAsDataURL(file)
  }

  async function uploadPhoto() {
    if (!selectedFile) return
    setUploading(true)
    const ext = selectedFile.name.split('.').pop()
    const path = `${room.id}/${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('photos')
      .upload(path, selectedFile)
    if (uploadErr) { setUploading(false); return }

    await supabase.from('photos').insert({
      room_id: room.id,
      storage_path: path,
      caption: caption.trim(),
      sensitive,
      sensitive_emoji: sensitive ? sensitiveEmoji : null,
    })
    setCaption('')
    setSelectedFile(null)
    setUploadPreview(null)
    setShowUpload(false)
    setSensitive(false)
    setSensitiveEmoji('🎂')
    setUploading(false)
    notify(room.id, 'photo', sensitive ? 'a ajouté une photo sensible 🔒' : 'a ajouté une photo à la galerie 📸', username)
  }

  async function deletePhoto(photo) {
    await supabase.storage.from('photos').remove([photo.storage_path])
    await supabase.from('photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    setSelected(null)
    setRevealedModal(false)
  }

  async function saveCaption(id) {
    await supabase.from('photos').update({ caption }).eq('id', id)
  }

  async function toggleSensitive(photo) {
    const newValue = !photo.sensitive
    await supabase.from('photos').update({
      sensitive: newValue,
      sensitive_emoji: newValue ? sensitiveEmoji : null,
    }).eq('id', photo.id)
    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, sensitive: newValue, sensitive_emoji: newValue ? sensitiveEmoji : null } : p))
    if (selected?.id === photo.id) {
      setSelected(prev => ({ ...prev, sensitive: newValue, sensitive_emoji: newValue ? sensitiveEmoji : null }))
    }
  }

  async function loadComments(photoId) {
    const { data } = await supabase
      .from('photo_comments')
      .select('*')
      .eq('photo_id', photoId)
      .order('created_at', { ascending: true })
    if (data) setComments(data)
  }

  async function addComment() {
    if (!commentText.trim() || !selected) return
    await supabase.from('photo_comments').insert({
      photo_id: selected.id,
      room_id: room.id,
      author: username || 'Anonyme',
      text: commentText.trim(),
    })
    setCommentText('')
    loadComments(selected.id)
    notify(room.id, 'comment', 'a commenté une photo 💬', username)
  }

  function openPhoto(p) {
    setSelected(p)
    setCaption(p.caption)
    setComments([])
    setCommentText('')
    setRevealedModal(false)
    loadComments(p.id)
  }

  function revealPhoto(id) {
    setRevealedPhotos(prev => ({ ...prev, [id]: true }))
  }

  function hidePhoto(id) {
    setRevealedPhotos(prev => ({ ...prev, [id]: false }))
  }

  return (
    <div className="page gallery-page">
      <div className="page-header">
        <Image size={24} />
        <h2>Notre Galerie</h2>
        <span style={{ fontSize: 14, color: 'var(--muted-foreground)', fontWeight: 400 }}>({photos.length})</span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm btn-secondary" onClick={() => setShowUpload(!showUpload)}>
          <Upload size={16} />
          Ajouter
        </button>
      </div>

      {/* Upload area */}
      {showUpload && (
        <div className="gallery-upload-area">
          {uploadPreview && (
            <div className={`gallery-upload-preview ${sensitive ? 'sensitive-preview' : ''}`}>
              <img src={uploadPreview} alt="Preview" style={sensitive ? { filter: 'blur(20px)' } : {}} />
              <button className="gallery-upload-remove" onClick={() => { setUploadPreview(null); setSelectedFile(null) }}>
                <X size={16} />
              </button>
              {sensitive && (
                <div className="sensitive-preview-overlay">
                  <span style={{ fontSize: 48 }}>{sensitiveEmoji}</span>
                </div>
              )}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            className="gallery-upload-caption"
            placeholder="Description de la photo..."
            value={caption}
            onChange={e => setCaption(e.target.value)}
          />

          {/* Sensitive toggle */}
          <div className="sensitive-toggle-row">
            <button
              className={`sensitive-toggle ${sensitive ? 'active' : ''}`}
              onClick={() => setSensitive(!sensitive)}
              type="button"
            >
              <Shield size={16} />
              <span>Photo sensible</span>
              {sensitive ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {/* Emoji picker for sensitive */}
          {sensitive && (
            <div className="sensitive-emoji-picker">
              <span className="sensitive-emoji-label">Choisir un emoji de couverture :</span>
              <div className="sensitive-emoji-grid">
                {SENSITIVE_EMOJIS.map(em => (
                  <button
                    key={em}
                    className={`sensitive-emoji-btn ${sensitiveEmoji === em ? 'active' : ''}`}
                    onClick={() => setSensitiveEmoji(em)}
                    type="button"
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="gallery-upload-actions">
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>
              <Image size={16} />
              {selectedFile ? 'Changer' : 'Choisir une photo'}
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={uploadPhoto} disabled={!selectedFile || uploading}>
              {uploading ? 'Envoi...' : 'Partager'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="gallery-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="gallery-skeleton" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Image size={48} />
          </div>
          <p>Aucune photo encore</p>
          <span style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>Partagez vos premiers moments !</span>
          <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => setShowUpload(true)}>
            <Upload size={16} /> Ajouter une photo
          </button>
        </div>
      ) : (
        <div className="gallery-grid">
          {photos.map(p => {
            const url = getPhotoUrl(p.storage_path)
            const isSensitive = p.sensitive
            const isRevealed = revealedPhotos[p.id]
            return (
              <div
                key={p.id}
                className={`gallery-item ${isSensitive ? 'gallery-item-sensitive' : ''} ${isRevealed ? 'revealed' : ''}`}
                onClick={() => isSensitive && !isRevealed ? revealPhoto(p.id) : openPhoto(p)}
              >
                <img
                  src={url}
                  alt={p.caption || ''}
                  loading="lazy"
                  style={isSensitive && !isRevealed ? { filter: 'blur(20px)' } : {}}
                />
                {isSensitive && !isRevealed && (
                  <div className="sensitive-overlay">
                    <span className="sensitive-emoji-display">{p.sensitive_emoji || '🎂'}</span>
                    <span className="sensitive-label">Photo sensible</span>
                    <button className="sensitive-reveal-btn" onClick={(e) => { e.stopPropagation(); revealPhoto(p.id) }}>
                      <Eye size={16} /> Voir
                    </button>
                  </div>
                )}
                {isSensitive && isRevealed && (
                  <button className="sensitive-hide-btn" onClick={(e) => { e.stopPropagation(); hidePhoto(p.id) }}>
                    <EyeOff size={14} />
                  </button>
                )}
                <div className="gallery-overlay">
                  {p.caption && <span>{p.caption}</span>}
                  {isSensitive && <span className="gallery-sensitive-badge">🔒</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setRevealedModal(false) }}>
          <div className="modal-card gallery-modal" onClick={e => e.stopPropagation()}>
            <div className="gallery-modal-header">
              <button
                className="gallery-modal-close"
                style={selected.sensitive ? { color: selected.sensitive ? 'var(--romantic)' : undefined } : {}}
                onClick={() => toggleSensitive(selected)}
                title={selected.sensitive ? 'Retirer le flou' : 'Rendre sensible'}
              >
                {selected.sensitive ? <Eye size={16} /> : <Shield size={16} />}
              </button>
              <button className="gallery-modal-close" onClick={() => deletePhoto(selected)}>
                <Trash2 size={16} />
              </button>
              <button className="gallery-modal-close" onClick={() => { setSelected(null); setRevealedModal(false) }}>
                <X size={16} />
              </button>
            </div>

            {/* Modal image with sensitive handling */}
            <div className="gallery-modal-image-wrapper">
              {selected.sensitive && !revealedModal ? (
                <div className="gallery-modal-sensitive" onClick={() => setRevealedModal(true)}>
                  <img
                    src={getPhotoUrl(selected.storage_path)}
                    alt={selected.caption || ''}
                    className="modal-img"
                    style={{ filter: 'blur(25px)' }}
                  />
                  <div className="gallery-modal-sensitive-overlay">
                    <span style={{ fontSize: 56 }}>{selected.sensitive_emoji || '🎂'}</span>
                    <p style={{ color: 'white', fontWeight: 600, marginTop: 8, fontSize: 15 }}>Photo sensible</p>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>Appuyez pour révéler</p>
                  </div>
                </div>
              ) : (
                <img
                  src={getPhotoUrl(selected.storage_path)}
                  alt={selected.caption || ''}
                  className="modal-img"
                />
              )}
            </div>

            {selected.sensitive && revealedModal && (
              <div className="gallery-modal-sensitive-info">
                <Shield size={14} />
                <span>Photo marquée comme sensible</span>
                <button className="btn-icon" onClick={() => setRevealedModal(false)}>
                  <EyeOff size={14} />
                </button>
              </div>
            )}

            <div className="gallery-modal-body">
              {selected.caption && <p className="gallery-modal-caption">{selected.caption}</p>}
              <div className="gallery-modal-caption-input">
                <input
                  placeholder="Ajouter un commentaire..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addComment()}
                />
                <button className="btn-icon" style={{ color: 'var(--primary)' }} onClick={addComment} disabled={!commentText.trim()}>
                  <Send size={18} />
                </button>
              </div>
              <div className="gallery-comments">
                {comments.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--muted-foreground)', textAlign: 'center', padding: 8 }}>
                    Pas encore de commentaires
                  </p>
                )}
                {comments.map(c => (
                  <div key={c.id} className="comment-bubble">
                    <strong>{c.author}</strong>
                    <p>{c.text}</p>
                    <small>{new Date(c.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
