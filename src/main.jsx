import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

const root = createRoot(document.getElementById('root'))
root.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Remove splash once React has committed
requestAnimationFrame(() => {
  const splash = document.getElementById('splash')
  if (splash) {
    splash.style.transition = 'opacity 0.3s'
    splash.style.opacity = '0'
    setTimeout(() => splash.remove(), 300)
  }
})
