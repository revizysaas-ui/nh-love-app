import { useState, useEffect, useRef } from 'react'
import { Image, Camera, FolderOpen, X, Trash2, Heart, Send, MessageCircle } from 'lucide-react'
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

  async function uploadPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${room.id}/${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('photos')
      .upload(path, file)
    if (uploadErr) { setUploading(false); return }

    await supabase.from('photos').insert({
      room_id: room.id,
      storage_path: path,
      caption: '',
    })
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
        <button className="btn-icon" onClick={() => cameraRef.current?.click()} disabled={uploading}>
          <Camera size={20} />
        </button>
        <button className="btn-icon" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <FolderOpen size={20} />
        </button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={uploadPhoto} hidden />
        <input ref={fileRef} type="file" accept="image/*" onChange={uploadPhoto} hidden />
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : photos.length === 0 ? (
        <div className="empty-state">
          <Heart size={48} />
          <p>Pas encore de photos</p>
          <span>Ajoutez vos premiers souvenirs</span>
        </div>
      ) : (
        <div className="gallery-grid">
          {photos.map(p => (
            <div key={p.id} className="gallery-item" onClick={() => openPhoto(p)}>
              <img src={supabase.storage.from('photos').getPublicUrl(p.storage_path).data.publicUrl} alt={p.caption || ''} />
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
            <img
              src={supabase.storage.from('photos').getPublicUrl(selected.storage_path).data.publicUrl}
              alt={selected.caption || ''}
              className="modal-img"
            />
            <div className="modal-actions">
              <input
                className="modal-caption"
                placeholder="Ajoute une légende..."
                value={caption}
                onChange={e => setCaption(e.target.value)}
                onBlur={() => saveCaption(selected.id)}
              />
              <button className="btn-icon btn-danger-icon" onClick={() => deletePhoto(selected)}>
                <Trash2 size={18} />
              </button>
            </div>

            <div className="comments-section">
              <div className="comments-list">
                {comments.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--muted-foreground)', textAlign: 'center' }}>
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
              <div className="comment-input-row">
                <input
                  placeholder="Écris un commentaire..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addComment()}
                />
                <button className="btn-icon" style={{ color: 'var(--primary)' }} onClick={addComment} disabled={!commentText.trim()}>
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
