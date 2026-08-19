import { useState, useEffect, useRef } from 'react'
import { Target, Plus, Check, X, Camera, Trash2, Upload, User, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'
import { notify } from '../lib/notify'

function getProofUrl(path) {
  return supabase.storage.from('objectives').getPublicUrl(path).data.publicUrl
}

export default function Objectives() {
  const { room, username } = useRoom()
  const [objectives, setObjectives] = useState([])
  const [tab, setTab] = useState('mine')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileRef = useRef(null)

  const partner = room?.name1 === username ? room?.name2 : room?.name1

  useEffect(() => {
    if (!room) return
    load()
    const sub = supabase
      .channel('objectives-' + room.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'objectives', filter: `room_id=eq.${room.id}` }, () => load())
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [room?.id])

  async function load() {
    if (!room) return
    const { data } = await supabase
      .from('objectives')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
    if (data) setObjectives(data)
    setLoading(false)
  }

  async function createObjective() {
    if (!title.trim()) return
    setUploading(true)
    let proofUrl = null

    if (proofFile) {
      const ext = proofFile.name.split('.').pop()
      const path = `${room.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('objectives').upload(path, proofFile)
      if (!error) proofUrl = path
    }

    await supabase.from('objectives').insert({
      room_id: room.id,
      created_by: username,
      assigned_to: partner,
      title: title.trim(),
      description: description.trim() || null,
      proof_url: proofUrl,
    })

    setTitle('')
    setDescription('')
    setProofFile(null)
    setProofPreview(null)
    setShowForm(false)
    setUploading(false)
    notify(room.id, 'game', `t'a assigné un objectif "${title.trim()}" 🎯`, username)
  }

  async function toggleComplete(obj) {
    const newCompleted = !obj.completed
    const updates = {
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
    }
    await supabase.from('objectives').update(updates).eq('id', obj.id)
    setObjectives(prev => prev.map(o => o.id === obj.id ? { ...o, ...updates } : o))
  }

  async function addProof(obj) {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()
    const path = `${room.id}/${obj.id}.${ext}`
    const { error } = await supabase.storage.from('objectives').upload(path, file)
    if (!error) {
      await supabase.from('objectives').update({ proof_url: path }).eq('id', obj.id)
      setObjectives(prev => prev.map(o => o.id === obj.id ? { ...o, proof_url: path } : o))
    }
  }

  async function deleteObjective(obj) {
    if (obj.proof_url) await supabase.storage.from('objectives').remove([obj.proof_url])
    await supabase.from('objectives').delete().eq('id', obj.id)
    setObjectives(prev => prev.filter(o => o.id !== obj.id))
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setProofFile(file)
    const reader = new FileReader()
    reader.onload = () => setProofPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const mine = objectives.filter(o => o.assigned_to === username)
  const assigned = objectives.filter(o => o.created_by === username)
  const displayed = tab === 'mine' ? mine : assigned

  const mineDone = mine.filter(o => o.completed).length
  const assignedDone = assigned.filter(o => o.completed).length

  return (
    <div className="page objectives-page">
      <div className="page-header">
        <Target size={24} />
        <h2>Nos Objectifs</h2>
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm btn-secondary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      <div className="objectives-tabs">
        <button className={`objectives-tab ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>
          <User size={16} />
          Mes objectifs {mine.length > 0 && <span className="objectives-badge">{mineDone}/{mine.length}</span>}
        </button>
        <button className={`objectives-tab ${tab === 'assigned' ? 'active' : ''}`} onClick={() => setTab('assigned')}>
          <Target size={16} />
          Assignés {assigned.length > 0 && <span className="objectives-badge">{assignedDone}/{assigned.length}</span>}
        </button>
      </div>

      {showForm && (
        <div className="objectives-form">
          <div className="objectives-form-header">
            <h3>Créer un objectif pour {partner}</h3>
            <button className="btn-icon" onClick={() => { setShowForm(false); setTitle(''); setDescription(''); setProofFile(null); setProofPreview(null) }}>
              <X size={18} />
            </button>
          </div>
          <input
            className="objectives-input"
            placeholder="Titre de l'objectif..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
          <textarea
            className="objectives-textarea"
            placeholder="Description (optionnel)..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
          />

          {proofPreview && (
            <div className="objectives-preview">
              <img src={proofPreview} alt="Preview" />
              <button className="objectives-preview-remove" onClick={() => { setProofPreview(null); setProofFile(null) }}>
                <X size={14} />
              </button>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

          <div className="objectives-form-actions">
            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
              <Camera size={16} />
              Photo
            </button>
            <button className="btn btn-primary" onClick={createObjective} disabled={!title.trim() || uploading}>
              {uploading ? 'Envoi...' : <><Target size={16} /> Créer</>}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="objectives-list">
          {[1, 2, 3].map(i => <div key={i} className="objectives-skeleton" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Target size={48} />
          </div>
          <p>{tab === 'mine' ? 'Aucun objectif pour toi' : "Tu n'as assigné aucun objectif"}</p>
          <span style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
            {tab === 'mine' ? 'Ton partenaire peut t\'assigner des objectifs !' : 'Crée un objectif pour ton/ta partenaire'}
          </span>
        </div>
      ) : (
        <div className="objectives-list">
          {displayed.map(obj => {
            const isOwner = obj.created_by === username
            return (
              <div key={obj.id} className={`objective-card ${obj.completed ? 'completed' : ''}`}>
                <div className="objective-header">
                  <button
                    className={`objective-check ${obj.completed ? 'checked' : ''}`}
                    onClick={() => isOwner ? null : toggleComplete(obj)}
                    disabled={isOwner}
                  >
                    {obj.completed && <Check size={14} />}
                  </button>
                  <div className="objective-info">
                    <h4 className="objective-title">{obj.title}</h4>
                    {obj.description && <p className="objective-desc">{obj.description}</p>}
                    <small className="objective-meta">
                      {isOwner ? `Assigné à ${obj.assigned_to}` : `Créé par ${obj.created_by}`}
                      {obj.completed && obj.completed_at && ` · Terminé le ${new Date(obj.completed_at).toLocaleDateString('fr-FR')}`}
                    </small>
                  </div>
                  <div className="objective-actions">
                    {!isOwner && !obj.proof_url && (
                      <>
                        <input ref={el => { if (el && !el.dataset.bound) { el.dataset.bound = '1'; el.addEventListener('change', () => addProof(obj)); } }} type="file" accept="image/*" className="hidden" id={`proof-${obj.id}`} />
                        <button className="btn-icon" title="Ajouter une photo preuve" onClick={() => document.getElementById(`proof-${obj.id}`)?.click()}>
                          <Camera size={16} />
                        </button>
                      </>
                    )}
                    {isOwner && (
                      <button className="btn-icon btn-danger-icon" title="Supprimer" onClick={() => deleteObjective(obj)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {obj.proof_url && (
                  <div className="objective-proof">
                    <img src={getProofUrl(obj.proof_url)} alt="Preuve" />
                  </div>
                )}

                {obj.completed && (
                  <div className="objective-completed-badge">
                    <Check size={14} />
                    Terminé{obj.completed_at && ` le ${new Date(obj.completed_at).toLocaleDateString('fr-FR')}`}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
