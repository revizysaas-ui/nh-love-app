import { useState, useEffect, useRef } from 'react'
import { Image, Camera, FolderOpen, X, Trash2, Heart, Send, MessageCircle, Upload } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'
import { notify } from '../lib/notify'

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
    })
    setCaption('')
    setSelectedFile(null)
    setUploadPreview(null)
    setShowUpload(false)
    setUploading(false)
    notify(room.id, 'photo', 'a ajouté une photo à la galerie 📸', username)
  }

  async function deletePhoto(photo) {
    await supabase.storage.from('photos').remove([photo.storage_path])
    await supabase.from('photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    setSelected(null)
  }

  async function saveCaption(id) {
    await supabase.from('photos').update({ caption }).eq('id', id)
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
    loadComments(p.id)
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
            <div className="gallery-upload-preview">
              <img src={uploadPreview} alt="Preview" />
              <button className="gallery-upload-remove" onClick={() => { setUploadPreview(null); setSelectedFile(null) }}>
                <X size={16} />
              </button>
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
            const url = supabase.storage.from('photos').getPublicUrl(p.storage_path).data.publicUrl
            return (
              <div key={p.id} className="gallery-item" onClick={() => openPhoto(p)}>
                <img src={url} alt={p.caption || ''} loading="lazy" />
                <div className="gallery-overlay">
                  {p.caption && <span>{p.caption}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-card gallery-modal" onClick={e => e.stopPropagation()}>
            <div className="gallery-modal-header">
              <button className="gallery-modal-close" onClick={() => deletePhoto(selected)}>
                <Trash2 size={16} />
              </button>
              <button className="gallery-modal-close" onClick={() => setSelected(null)}>
                <X size={16} />
              </button>
            </div>
            <img
              src={supabase.storage.from('photos').getPublicUrl(selected.storage_path).data.publicUrl}
              alt={selected.caption || ''}
              className="modal-img"
            />
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
