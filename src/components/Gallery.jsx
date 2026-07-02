import { useState, useEffect, useRef } from 'react'
import { Image, Upload, X, Trash2, Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Gallery() {
  const [photos, setPhotos] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    loadPhotos()
    const sub = supabase
      .channel('photos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos' }, () => loadPhotos())
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  async function loadPhotos() {
    const { data } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setPhotos(data)
    setLoading(false)
  }

  async function uploadPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('photos')
      .upload(path, file)
    if (uploadErr) { setUploading(false); return }

    await supabase.from('photos').insert({
      storage_path: path,
      caption: '',
    })
    setUploading(false)
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

  function openPhoto(p) {
    setSelected(p)
    setCaption(p.caption)
  }

  return (
    <div className="page gallery-page">
      <div className="page-header">
        <Image size={24} />
        <h2>Notre Galerie</h2>
        <button className="btn btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload size={16} />
          {uploading ? '...' : 'Ajouter'}
        </button>
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
          </div>
        </div>
      )}
    </div>
  )
}
