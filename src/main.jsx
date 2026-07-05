import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

const root = document.getElementById('root')
const splash = document.getElementById('splash')

try {
  const app = createRoot(root)
  app.render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
  if (splash) splash.style.display = 'none'
} catch (e) {
  if (splash) {
    splash.innerHTML = '<span style="color:#666;font-size:14px">Erreur de chargement</span>'
  }
  console.error(e)
}
