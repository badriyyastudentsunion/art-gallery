// src/pages/media/MediaDashboard.jsx
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import './MediaDashboard.css'

/* ── SVG Icons ─────────────────────────────────────────── */
const Ico = ({ d, w = 24, h = 24, fill = 'none', sw = 2 }) => (
  <svg viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={w} height={h}>
    {Array.isArray(d) ? d.map((el, i) => {
      const [tag, props] = el
      if (tag === 'path')    return <path key={i} {...props} />
      if (tag === 'line')    return <line key={i} {...props} />
      if (tag === 'polyline') return <polyline key={i} {...props} />
      if (tag === 'polygon') return <polygon key={i} {...props} />
      if (tag === 'rect')    return <rect key={i} {...props} />
      if (tag === 'circle')  return <circle key={i} {...props} />
      return null
    }) : <path d={d} />}
  </svg>
)

const IconUpload   = ({ s = 20 }) => <Ico w={s} h={s} d={[['path',{d:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'}],['polyline',{points:'17 8 12 3 7 8'}],['line',{x1:'12',y1:'3',x2:'12',y2:'15'}]]} />
const IconImage    = ({ s = 16 }) => <Ico w={s} h={s} d={[['rect',{x:'3',y:'3',width:'18',height:'18',rx:'2'}],['circle',{cx:'8.5',cy:'8.5',r:'1.5'}],['polyline',{points:'21 15 16 10 5 21'}]]} />
const IconPoster   = ({ s = 16 }) => <Ico w={s} h={s} d={[['rect',{x:'4',y:'2',width:'16',height:'20',rx:'2'}],['line',{x1:'8',y1:'7',x2:'16',y2:'7'}],['line',{x1:'8',y1:'11',x2:'16',y2:'11'}],['line',{x1:'8',y1:'15',x2:'13',y2:'15'}]]} />
const IconYoutube  = ({ s = 16 }) => <Ico w={s} h={s} d={[['path',{d:'M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z'}],['polygon',{points:'9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02'}]]} />
const IconVideo    = ({ s = 16 }) => <Ico w={s} h={s} d={[['polygon',{points:'23 7 16 12 23 17 23 7'}],['rect',{x:'1',y:'5',width:'15',height:'14',rx:'2'}]]} />
const IconTrash    = ({ s = 14 }) => <Ico w={s} h={s} d={[['polyline',{points:'3 6 5 6 21 6'}],['path',{d:'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'}],['line',{x1:'10',y1:'11',x2:'10',y2:'17'}],['line',{x1:'14',y1:'11',x2:'14',y2:'17'}]]} />
const IconLogOut   = ({ s = 15 }) => <Ico w={s} h={s} d={[['path',{d:'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'}],['polyline',{points:'16 17 21 12 16 7'}],['line',{x1:'21',y1:'12',x2:'9',y2:'12'}]]} />
const IconLayers   = ({ s = 13 }) => <Ico w={s} h={s} d={[['polygon',{points:'12 2 2 7 12 12 22 7 12 2'}],['polyline',{points:'2 17 12 22 22 17'}],['polyline',{points:'2 12 12 17 22 12'}]]} />
const IconSearch   = ({ s = 14 }) => <Ico w={s} h={s} d={[['circle',{cx:'11',cy:'11',r:'8'}],['line',{x1:'21',y1:'21',x2:'16.65',y2:'16.65'}]]} />
const IconCheck    = ({ s = 11 }) => <Ico w={s} h={s} sw={2.5} d={[['polyline',{points:'20 6 9 17 4 12'}]]} />
const IconX        = ({ s = 13 }) => <Ico w={s} h={s} sw={2.5} d={[['line',{x1:'18',y1:'6',x2:'6',y2:'18'}],['line',{x1:'6',y1:'6',x2:'18',y2:'18'}]]} />
const IconChevL    = ({ s = 16 }) => <Ico w={s} h={s} sw={2.5} d={[['polyline',{points:'15 18 9 12 15 6'}]]} />
const IconChevR    = ({ s = 16 }) => <Ico w={s} h={s} sw={2.5} d={[['polyline',{points:'9 18 15 12 9 6'}]]} />
const IconRadio    = ({ s = 15 }) => <Ico w={s} h={s} d={[['circle',{cx:'12',cy:'12',r:'2'}],['path',{d:'M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14'}]]} />
const IconRefresh  = ({ s = 14 }) => <Ico w={s} h={s} d={[['polyline',{points:'23 4 23 10 17 10'}],['path',{d:'M20.49 15a9 9 0 1 1-2.12-9.36L23 10'}]]} />
const IconGrid     = ({ s = 15 }) => <Ico w={s} h={s} d={[['rect',{x:'3',y:'3',width:'7',height:'7'}],['rect',{x:'14',y:'3',width:'7',height:'7'}],['rect',{x:'3',y:'14',width:'7',height:'7'}],['rect',{x:'14',y:'14',width:'7',height:'7'}]]} />
const IconWarn     = ({ s = 20 }) => <Ico w={s} h={s} d={[['path',{d:'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'}],['line',{x1:'12',y1:'9',x2:'12',y2:'13'}],['line',{x1:'12',y1:'17',x2:'12.01',y2:'17'}]]} />
const IconPlay     = ({ s = 18 }) => <Ico w={s} h={s} fill="currentColor" d={[['polygon',{points:'5 3 19 12 5 21 5 3'}]]} />
const IconTag      = ({ s = 10 }) => <Ico w={s} h={s} d={[['path',{d:'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z'}],['line',{x1:'7',y1:'7',x2:'7.01',y2:'7'}]]} />
const IconSelAll   = ({ s = 13 }) => <Ico w={s} h={s} d={[['rect',{x:'3',y:'3',width:'18',height:'18',rx:'2'}],['polyline',{points:'9 11 12 14 22 4'}]]} />

const PAGE_SIZE = 24

const TYPES = [
  { id: 'photo',  label: 'Photo',  Icon: IconImage },
  { id: 'poster', label: 'Poster', Icon: IconPoster },
  { id: 'live',   label: 'Live',   Icon: IconRadio },
  { id: 'video',  label: 'Video',  Icon: IconVideo },
  { id: 'shorts', label: 'Shorts', Icon: IconYoutube },
]
const FILTERS = [
  { id: 'all',    label: 'All' },
  { id: 'photo',  label: 'Photos' },
  { id: 'poster', label: 'Posters' },
  { id: 'live',   label: 'Live' },
  { id: 'video',  label: 'Video' },
  { id: 'shorts', label: 'Shorts' },
]

function relTime(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return m + 'm ago'
  const h = Math.floor(m / 60)
  if (h < 24) return h + 'h ago'
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function detectRatio(w, h) {
  const r = w / h
  if (r >= 1.15) return '4:3'
  if (r <= 0.87) return '3:4'
  return 'original'
}

function ratioPaddingTop(ratio, tw, th) {
  if (ratio === '3:4')     return '133.33%'
  if (ratio === '4:3')     return '75%'
  if (tw && th)            return (th / tw * 100).toFixed(2) + '%'
  return '75%'
}

export default function MediaDashboard() {
  const { user, logout } = useAuth()

  // Upload state
  const [mediaType,     setMediaType]     = useState('photo')
  const [caption,       setCaption]       = useState('')
  const [link,          setLink]          = useState('')
  const [compTag,       setCompTag]       = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [aspectRatio,   setAspectRatio]   = useState('auto')
  const [uploading,     setUploading]     = useState(false)

  // Overlay
  const [overlays,         setOverlays]         = useState({ overlay43: '', overlay34: '' })
  const [applyOverlay,     setApplyOverlay]      = useState(true)
  const [showOverlayPanel, setShowOverlayPanel]  = useState(false)

  // Library
  const [mediaFeed,      setMediaFeed]      = useState([])
  const [competitions,   setCompetitions]   = useState([])
  const [libFilter,      setLibFilter]      = useState('all')
  const [libSearch,      setLibSearch]      = useState('')
  const [currentPage,    setCurrentPage]    = useState(1)
  const [selectedItems,  setSelectedItems]  = useState(new Set())
  const [bulkMode,       setBulkMode]       = useState(false)
  const [confirmDel,     setConfirmDel]     = useState(null)

  // UI
  const [activePanel, setActivePanel] = useState('upload')
  const [toast,       setToast]       = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchMedia(); fetchCompetitions(); fetchOverlays()
    const ch = supabase.channel('media-db-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_media' }, fetchMedia)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.gallery_overlays' }, fetchOverlays)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  async function fetchMedia() {
    try {
      const { data } = await supabase
        .from('gallery_media')
        .select('id,type,caption,thumb_url,hd_url,competition_id,uploader_name,created_at')
        .order('created_at', { ascending: false })
      setMediaFeed(data ? data.map(i => ({ ...i, thumbUrl: i.thumb_url, url: i.hd_url || i.thumb_url })) : [])
    } catch {}
  }

  async function fetchOverlays() {
    try {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'gallery_overlays').maybeSingle()
      if (data?.value) setOverlays(JSON.parse(data.value))
    } catch {}
  }

  async function fetchCompetitions() {
    try {
      const { data } = await supabase.from('competitions').select('id,name').order('name')
      if (data) setCompetitions(data)
    } catch {}
  }

  // Overlay handlers
  const handleOverlayUpload = async (key, file) => {
    if (!file?.type.startsWith('image/')) return
    try {
      const path = `overlays/${key}_${Date.now()}.png`
      const { error } = await supabase.storage.from('event-media').upload(path, file, { upsert: true })
      if (error) throw error
      const url = supabase.storage.from('event-media').getPublicUrl(path).data.publicUrl
      const next = { ...overlays, [key]: url }
      setOverlays(next)
      await supabase.from('app_settings').upsert({ key: 'gallery_overlays', value: JSON.stringify(next) })
      showToast('Overlay uploaded.')
    } catch (e) { showToast('Upload failed: ' + e.message, 'error') }
  }
  const handleRemoveOverlay = async (key) => {
    const next = { ...overlays, [key]: '' }
    setOverlays(next)
    try { await supabase.from('app_settings').upsert({ key: 'gallery_overlays', value: JSON.stringify(next) }) } catch {}
    showToast('Overlay removed.')
  }

  // Image processing
  const processSingleFile = (file, ratio) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let sx = 0, sy = 0, sw = img.width, sh = img.height, tw, th

        if (ratio === '4:3') {
          const ir = img.width / img.height
          if (ir > 4/3) { sw = img.height * 4/3; sx = (img.width - sw) / 2 }
          else { sh = img.width / (4/3); sy = (img.height - sh) / 2 }
          tw = 1600; th = 1200
        } else if (ratio === '3:4') {
          const ir = img.width / img.height
          if (ir > 3/4) { sw = img.height * 3/4; sx = (img.width - sw) / 2 }
          else { sh = img.width / (3/4); sy = (img.height - sh) / 2 }
          tw = 1200; th = 1600
        } else {
          const mx = 1920
          let w = img.width, h = img.height
          if (w > h) { if (w > mx) { h = Math.round(h * mx / w); w = mx } }
          else { if (h > mx) { w = Math.round(w * mx / h); h = mx } }
          tw = w; th = h
        }

        canvas.width = tw; canvas.height = th
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th)

        let overlaySrc = null
        if (applyOverlay && mediaType === 'photo') {
          // Only apply overlay if the EXACT matching ratio overlay exists — no cross-ratio fallback
          if (ratio === '4:3' || tw > th) {
            overlaySrc = overlays.overlay43 || null
          } else {
            overlaySrc = overlays.overlay34 || null
          }
        }

        const buildResult = cvs => {
          const fullUrl = cvs.toDataURL('image/jpeg', 0.92)
          const tC = document.createElement('canvas')
          const mx = 400
          let tW = cvs.width, tH = cvs.height
          if (tW > tH) { if (tW > mx) { tH = Math.round(tH * mx / tW); tW = mx } }
          else { if (tH > mx) { tW = Math.round(tW * mx / tH); tH = mx } }
          tC.width = tW; tC.height = tH
          tC.getContext('2d').drawImage(cvs, 0, 0, tW, tH)
          const thumbUrl = tC.toDataURL('image/jpeg', 0.5)
          const outRatio = ratio === 'original' ? detectRatio(tw, th) : ratio
          const overlayApplied = !!overlaySrc
          return { fullUrl, thumbUrl, outRatio, tw, th, overlayApplied }
        }

        if (overlaySrc) {
          const ov = new Image(); ov.crossOrigin = 'anonymous'
          ov.onload = () => { ctx.drawImage(ov, 0, 0, tw, th); resolve(buildResult(canvas)) }
          ov.onerror = () => resolve(buildResult(canvas))
          ov.src = overlaySrc
        } else resolve(buildResult(canvas))
      }
      img.src = ev.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const detectFileRatio = file => new Promise(res => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { res(detectRatio(img.width, img.height)); URL.revokeObjectURL(url) }
    img.onerror = () => { res('original'); URL.revokeObjectURL(url) }
    img.src = url
  })

  const handleImageChange = async e => {
    const files = Array.from(e.target.files || []).filter(f => {
      if (!f.type.startsWith('image/')) { showToast(f.name + ' is not an image.', 'error'); return false }
      return true
    })
    const withRatio = await Promise.all(files.map(async f => {
      f.detectedRatio = await detectFileRatio(f); return f
    }))
    setSelectedFiles(prev => [...prev, ...withRatio])
    if (e.target) e.target.value = ''
  }

  useEffect(() => {
    if (!selectedFiles.length) { setImagePreviews([]); return }
    let alive = true; const out = [];
    (async () => {
      for (const f of selectedFiles) {
        const ratio = aspectRatio === 'auto' ? (f.detectedRatio || 'original') : aspectRatio
        try { const r = await processSingleFile(f, ratio); if (alive) out.push(r) } catch {}
      }
      if (alive) setImagePreviews([...out])
    })()
    return () => { alive = false }
  }, [selectedFiles, aspectRatio, mediaType, applyOverlay, overlays])

  const removeFile = idx => setSelectedFiles(p => p.filter((_, i) => i !== idx))

  const dataURLtoBlob = url => {
    const [h, d] = url.split(','); const mime = h.match(/:(.*?);/)[1]
    const b = atob(d); let n = b.length; const u = new Uint8Array(n)
    while (n--) u[n] = b.charCodeAt(n); return new Blob([u], { type: mime })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const isImg = mediaType === 'photo' || mediaType === 'poster'
    if (isImg && !imagePreviews.length) { showToast('Select at least one image.', 'error'); return }
    if (!isImg && !link.trim()) { showToast('Enter a YouTube URL.', 'error'); return }
    setUploading(true)
    try {
      let rows = []
      if (isImg) {
        for (let i = 0; i < imagePreviews.length; i++) {
          const p = imagePreviews[i]
          const fid = Math.random().toString(36).slice(2, 9) + '-' + Date.now() + '-' + i
          let hdUrl = p.fullUrl, thUrl = p.thumbUrl
          if (p.fullUrl?.startsWith('data:')) {
            try {
              const blob = dataURLtoBlob(p.fullUrl)
              const fp = `hd/${fid}.jpg`
              const { error } = await supabase.storage.from('event-media').upload(fp, blob, { contentType: 'image/jpeg' })
              if (!error) hdUrl = supabase.storage.from('event-media').getPublicUrl(fp).data.publicUrl
            } catch {}
          }
          if (p.thumbUrl?.startsWith('data:')) {
            try {
              const blob = dataURLtoBlob(p.thumbUrl)
              const tp = `thumbs/${fid}.jpg`
              const { error } = await supabase.storage.from('event-media').upload(tp, blob, { contentType: 'image/jpeg' })
              if (!error) thUrl = supabase.storage.from('event-media').getPublicUrl(tp).data.publicUrl
            } catch {}
          }
          rows.push({ id: fid, type: mediaType, caption: caption.trim(), thumb_url: thUrl, hd_url: hdUrl, competition_id: compTag || null, uploader_name: user?.name || user?.username || 'Media' })
        }
      } else {
        rows = [{ id: Math.random().toString(36).slice(2, 9) + '-' + Date.now(), type: mediaType, caption: caption.trim(), thumb_url: link.trim(), hd_url: link.trim(), competition_id: compTag || null, uploader_name: user?.name || user?.username || 'Media' }]
      }
      const { error } = await supabase.from('gallery_media').insert(rows)
      if (error) throw error
      setCaption(''); setLink(''); setSelectedFiles([]); setImagePreviews([]); setCompTag('')
      fetchMedia()
      showToast(`${rows.length} item${rows.length > 1 ? 's' : ''} published.`)
      if (window.innerWidth < 900) setActivePanel('library')
    } catch (err) { showToast('Failed: ' + err.message, 'error') }
    finally { setUploading(false) }
  }

  // Delete helpers
  const purgeStorage = items => {
    const paths = []
    items.forEach(it => {
      if (it.hd_url?.includes('/event-media/')) { const p = it.hd_url.split('/event-media/')[1]?.split('?')[0]; if (p) paths.push(p) }
      if (it.thumb_url?.includes('/event-media/')) { const p = it.thumb_url.split('/event-media/')[1]?.split('?')[0]; if (p) paths.push(p) }
    })
    if (paths.length) supabase.storage.from('event-media').remove(paths).catch(() => {})
  }

  const handleConfirmDelete = async () => {
    const target = confirmDel; setConfirmDel(null)
    try {
      if (target === 'bulk') {
        const ids = [...selectedItems]
        const items = mediaFeed.filter(m => ids.includes(m.id))
        const { error } = await supabase.from('gallery_media').delete().in('id', ids)
        if (error) throw error
        purgeStorage(items); setSelectedItems(new Set()); setBulkMode(false)
        showToast(`${ids.length} items deleted.`)
      } else {
        const item = mediaFeed.find(m => m.id === target)
        const { error } = await supabase.from('gallery_media').delete().eq('id', target)
        if (error) throw error
        if (item) purgeStorage([item])
        showToast('Item deleted.')
      }
      fetchMedia()
    } catch (err) { showToast('Delete failed: ' + err.message, 'error') }
  }

  // Library computed
  const filtered = mediaFeed.filter(it => {
    const typeOk = libFilter === 'all' || it.type === libFilter
    const q = libSearch.trim().toLowerCase()
    const searchOk = !q || it.caption?.toLowerCase().includes(q) ||
      competitions.find(c => c.id === it.competition_id)?.name?.toLowerCase().includes(q)
    return typeOk && searchOk
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(currentPage, totalPages)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSel = id => setSelectedItems(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAll  = () => setSelectedItems(new Set(filtered.map(i => i.id)))
  const clearSel   = () => setSelectedItems(new Set())

  const getYtId = url => {
    if (!url) return null
    const m = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)
    return m ? m[1] : null
  }

  const isImg = mediaType === 'photo' || mediaType === 'poster'

  return (
    <div className="med-root">

      {/* Topbar */}
      <header className="med-topbar">
        <div className="med-topbar-left">
          <img src="/inspico-logo.svg" alt="" className="med-logo-mark" />
          <img src="/inspico.svg"      alt="Inspico" className="med-logo-text" />
          <div className="med-topbar-div" />
          <span className="med-topbar-name">{user?.name || user?.username || 'Media Team'}</span>
        </div>
        <button className="med-signout-btn" onClick={logout}>
          <IconLogOut /> Sign out
        </button>
      </header>

      {/* Mobile tab switcher */}
      <div className="med-mob-tabs">
        <button className={'med-mob-tab' + (activePanel === 'upload' ? ' active' : '')} onClick={() => setActivePanel('upload')}>
          <IconUpload s={15} /> Upload
        </button>
        <button className={'med-mob-tab' + (activePanel === 'library' ? ' active' : '')} onClick={() => setActivePanel('library')}>
          <IconGrid s={15} /> Library
          {mediaFeed.length > 0 && <span className="med-mob-count">{mediaFeed.length}</span>}
        </button>
      </div>

      {/* Two-panel layout */}
      <main className="med-main">

        {/* ── Upload Panel ────────────────────────── */}
        <section className={'med-panel med-upload-panel' + (activePanel === 'upload' ? ' mob-visible' : '')}>

          <div className="med-panel-head">
            <h2 className="med-panel-title">Upload</h2>
            {mediaType === 'photo' && (
              <button type="button" className="med-pill" onClick={() => setShowOverlayPanel(p => !p)}>
                <IconLayers />
                PNG Frames
                {(overlays.overlay34 || overlays.overlay43) && <span className="med-dot" />}
              </button>
            )}
          </div>

          {/* Overlay config */}
          {mediaType === 'photo' && showOverlayPanel && (
            <div className="med-overlay-box">
              <p className="med-overlay-desc">Transparent PNG frames applied to all photos automatically.</p>
              <div className="med-overlay-slots">
                {[
                  { key: 'overlay34', label: 'Portrait 3:4',  dim: '1200×1600' },
                  { key: 'overlay43', label: 'Landscape 4:3', dim: '1600×1200' },
                ].map(({ key, label, dim }) => (
                  <div key={key} className="med-overlay-slot">
                    <div className="med-overlay-slot-hd">
                      <span>{label}</span><code>{dim}</code>
                    </div>
                    {overlays[key]
                      ? <div className="med-overlay-img-wrap">
                          <img src={overlays[key]} alt={label} />
                          <button type="button" className="med-overlay-rm" onClick={() => handleRemoveOverlay(key)}>
                            <IconX s={10} /> Remove
                          </button>
                        </div>
                      : <label className="med-overlay-drop">
                          <IconUpload s={16} />
                          <span>Upload PNG</span>
                          <input type="file" accept="image/png" style={{ display: 'none' }} onChange={e => handleOverlayUpload(key, e.target.files[0])} />
                        </label>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Type tabs */}
          <div className="med-type-tabs">
            {TYPES.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={'med-type-btn' + (mediaType === id ? ' active' : '')}
                onClick={() => { setMediaType(id); setLink(''); setSelectedFiles([]); setImagePreviews([]) }}
              >
                <Icon s={15} /><span>{label}</span>
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="med-form">

            {/* Competition tag — only for non-photo types */}
            {mediaType !== 'photo' && competitions.length > 0 && (
              <div className="med-field">
                <label className="med-label">Competition</label>
                <select className="med-input med-select" value={compTag} onChange={e => setCompTag(e.target.value)}>
                  <option value="">None</option>
                  {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {isImg && (
              <>
                {mediaType === 'photo' && (overlays.overlay34 || overlays.overlay43) && (
                  <label className="med-check-row">
                    <input type="checkbox" checked={applyOverlay} onChange={e => setApplyOverlay(e.target.checked)} />
                    <IconLayers s={13} />
                    Apply PNG frame overlay
                  </label>
                )}

                {mediaType === 'photo' && (
                  <div className="med-field">
                    <label className="med-label">Aspect ratio</label>
                    <div className="med-ratio-row">
                      {[
                        { id: 'auto',     txt: 'Auto' },
                        { id: '4:3',      txt: '4:3' },
                        { id: '3:4',      txt: '3:4' },
                        { id: 'original', txt: 'Original' },
                      ].map(r => (
                        <button key={r.id} type="button"
                          className={'med-ratio-btn' + (aspectRatio === r.id ? ' active' : '')}
                          onClick={() => setAspectRatio(r.id)}>
                          {r.txt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Drop zone */}
                <div className="med-drop" onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleImageChange({ target: { files: Array.from(e.dataTransfer.files), value: '' } }) }}>
                  <IconUpload s={22} />
                  <span className="med-drop-title">Click or drag images here</span>
                  <span className="med-drop-sub">JPEG, PNG — multiple files allowed</span>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
                </div>

                {/* Preview grid */}
                {imagePreviews.length > 0 && (
                  <div className="med-field">
                    <div className="med-field-hd">
                      <label className="med-label">{imagePreviews.length} file{imagePreviews.length > 1 ? 's' : ''} ready</label>
                      <button type="button" className="med-text-btn" onClick={() => setSelectedFiles([])}>Clear all</button>
                    </div>
                    <div className="med-preview-grid">
                      {imagePreviews.map((p, i) => (
                        <div key={i} className="med-preview-card">
                          <div className="med-preview-ratio" style={{ paddingTop: ratioPaddingTop(p.outRatio, p.tw, p.th) }}>
                            <img src={p.thumbUrl || p.fullUrl} alt="" />
                            <button type="button" className="med-preview-rm" onClick={() => removeFile(i)} title="Remove">
                              <IconX s={10} />
                            </button>
                            <span className="med-preview-chip">{p.outRatio}</span>
                            {applyOverlay && mediaType === 'photo' && (
                              <span className={'med-preview-overlay-chip' + (p.overlayApplied ? ' on' : ' off')}>
                                {p.overlayApplied ? 'Frame' : 'No frame'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {!isImg && (
              <div className="med-field">
                <label className="med-label">
                  {mediaType === 'live' ? 'YouTube Live URL' : mediaType === 'shorts' ? 'YouTube Shorts URL' : 'YouTube URL'}
                </label>
                <input type="url" className="med-input" placeholder="https://youtube.com/…"
                  value={link} onChange={e => setLink(e.target.value)} required />
                {link && !getYtId(link) && (
                  <span className="med-warn-row"><IconWarn s={14} /> Invalid YouTube URL</span>
                )}
              </div>
            )}

            <button type="submit" className="med-submit" disabled={uploading}>
              {uploading
                ? <><div className="med-spin" /> Processing…</>
                : <><IconUpload s={15} /> Publish</>}
            </button>
          </form>
        </section>

        {/* ── Library Panel ────────────────────────── */}
        <section className={'med-panel med-library-panel' + (activePanel === 'library' ? ' mob-visible' : '')}>

          <div className="med-panel-head">
            <div className="med-panel-head-left">
              <h2 className="med-panel-title">Library</h2>
              <span className="med-count-badge">{filtered.length}</span>
            </div>
            <div className="med-panel-head-right">
              {bulkMode ? (
                <>
                  <button type="button" className="med-pill"
                    onClick={selectedItems.size === filtered.length ? clearSel : selectAll}>
                    <IconSelAll s={12} />
                    {selectedItems.size === filtered.length ? 'Deselect all' : 'Select all'}
                  </button>
                  <button type="button" className="med-pill med-pill--danger"
                    disabled={!selectedItems.size}
                    onClick={() => setConfirmDel('bulk')}>
                    <IconTrash s={12} />
                    Delete {selectedItems.size > 0 ? '(' + selectedItems.size + ')' : ''}
                  </button>
                  <button type="button" className="med-icon-btn" onClick={() => { setBulkMode(false); clearSel() }} title="Cancel">
                    <IconX s={14} />
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="med-icon-btn" onClick={fetchMedia} title="Refresh"><IconRefresh /></button>
                  <button type="button" className="med-pill" onClick={() => setBulkMode(true)}><IconSelAll s={12} /> Select</button>
                </>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="med-search-wrap">
            <IconSearch s={14} />
            <input className="med-search" type="text" placeholder="Search captions…"
              value={libSearch} onChange={e => { setLibSearch(e.target.value); setCurrentPage(1) }} />
            {libSearch && (
              <button type="button" className="med-search-clr" onClick={() => setLibSearch('')}><IconX s={11} /></button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="med-filter-tabs">
            {FILTERS.map(f => {
              const cnt = f.id === 'all' ? mediaFeed.length : mediaFeed.filter(i => i.type === f.id).length
              return (
                <button key={f.id} type="button"
                  className={'med-filter-tab' + (libFilter === f.id ? ' active' : '')}
                  onClick={() => { setLibFilter(f.id); setCurrentPage(1) }}>
                  {f.label}
                  {cnt > 0 && <span className="med-filter-num">{cnt}</span>}
                </button>
              )
            })}
          </div>

          {/* Grid */}
          {paged.length === 0 ? (
            <div className="med-empty">
              <IconImage s={28} />
              <p>{libSearch ? 'No results.' : 'No media here yet.'}</p>
            </div>
          ) : (
            <div className="med-lib-grid">
              {paged.map(item => {
                const isPhoto = item.type === 'photo' || item.type === 'poster'
                const ytId = !isPhoto ? getYtId(item.url) : null
                const comp = competitions.find(c => c.id === item.competition_id)
                const sel = selectedItems.has(item.id)
                return (
                  <div key={item.id}
                    className={'med-lib-card' + (sel ? ' selected' : '') + (bulkMode ? ' bulk' : '')}
                    onClick={bulkMode ? () => toggleSel(item.id) : undefined}>
                    <div className="med-lib-thumb-box">
                      {isPhoto
                        ? <img src={item.thumb_url} alt="" className="med-lib-thumb" loading="lazy" />
                        : ytId
                          ? <><img src={'https://img.youtube.com/vi/' + ytId + '/mqdefault.jpg'} alt="" className="med-lib-thumb" loading="lazy" />
                              <div className="med-lib-play"><IconPlay s={16} /></div></>
                          : <div className="med-lib-thumb-fallback"><IconVideo s={22} /></div>
                      }
                      <span className={'med-lib-badge type-' + item.type}>{item.type}</span>
                      {bulkMode && (
                        <div className={'med-lib-check' + (sel ? ' on' : '')}>{sel && <IconCheck s={10} />}</div>
                      )}
                      {!bulkMode && (
                        <button type="button" className="med-lib-del"
                          onClick={e => { e.stopPropagation(); setConfirmDel(item.id) }} title="Delete">
                          <IconTrash s={12} />
                        </button>
                      )}
                    </div>
                    <div className="med-lib-info">
                      <p className="med-lib-caption">{item.caption || <em>No caption</em>}</p>
                      <div className="med-lib-meta">
                        {comp && <span className="med-lib-comp"><IconTag s={9} /> {comp.name}</span>}
                        <span className="med-lib-time">{relTime(item.created_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="med-pager">
              <button type="button" className="med-page-btn" disabled={page <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                <IconChevL />
              </button>
              <span className="med-page-info">Page {page} of {totalPages}</span>
              <button type="button" className="med-page-btn" disabled={page >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <IconChevR />
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Toast */}
      {toast && <div className={'med-toast ' + toast.type}>{toast.msg}</div>}

      {/* Delete confirm */}
      {confirmDel && (
        <div className="med-modal-bg">
          <div className="med-modal">
            <div className="med-modal-icon"><IconWarn s={24} /></div>
            <h3 className="med-modal-title">
              {confirmDel === 'bulk' ? 'Delete ' + selectedItems.size + ' items?' : 'Delete this item?'}
            </h3>
            <p className="med-modal-desc">Files will be permanently removed from storage. This cannot be undone.</p>
            <div className="med-modal-btns">
              <button type="button" className="med-modal-cancel" onClick={() => setConfirmDel(null)}>Cancel</button>
              <button type="button" className="med-modal-del" onClick={handleConfirmDelete}>
                <IconTrash s={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
