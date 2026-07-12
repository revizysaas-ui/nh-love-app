import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

window.onerror = function(msg, url, line, col, err) {
  var el = document.getElementById('splash') || document.getElementById('root')
  var text = err && err.message ? err.message.slice(0,80) : (msg || 'Erreur').slice(0,80)
  if (el) el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;background:#f8f7fa;font-family:-apple-system,sans-serif;text-align:center"><div><p style="font-size:14px;color:#666;margin-bottom:8px">⚠ ' + text + '</p><p style="font-size:12px;color:#999">Ferme et rouvre l\'app</p></div></div>'
  return true
}

try {
  createRoot(document.getElementById('root')).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  )
} catch (e) {
  var el = document.getElementById('splash') || document.getElementById('root')
  if (el) el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;background:#f8f7fa;font-family:-apple-system,sans-serif;text-align:center"><div><p style="font-size:14px;color:#666;margin-bottom:8px">⚠ ' + (e.message || 'Erreur').slice(0,80) + '</p><p style="font-size:12px;color:#999">Ferme et rouvre l\'app</p></div></div>'
}
