import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('Boundary:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:20, background:'#f8f7fa', fontFamily:'-apple-system, sans-serif', textAlign:'center' }}>
          <div>
            <p style={{ fontSize:14, color:'#666', marginBottom:8 }}>⚠ Erreur</p>
            <p style={{ fontSize:12, color:'#999', wordBreak:'break-all' }}>{this.state.error.message || String(this.state.error)}</p>
            <button onClick={function(){ window.location.href = '/' }} style={{ marginTop:16, padding:'10px 24px', border:'none', borderRadius:8, background:'#8a79ab', color:'#fff', fontSize:14, cursor:'pointer' }}>Recharger</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
