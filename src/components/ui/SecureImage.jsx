import { useState, useEffect, useRef } from 'react'

export default function SecureImage({ url, alt, className, style, onClick }) {
  const canvasRef = useRef(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!url || !canvasRef.current) return
    let cancelled = false
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        if (cancelled) return
        const img = new Image()
        img.onload = () => {
          if (cancelled) return
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          ctx.drawImage(img, 0, 0)
          setLoaded(true)
        }
        img.src = URL.createObjectURL(blob)
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [url])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ ...style, display: loaded ? 'block' : 'none' }}
      onClick={onClick}
      onContextMenu={e => e.preventDefault()}
      onDragStart={e => e.preventDefault()}
    />
  )
}
