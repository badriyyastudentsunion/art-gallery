// src/pages/admin/sections/PosterTemplatesSection.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../lib/supabase'
import DynamicPosterRenderer, { extractTextLayers } from '../../../components/DynamicPosterRenderer'
import './posterTemplates.css'

const FIELD_OPTIONS = [
  { value: 'code_number', label: '🔢 Announcement Code Number' },
  { value: 'competition_name', label: '🏆 Competition Title' },
  { value: 'category_name', label: '🏷️ Category Name' },
  { value: 'winners_names', label: '👥 Winner Names (Multiline 1, 2, 3)' },
  { value: 'winners_teams', label: '👥 Winner Teams (Multiline 1, 2, 3)' },
  { value: 'rank_1_name', label: '🥇 1st Position Name' },
  { value: 'rank_1_team', label: '👥 1st Position Team' },
  { value: 'rank_2_name', label: '🥈 2nd Position Name' },
  { value: 'rank_2_team', label: '👥 2nd Position Team' },
  { value: 'rank_3_name', label: '🥉 3rd Position Name' },
  { value: 'rank_3_team', label: '👥 3rd Position Team' },
  { value: 'static', label: '🔒 Keep Static (Original Text)' }
]

const STORAGE_KEY = 'inspico_poster_templates_cache'

function RangeChips({ template, updateRange }) {
  const [inputValue, setInputValue] = useState('');
  
  const ranges = template.result_range 
    ? template.result_range.split(',').map(s => s.trim()).filter(Boolean) 
    : [];

  const handleAdd = () => {
    const val = inputValue.trim();
    if (!val) return;
    if (!/^\d+(-\d+)?$/.test(val)) {
       alert("Please enter a valid range (e.g. 1-10 or 5)");
       return;
    }
    if (!ranges.includes(val)) {
      const newRanges = [...ranges, val];
      updateRange(template.id, newRanges.join(', '));
    }
    setInputValue('');
  };

  const handleRemove = (rangeToRemove) => {
    const newRanges = ranges.filter(r => r !== rangeToRemove);
    updateRange(template.id, newRanges.join(', '));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {ranges.length === 0 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', padding: '2px 0' }}>No ranges assigned</span>}
        {ranges.map(r => (
          <span key={r} style={{ 
            background: 'rgba(184, 25, 60, 0.2)', 
            color: '#fb7185', 
            border: '1px solid rgba(184, 25, 60, 0.5)',
            fontSize: 10.5, 
            padding: '2px 6px', 
            borderRadius: 4,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}>
            {r}
            <button 
              onClick={(e) => { e.stopPropagation(); handleRemove(r); }}
              style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                 <line x1="18" y1="6" x2="6" y2="18" />
                 <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <input 
          type="text" 
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add range (e.g. 1-10)"
          style={{
            flex: 1,
            fontSize: 11, 
            padding: '4px 6px', 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            color: '#e2e8f0', 
            borderRadius: 4, 
            outline: 'none',
            minWidth: 0
          }}
        />
        <button 
          onClick={(e) => { e.stopPropagation(); handleAdd(); }}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            borderRadius: 4,
            padding: '0 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function PosterTemplatesSection() {
  const [templates, setTemplates] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      if (cached) return JSON.parse(cached)
    } catch (_) {}
    return []
  })
  const [loading, setLoading] = useState(() => templates.length === 0)
  const [activePreviewTpl, setActivePreviewTpl] = useState(null)
  const [editingTpl, setEditingTpl] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [activeModalTab, setActiveModalTab] = useState('mapping') // 'mapping' | 'competition'
  const [savingMapping, setSavingMapping] = useState(false)
  const [mappingSuccess, setMappingSuccess] = useState(false)
  const fileInputRef = useRef(null)
  const previewRendererRef = useRef(null)
  const [hoveredCard, setHoveredCard] = useState(null)
  const [renamingTplId, setRenamingTplId] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  const getStartingNumber = (rangeStr) => {
    if (!rangeStr) return '01'
    const match = rangeStr.match(/\d+/)
    return match ? String(match[0]).padStart(2, '0') : '01'
  }

  // Dynamic values bound to renderer
  const [currentCompName, setCurrentCompName] = useState('Article Preveiw')
  const [currentCatName, setCurrentCatName] = useState('A ZONE')
  const [currentCodeNumber, setCurrentCodeNumber] = useState('01')
  const [currentWinners, setCurrentWinners] = useState([
    { rank: '01.', name: 'Suhail Kp', team: 'Zahrawi' },
    { rank: '02.', name: 'Sinan A', team: 'Zahrawi' },
    { rank: '03.', name: 'Hudaifath', team: 'Zahrawi' }
  ])

  // Current active template's extracted layers, mapping & result range
  const [detectedLayers, setDetectedLayers] = useState([])
  const [currentMapping, setCurrentMapping] = useState({})
  const [currentResultRange, setCurrentResultRange] = useState('')

  const [loadingModalTpl, setLoadingModalTpl] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const prefetchedIds = useRef(new Set())

  const totalCovered = useMemo(() => {
    let count = 0
    templates.forEach(t => {
      const rangeStr = t.result_range
      if (!rangeStr) return
      const parts = rangeStr.split(',').map(s => s.trim()).filter(Boolean)
      for (const part of parts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(Number)
          if (!isNaN(start) && !isNaN(end)) {
            count += (Math.max(start, end) - Math.min(start, end) + 1)
          }
        } else {
          if (!isNaN(Number(part))) count += 1
        }
      }
    })
    return count
  }, [templates])

  // Save templates cache to localStorage and notify other components
  const updateCachedTemplates = (newTemplates) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTemplates))
      localStorage.setItem('inspico_poster_templates_version', Date.now().toString())
      window.dispatchEvent(new CustomEvent('poster_templates_updated'))
    } catch (_) {}
  }

  const updateTemplateRange = async (id, newRange) => {
    try {
      const { error } = await supabase
        .from('poster_templates')
        .update({ result_range: newRange, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (!error) {
        setTemplates(prev => {
          const updated = prev.map(t => t.id === id ? { ...t, result_range: newRange } : t);
          updateCachedTemplates(updated);
          return updated;
        });
        if (activePreviewTpl?.id === id) {
          setCurrentResultRange(newRange);
        }
      }
    } catch (err) {
      console.error('Failed to update range:', err);
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  // Listen for Escape and Enter keys for modal actions
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (deleteConfirm) {
          setDeleteConfirm(null)
        } else if (editingTpl) {
          setEditingTpl(null)
        } else if (activePreviewTpl) {
          setActivePreviewTpl(null)
        }
      } else if (e.key === 'Enter') {
        // Avoid submitting if user is typing inside textarea or a button is actively focused
        if (e.target.tagName === 'TEXTAREA') return

        if (deleteConfirm) {
          e.preventDefault()
          deleteConfirm.onConfirm()
          setDeleteConfirm(null)
        } else if (activePreviewTpl && !savingMapping) {
          e.preventDefault()
          handleSaveLayerMapping()
        } else if (editingTpl) {
          e.preventDefault()
          handleSaveCodeEdit()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activePreviewTpl, editingTpl, deleteConfirm, currentMapping, currentResultRange, savingMapping])

  // Prefetch HTML in background on card hover so click is instant
  const handlePrefetch = async (tpl) => {
    if (tpl.html_content || prefetchedIds.current.has(tpl.id)) return
    prefetchedIds.current.add(tpl.id)
    try {
      const { data } = await supabase
        .from('poster_templates')
        .select('html_content')
        .eq('id', tpl.id)
        .single()
      if (data?.html_content) {
        const fullTpl = { ...tpl, html_content: data.html_content }
        setTemplates(prev => prev.map(t => t.id === tpl.id ? fullTpl : t))
        // If this template is currently shown in modal, update it too
        setActivePreviewTpl(prev => prev?.id === tpl.id ? { ...prev, html_content: data.html_content } : prev)
      }
    } catch (err) {
      prefetchedIds.current.delete(tpl.id) // allow retry
    }
  }

  // When active preview template changes, extract its layers and load its mapping + range
  useEffect(() => {
    if (activePreviewTpl && activePreviewTpl.html_content) {
      const layers = extractTextLayers(activePreviewTpl.html_content)
      setDetectedLayers(layers)

      const saved = activePreviewTpl.layer_mapping || {}
      const initialMap = {}

      layers.forEach(l => {
        initialMap[l.id] = saved[l.id] || l.defaultField || 'static'
      })

      setCurrentMapping(initialMap)
      setCurrentResultRange(activePreviewTpl.result_range || '')
      setMappingSuccess(false)
    } else {
      setDetectedLayers([])
      setCurrentMapping({})
      setCurrentResultRange('')
    }
  }, [activePreviewTpl])

  async function fetchTemplates() {
    // If we don't have templates yet, show loader
    if (templates.length === 0) setLoading(true)

    try {
      const { data, error } = await supabase
        .from('poster_templates')
        .select('id, name, result_range, is_default, canvas_width, canvas_height, layer_mapping, html_content, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching templates:', error)
      } else {
        const fetched = data || []
        setTemplates(fetched)
        updateCachedTemplates(fetched)
        fetched.forEach(t => prefetchedIds.current.add(t.id))
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Open modal INSTANTLY with metadata, load HTML in background if needed
  const handleOpenPreview = async (tpl) => {
    setActivePreviewTpl(tpl)
    setActiveModalTab('mapping')

    if (tpl.html_content) return

    try {
      setLoadingModalTpl(true)
      const { data, error } = await supabase
        .from('poster_templates')
        .select('html_content')
        .eq('id', tpl.id)
        .single()

      if (data?.html_content) {
        const fullTpl = { ...tpl, html_content: data.html_content }
        setActivePreviewTpl(fullTpl)
        setTemplates(prev => {
          const updated = prev.map(t => t.id === tpl.id ? fullTpl : t)
          updateCachedTemplates(updated)
          return updated
        })
        prefetchedIds.current.add(tpl.id)
      } else if (error) {
        console.error('Failed to load template content:', error.message)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingModalTpl(false)
    }
  }

  // Load single template HTML on demand when edit code modal is opened
  const handleOpenEdit = async (tpl) => {
    if (tpl.html_content) {
      setEditingTpl(tpl)
      return
    }

    try {
      setLoadingModalTpl(true)
      const { data, error } = await supabase
        .from('poster_templates')
        .select('html_content')
        .eq('id', tpl.id)
        .single()

      if (data?.html_content) {
        const fullTpl = { ...tpl, html_content: data.html_content }
        setEditingTpl(fullTpl)
        setTemplates(prev => {
          const updated = prev.map(t => t.id === tpl.id ? fullTpl : t)
          updateCachedTemplates(updated)
          return updated
        })
        prefetchedIds.current.add(tpl.id)
      } else if (error) {
        alert('Failed to load template content: ' + error.message)
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoadingModalTpl(false)
    }
  }

  // Handle File Upload (.html)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.html') && !file.name.toLowerCase().endsWith('.htm')) {
      alert('Please upload an .html file')
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const htmlContent = event.target.result
      setIsUploading(true)

      try {
        let width = 1254
        let height = 1254

        const wMatch = htmlContent.match(/width:\s*(\d+)px/i)
        const hMatch = htmlContent.match(/height:\s*(\d+)px/i)
        if (wMatch && wMatch[1]) width = parseInt(wMatch[1], 10)
        if (hMatch && hMatch[1]) height = parseInt(hMatch[1], 10)

        const tplName = file.name.replace(/\.[^/.]+$/, '')

        // Auto extract initial default layer mapping
        const extracted = extractTextLayers(htmlContent)
        const initialMap = {}
        extracted.forEach(l => {
          initialMap[l.id] = l.defaultField || 'static'
        })

        const { data, error } = await supabase
          .from('poster_templates')
          .insert([
            {
              name: tplName,
              html_content: htmlContent,
              canvas_width: width,
              canvas_height: height,
              is_default: false,
              layer_mapping: initialMap
            }
          ])
          .select()

        if (error) {
          alert('Upload failed: ' + error.message)
        } else {
          await fetchTemplates()
          if (data && data[0]) {
            setActivePreviewTpl(data[0])
            setActiveModalTab('mapping')
          }
        }
      } catch (err) {
        alert('Error parsing template: ' + err.message)
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }

    reader.readAsText(file)
  }

  // Save Layer Mapping and Result Range to Supabase
  async function handleSaveLayerMapping() {
    if (!activePreviewTpl) return
    setSavingMapping(true)
    try {
      const { error } = await supabase
        .from('poster_templates')
        .update({
          layer_mapping: currentMapping,
          result_range: currentResultRange.trim()
        })
        .eq('id', activePreviewTpl.id)

      if (error) {
        alert('Failed to save settings: ' + error.message)
      } else {
        const updated = {
          ...activePreviewTpl,
          layer_mapping: currentMapping,
          result_range: currentResultRange.trim()
        }
        setTemplates(prev => {
          const next = prev.map(t => t.id === activePreviewTpl.id ? updated : t)
          updateCachedTemplates(next)
          return next
        })
        // Close modal automatically on successful save
        setActivePreviewTpl(null)
      }
    } catch (err) {
      alert('Error saving settings: ' + err.message)
    } finally {
      setSavingMapping(false)
    }
  }

  // Delete template
  async function handleDelete(id, name) {
    setDeleteConfirm({
      message: `Are you sure you want to delete the template "${name}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await supabase.from('poster_templates').delete().eq('id', id)
          if (activePreviewTpl?.id === id) {
            setActivePreviewTpl(null)
          }
          setTemplates(prev => {
            const next = prev.filter(t => t.id !== id)
            updateCachedTemplates(next)
            return next
          })
        } catch (err) {
          console.error('Delete failed:', err.message)
        }
      }
    })
  }

  const handleRenameConfirm = async (id, currentName) => {
    const newName = renameValue.trim()
    setRenamingTplId(null)
    if (newName && newName !== currentName) {
      try {
        const { error } = await supabase
          .from('poster_templates')
          .update({ name: newName, updated_at: new Date().toISOString() })
          .eq('id', id)
          
        if (error) throw error
        setTemplates(prev => {
          const updated = prev.map(t => t.id === id ? { ...t, name: newName } : t)
          updateCachedTemplates(updated)
          return updated
        })
        if (activePreviewTpl?.id === id) {
          setActivePreviewTpl(prev => ({ ...prev, name: newName }))
        }
      } catch (err) {
        alert('Failed to rename template: ' + err.message)
      }
    }
  }

  // Save Code Edit
  async function handleSaveCodeEdit() {
    if (!editingTpl) return
    try {
      const { error } = await supabase
        .from('poster_templates')
        .update({
          name: editingTpl.name,
          html_content: editingTpl.html_content,
          canvas_width: editingTpl.canvas_width,
          canvas_height: editingTpl.canvas_height,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTpl.id)

      if (error) {
        alert('Failed to update template: ' + error.message)
      } else {
        setEditingTpl(null)
        await fetchTemplates()
      }
    } catch (err) {
      alert('Error updating template: ' + err.message)
    }
  }

  const currentPosterData = useMemo(() => ({
    competition_name: currentCompName,
    category_name: currentCatName,
    code_number: currentCodeNumber,
    winners: currentWinners
  }), [currentCompName, currentCatName, currentCodeNumber, currentWinners])

  return (
    <>
    <div className="pt-root">
      {/* Top Header */}
      <div className="list-header" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="list-title">Poster Templates</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            Results Assigned: <strong style={{ color: '#f7c948' }}>{totalCovered}</strong>
          </span>
        </div>
        <div className="pt-header-actions" style={{ marginLeft: 'auto' }}>
          <span className="list-count" style={{ marginRight: 6 }}>{templates.length} total</span>
          <input
            type="file"
            accept=".html,.htm"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button
            className="pt-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {isUploading ? 'Uploading...' : 'Upload HTML Template'}
          </button>
        </div>
      </div>

      {/* Upload Dropzone Banner */}
      <div
        className="pt-dropzone"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="pt-dropzone-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Click or drop PSD-to-HTML poster files here</span>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            Supports standalone .html files with custom text layer mapping controls
          </p>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading templates...</div>
      ) : templates.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
          No poster templates uploaded yet. Upload your first HTML template above!
        </div>
      ) : (
        <div className="pt-grid">
          {templates.map(tpl => (
            <div key={tpl.id} className="pt-card" onMouseEnter={() => { handlePrefetch(tpl); setHoveredCard(tpl.id); }} onMouseLeave={() => setHoveredCard(null)}>
              <div
                className="pt-card-preview-wrap"
                onClick={() => handleOpenPreview(tpl)}
                title="Click to configure layer mapping & live preview"
                style={{
                  background: 'linear-gradient(135deg, rgba(247, 201, 72, 0.04) 0%, rgba(13, 17, 23, 0.95) 100%)',
                  aspectRatio: '1 / 1',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  cursor: 'pointer',
                  padding: '16px',
                  borderRadius: '10px 10px 0 0',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <span className="pt-card-dim">{tpl.canvas_width}x{tpl.canvas_height}</span>

                {tpl.html_content ? (
                  <div style={{ pointerEvents: 'none', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <DynamicPosterRenderer
                      template={tpl}
                      mockData={
                        hoveredCard === tpl.id
                          ? { ...currentPosterData, code_number: getStartingNumber(tpl.result_range) }
                          : { code_number: getStartingNumber(tpl.result_range) }
                      }
                      customMapping={
                        hoveredCard === tpl.id
                          ? tpl.layer_mapping
                          : Object.fromEntries(
                              Object.entries(tpl.layer_mapping || {}).filter(([_, field]) => field === 'code_number')
                            )
                      }
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
                    <div style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: 'rgba(247, 201, 72, 0.12)',
                      border: '1px solid rgba(247, 201, 72, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
                    }}>
                      🖼️
                    </div>
                    <div>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', display: 'block' }}>
                        {tpl.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                          {Object.keys(tpl.layer_mapping || {}).length} Layers Mapped
                        </span>
                        <span style={{ fontSize: 11, color: '#f7c948', fontWeight: 700 }}>
                          Preview ›
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-card-body">
                <div className="pt-card-header-row">
                  {renamingTplId === tpl.id ? (
                    <input
                      autoFocus
                      className="pt-input"
                      style={{ flex: 1, padding: '2px 6px', fontSize: 13, minWidth: 0, height: 26, background: 'rgba(255,255,255,0.1)' }}
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        e.stopPropagation()
                        if (e.key === 'Enter') handleRenameConfirm(tpl.id, tpl.name)
                        if (e.key === 'Escape') setRenamingTplId(null)
                      }}
                      onBlur={() => handleRenameConfirm(tpl.id, tpl.name)}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <h3 className="pt-card-title" title={tpl.name}>{tpl.name}</h3>
                  )}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className="pt-btn-icon"
                      onClick={(e) => { 
                        e.stopPropagation()
                        setRenamingTplId(tpl.id)
                        setRenameValue(tpl.name)
                      }}
                      title="Rename template"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="pt-btn-icon delete"
                      onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id, tpl.name) }}
                      title="Delete template"
                      aria-label="Delete template"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="pt-card-actions" onClick={e => e.stopPropagation()}>
                  <RangeChips template={tpl} updateRange={updateTemplateRange} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Layer Mapping & Live Preview Modal */}
      {activePreviewTpl && (
        <div className="pt-modal-overlay" onClick={() => setActivePreviewTpl(null)}>
          <div className="pt-modal" onClick={e => e.stopPropagation()}>
            <div className="pt-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                  {activePreviewTpl.name}
                </span>
                <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(255,255,255,0.08)', borderRadius: 4, color: 'rgba(255,255,255,0.7)' }}>
                  {activePreviewTpl.canvas_width} x {activePreviewTpl.canvas_height} px
                </span>
              </div>
              <button
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20 }}
                onClick={() => setActivePreviewTpl(null)}
              >
                ✕
              </button>
            </div>

            <div className="pt-modal-body">
              {/* Scaled Live Preview Canvas */}
              <div className="pt-preview-pane">
                {activePreviewTpl.html_content ? (
                  <DynamicPosterRenderer
                    ref={previewRendererRef}
                    template={activePreviewTpl}
                    mockData={currentPosterData}
                    customMapping={currentMapping}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    aspectRatio: `${activePreviewTpl.canvas_width} / ${activePreviewTpl.canvas_height}`,
                    background: 'linear-gradient(135deg, rgba(247,201,72,0.04) 0%, rgba(13,17,23,0.95) 100%)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12
                  }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      border: '3px solid rgba(247,201,72,0.3)',
                      borderTopColor: '#f7c948',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Loading poster…</span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}

                <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                  <button
                    className="pt-btn-sm pt-btn-primary"
                    style={{ padding: '8px 16px', fontSize: 13 }}
                    onClick={() => previewRendererRef.current?.exportPng()}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Rendered PNG
                  </button>
                </div>
              </div>

              {/* Sidebar: Layer Mapping & Field Controls */}
              <div className="pt-controls-pane">
                <div className="pt-tabs-bar">
                  <button
                    className={`pt-tab-btn ${activeModalTab === 'mapping' ? 'active' : ''}`}
                    onClick={() => setActiveModalTab('mapping')}
                  >
                    🎯 Map Text Layers ({detectedLayers.length})
                  </button>
                  <button
                    className={`pt-tab-btn ${activeModalTab === 'competition' ? 'active' : ''}`}
                    onClick={() => setActiveModalTab('competition')}
                  >
                    📝 Test Sample Data
                  </button>
                  <button
                    className={`pt-tab-btn ${activeModalTab === 'code' ? 'active' : ''}`}
                    onClick={() => {
                      setEditingTpl(activePreviewTpl)
                      setActivePreviewTpl(null)
                    }}
                    style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.05)' }}
                  >
                    &lt;/&gt; Edit Code
                  </button>
                </div>

                {/* TAB 1: VISUAL LAYER MAPPING & RANGE */}
                {activeModalTab === 'mapping' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Result Range Setting Box */}
                    <div style={{
                      background: 'rgba(247, 201, 72, 0.04)',
                      border: '1px solid rgba(247, 201, 72, 0.15)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label className="pt-form-label" style={{ color: '#f7c948', margin: 0 }}>
                          🔢 Result Code Range
                        </label>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>e.g. 1-10, 30-40</span>
                      </div>
                      <input
                        type="text"
                        className="pt-input"
                        placeholder="e.g. 1-10, 30-40"
                        value={currentResultRange}
                        onChange={e => setCurrentResultRange(e.target.value)}
                        style={{ fontSize: 13, padding: '7px 10px' }}
                      />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                        Specify the announcement numbers where this template applies (e.g. <code>1-10, 30-40</code>). If left blank, this template will remain inactive.
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                        Assign Dynamic Fields to Template Layers
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {detectedLayers.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                          No text layers detected automatically in this template.
                        </div>
                      ) : (
                        detectedLayers.map(l => (
                          <div key={l.id} className="pt-layer-item">
                            <div className="pt-layer-head">
                              <span className="pt-layer-badge">#{l.id}</span>
                              <span className="pt-layer-meta">{l.fontSize}px · {l.fontWeight}</span>
                            </div>

                            <div className="pt-layer-sample" title={l.sampleText}>
                              "{l.sampleText}"
                            </div>

                            <select
                              className="pt-input"
                              style={{ fontSize: 12, padding: '6px 8px', background: '#1e293b' }}
                              value={currentMapping[l.id] || 'static'}
                              onChange={e => {
                                setCurrentMapping({
                                  ...currentMapping,
                                  [l.id]: e.target.value
                                })
                              }}
                            >
                              {FIELD_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      <button
                        className="pt-upload-btn"
                        style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
                        onClick={handleSaveLayerMapping}
                        disabled={savingMapping}
                      >
                        {savingMapping ? (
                          <>
                            <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                              <polyline points="17 21 17 13 7 13 7 21" />
                              <polyline points="7 3 7 8 15 8" />
                            </svg>
                            <span>Save Mapping & Range</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: TEST SAMPLE DATA */}
                {activeModalTab === 'competition' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="pt-form-group">
                      <label className="pt-form-label">Competition Title</label>
                      <input
                        type="text"
                        className="pt-input"
                        value={currentCompName}
                        onChange={e => setCurrentCompName(e.target.value)}
                      />
                    </div>

                    <div className="pt-form-group">
                      <label className="pt-form-label">Category Name</label>
                      <input
                        type="text"
                        className="pt-input"
                        value={currentCatName}
                        onChange={e => setCurrentCatName(e.target.value)}
                      />
                    </div>

                    <div className="pt-form-group">
                      <label className="pt-form-label">Announcement Code</label>
                      <input
                        type="text"
                        className="pt-input"
                        value={currentCodeNumber}
                        onChange={e => setCurrentCodeNumber(e.target.value)}
                      />
                    </div>

                    <div className="pt-form-group">
                      <label className="pt-form-label">1st Position (Name · Team)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 6 }}>
                        <input
                          type="text"
                          className="pt-input"
                          value={currentWinners[0]?.name || ''}
                          onChange={e => {
                            const updated = [...currentWinners]
                            updated[0] = { ...updated[0], name: e.target.value }
                            setCurrentWinners(updated)
                          }}
                          placeholder="Participant Name"
                        />
                        <input
                          type="text"
                          className="pt-input"
                          value={currentWinners[0]?.team || ''}
                          onChange={e => {
                            const updated = [...currentWinners]
                            updated[0] = { ...updated[0], team: e.target.value }
                            setCurrentWinners(updated)
                          }}
                          placeholder="Team"
                        />
                      </div>
                    </div>

                    <div className="pt-form-group">
                      <label className="pt-form-label">2nd Position (Name · Team)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 6 }}>
                        <input
                          type="text"
                          className="pt-input"
                          value={currentWinners[1]?.name || ''}
                          onChange={e => {
                            const updated = [...currentWinners]
                            updated[1] = { ...updated[1], name: e.target.value }
                            setCurrentWinners(updated)
                          }}
                          placeholder="Participant Name"
                        />
                        <input
                          type="text"
                          className="pt-input"
                          value={currentWinners[1]?.team || ''}
                          onChange={e => {
                            const updated = [...currentWinners]
                            updated[1] = { ...updated[1], team: e.target.value }
                            setCurrentWinners(updated)
                          }}
                          placeholder="Team"
                        />
                      </div>
                    </div>

                    <div className="pt-form-group">
                      <label className="pt-form-label">3rd Position (Name · Team)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 6 }}>
                        <input
                          type="text"
                          className="pt-input"
                          value={currentWinners[2]?.name || ''}
                          onChange={e => {
                            const updated = [...currentWinners]
                            updated[2] = { ...updated[2], name: e.target.value }
                            setCurrentWinners(updated)
                          }}
                          placeholder="Participant Name"
                        />
                        <input
                          type="text"
                          className="pt-input"
                          value={currentWinners[2]?.team || ''}
                          onChange={e => {
                            const updated = [...currentWinners]
                            updated[2] = { ...updated[2], team: e.target.value }
                            setCurrentWinners(updated)
                          }}
                          placeholder="Team"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Code Editor Modal */}
      {editingTpl && (
        <div className="pt-modal-overlay" onClick={() => setEditingTpl(null)}>
          <div className="pt-modal" style={{ maxWidth: 800 }} onClick={e => e.stopPropagation()}>
            <div className="pt-modal-header">
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Edit Template Code</span>
              <button
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20 }}
                onClick={() => setEditingTpl(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="pt-form-group">
                <label className="pt-form-label">Template Name</label>
                <input
                  type="text"
                  className="pt-input"
                  value={editingTpl.name}
                  onChange={e => setEditingTpl({ ...editingTpl, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="pt-form-group">
                  <label className="pt-form-label">Canvas Width (px)</label>
                  <input
                    type="number"
                    className="pt-input"
                    value={editingTpl.canvas_width || 1254}
                    onChange={e => setEditingTpl({ ...editingTpl, canvas_width: parseInt(e.target.value, 10) || 1254 })}
                  />
                </div>
                <div className="pt-form-group">
                  <label className="pt-form-label">Canvas Height (px)</label>
                  <input
                    type="number"
                    className="pt-input"
                    value={editingTpl.canvas_height || 1254}
                    onChange={e => setEditingTpl({ ...editingTpl, canvas_height: parseInt(e.target.value, 10) || 1254 })}
                  />
                </div>
              </div>

              <div className="pt-form-group">
                <label className="pt-form-label">HTML Code</label>
                <textarea
                  className="pt-input"
                  style={{ minHeight: 300, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                  value={editingTpl.html_content}
                  onChange={e => setEditingTpl({ ...editingTpl, html_content: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button className="pt-btn-sm" onClick={() => setEditingTpl(null)}>
                  Cancel
                </button>
                <button className="pt-btn-sm pt-btn-primary" onClick={handleSaveCodeEdit}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

      {deleteConfirm && createPortal(
        <div className="dash-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="dash-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#e07c7c' }}>Confirm Delete</h3>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 20 }}>
              {deleteConfirm.message}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-cancel-edit"
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                onClick={() => setDeleteConfirm(null)}
              >Cancel</button>
              <button type="button" className="btn-delete"
                style={{ padding: '8px 16px', background: '#e07c7c', color: '#0e0b07', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                onClick={async () => { await deleteConfirm.onConfirm(); setDeleteConfirm(null) }}
              >Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
