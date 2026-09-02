// src/pages/admin/sections/PosterTemplatesSection.jsx
import React, { useState, useEffect, useRef } from 'react'
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

export default function PosterTemplatesSection() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePreviewTpl, setActivePreviewTpl] = useState(null)
  const [editingTpl, setEditingTpl] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [activeModalTab, setActiveModalTab] = useState('mapping') // 'mapping' | 'competition'
  const [savingMapping, setSavingMapping] = useState(false)
  const [mappingSuccess, setMappingSuccess] = useState(false)
  const fileInputRef = useRef(null)
  const previewRendererRef = useRef(null)

  // Real Database Judged Competitions & Computed Winners State
  const [realCompetitions, setRealCompetitions] = useState([])
  const [selectedCompId, setSelectedCompId] = useState('')

  // Dynamic values bound to renderer
  const [currentCompName, setCurrentCompName] = useState('Article Preveiw')
  const [currentCatName, setCurrentCatName] = useState('A ZONE')
  const [currentCodeNumber, setCurrentCodeNumber] = useState('01')
  const [currentWinners, setCurrentWinners] = useState([
    { rank: '01.', name: 'Suhail Kp', team: 'Zahrawi' },
    { rank: '02.', name: 'Sinan A', team: 'Zahrawi' },
    { rank: '03.', name: 'Hudaifath', team: 'Zahrawi' }
  ])

  // Current active template's extracted layers & active custom mapping
  const [detectedLayers, setDetectedLayers] = useState([])
  const [currentMapping, setCurrentMapping] = useState({})

  useEffect(() => {
    fetchTemplates()
    fetchRealJudgedCompetitions()
  }, [])

  // When active preview template changes, extract its layers and load its mapping
  useEffect(() => {
    if (activePreviewTpl) {
      const layers = extractTextLayers(activePreviewTpl.html_content)
      setDetectedLayers(layers)

      const saved = activePreviewTpl.layer_mapping || {}
      const initialMap = {}

      layers.forEach(l => {
        initialMap[l.id] = saved[l.id] || l.defaultField || 'static'
      })

      setCurrentMapping(initialMap)
      setMappingSuccess(false)
    } else {
      setDetectedLayers([])
      setCurrentMapping({})
    }
  }, [activePreviewTpl])

  async function fetchTemplates() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('poster_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching templates:', error)
      } else {
        setTemplates(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchRealJudgedCompetitions() {
    try {
      const [
        { data: comps, error: compErr },
        { data: jResults, error: jErr },
        { data: reports, error: repErr }
      ] = await Promise.all([
        supabase.from('competitions').select('*, categories(id, name)').order('name'),
        supabase.from('judge_results').select('competition_id, code_letter, points_raw, grade'),
        supabase.from('competition_reports').select('competition_id, code_letter, participant_id, participants(id, name, chess_number, team_id, teams(name))')
      ])

      if (compErr || jErr || repErr) {
        console.error('Error fetching judge results:', compErr || jErr || repErr)
        return
      }

      const compScores = {}
      ;(jResults || []).forEach(r => {
        if (!compScores[r.competition_id]) compScores[r.competition_id] = {}
        if (!compScores[r.competition_id][r.code_letter]) {
          compScores[r.competition_id][r.code_letter] = []
        }
        compScores[r.competition_id][r.code_letter].push(Number(r.points_raw) || 0)
      })

      const compParticipants = {}
      ;(reports || []).forEach(r => {
        if (!compParticipants[r.competition_id]) compParticipants[r.competition_id] = {}
        compParticipants[r.competition_id][r.code_letter] = r.participants
      })

      const judgedList = []

      ;(comps || []).forEach(c => {
        const rawScores = compScores[c.id]
        if (!rawScores) return

        const nameMap = compParticipants[c.id] || {}

        const aggregated = Object.entries(rawScores).map(([code, ptsArr]) => {
          const avg = ptsArr.reduce((sum, v) => sum + v, 0) / ptsArr.length
          const participant = nameMap[code]
          return {
            code_letter: code,
            avg_points: avg,
            name: participant?.name || `Code ${code}`,
            team: participant?.teams?.name || '—'
          }
        }).sort((a, b) => b.avg_points - a.avg_points)

        if (aggregated.length > 0) {
          const winners = aggregated.slice(0, 3).map((w, idx) => ({
            rank: `0${idx + 1}.`,
            name: w.name,
            team: w.team
          }))

          while (winners.length < 3) {
            winners.push({ rank: `0${winners.length + 1}.`, name: '—', team: '—' })
          }

          judgedList.push({
            id: c.id,
            name: c.name,
            category_name: c.categories?.name || 'General',
            announcementNumber: c.announcementNumber || '',
            winners: winners,
            totalJudgedCount: aggregated.length
          })
        }
      })

      setRealCompetitions(judgedList)

      if (judgedList.length > 0) {
        setSelectedCompId(judgedList[0].id)
        applyJudgedCompetition(judgedList[0])
      }
    } catch (err) {
      console.error('Error calculating judged competitions:', err)
    }
  }

  function applyJudgedCompetition(comp) {
    if (!comp) return
    setCurrentCompName(comp.name)
    setCurrentCatName(comp.category_name)
    setCurrentCodeNumber(comp.announcementNumber ? String(comp.announcementNumber).padStart(2, '0') : '01')
    setCurrentWinners(comp.winners)
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
              is_default: templates.length === 0,
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

  // Save Layer Mapping to Supabase
  async function handleSaveLayerMapping() {
    if (!activePreviewTpl) return
    setSavingMapping(true)
    try {
      const { error } = await supabase
        .from('poster_templates')
        .update({ layer_mapping: currentMapping })
        .eq('id', activePreviewTpl.id)

      if (error) {
        alert('Failed to save mapping: ' + error.message)
      } else {
        setMappingSuccess(true)
        // Update local template record
        setActivePreviewTpl({ ...activePreviewTpl, layer_mapping: currentMapping })
        setTemplates(templates.map(t => t.id === activePreviewTpl.id ? { ...t, layer_mapping: currentMapping } : t))
        setTimeout(() => setMappingSuccess(false), 2500)
      }
    } catch (err) {
      alert('Error saving mapping: ' + err.message)
    } finally {
      setSavingMapping(false)
    }
  }

  // Set default template
  async function handleSetDefault(id) {
    try {
      await supabase.from('poster_templates').update({ is_default: false }).neq('id', id)
      await supabase.from('poster_templates').update({ is_default: true }).eq('id', id)
      await fetchTemplates()
    } catch (err) {
      console.error('Error setting default template:', err)
    }
  }

  // Delete template
  async function handleDelete(id, name) {
    if (!window.confirm(`Are you sure you want to delete template "${name}"?`)) return
    try {
      await supabase.from('poster_templates').delete().eq('id', id)
      if (activePreviewTpl?.id === id) setActivePreviewTpl(null)
      await fetchTemplates()
    } catch (err) {
      alert('Delete failed: ' + err.message)
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

  const currentPosterData = {
    competition_name: currentCompName,
    category_name: currentCatName,
    code_number: currentCodeNumber,
    winners: currentWinners
  }

  return (
    <div className="pt-root">
      {/* Top Header */}
      <div className="list-header" style={{ marginBottom: 8 }}>
        <span className="list-title">Poster Templates</span>
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
            <div key={tpl.id} className="pt-card">
              <div
                className="pt-card-preview-wrap"
                onClick={() => {
                  setActivePreviewTpl(tpl)
                  setActiveModalTab('mapping')
                }}
                title="Click to configure layer mapping & live preview"
              >
                {tpl.is_default && <span className="pt-card-badge">Default</span>}
                <span className="pt-card-dim">{tpl.canvas_width}x{tpl.canvas_height}</span>

                <div style={{ pointerEvents: 'none', width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <DynamicPosterRenderer
                    template={tpl}
                    mockData={currentPosterData}
                    customMapping={tpl.layer_mapping}
                  />
                </div>
              </div>

              <div className="pt-card-body">
                <h3 className="pt-card-title">{tpl.name}</h3>

                <div className="pt-card-actions">
                  <button
                    className="pt-btn-sm pt-btn-primary"
                    onClick={() => {
                      setActivePreviewTpl(tpl)
                      setActiveModalTab('mapping')
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="22" y1="12" x2="18" y2="12" />
                      <line x1="6" y1="12" x2="2" y2="12" />
                      <line x1="12" y1="6" x2="12" y2="2" />
                      <line x1="12" y1="22" x2="12" y2="18" />
                    </svg>
                    Map Layers & Preview
                  </button>

                  <button
                    className="pt-btn-sm"
                    onClick={() => setEditingTpl(tpl)}
                    title="Edit HTML code"
                  >
                    Edit Code
                  </button>

                  {!tpl.is_default && (
                    <button
                      className="pt-btn-sm"
                      onClick={() => handleSetDefault(tpl.id)}
                      title="Set as default result poster template"
                    >
                      Set Default
                    </button>
                  )}

                  <button
                    className="pt-btn-sm"
                    style={{ color: '#ef4444' }}
                    onClick={() => handleDelete(tpl.id, tpl.name)}
                    title="Delete template"
                  >
                    Delete
                  </button>
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
                <DynamicPosterRenderer
                  ref={previewRendererRef}
                  template={activePreviewTpl}
                  mockData={currentPosterData}
                  customMapping={currentMapping}
                />

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
                    Download Rendered PNG (High-Res 2x)
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
                    🏆 Test Competition
                  </button>
                </div>

                {/* TAB 1: VISUAL LAYER MAPPING */}
                {activeModalTab === 'mapping' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                        Assign Dynamic Fields to Template Layers
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '50vh', overflowY: 'auto', paddingRight: 4 }}>
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
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={handleSaveLayerMapping}
                        disabled={savingMapping}
                      >
                        {savingMapping ? 'Saving...' : mappingSuccess ? '✓ Mapping Saved!' : '💾 Save Layer Mapping'}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: COMPETITION SELECTOR */}
                {activeModalTab === 'competition' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="pt-form-group">
                      <label className="pt-form-label" style={{ color: '#fb7185', fontWeight: 700 }}>
                        🏆 Select Judged Competition ({realCompetitions.length} Available)
                      </label>
                      <select
                        className="pt-input"
                        value={selectedCompId}
                        onChange={e => {
                          const cId = e.target.value
                          setSelectedCompId(cId)
                          const comp = realCompetitions.find(c => c.id === cId)
                          if (comp) applyJudgedCompetition(comp)
                        }}
                        style={{ fontWeight: 600, background: '#1e293b' }}
                      >
                        {realCompetitions.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.category_name})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-form-group">
                      <label className="pt-form-label">Competition Name</label>
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
  )
}
