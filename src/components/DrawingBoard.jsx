import { useRef, useState, useEffect, useCallback } from 'react'
import { Pen, Eraser, Undo2, Redo2, Trash2, Palette, Download, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRoom } from '../context/RoomContext'
import { notify } from '../lib/notify'

const COLORS = ['#8a79ab', '#e8b4c8', '#e74c6f', '#4a90d9', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e74c3c', '#2c3e50']

export default function DrawingBoard() {
  const { room, username } = useRoom()
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#8a79ab')
  const [brushSize, setBrushSize] = useState(4)
  const [tool, setTool] = useState('pen')
  const [showColors, setShowColors] = useState(false)
  const [saved, setSaved] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const lastPoint = useRef(null)
  const historyRef = useRef([])
  const historyIndexRef = useRef(-1)

  function saveHistory() {
    const canvas = canvasRef.current
    if (!canvas) return
    const data = canvas.toDataURL()
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current.push(data)
    if (historyRef.current.length > 30) historyRef.current.shift()
    historyIndexRef.current = historyRef.current.length - 1
  }

  function undo() {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current--
    restoreHistory()
  }

  function redo() {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current++
    restoreHistory()
  }

  function restoreHistory() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
    }
    img.src = historyRef.current[historyIndexRef.current]
  }

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    }
  }, [])

  useEffect(() => {
    if (!room) return
    loadDrawings()
    initCanvas()
  }, [room])

  useEffect(() => {
    function resizeCanvas() {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      const rect = container.getBoundingClientRect()
      const ctx = canvas.getContext('2d')
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      canvas.width = rect.width
      canvas.height = rect.height
      ctx.putImageData(imageData, 0, 0)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  function initCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    historyRef.current = []
    historyIndexRef.current = -1
    saveHistory()
  }

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
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color
    }
    ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize
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
    const ctx = canvasRef.current.getContext('2d')
    ctx.globalCompositeOperation = 'source-over'
    saveHistory()
  }

  function clearCanvas() {
    const ctx = canvasRef.current.getContext('2d')
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    saveHistory()
  }

  async function saveDrawing() {
    setSaving(true)
    const dataUrl = canvasRef.current.toDataURL()
    await supabase.from('drawings').insert({ room_id: room.id, data_url: dataUrl })
    loadDrawings()
    setSaving(false)
    notify(room.id, 'drawing', 'a fait un dessin 🎨', username)
  }

  function loadDrawing(d) {
    const img = new Image()
    img.onload = () => {
      clearCanvas()
      canvasRef.current.getContext('2d').drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height)
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
        <Pen size={24} />
        <h2>Dessin Partagé</h2>
      </div>

      {/* Toolbar */}
      <div className="draw-toolbar">
        <button className={`draw-tool-btn ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')} title="Crayon">
          <Pen size={16} />
        </button>
        <button className={`draw-tool-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')} title="Gomme">
          <Eraser size={16} />
        </button>
        <div className="draw-separator" />
        <button className="draw-tool-btn" onClick={undo} disabled={tool === 'eraser'}>
          <Undo2 size={16} />
        </button>
        <button className="draw-tool-btn" onClick={redo} disabled={tool === 'eraser'}>
          <Redo2 size={16} />
        </button>
        <div className="draw-separator" />
        <button className={`draw-tool-btn ${showColors ? 'active' : ''}`} onClick={() => setShowColors(!showColors)}>
          <Palette size={16} />
        </button>
        <button className="draw-tool-btn draw-tool-danger" onClick={clearCanvas}>
          <Trash2 size={16} />
        </button>
        {saving && <span className="draw-saving">Sauvegarde...</span>}
        <div className="draw-toolbar-right">
          <div className="draw-size-preview" style={{ width: Math.max(4, brushSize), height: Math.max(4, brushSize) }} />
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={e => setBrushSize(Number(e.target.value))}
            className="draw-size-slider"
          />
        </div>
      </div>

      {/* Color picker */}
      {showColors && (
        <div className="draw-color-bar">
          {COLORS.map(c => (
            <button
              key={c}
              className={`draw-color-dot ${color === c && tool === 'pen' ? 'active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => { setColor(c); setTool('pen') }}
            />
          ))}
        </div>
      )}

      {/* Canvas */}
      <div className="draw-canvas-box" ref={containerRef}>
        <canvas
          ref={canvasRef}
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

      {/* Action buttons */}
      <div className="draw-actions">
        <button className="btn btn-sm btn-secondary" onClick={saveDrawing} disabled={saving}>
          <Save size={14} /> Sauver
        </button>
        <button className="btn btn-sm btn-secondary" onClick={downloadCurrent}>
          <Download size={14} /> Télécharger
        </button>
      </div>

      {/* Saved drawings */}
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
