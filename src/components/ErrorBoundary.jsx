import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      const splash = document.getElementById('splash')
      if (splash) {
        splash.style.display = 'flex'
        splash.innerHTML = '<span style="color:#666;font-size:14px;text-align:center;padding:20px">⚠ Erreur de rendu. Essaie de rouvrir l\'app.</span>'
        const root = document.getElementById('root')
        if (root) root.innerHTML = ''
      }
      return null
    }
    return this.props.children
  }
}
