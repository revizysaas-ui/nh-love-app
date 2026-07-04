import { useState } from 'react'
import { Settings as SettingsIcon, Heart, MapPin, Calendar, Save, Copy, Check, Search, Loader } from 'lucide-react'
import { useRoom } from '../context/RoomContext'

async function geocode(city) {
  if (!city.trim()) return null
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
    { headers: { 'User-Agent': 'NH-Love-App/1.0' } }
  )
  const data = await res.json()
  if (data.length === 0) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
}

export default function Settings() {
  const { room, updateRoom } = useRoom()
  const [form, setForm] = useState(room || {})
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [searching1, setSearching1] = useState(false)
  const [searching2, setSearching2] = useState(false)

  if (!room) return null

  function handleChange(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleGeocode(cityKey, latKey, lngKey, setSearching) {
    setSearching(true)
    const result = await geocode(form[cityKey])
    if (result) {
      setForm(prev => ({ ...prev, [latKey]: result.lat, [lngKey]: result.lng }))
    }
    setSearching(false)
  }

  async function handleSave() {
    await updateRoom({
      name1: form.name1,
      name2: form.name2,
      start_date: form.start_date,
      next_meeting: form.next_meeting,
      city1_name: form.city1_name,
      city1_lat: parseFloat(form.city1_lat) || 0,
      city1_lng: parseFloat(form.city1_lng) || 0,
      city2_name: form.city2_name,
      city2_lat: parseFloat(form.city2_lat) || 0,
      city2_lng: parseFloat(form.city2_lng) || 0,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function copyCode() {
    navigator.clipboard.writeText(room.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="page settings-page">
      <div className="page-header">
        <SettingsIcon size={24} />
        <h2>Paramètres</h2>
      </div>

      <div className="settings-card">
        <div className="settings-code">
          <span>Ton code secret</span>
          <button className="code-badge" onClick={copyCode}>
            {room.code} {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <small>Donne ce code à ta copine pour lier vos espaces</small>
        </div>
      </div>

      <div className="settings-card">
        <h3><Heart size={18} /> Vous deux</h3>
        <div className="settings-grid">
          <div className="field">
            <label>Ton prénom</label>
            <input value={form.name1} onChange={e => handleChange('name1', e.target.value)} />
          </div>
          <div className="field">
            <label>Son prénom</label>
            <input value={form.name2} onChange={e => handleChange('name2', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h3><Calendar size={18} /> Dates</h3>
        <div className="settings-grid">
          <div className="field">
            <label>Début de la relation</label>
            <input type="date" value={form.start_date} onChange={e => handleChange('start_date', e.target.value)} />
          </div>
          <div className="field">
            <label>Prochaines retrouvailles</label>
            <input type="date" value={form.next_meeting} onChange={e => handleChange('next_meeting', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h3><MapPin size={18} /> Villes</h3>
        <div className="settings-grid">
          <div className="field">
            <label>Ta ville</label>
            <div className="field-row">
              <input
                value={form.city1_name}
                onChange={e => handleChange('city1_name', e.target.value)}
                placeholder="Ex: Paris, France"
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => handleGeocode('city1_name', 'city1_lat', 'city1_lng', setSearching1)}
                disabled={searching1}
              >
                {searching1 ? <Loader size={14} /> : <Search size={14} />}
              </button>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Latitude</label>
              <input type="number" step="any" value={form.city1_lat} onChange={e => handleChange('city1_lat', e.target.value)} />
            </div>
            <div className="field">
              <label>Longitude</label>
              <input type="number" step="any" value={form.city1_lng} onChange={e => handleChange('city1_lng', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Sa ville</label>
            <div className="field-row">
              <input
                value={form.city2_name}
                onChange={e => handleChange('city2_name', e.target.value)}
                placeholder="Ex: New York, USA"
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => handleGeocode('city2_name', 'city2_lat', 'city2_lng', setSearching2)}
                disabled={searching2}
              >
                {searching2 ? <Loader size={14} /> : <Search size={14} />}
              </button>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Latitude</label>
              <input type="number" step="any" value={form.city2_lat} onChange={e => handleChange('city2_lat', e.target.value)} />
            </div>
            <div className="field">
              <label>Longitude</label>
              <input type="number" step="any" value={form.city2_lng} onChange={e => handleChange('city2_lng', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <button className="btn btn-primary btn-full btn-lg" onClick={handleSave}>
        <Save size={20} />
        {saved ? 'Enregistré !' : 'Enregistrer'}
      </button>
    </div>
  )
}
