// src/pages/admin/sections/MediaSection.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import './competitions.css' // Reuse general admin forms and list styles

const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

export default function MediaSection() {
  const [activeTab, setActiveTab] = useState('uploaders') // 'uploaders' | 'moderation'
  const [uploaders, setUploaders] = useState([])
  const [mediaItems, setMediaItems] = useState([])
  
  // New Uploader form state
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchUploaders()
    fetchMedia()
  }, [])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function fetchUploaders() {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'media_uploaders')
        .maybeSingle()
      if (data?.value) {
        setUploaders(JSON.parse(data.value))
      } else {
        setUploaders([])
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function fetchMedia() {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'event_media')
        .maybeSingle()
      if (data?.value) {
        setMediaItems(JSON.parse(data.value))
      } else {
        setMediaItems([])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddUploader = async (e) => {
    e.preventDefault()
    if (!name.trim() || !username.trim() || !password.trim()) {
      showToast('Please fill all fields.', 'error')
      return
    }

    setLoading(true)
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'media_uploaders')
        .maybeSingle()

      const currentUploaders = data?.value ? JSON.parse(data.value) : []

      if (currentUploaders.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
        showToast('Username already exists.', 'error')
        setLoading(false)
        return
      }

      const newUploader = {
        id: Math.random().toString(36).substring(2, 9) + '-' + Date.now(),
        name: name.trim(),
        username: username.trim().toLowerCase(),
        password: password.trim(),
        created_at: new Date().toISOString()
      }

      const updatedUploaders = [...currentUploaders, newUploader]

      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'media_uploaders', value: JSON.stringify(updatedUploaders) })

      if (error) throw error

      setUploaders(updatedUploaders)
      setName('')
      setUsername('')
      setPassword('')
      setFormOpen(false)
      showToast('Media Uploader account created successfully!')
    } catch (err) {
      console.error(err)
      showToast(`Failed: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUploader = async (uploaderId) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return

    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'media_uploaders')
        .maybeSingle()

      if (!data?.value) return

      const currentUploaders = JSON.parse(data.value)
      const filteredUploaders = currentUploaders.filter(u => u.id !== uploaderId)

      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'media_uploaders', value: JSON.stringify(filteredUploaders) })

      if (error) throw error

      setUploaders(filteredUploaders)
      showToast('Account deleted successfully.')
    } catch (err) {
      console.error(err)
      showToast('Failed to delete account.', 'error')
    }
  }

  const handleDeleteMedia = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this media item?')) return

    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'event_media')
        .maybeSingle()

      if (!data?.value) return

      const currentFeed = JSON.parse(data.value)
      const filteredFeed = currentFeed.filter(item => item.id !== itemId)

      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'event_media', value: JSON.stringify(filteredFeed) })

      if (error) throw error

      setMediaItems(filteredFeed)
      showToast('Media item deleted.')
    } catch (err) {
      console.error(err)
      showToast('Failed to delete media item.', 'error')
    }
  }

  const filteredMedia = mediaItems.filter(item =>
    item.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.uploader_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={`section-root${formOpen ? ' panel-open' : ''}`}>
      <div className="section-list">
        {/* Header bar */}
        <div className="sect-header" style={{ marginBottom: 16 }}>
          <h2 className="sect-title">Media & Uploaders</h2>
        </div>

        {/* Tabs selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 10 }}>
          <button
            className={`tab-pill ${activeTab === 'uploaders' ? 'active' : ''}`}
            onClick={() => { setActiveTab('uploaders'); setFormOpen(false) }}
            style={{ background: activeTab === 'uploaders' ? 'rgba(79, 156, 249, 0.15)' : 'transparent', border: 'none', color: activeTab === 'uploaders' ? '#4f9cf9' : 'rgba(255,255,255,0.6)', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Staff Logins
          </button>
          <button
            className={`tab-pill ${activeTab === 'moderation' ? 'active' : ''}`}
            onClick={() => { setActiveTab('moderation'); setFormOpen(false) }}
            style={{ background: activeTab === 'moderation' ? 'rgba(79, 156, 249, 0.15)' : 'transparent', border: 'none', color: activeTab === 'moderation' ? '#4f9cf9' : 'rgba(255,255,255,0.6)', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Moderate Gallery ({mediaItems.length})
          </button>
        </div>

        {/* TAB 1: Uploader Accounts list */}
        {activeTab === 'uploaders' && (
          <>
            <div className="list-header">
              <span className="list-title">All Uploaders</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="list-count">{uploaders.length} total</span>
                <button
                  className="btn-submit"
                  onClick={() => { setFormOpen(true); setPassword('') }}
                >
                  <IconPlus /> Add
                </button>
              </div>
            </div>
            <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Password</th>
                  <th>Created At</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploaders.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '24px 0' }}>
                      No media uploader accounts created yet.
                    </td>
                  </tr>
                ) : (
                  uploaders.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="part-avatar" style={{ background: 'rgba(79, 156, 249, 0.1)', color: '#4f9cf9', width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                            {u.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span style={{ fontWeight: 600 }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#4f9cf9' }}>{u.username}</td>
                      <td style={{ fontFamily: 'monospace' }}>{u.password}</td>
                      <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <button className="row-action-btn delete" onClick={() => handleDeleteUploader(u.id)} title="Delete Account">
                          <IconTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

        {/* TAB 2: Media Moderation feed */}
        {activeTab === 'moderation' && (
          <div>
            {/* Search bar */}
            <div className="search-bar" style={{ marginBottom: 18, background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconSearch />
              <input
                type="text"
                placeholder="Search by caption, uploader, or type..."
                className="search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, flex: 1, outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
              {filteredMedia.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40 }}>
                  No media items matching search.
                </div>
              ) : (
                filteredMedia.map(item => {
                  const isPhoto = item.type === 'photo' || item.type === 'poster'
                  const youtubeId = !isPhoto ? item.url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/)?.[2] : null

                  return (
                    <div key={item.id} className="comp-card" style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden', padding: 0 }}>
                      {/* Media Display Area */}
                      <div style={{ height: 160, width: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                        {isPhoto ? (
                          <img src={item.url} alt="Uploaded Event" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : youtubeId ? (
                          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <img src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`} alt="YT Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'red', color: '#fff', width: 44, height: 30, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900 }}>▶</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 24 }}>🎥</span>
                        )}
                        
                        {/* Floating type badge */}
                        <span style={{ position: 'absolute', top: 10, left: 10, background: item.type === 'photo' ? '#818cf8' : '#f87171', color: '#fff', fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {item.type}
                        </span>
                      </div>

                      {/* Card Content info */}
                      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }} title={item.caption}>
                          {item.caption}
                        </p>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                          <span>By: {item.uploader_name}</span>
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>

                        <button
                          className="btn-secondary"
                          onClick={() => handleDeleteMedia(item.id)}
                          style={{ marginTop: 8, width: '100%', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          <IconTrash />
                          Remove Media
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Side sliding panel */}
      <div className="section-form-panel">
        <div className="form-panel-header">
          <p className="form-panel-title">Add Uploader</p>
          <button className="btn-cancel-edit" onClick={() => setFormOpen(false)}>✕</button>
        </div>
        <form onSubmit={handleAddUploader} autoComplete="off">
          <div className="form-fields">
            <div className="field">
              <label className="field-lbl">Full Name</label>
              <input className="field-inp" placeholder="e.g. Media Team Lead" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label className="field-lbl">Username</label>
              <input className="field-inp" placeholder="e.g. media1" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div className="field">
              <label className="field-lbl">Password</label>
              <input className="field-inp" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn-submit" type="submit" disabled={loading}>
              {loading ? <span className="spin" /> : <IconPlus />}
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div className={`med-toast ${toast.type}`} style={{ position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 999999, background: toast.type === 'error' ? '#dc2626' : '#059669', color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}
