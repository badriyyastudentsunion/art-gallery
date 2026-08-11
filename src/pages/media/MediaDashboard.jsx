// src/pages/media/MediaDashboard.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Cropper from 'react-easy-crop'
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
const IconSelAll   = ({ s = 13 }) => <Ico w={s} h={s} d={[['rect',{x:'3',y:'3',width:'18',height:'18',rx:'2'}],['polyline',{points:'9 11 12 14 22 4'}]]} />
const IconEye      = ({ s = 14 }) => <Ico w={s} h={s} d={[['path',{d:'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'}],['circle',{cx:'12',cy:'12',r:'3'}]]} />

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

export default function MediaDashboard() {
  const { user, logout } = useAuth()

  // General State
  const [activePanel, setActivePanel] = useState('upload') // 'upload' | 'library' for mobile
  const [toast, setToast] = useState(null)
  
  // Library State
  const [mediaFeed, setMediaFeed] = useState([])
  const [competitions, setCompetitions] = useState([])
  const [libFilter, setLibFilter] = useState('all')
  const [libSearch, setLibSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [presetModal, setPresetModal] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [confirmPresetDel, setConfirmPresetDel] = useState(null)

  // Editor State
  const [mediaType, setMediaType] = useState('photo')
  const [caption, setCaption] = useState('')
  const [link, setLink] = useState('')
  const [compTag, setCompTag] = useState('')
  const [uploading, setUploading] = useState(false)
  const [overlays, setOverlays] = useState({ overlay43: '', overlay34: '' })
  const [applyOverlay, setApplyOverlay] = useState(true)

  // Cropper State
  const [editFiles, setEditFiles] = useState([]) // Array of objects containing file & edit state
  const [activeEditId, setActiveEditId] = useState(null)
  const [presets, setPresets] = useState([])
  const [isComparing, setIsComparing] = useState(false)
  const [showArrowTip, setShowArrowTip] = useState(false)
  
  const hist = useRef({ past: [], pointer: -1 })
  const editFilesRef = useRef([])

  useEffect(() => {
    editFilesRef.current = editFiles
  }, [editFiles])

  const pushHistory = (state = editFilesRef.current) => {
    let { past, pointer } = hist.current
    const sliced = past.slice(0, pointer + 1)
    const clone = state.map(f => ({ ...f, crop: { ...f.crop }, cropPx: f.cropPx ? { ...f.cropPx } : null }))
    sliced.push(clone)
    if (sliced.length > 30) sliced.shift()
    hist.current = { past: sliced, pointer: sliced.length - 1 }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
      
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        let { past, pointer } = hist.current
        if (e.shiftKey) { // Redo
          if (pointer < past.length - 1) {
            hist.current.pointer = pointer + 1
            setEditFiles(past[pointer + 1])
          }
        } else { // Undo
          if (pointer > 0) {
            hist.current.pointer = pointer - 1
            setEditFiles(past[pointer - 1])
          }
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const files = editFilesRef.current
        if (files.length > 1) {
          e.preventDefault()
          if (!localStorage.getItem('ag_arrow_tip_dismissed')) {
            localStorage.setItem('ag_arrow_tip_dismissed', 'true')
            setShowArrowTip(false)
          }
          setActiveEditId(prev => {
            const idx = files.findIndex(f => f.id === prev)
            if (idx === -1) return prev
            let nIdx = e.key === 'ArrowRight' ? idx + 1 : idx - 1
            if (nIdx < 0) nIdx = files.length - 1
            if (nIdx >= files.length) nIdx = 0
            return files[nIdx].id
          })
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  const fileInputRef = useRef(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  useEffect(() => {
    fetchMedia(); fetchCompetitions(); fetchOverlays(); fetchPresets()
    
    const ch = supabase.channel('media-db-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_media' }, fetchMedia)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.gallery_overlays' }, fetchOverlays)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media_presets' }, fetchPresets)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function fetchPresets() {
    try {
      const { data } = await supabase.from('media_presets').select('*').order('created_at', { ascending: true })
      if (data) setPresets(data)
    } catch {}
  }

  async function fetchMedia() {
    try {
      const { data } = await supabase.from('gallery_media').select('*').order('created_at', { ascending: false })
      setMediaFeed(data || [])
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

  // File Handling
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []).filter(f => {
      if (!f.type.startsWith('image/')) { showToast(f.name + ' is not an image.', 'error'); return false }
      return true
    })
    
    const newFiles = files.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      url: URL.createObjectURL(f),
      crop: { x: 0, y: 0 },
      zoom: 1,
      cropPx: null,
      ratio: mediaType === 'poster' ? 'original' : 'auto',
      brightness: 100,
      contrast: 100,
      saturate: 100,
      presetId: null,
      naturalAspect: null // populated on load
    }))

    setEditFiles(prev => {
      const next = [...prev, ...newFiles]
      pushHistory(next)
      return next
    })
    if (!activeEditId && newFiles.length > 0) setActiveEditId(newFiles[0].id)
    if (e.target) e.target.value = ''
  }

  const removeFile = (id) => {
    setEditFiles(prev => {
      const next = prev.filter(f => f.id !== id)
      pushHistory(next)
      return next
    })
    if (activeEditId === id) setActiveEditId(null)
  }

  const activeFile = editFiles.find(f => f.id === activeEditId)

  const updateActiveFile = (updates, doPush = false) => {
    if (!activeEditId) return
    setEditFiles(prev => {
      const next = prev.map(f => f.id === activeEditId ? { ...f, ...updates } : f)
      if (doPush) pushHistory(next)
      return next
    })
  }

  const applyBulkSettings = () => {
    if (!activeFile) return
    setEditFiles(prev => {
      const next = prev.map(f => ({
        ...f,
        ratio: activeFile.ratio,
        brightness: activeFile.brightness,
        contrast: activeFile.contrast,
        saturate: activeFile.saturate,
        presetId: activeFile.presetId,
      }))
      pushHistory(next)
      return next
    })
    showToast('Applied settings to all items')
  }

  const handleSavePreset = async (e) => {
    if (e) e.preventDefault()
    if (!activeFile || !presetName.trim()) return
    try {
      const { error } = await supabase.from('media_presets').insert({
        name: presetName.trim(),
        brightness: activeFile.brightness,
        contrast: activeFile.contrast,
        saturate: activeFile.saturate
      })
      if (error) throw error
      showToast('Preset saved')
      setPresetModal(false)
      setPresetName('')
      fetchPresets()
    } catch (err) {
      showToast('Failed to save preset: ' + err.message, 'error')
    }
  }

  const handleConfirmPresetDelete = async () => {
    if (!confirmPresetDel) return
    const id = confirmPresetDel
    setConfirmPresetDel(null)
    try {
      const { error } = await supabase.from('media_presets').delete().eq('id', id)
      if (error) throw error
      showToast('Preset deleted')
      fetchPresets()
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error')
    }
  }

  const loadPreset = (p) => {
    if (activeFile.presetId === p.id) {
      updateActiveFile({ brightness: 100, contrast: 100, saturate: 100, presetId: null }, true)
    } else {
      updateActiveFile({ brightness: p.brightness, contrast: p.contrast, saturate: p.saturate, presetId: p.id }, true)
    }
  }

  // Rendering the final canvas
  const processEditedFile = (fileObj) => new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const { cropPx, brightness, contrast, saturate, ratio } = fileObj
      
      // Calculate actual draw dimensions
      let tw, th, sx, sy, sw, sh

      if (cropPx && ratio !== 'original') {
        tw = cropPx.width
        th = cropPx.height
        sx = cropPx.x
        sy = cropPx.y
        sw = cropPx.width
        sh = cropPx.height
      } else {
        tw = img.width
        th = img.height
        sx = 0; sy = 0; sw = tw; sh = th
      }

      // Limit max dimensions for HD
      const mx = 1920
      if (tw > th) { if (tw > mx) { th = Math.round(th * mx / tw); tw = mx } }
      else { if (th > mx) { tw = Math.round(tw * mx / th); th = mx } }

      const canvas = document.createElement('canvas')
      canvas.width = tw
      canvas.height = th
      const ctx = canvas.getContext('2d')
      
      // Apply color corrections
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th)

      // Apply overlay
      let overlaySrc = null
      if (applyOverlay && mediaType === 'photo') {
        const ar = tw / th
        if (ratio === '4:3' || ar > 1.1) overlaySrc = overlays.overlay43 || null
        else overlaySrc = overlays.overlay34 || null
      }

      const buildResult = (cvs) => {
        const fullUrl = cvs.toDataURL('image/jpeg', 0.92)
        const tC = document.createElement('canvas')
        const tMx = 800
        let tW = cvs.width, tH = cvs.height
        if (tW > tH) { if (tW > tMx) { tH = Math.round(tH * tMx / tW); tW = tMx } }
        else { if (tH > tMx) { tW = Math.round(tW * tMx / tH); tH = tMx } }
        tC.width = tW; tC.height = tH
        const ctxT = tC.getContext('2d')
        ctxT.imageSmoothingEnabled = true
        ctxT.imageSmoothingQuality = 'high'
        ctxT.drawImage(cvs, 0, 0, tW, tH)
        return { fullUrl, thumbUrl: tC.toDataURL('image/jpeg', 0.85) }
      }

      if (overlaySrc) {
        ctx.filter = 'none' // Reset filter so overlay isn't affected
        const ov = new Image(); ov.crossOrigin = 'anonymous'
        ov.onload = () => { ctx.drawImage(ov, 0, 0, tw, th); resolve(buildResult(canvas)) }
        ov.onerror = () => resolve(buildResult(canvas))
        ov.src = overlaySrc
      } else resolve(buildResult(canvas))
    }
    img.onerror = reject
    img.src = fileObj.url
  })

  const dataURLtoBlob = url => {
    const [h, d] = url.split(','); const mime = h.match(/:(.*?);/)[1]
    const b = atob(d); let n = b.length; const u = new Uint8Array(n)
    while (n--) u[n] = b.charCodeAt(n); return new Blob([u], { type: mime })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const isImg = mediaType === 'photo' || mediaType === 'poster'
    if (isImg && !editFiles.length) { showToast('Select at least one image.', 'error'); return }
    if (!isImg && !link.trim()) { showToast('Enter a YouTube URL.', 'error'); return }
    setUploading(true)
    
    try {
      let rows = []
      if (isImg) {
        for (let i = 0; i < editFiles.length; i++) {
          const fileObj = editFiles[i]
          const p = await processEditedFile(fileObj)
          
          const fid = Math.random().toString(36).slice(2, 9) + '-' + Date.now() + '-' + i
          let hdUrl = p.fullUrl, thUrl = p.thumbUrl
          
          const blobHd = dataURLtoBlob(p.fullUrl)
          const fpHd = `hd/${fid}.jpg`
          const resHd = await supabase.storage.from('event-media').upload(fpHd, blobHd, { contentType: 'image/jpeg' })
          if (!resHd.error) hdUrl = supabase.storage.from('event-media').getPublicUrl(fpHd).data.publicUrl
          
          const blobTh = dataURLtoBlob(p.thumbUrl)
          const fpTh = `thumbs/${fid}.jpg`
          const resTh = await supabase.storage.from('event-media').upload(fpTh, blobTh, { contentType: 'image/jpeg' })
          if (!resTh.error) thUrl = supabase.storage.from('event-media').getPublicUrl(fpTh).data.publicUrl
          
          rows.push({ id: fid, type: mediaType, caption: caption.trim(), thumb_url: thUrl, hd_url: hdUrl, competition_id: compTag || null, uploader_name: user?.name || user?.username || 'Media' })
        }
      } else {
        rows = [{ id: Math.random().toString(36).slice(2, 9) + '-' + Date.now(), type: mediaType, caption: caption.trim(), thumb_url: link.trim(), hd_url: link.trim(), competition_id: compTag || null, uploader_name: user?.name || user?.username || 'Media' }]
      }
      
      const { error } = await supabase.from('gallery_media').insert(rows)
      if (error) throw error
      setCaption(''); setLink(''); setEditFiles([]); setCompTag(''); setActiveEditId(null)
      fetchMedia()
      showToast(`${rows.length} item${rows.length > 1 ? 's' : ''} published.`)
      
      // Auto switch to library on mobile
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

  // Cropper calculation
  const getAspect = (ratio, natAspect) => {
    if (ratio === '4:3') return 4/3
    if (ratio === '3:4') return 3/4
    if (ratio === 'auto') {
      if (!natAspect) return 4/3
      return natAspect > 1.1 ? 4/3 : 3/4
    }
    return natAspect || 1 // if 'original' or not loaded yet
  }

  const onMediaLoaded = (mediaSize) => {
    updateActiveFile({ naturalAspect: mediaSize.width / mediaSize.height })
  }

  const isImg = mediaType === 'photo' || mediaType === 'poster'

  // Filter computations
  const filtered = mediaFeed.filter(it => {
    const typeOk = libFilter === 'all' || it.type === libFilter
    const q = libSearch.trim().toLowerCase()
    const searchOk = !q || it.caption?.toLowerCase().includes(q) || competitions.find(c => c.id === it.competition_id)?.name?.toLowerCase().includes(q)
    return typeOk && searchOk
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(currentPage, totalPages)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const toggleSel = id => setSelectedItems(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const getYtId = url => {
    if (!url) return null
    const m = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)
    return m ? m[1] : null
  }

  return (
    <div className="med-root">
      {/* Topbar exactly as it was originally */}
      <header className="med-topbar">
        <div className="med-topbar-left">
          <img src="/inspico-logo.svg" alt="" className="med-logo-mark" />
          <img src="/inspico.svg" alt="Inspico" className="med-logo-text" />
          <div className="med-topbar-div" />
          <span className="med-topbar-name">{user?.name || user?.username || 'Media Team'}</span>
        </div>
        <button className="med-signout-btn" onClick={logout}>
          <IconLogOut /> Sign out
        </button>
      </header>

      {/* Mobile tab switcher (Restored) */}
      <div className="med-mob-tabs">
        <button className={'med-mob-tab' + (activePanel === 'upload' ? ' active' : '')} onClick={() => setActivePanel('upload')}>
          <IconUpload s={15} /> Upload
        </button>
        <button className={'med-mob-tab' + (activePanel === 'library' ? ' active' : '')} onClick={() => setActivePanel('library')}>
          <IconGrid s={15} /> Library
          {mediaFeed.length > 0 && <span className="med-mob-count">{mediaFeed.length}</span>}
        </button>
      </div>

      <main className="med-main">
        {/* Editor Area (Contains Sidebar + Canvas) */}
        <section className={`med-panel med-upload-panel ${activePanel === 'upload' ? 'mob-visible' : ''}`}>
          
          <div className="med-editor-layout">
            {/* Editor Sidebar */}
            <aside className="med-sidebar">
              <div className="med-sidebar-inner">
                <div className="med-panel-head">
                  <h2 className="med-panel-title">Upload & Edit</h2>
                </div>
                
                {/* Type Selection */}
                <div className="med-type-tabs">
                  {TYPES.map(({ id, label, Icon }) => (
                    <button key={id} type="button" className={`med-type-btn ${mediaType === id ? 'active' : ''}`}
                      onClick={() => { setMediaType(id); setLink(''); setEditFiles([]); setActiveEditId(null) }}>
                      <Icon s={15} /><span>{label}</span>
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="med-form">
                  {isImg && (
                    <>
                      <div className="med-field">
                        <label className="med-label">Queue ({editFiles.length})</label>
                        <div className="med-queue-grid">
                          <div className="med-queue-add" onClick={() => fileInputRef.current?.click()}>
                            <IconUpload s={18} />
                            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
                          </div>
                          {editFiles.map(f => {
                            const hasFilters = f.brightness !== 100 || f.contrast !== 100 || f.saturate !== 100
                            return (
                              <div key={f.id} className={`med-queue-item ${activeEditId === f.id ? 'active' : ''}`} onClick={() => {
                                setActiveEditId(f.id)
                                if (editFiles.length > 1 && !localStorage.getItem('ag_arrow_tip_dismissed')) {
                                  setShowArrowTip(true)
                                  setTimeout(() => setShowArrowTip(false), 5000)
                                }
                              }}>
                                <img src={f.url} alt="" />
                                {hasFilters && (
                                  <img src={f.url} alt="" style={{
                                    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                                    clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                                    filter: `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%)`
                                  }} />
                                )}
                                <button type="button" className="med-queue-rm" onClick={(e) => { e.stopPropagation(); removeFile(f.id) }}><IconX s={10} /></button>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {activeFile && (
                        <>
                          <div className="med-field">
                            <label className="med-label">Aspect Ratio</label>
                            <div className="med-ratio-row">
                              {['auto', '4:3', '3:4', 'original'].map(r => (
                                <button key={r} type="button" className={`med-ratio-btn ${activeFile.ratio === r ? 'active' : ''}`}
                                  onClick={() => updateActiveFile({ ratio: r }, true)}>
                                  {r}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="med-field med-adjustments">
                            <div className="med-field-hd">
                              <label className="med-label">Adjustments</label>
                              <div style={{display:'flex', gap:'8px'}}>
                                {(activeFile.brightness !== 100 || activeFile.contrast !== 100 || activeFile.saturate !== 100) && (
                                  <button type="button" className="med-text-btn" onClick={() => updateActiveFile({ brightness: 100, contrast: 100, saturate: 100, presetId: null }, true)}>Reset</button>
                                )}
                                <button type="button" className="med-text-btn" onClick={() => setPresetModal(true)}>+ Save</button>
                              </div>
                            </div>
                            
                            {presets.length > 0 && (
                              <div className="med-preset-chips">
                                {presets.map((p) => (
                                  <div key={p.id} className={`med-preset-chip ${activeFile.presetId === p.id ? 'active' : ''}`}>
                                    <button type="button" className="med-preset-chip-btn" onClick={() => loadPreset(p)}>{p.name}</button>
                                    <button type="button" className="med-preset-chip-del" onClick={() => setConfirmPresetDel(p.id)}><IconX s={10} /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            <div className="med-slider-row">
                              <span className="med-slider-lbl"><span>Brightness</span><div style={{display:'flex',alignItems:'center'}}><input type="number" className="med-val-input" value={activeFile.brightness} onChange={e => updateActiveFile({ brightness: Number(e.target.value), presetId: null })} onBlur={() => pushHistory()} onKeyDown={e => { if(e.key==='Enter') { e.preventDefault(); e.target.blur() } }} />%</div></span>
                              <input type="range" className="med-slider" min="50" max="150" value={activeFile.brightness} onChange={e => updateActiveFile({ brightness: Number(e.target.value), presetId: null })} onPointerUp={() => pushHistory()} onTouchEnd={() => pushHistory()} />
                            </div>
                            <div className="med-slider-row">
                              <span className="med-slider-lbl"><span>Contrast</span><div style={{display:'flex',alignItems:'center'}}><input type="number" className="med-val-input" value={activeFile.contrast} onChange={e => updateActiveFile({ contrast: Number(e.target.value), presetId: null })} onBlur={() => pushHistory()} onKeyDown={e => { if(e.key==='Enter') { e.preventDefault(); e.target.blur() } }} />%</div></span>
                              <input type="range" className="med-slider" min="50" max="150" value={activeFile.contrast} onChange={e => updateActiveFile({ contrast: Number(e.target.value), presetId: null })} onPointerUp={() => pushHistory()} onTouchEnd={() => pushHistory()} />
                            </div>
                            <div className="med-slider-row">
                              <span className="med-slider-lbl"><span>Saturation</span><div style={{display:'flex',alignItems:'center'}}><input type="number" className="med-val-input" value={activeFile.saturate} onChange={e => updateActiveFile({ saturate: Number(e.target.value), presetId: null })} onBlur={() => pushHistory()} onKeyDown={e => { if(e.key==='Enter') { e.preventDefault(); e.target.blur() } }} />%</div></span>
                              <input type="range" className="med-slider" min="0" max="200" value={activeFile.saturate} onChange={e => updateActiveFile({ saturate: Number(e.target.value), presetId: null })} onPointerUp={() => pushHistory()} onTouchEnd={() => pushHistory()} />
                            </div>
                          </div>

                          {editFiles.length > 1 && (
                            <button type="button" className="med-pill" onClick={applyBulkSettings} style={{width:'100%', justifyContent:'center'}}>
                              <IconLayers s={13} /> Sync adjustments to all
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {!isImg && (
                    <div className="med-field">
                      <label className="med-label">YouTube URL</label>
                      <input type="url" className="med-input" placeholder="https://youtube.com/…" value={link} onChange={e => setLink(e.target.value)} required />
                    </div>
                  )}

                  <div className="med-field">
                    <label className="med-label">Caption</label>
                    <textarea className="med-textarea" placeholder="Add a caption..." value={caption} onChange={e => setCaption(e.target.value)} />
                  </div>

                  <button type="submit" className="med-submit" disabled={uploading}>
                    {uploading ? <><div className="med-spin" /> Publishing...</> : <><IconUpload s={15} /> Publish</>}
                  </button>
                </form>
              </div>
            </aside>

            <div className="med-editor-canvas" style={{ position: 'relative' }}>
              {isImg ? (
                activeFile ? (
                  <>
                    {showArrowTip && (
                      <div style={{
                        position:'absolute', top:'20px', left:'50%', transform:'translateX(-50%)',
                        background:'rgba(255,255,255,0.95)', color:'#000', padding:'6px 12px',
                        borderRadius:'20px', fontSize:'11px', fontWeight:600,
                        boxShadow:'0 4px 12px rgba(0,0,0,0.3)', zIndex:20, pointerEvents:'none',
                        animation:'toastIn 0.3s ease-out'
                      }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          <span>💡 Tip: Use</span>
                          <span style={{ border:'1px solid #ccc', borderRadius:'4px', padding:'2px 4px', background:'#f5f5f5', display:'inline-flex', alignItems:'center', color:'#555' }}><IconChevL s={10} /></span>
                          <span style={{ border:'1px solid #ccc', borderRadius:'4px', padding:'2px 4px', background:'#f5f5f5', display:'inline-flex', alignItems:'center', color:'#555' }}><IconChevR s={10} /></span>
                          <span>keys to switch images</span>
                        </div>
                      </div>
                    )}
                    <div className="med-crop-container">
                      <Cropper
                        image={activeFile.url}
                        crop={activeFile.crop}
                        zoom={activeFile.zoom}
                        aspect={getAspect(activeFile.ratio, activeFile.naturalAspect)}
                        zoomSpeed={0.3}
                        onCropChange={crop => updateActiveFile({ crop })}
                        onZoomChange={zoom => updateActiveFile({ zoom })}
                        onCropComplete={(cp, cropPx) => updateActiveFile({ cropPx }, true)}
                        onInteractionEnd={() => pushHistory()}
                        onMediaLoaded={onMediaLoaded}
                        objectFit={activeFile.ratio === 'original' ? "contain" : "contain"} 
                        showGrid={activeFile.ratio !== 'original'}
                        style={{ mediaStyle: { filter: isComparing ? 'none' : `brightness(${activeFile.brightness}%) contrast(${activeFile.contrast}%) saturate(${activeFile.saturate}%)` } }}
                      />
                    </div>
                    
                    {(activeFile.brightness !== 100 || activeFile.contrast !== 100 || activeFile.saturate !== 100) && (
                      <button className="med-pill med-compare-btn"
                        style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
                        onPointerDown={() => setIsComparing(true)}
                        onPointerUp={() => setIsComparing(false)}
                        onPointerLeave={() => setIsComparing(false)}
                        onTouchStart={() => setIsComparing(true)}
                        onTouchEnd={() => setIsComparing(false)}
                      >
                        <IconEye s={14} /> Hold to view original
                      </button>
                    )}
                  </>
                ) : (
                  <div className="med-empty">
                    <IconImage s={32} />
                    <p>Select images to edit</p>
                  </div>
                )
              ) : (
                <div className="med-empty">
                  <IconYoutube s={32} />
                  <p>YouTube Link Mode</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Library Area */}
        <section className={`med-panel med-library-panel ${activePanel === 'library' ? 'mob-visible' : ''}`}>
          <div className="med-panel-head">
            <div className="med-panel-head-left">
              <h2 className="med-panel-title">Library</h2>
              <span className="med-count-badge">{filtered.length}</span>
            </div>
            <div className="med-panel-head-right">
              {bulkMode ? (
                <>
                  <button type="button" className="med-pill" onClick={selectedItems.size === filtered.length ? () => setSelectedItems(new Set()) : () => setSelectedItems(new Set(filtered.map(i => i.id)))}>
                    <IconSelAll s={12} /> {selectedItems.size === filtered.length ? 'Deselect all' : 'Select all'}
                  </button>
                  <button type="button" className="med-pill med-pill--danger" disabled={!selectedItems.size} onClick={() => setConfirmDel('bulk')}>
                    <IconTrash s={12} /> Delete {selectedItems.size > 0 ? '(' + selectedItems.size + ')' : ''}
                  </button>
                  <button type="button" className="med-icon-btn" onClick={() => { setBulkMode(false); setSelectedItems(new Set()) }}><IconX s={14} /></button>
                </>
              ) : (
                <>
                  <button type="button" className="med-icon-btn" onClick={fetchMedia}><IconRefresh /></button>
                  <button type="button" className="med-pill" onClick={() => setBulkMode(true)}><IconSelAll s={12} /> Select</button>
                </>
              )}
            </div>
          </div>

          <div className="med-search-wrap">
            <IconSearch s={14} />
            <input className="med-search" type="text" placeholder="Search captions…" value={libSearch} onChange={e => { setLibSearch(e.target.value); setCurrentPage(1) }} />
          </div>

          <div className="med-filter-tabs">
            {FILTERS.map(f => (
              <button key={f.id} type="button" className={`med-filter-tab ${libFilter === f.id ? 'active' : ''}`} onClick={() => { setLibFilter(f.id); setCurrentPage(1) }}>
                {f.label}
              </button>
            ))}
          </div>

          {paged.length === 0 ? (
            <div className="med-empty"><IconImage s={28} /><p>No media found.</p></div>
          ) : (
            <div className="med-lib-grid">
              {paged.map(item => {
                const isP = item.type === 'photo' || item.type === 'poster'
                const ytId = !isP ? getYtId(item.url) : null
                const sel = selectedItems.has(item.id)
                return (
                  <div key={item.id} className={`med-lib-card ${sel ? 'selected' : ''} ${bulkMode ? 'bulk' : ''}`} onClick={bulkMode ? () => toggleSel(item.id) : undefined}>
                    <div className="med-lib-thumb-box">
                      {isP ? <img src={item.thumb_url} alt="" className="med-lib-thumb" loading="lazy" />
                         : ytId ? <><img src={'https://img.youtube.com/vi/' + ytId + '/mqdefault.jpg'} alt="" className="med-lib-thumb" loading="lazy" /><div className="med-lib-play"><IconPlay s={16} /></div></>
                         : <div className="med-lib-thumb-fallback"><IconVideo s={22} /></div>}
                      <span className={`med-lib-badge type-${item.type}`}>{item.type}</span>
                      {bulkMode && <div className={`med-lib-check ${sel ? 'on' : ''}`}>{sel && <IconCheck s={10} />}</div>}
                      {!bulkMode && <button type="button" className="med-lib-del" onClick={e => { e.stopPropagation(); setConfirmDel(item.id) }}><IconTrash s={12} /></button>}
                    </div>
                    <div className="med-lib-info">
                      <p className="med-lib-caption">{item.caption || <em>No caption</em>}</p>
                      <div className="med-lib-meta"><span className="med-lib-time">{relTime(item.created_at)}</span></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="med-pager">
              <button type="button" className="med-page-btn" disabled={page <= 1} onClick={() => setCurrentPage(p => p - 1)}><IconChevL /></button>
              <span className="med-page-info">Page {page} of {totalPages}</span>
              <button type="button" className="med-page-btn" disabled={page >= totalPages} onClick={() => setCurrentPage(p => p + 1)}><IconChevR /></button>
            </div>
          )}
        </section>
      </main>

      {toast && <div className={`med-toast ${toast.type}`}>{toast.msg}</div>}

      {confirmDel && (
        <div className="med-modal-bg">
          <div className="med-modal">
            <div className="med-modal-icon"><IconWarn s={24} /></div>
            <h3 className="med-modal-title">{confirmDel === 'bulk' ? 'Delete ' + selectedItems.size + ' items?' : 'Delete this item?'}</h3>
            <p className="med-modal-desc">Files will be permanently removed. This cannot be undone.</p>
            <div className="med-modal-btns">
              <button type="button" className="med-modal-cancel" onClick={() => setConfirmDel(null)}>Cancel</button>
              <button type="button" className="med-modal-del" onClick={handleConfirmDelete}><IconTrash s={13} /> Delete</button>
            </div>
          </div>
        </div>
      )}

      {presetModal && (
        <div className="med-modal-bg">
          <form className="med-modal" onSubmit={handleSavePreset}>
            <h3 className="med-modal-title">Save Preset</h3>
            <p className="med-modal-desc" style={{marginBottom: '16px'}}>Name your custom color settings.</p>
            <input type="text" className="med-input" placeholder="e.g. Cinematic Dark" value={presetName} onChange={e => setPresetName(e.target.value)} autoFocus required style={{marginBottom: '20px'}} />
            <div className="med-modal-btns">
              <button type="button" className="med-modal-cancel" onClick={() => setPresetModal(false)}>Cancel</button>
              <button type="submit" className="med-submit" style={{marginTop:0, flex:1}}>Save</button>
            </div>
          </form>
        </div>
      )}

      {confirmPresetDel && (
        <div className="med-modal-bg">
          <div className="med-modal">
            <div className="med-modal-icon"><IconWarn s={24} /></div>
            <h3 className="med-modal-title">Delete preset?</h3>
            <p className="med-modal-desc">This custom lighting preset will be removed.</p>
            <div className="med-modal-btns">
              <button type="button" className="med-modal-cancel" onClick={() => setConfirmPresetDel(null)}>Cancel</button>
              <button type="button" className="med-modal-del" onClick={handleConfirmPresetDelete}><IconTrash s={13} /> Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
