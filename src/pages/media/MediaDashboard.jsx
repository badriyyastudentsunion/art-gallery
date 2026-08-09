// src/pages/media/MediaDashboard.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import './MediaDashboard.css'

const IconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

const IconYoutube = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
)

const IconImage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
)

const IconVideo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
)

const IconLogOut = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const IconLayers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
)

export default function MediaDashboard() {
  const { user, logout } = useAuth()
  
  const [mediaType, setMediaType] = useState('photo') // 'photo' | 'live' | 'video' | 'shorts'
  const [caption, setCaption] = useState('')
  const [link, setLink] = useState('')
  const [compTag, setCompTag] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([]) // Array of Base64 strings
  const [aspectRatio, setAspectRatio] = useState('original') // 'original' | '4:3' | '3:4'
  
  const [uploading, setUploading] = useState(false)
  const [mediaFeed, setMediaFeed] = useState([])
  const [competitions, setCompetitions] = useState([])
  const [toast, setToast] = useState(null)
  const [itemToDelete, setItemToDelete] = useState(null)

  // PNG Overlay States
  const [overlays, setOverlays] = useState({ overlay43: '', overlay34: '' })
  const [applyOverlay, setApplyOverlay] = useState(true)
  const [showOverlaySettings, setShowOverlaySettings] = useState(false)

  useEffect(() => {
    fetchMedia()
    fetchCompetitions()
    fetchOverlays()

    // Subscribe to events updates in real-time
    const ch = supabase.channel('media-dashboard-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.event_media' }, fetchMedia)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.gallery_overlays' }, fetchOverlays)
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function fetchMedia() {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'event_media')
        .maybeSingle()

      if (data?.value) {
        setMediaFeed(JSON.parse(data.value))
      } else {
        setMediaFeed([])
      }
    } catch (e) {
      console.error('Error fetching media feed:', e)
    }
  }

  async function fetchOverlays() {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'gallery_overlays')
        .maybeSingle()

      if (data?.value) {
        setOverlays(JSON.parse(data.value))
      }
    } catch (err) {
      console.error('Error fetching overlays:', err)
    }
  }

  const handleOverlayUpload = (key, file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please select a valid PNG/Image file.', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result
      const newOverlays = { ...overlays, [key]: base64 }
      setOverlays(newOverlays)
      try {
        await supabase
          .from('app_settings')
          .upsert({ key: 'gallery_overlays', value: JSON.stringify(newOverlays) })
        showToast('PNG Overlay frame saved successfully!')
      } catch (err) {
        console.error(err)
        showToast('Failed to save overlay to database.', 'error')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveOverlay = async (key) => {
    const newOverlays = { ...overlays, [key]: '' }
    setOverlays(newOverlays)
    try {
      await supabase
        .from('app_settings')
        .upsert({ key: 'gallery_overlays', value: JSON.stringify(newOverlays) })
      showToast('Overlay frame removed.')
    } catch (err) {
      console.error(err)
    }
  }

  async function fetchCompetitions() {
    try {
      const { data } = await supabase
        .from('competitions')
        .select('id, name')
        .order('name')
      if (data) setCompetitions(data)
    } catch (e) {
      console.error(e)
    }
  }

  // Helper to crop & resize a single image file on canvas (with PNG overlay support)
  const processSingleFile = (file, ratio) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onerror = reject
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let sourceX = 0
          let sourceY = 0
          let sourceWidth = img.width
          let sourceHeight = img.height

          let targetWidth = img.width
          let targetHeight = img.height

          if (ratio === '4:3') {
            const targetRatio = 4 / 3
            const imgRatio = img.width / img.height
            if (imgRatio > targetRatio) {
              sourceWidth = img.height * targetRatio
              sourceX = (img.width - sourceWidth) / 2
            } else {
              sourceHeight = img.width / targetRatio
              sourceY = (img.height - sourceHeight) / 2
            }
            targetWidth = 1600
            targetHeight = 1200
          } else if (ratio === '3:4') {
            const targetRatio = 3 / 4
            const imgRatio = img.width / img.height
            if (imgRatio > targetRatio) {
              sourceWidth = img.height * targetRatio
              sourceX = (img.width - sourceWidth) / 2
            } else {
              sourceHeight = img.width / targetRatio
              sourceY = (img.height - sourceHeight) / 2
            }
            targetWidth = 1200
            targetHeight = 1600
          } else {
            const maxDim = 1600
            let w = img.width
            let h = img.height
            if (w > h) {
              if (w > maxDim) {
                h = Math.round((h * maxDim) / w)
                w = maxDim
              }
            } else {
              if (h > maxDim) {
                w = Math.round((w * maxDim) / h)
                h = maxDim
              }
            }
            targetWidth = w
            targetHeight = h
          }

          canvas.width = targetWidth
          canvas.height = targetHeight
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight)

          // Check if PNG Overlay should be applied
          let overlaySrc = null
          if (applyOverlay) {
            if (ratio === '4:3' || targetWidth > targetHeight) {
              overlaySrc = overlays.overlay43 || overlays.overlay34
            } else {
              overlaySrc = overlays.overlay34 || overlays.overlay43
            }
          }

          if (overlaySrc) {
            const ovImg = new Image()
            ovImg.crossOrigin = 'anonymous'
            ovImg.onload = () => {
              ctx.drawImage(ovImg, 0, 0, targetWidth, targetHeight)
              const base64 = canvas.toDataURL('image/jpeg', 0.85)
              resolve(base64)
            }
            ovImg.onerror = () => {
              // Fallback if overlay fails to draw
              const base64 = canvas.toDataURL('image/jpeg', 0.85)
              resolve(base64)
            }
            ovImg.src = overlaySrc
          } else {
            const base64 = canvas.toDataURL('image/jpeg', 0.85)
            resolve(base64)
          }
        }
        img.src = event.target.result
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Handle files selection and add to active selection queue
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        showToast(`Skipped non-image file: ${file.name}`, 'error')
        return false
      }
      return true
    })
    setSelectedFiles(prev => [...prev, ...validFiles])
  }

  // Re-process all selected images when the file list, aspect ratio, or overlay toggle changes
  useEffect(() => {
    if (selectedFiles.length === 0) {
      setImagePreviews([])
      return
    }

    let isCurrent = true
    const processedList = []

    const processFiles = async () => {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        try {
          const ratioToUse = mediaType === 'photo' ? aspectRatio : 'original'
          const base64 = await processSingleFile(file, ratioToUse)
          if (isCurrent) {
            processedList.push(base64)
          }
        } catch (err) {
          console.error(err)
        }
      }
      if (isCurrent) {
        setImagePreviews(processedList)
      }
    }

    processFiles()

    return () => {
      isCurrent = false
    }
  }, [selectedFiles, aspectRatio, mediaType, applyOverlay, overlays])

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const isImageUpload = mediaType === 'photo' || mediaType === 'poster'

    if (isImageUpload && imagePreviews.length === 0) {
      showToast('Please select at least one photo.', 'error')
      return
    }

    if (!isImageUpload && !link.trim()) {
      showToast('Please enter the YouTube URL.', 'error')
      return
    }

    setUploading(true)

    try {
      // 1. Fetch current feed from DB to append to
      const { data } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'event_media')
        .maybeSingle()

      const currentFeed = data?.value ? JSON.parse(data.value) : []

      let newItems = []
      
      if (isImageUpload) {
        newItems = imagePreviews.map((imgBase64, idx) => ({
          id: Math.random().toString(36).substring(2, 9) + '-' + Date.now() + '-' + idx,
          type: mediaType,
          caption: caption.trim(),
          url: imgBase64,
          competition_id: compTag || null,
          uploader_name: user?.name || user?.username || 'Media Team',
          created_at: new Date().toISOString()
        }))
      } else {
        newItems = [{
          id: Math.random().toString(36).substring(2, 9) + '-' + Date.now(),
          type: mediaType,
          caption: caption.trim(),
          url: link.trim(),
          competition_id: compTag || null,
          uploader_name: user?.name || user?.username || 'Media Team',
          created_at: new Date().toISOString()
        }]
      }

      const updatedFeed = [...newItems, ...currentFeed]

      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'event_media', value: JSON.stringify(updatedFeed) })

      if (error) throw error

      // Reset form
      setCaption('')
      setLink('')
      setSelectedFiles([])
      setImagePreviews([])
      setCompTag('')
      
      setMediaFeed(updatedFeed)
      showToast('Media uploaded successfully!')
    } catch (err) {
      console.error(err)
      showToast(`Failed to upload: ${err.message}`, 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = (itemId) => {
    setItemToDelete(itemId)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    const targetId = itemToDelete
    setItemToDelete(null)

    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'event_media')
        .maybeSingle()

      if (!data?.value) return

      const currentFeed = JSON.parse(data.value)
      const filteredFeed = currentFeed.filter(item => item.id !== targetId)

      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'event_media', value: JSON.stringify(filteredFeed) })

      if (error) throw error

      setMediaFeed(filteredFeed)
      showToast('Media deleted successfully.')
    } catch (err) {
      console.error(err)
      showToast('Failed to delete media.', 'error')
    }
  }

  const getYoutubeId = (url) => {
    if (!url) return null
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
    const match = url.trim().match(regExp)
    return match ? match[1] : null
  }

  const renderFeedList = (items) => {
    if (items.length === 0) {
      return (
        <div style={{ padding: '14px', fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
          No items in this section
        </div>
      )
    }
    return items.map(item => {
      const isPhotoOrPoster = item.type === 'photo' || item.type === 'poster'
      const ytId = !isPhotoOrPoster ? getYoutubeId(item.url) : null
      const relatedCompName = competitions.find(c => c.id === item.competition_id)?.name

      return (
        <div key={item.id} className="med-feed-card" style={{ marginBottom: '6px' }}>
          {/* Media Thumbnail */}
          <div className="med-feed-thumbnail-box">
            {isPhotoOrPoster ? (
              <img src={item.url} alt="Photo" className="med-feed-thumbnail" />
            ) : ytId ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <img
                  src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                  alt="YouTube Preview"
                  className="med-feed-thumbnail"
                />
                <div className="med-play-overlay">
                  <span>▶</span>
                </div>
              </div>
            ) : (
              <div className="med-feed-thumbnail med-thumbnail-fallback">
                <span>🎥</span>
              </div>
            )}
          </div>

          {/* Media Info */}
          <div className="med-feed-info">
            <div className="med-feed-top-row">
              <span className={`med-badge-type ${item.type}`}>
                {item.type.toUpperCase()}
              </span>
              <span className="med-feed-time">
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="med-feed-caption" title={item.caption}>{item.caption}</p>
            {relatedCompName && (
              <span className="med-feed-tagged-comp" style={{ fontSize: '9px', opacity: 0.7 }}>🏷️ {relatedCompName}</span>
            )}
          </div>

          {/* Delete Action */}
          <button
            type="button"
            className="med-delete-btn"
            onClick={() => handleDelete(item.id)}
            title="Delete Update"
          >
            <IconTrash />
          </button>
        </div>
      )
    })
  }

  return (
    <div className="med-root">
      
      {/* ── Top Bar ── */}
      <header className="med-topbar">
        <div className="med-topbar-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/inspico-logo.svg" alt="Inspico Logo" style={{ height: 20, width: 20, filter: 'brightness(0) invert(1)', flexShrink: 0 }} />
            <img src="/inspico.svg" alt="Inspico" style={{ height: 15, maxWidth: 90 }} />
          </div>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
          <span className="med-topbar-name">{user?.name || user?.username || 'Media Team'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="med-logout-btn" onClick={logout}>
            <IconLogOut />
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <main className="med-container">
        
        {/* Left Side: Upload Form */}
        <section className="med-card med-form-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h2 className="med-section-title" style={{ margin: 0 }}>Upload New Media</h2>
            {mediaType === 'photo' && (
              <button
                type="button"
                onClick={() => setShowOverlaySettings(!showOverlaySettings)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <IconLayers />
                <span>{showOverlaySettings ? 'Hide Overlay Frames' : 'Manage PNG Frames'}</span>
                {(overlays.overlay34 || overlays.overlay43) && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                )}
              </button>
            )}
          </div>

          {/* Expandable PNG Overlay Settings Box (Photo tab only) */}
          {mediaType === 'photo' && showOverlaySettings && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconLayers />
                <span>PNG Frame Overlays</span>
              </h4>
              <p style={{ margin: '0 0 14px 0', fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                Upload transparent PNG frames to auto-overlay on photos.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* 3:4 Portrait Overlay */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                      Portrait (3:4)
                    </span>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                      1200 × 1600 px
                    </span>
                  </div>
                  {overlays.overlay34 ? (
                    <div style={{ position: 'relative' }}>
                      <img src={overlays.overlay34} alt="Overlay 3:4" style={{ width: '100%', height: '80px', objectFit: 'contain', background: '#000', borderRadius: '6px' }} />
                      <button
                        type="button"
                        onClick={() => handleRemoveOverlay('overlay34')}
                        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(239,68,68,0.8)', border: 'none', color: '#fff', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label style={{ display: 'block', textAlign: 'center', padding: '16px 8px', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                      Upload 3:4 PNG
                      <input type="file" accept="image/png" style={{ display: 'none' }} onChange={e => handleOverlayUpload('overlay34', e.target.files[0])} />
                    </label>
                  )}
                </div>

                {/* 4:3 Landscape Overlay */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                      Landscape (4:3)
                    </span>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                      1600 × 1200 px
                    </span>
                  </div>
                  {overlays.overlay43 ? (
                    <div style={{ position: 'relative' }}>
                      <img src={overlays.overlay43} alt="Overlay 4:3" style={{ width: '100%', height: '80px', objectFit: 'contain', background: '#000', borderRadius: '6px' }} />
                      <button
                        type="button"
                        onClick={() => handleRemoveOverlay('overlay43')}
                        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(239,68,68,0.8)', border: 'none', color: '#fff', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label style={{ display: 'block', textAlign: 'center', padding: '16px 8px', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                      Upload 4:3 PNG
                      <input type="file" accept="image/png" style={{ display: 'none' }} onChange={e => handleOverlayUpload('overlay43', e.target.files[0])} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="med-type-tabs">
            {[
              { id: 'photo', label: 'Photo', icon: <IconImage /> },
              { id: 'poster', label: 'Poster', icon: <IconImage /> },
              { id: 'live', label: 'Live Stream', icon: <IconYoutube /> },
              { id: 'video', label: 'Video Clip', icon: <IconVideo /> },
              { id: 'shorts', label: 'Shorts', icon: <IconYoutube /> }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                className={`med-type-btn ${mediaType === t.id ? 'active' : ''}`}
                onClick={() => { setMediaType(t.id); setLink(''); setSelectedFiles([]); setImagePreviews([]) }}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="med-form">
            <div className="med-field">
              <label className="med-label">Title / Caption (Optional)</label>
              <textarea
                className="med-input med-textarea"
                rows={2}
                placeholder="Write an optional caption or title..."
                value={caption}
                onChange={e => setCaption(e.target.value)}
                maxLength={200}
              />
            </div>

            {(mediaType === 'photo' || mediaType === 'poster') && (
              <>
                {/* PNG Frame Overlay Toggle (if overlay exists, photo tab only) */}
                {mediaType === 'photo' && (overlays.overlay34 || overlays.overlay43) && (
                  <div className="med-field" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                      <input
                        type="checkbox"
                        checked={applyOverlay}
                        onChange={e => setApplyOverlay(e.target.checked)}
                        style={{ accentColor: '#ef4444', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IconLayers />
                        <span>Attach Event PNG Frame Overlay</span>
                      </div>
                    </label>
                  </div>
                )}

                {/* Aspect Ratio Selector (Photo only) */}
                {mediaType === 'photo' && (
                  <div className="med-field">
                    <label className="med-label">Select Aspect Ratio</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[
                        { id: 'original', label: 'Original' },
                        { id: '4:3', label: '4:3 (Landscape)' },
                        { id: '3:4', label: '3:4 (Portrait)' }
                      ].map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setAspectRatio(r.id)}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: aspectRatio === r.id ? '1px solid #B8193C' : '1px solid rgba(255,255,255,0.08)',
                            background: aspectRatio === r.id ? 'rgba(184, 25, 60, 0.15)' : 'rgba(255,255,255,0.03)',
                            color: aspectRatio === r.id ? '#ff6b8a' : 'rgba(255,255,255,0.6)',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            transition: 'all 0.15s'
                          }}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="med-field">
                  <label className="med-label">{mediaType === 'poster' ? 'Poster Upload' : 'Photos Upload'} (Multiple allowed)</label>
                  <div className="med-upload-zone">
                    <label className="med-upload-label">
                      <IconUpload />
                      <span className="med-upload-title">Choose File(s)</span>
                      <span className="med-upload-sub">Supports JPEG, PNG</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple={true}
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>

                {/* Previews List */}
                {imagePreviews.length > 0 && (
                  <div className="med-field">
                    <label className="med-label">Selected Files ({imagePreviews.length})</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto', padding: '4px' }}>
                      {imagePreviews.map((imgBase64, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <img src={imgBase64} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(idx)}
                            style={{
                              position: 'absolute',
                              top: '2px',
                              right: '2px',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: 'rgba(0,0,0,0.7)',
                              color: '#fff',
                              border: 'none',
                              fontSize: '10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
              )}

            {(mediaType !== 'photo' && mediaType !== 'poster') && (
              <div className="med-field">
                <label className="med-label">
                  {mediaType === 'live' ? 'YouTube Live Link' : mediaType === 'shorts' ? 'YouTube Shorts Link' : 'YouTube Video Link'}
                </label>
                <input
                  type="url"
                  className="med-input"
                  placeholder="https://www.youtube.com/watch?v=... or shorts/..."
                  value={link}
                  onChange={e => setLink(e.target.value)}
                  required
                />
                {link && !getYoutubeId(link) && (
                  <p className="med-field-warning">⚠️ Please check if this is a valid YouTube link</p>
                )}
              </div>
            )}



            <button
              type="submit"
              className="med-submit-btn"
              disabled={uploading}
            >
              {uploading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <div className="spin" style={{ width: 14, height: 14, borderTopColor: '#fff' }} />
                  <span>Processing...</span>
                </div>
              ) : 'Publish Live Updates'}
            </button>
          </form>
        </section>

        {/* Right Side: Uploaded Feed separated by type sections */}
        <section className="med-card med-feed-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="med-feed-header" style={{ marginBottom: 0 }}>
            <h2 className="med-section-title" style={{ margin: 0 }}>Live Gallery Feed</h2>
            <span className="med-badge">{mediaFeed.length} items</span>
          </div>

          {/* 1. Live Broadcasts Subsection */}
          <div className="med-feed-subsection">
            <h3 style={{ fontSize: '11px', color: '#ff6b8a', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', margin: '0 0 10px 0' }}>
              🔴 Live Broadcasts ({mediaFeed.filter(i => i.type === 'live').length})
            </h3>
            <div className="med-feed-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {renderFeedList(mediaFeed.filter(i => i.type === 'live'))}
            </div>
          </div>

          {/* 2. Photos Subsection */}
          <div className="med-feed-subsection">
            <h3 style={{ fontSize: '11px', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', margin: '0 0 10px 0' }}>
              📸 Uploaded Photos ({mediaFeed.filter(i => i.type === 'photo').length})
            </h3>
            <div className="med-feed-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {renderFeedList(mediaFeed.filter(i => i.type === 'photo'))}
            </div>
          </div>

          {/* 3. Videos & Shorts Subsection */}
          <div className="med-feed-subsection">
            <h3 style={{ fontSize: '11px', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', margin: '0 0 10px 0' }}>
              🎥 Videos &amp; Shorts ({mediaFeed.filter(i => i.type === 'video' || i.type === 'shorts').length})
            </h3>
            <div className="med-feed-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {renderFeedList(mediaFeed.filter(i => i.type === 'video' || i.type === 'shorts'))}
            </div>
          </div>
        </section>

      </main>

      {/* Toast Alert */}
      {toast && (
        <div className={`med-toast ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#121218',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '380px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
            textAlign: 'center',
            animation: 'medModalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <IconTrash />
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#fff' }}>
              Delete Media Item?
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: '1.5' }}>
              Are you sure you want to delete this update? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                  transition: 'all 0.15s'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
