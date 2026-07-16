import { useState, useEffect } from 'react'

export default function SecureImage({ url, alt, className, style, onClick, loading }) {
  const [blobUrl, setBlobUrl] = useState(null)

  useEffect(() => {
    if (!url) return
    let cancelled = false
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        if (!cancelled) setBlobUrl(URL.createObjectURL(blob))
      })
      .catch(() => {
        if (!cancelled) setBlobUrl(url)
      })
    return () => {
      cancelled = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [url])

  if (!blobUrl) return <div className={className} style={{ ...style, background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />

  return (
    <img
      src={blobUrl}
      alt={alt || ''}
      className={className}
      style={style}
      onClick={onClick}
      loading={loading}
    />
  )
}
