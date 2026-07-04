import { useRef, useState, useEffect, useCallback } from 'react'
import { PenLine, Trash2, Download, Save, Minus, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'
import { notify } from '../lib/notify'

const COLORS = ['#e25555', '#ff6b6b', '#ffa07a', '#ffd700', '#98fb98', '#60a5fa', '#c084fc', '#2d2d2d']

export default function DrawingBoard() {
  const { room, username } = useRoom()
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#e25555')
  const [brushSize, setBrushSize] = useState(4)
  const [saved, setSaved] = useState([])
  const [loading, setLoading] = useState(true)
  const lastPoint = useRef(null)

  const getPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (clientY - rect.top) * (canvasRef.current.height / rect.height),
    }
  }, [])

  useEffect(() => {
    if (!room) return
    loadDrawings()
    clearCanvas()
  }, [room])

  async function loadDrawings() {
    const { data } = await supabase
      .from('drawings')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
    if (data) setSaved(data)
    setLoading(false)
  }

  function startDraw(e) {
    e.preventDefault()
    const pos = getPos(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
    lastPoint.current = pos
  }

  function draw(e) {
    e.preventDefault()
    if (!isDrawing) return
    const pos = getPos(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.strokeStyle = color
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPoint.current = pos
  }

  function stopDraw(e) {
    if (e) e.preventDefault()
    setIsDrawing(false)
    lastPoint.current = null
  }

  function clearCanvas() {
    const ctx = canvasRef.current.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  async function saveDrawing() {
    const dataUrl = canvasRef.current.toDataURL()
    await supabase.from('drawings').insert({ room_id: room.id, data_url: dataUrl })
    loadDrawings()
    notify(room.id, 'drawing', 'a fait un dessin 🎨', username)
  }

  function loadDrawing(d) {
    const img = new Image()
    img.onload = () => {
      clearCanvas()
      canvasRef.current.getContext('2d').drawImage(img, 0, 0)
    }
    img.src = d.data_url
  }

  async function deleteDrawing(id) {
    await supabase.from('drawings').delete().eq('id', id)
    setSaved(prev => prev.filter(d => d.id !== id))
  }

  function downloadCurrent() {
    const link = document.createElement('a')
    link.download = `nh-dessin-${Date.now()}.png`
    link.href = canvasRef.current.toDataURL()
    link.click()
  }

  return (
    <div className="page drawing-page">
      <div className="page-header">
        <PenLine size={24} />
        <h2>Dessin Partagé</h2>
      </div>

      <div className="drawing-tools">
        <div className="tool-group">
          {COLORS.map(c => (
            <button key={c} className={`color-dot ${color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>
        <div className="tool-group">
          <button className="btn-icon" onClick={() => setBrushSize(s => Math.max(2, s - 2))}><Minus size={16} /></button>
          <span className="brush-label">{brushSize}px</span>
          <button className="btn-icon" onClick={() => setBrushSize(s => Math.min(20, s + 2))}><Plus size={16} /></button>
        </div>
        <div className="tool-group">
          <button className="btn btn-sm" onClick={clearCanvas}><Trash2 size={14} /> Effacer</button>
          <button className="btn btn-sm" onClick={saveDrawing}><Save size={14} /> Sauver</button>
          <button className="btn btn-sm" onClick={downloadCurrent}><Download size={14} /> Télécharger</button>
        </div>
      </div>

      <div className="canvas-box">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="drawing-canvas"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>

      {!loading && saved.length > 0 && (
        <div className="saved-section">
          <h3>Dessins sauvegardés</h3>
          <div className="saved-grid">
            {saved.map(d => (
              <div key={d.id} className="saved-thumb">
                <img src={d.data_url} alt="" onClick={() => loadDrawing(d)} />
                <small>{new Date(d.created_at).toLocaleDateString('fr-FR')}</small>
                <button className="btn-icon btn-danger-icon" onClick={() => deleteDrawing(d.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
