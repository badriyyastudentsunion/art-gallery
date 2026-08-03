// src/pages/admin/sections/ParticipantsSection.jsx
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../lib/supabase'
import '../sections.css'
import BulkImporter from '../../../components/BulkImporter'
import ChestCardModal from '../../../components/ChestCardModal'
import { jsPDF } from 'jspdf'
import { toJpeg } from 'html-to-image'
import { QRCodeSVG } from 'qrcode.react'

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)
const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

function FormSingleSelect({ label, allItems, selectedId, onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = allItems.find(i => i.id === selectedId)

  return (
    <div className="form-dropdown" ref={ref}>
      <button
        type="button"
        className="form-dropdown-btn"
        onClick={() => setOpen(v => !v)}
      >
        <span>{selected ? selected.name : label}</span>
        <IconChevron />
      </button>
      {open && (
        <div className="form-dropdown-menu">
          <button
            type="button"
            className="form-dropdown-item"
            onClick={() => { onSelect(''); setOpen(false) }}
          >
            {label}
          </button>
          {allItems.map(item => (
            <button
              key={item.id}
              type="button"
              className={`form-dropdown-item ${selectedId === item.id ? 'form-dropdown-item--selected' : ''}`}
              onClick={() => { onSelect(item.id); setOpen(false) }}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


export default function ParticipantsSection({ navigateTo }) {
  const [participants, setParticipants] = useState(() => {
    try {
      const cached = localStorage.getItem('cache_participants')
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [teams, setTeams] = useState([])
  const [categories, setCategories] = useState([])
  const [teamColors, setTeamColors] = useState(() => {
    try {
      const cached = localStorage.getItem('cache_team_colors')
      if (cached && cached !== 'null') {
        const parsed = JSON.parse(cached)
        if (parsed && typeof parsed === 'object') return parsed
      }
      return {}
    } catch { return {} }
  })
  const [fetching, setFetching] = useState(() => !participants.length)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mode, setMode] = useState('add')
  const [editing, setEditing] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null)
  const [chestCardParticipant, setChestCardParticipant] = useState(null)
  const [viewingCompetitionsParticipant, setViewingCompetitionsParticipant] = useState(null)
  const [participantComps, setParticipantComps] = useState([])
  const [loadingParticipantComps, setLoadingParticipantComps] = useState(false)
  const [pdfProgress, setPdfProgress] = useState(null)
  const [pdfParticipant, setPdfParticipant] = useState(null)
  const pdfCardRef = useRef(null)

  const [pName, setPName] = useState('')
  const [teamId, setTeamId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [chessNumber, setChessNumber] = useState('')

  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [search, setSearch] = useState('')

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortedParticipants = [...participants].filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name?.toLowerCase().includes(q) ||
           p.chess_number?.toLowerCase().includes(q) ||
           p.teams?.name?.toLowerCase().includes(q) ||
           p.categories?.name?.toLowerCase().includes(q)
  }).sort((a, b) => {
    let valA = ''
    let valB = ''

    if (sortField === 'name') {
      valA = a.name || ''
      valB = b.name || ''
    } else if (sortField === 'team') {
      valA = a.teams?.name || ''
      valB = b.teams?.name || ''
    } else if (sortField === 'category') {
      valA = a.categories?.name || ''
      valB = b.categories?.name || ''
    } else if (sortField === 'chess') {
      const numA = parseInt(a.chess_number, 10)
      const numB = parseInt(b.chess_number, 10)
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDir === 'asc' ? numA - numB : numB - numA
      }
      valA = a.chess_number || ''
      valB = b.chess_number || ''
    }

    const comp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
    return sortDir === 'asc' ? comp : -comp
  })

  const renderSortIndicator = (field) => {
    if (sortField !== field) return <span style={{ opacity: 0.3, marginLeft: 4, fontSize: 11 }}>↕</span>
    return <span style={{ opacity: 0.9, marginLeft: 4, fontSize: 11, color: 'var(--accent)' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
  }

  const PART_COLS = [
    { key: 'name', label: 'name' },
    { key: 'team_name', label: 'team_name' },
    { key: 'category_name', label: 'category_name' },
    { key: 'chess_number', label: 'chess_number' },
  ]
  const PART_SAMPLE = []

  function handleExportCSV() {
    const headers = ['name', 'team_name', 'category_name', 'chess_number']
    const rows = sortedParticipants.map(p => [
      p.name || '',
      p.teams?.name || '',
      p.categories?.name || '',
      p.chess_number || ''
    ])
    const headerLine = headers.join(',')
    const formattedRows = rows.map(row =>
      row.map(val => {
        const str = String(val ?? '')
        return str.includes(',') || str.includes('\n') || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    )
    const csvContent = [headerLine, ...formattedRows].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'participants_backup.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleDownloadAllPDF() {
    if (sortedParticipants.length === 0) return
    try {
      setPdfProgress('0%')
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: [3.5, 2]
      })

      const total = sortedParticipants.length
      for (let i = 0; i < total; i++) {
        const p = sortedParticipants[i]
        setPdfProgress(`${Math.round((i / total) * 100)}%`)
        setPdfParticipant(p)
        
        // Wait for DOM update
        await new Promise(resolve => setTimeout(resolve, 80))
        
        if (!pdfCardRef.current) {
          throw new Error("Temporary card element not mounted properly")
        }
        
        const dataUrl = await toJpeg(pdfCardRef.current, {
          quality: 0.95,
          pixelRatio: 1
        })
        
        if (i > 0) {
          doc.addPage([3.5, 2], 'landscape')
        }
        doc.addImage(dataUrl, 'JPEG', 0, 0, 3.5, 2)
      }
      
      setPdfProgress('Saving...')
      doc.save(`ChestCards_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error("Failed to generate PDF:", err)
      alert("Error generating PDF: " + err.message)
    } finally {
      setPdfProgress(null)
      setPdfParticipant(null)
    }
  }

  async function handleBulkImport(rows) {
    // Fetch current team & category maps for name→id resolution
    const [{ data: tms }, { data: cats }] = await Promise.all([
      supabase.from('teams').select('id, name'),
      supabase.from('categories').select('id, name'),
    ])
    const teamMap = Object.fromEntries((tms || []).map(t => [t.name.toLowerCase(), t.id]))
    const catMap  = Object.fromEntries((cats || []).map(c => [c.name.toLowerCase(), c.id]))

    let imported = 0; const errors = []
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r.name?.trim()) { errors.push({ row: i + 2, msg: 'name required' }); continue }
      const { error } = await supabase.from('participants').insert([{
        name: r.name.trim(),
        team_id: r.team_name?.trim() ? (teamMap[r.team_name.trim().toLowerCase()] || null) : null,
        category_id: r.category_name?.trim() ? (catMap[r.category_name.trim().toLowerCase()] || null) : null,
        chess_number: r.chess_number?.trim() || null,
      }])
      if (error) errors.push({ row: i + 2, msg: error.message }); else imported++
    }
    return { imported, errors }
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (chestCardParticipant) {
          setChestCardParticipant(null)
        } else if (deleteConfirm) {
          setDeleteConfirm(null)
        } else if (bulkMode) {
          setBulkMode(false)
          setSelectedIds([])
        } else if (panelOpen) {
          setPanelOpen(false)
          setEditing(null)
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [chestCardParticipant, deleteConfirm, bulkMode, panelOpen])

  useEffect(() => {
    fetchAll()
    const channel = supabase
      .channel('realtime:participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => { fetchAll(); setSelectedIds([]) })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return
    setDeleteConfirm({
      message: `Are you sure you want to delete ${selectedIds.length} participant(s)? This cannot be undone.`,
      onConfirm: async () => {
        setLoading(true)
        const { error } = await supabase.from('participants').delete().in('id', selectedIds)
        setLoading(false)
        if (error) {
          alert(`Error deleting participants: ${error.message}`)
        } else {
          setSelectedIds([])
          setBulkMode(false)
          fetchAll()
        }
      }
    })
  }

  async function fetchAll(showSpinner = false) {
    if (showSpinner) setFetching(true)
    try {
      const [partsRes, tmsRes, catsRes, colRes] = await Promise.all([
        supabase.from('participants').select('*, teams(id, name), categories(name)').order('created_at', { ascending: false }),
        supabase.from('teams').select('id, name').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('app_settings').select('*').eq('key', 'team_colors')
      ])

      if (partsRes?.data) {
        setParticipants(partsRes.data)
        localStorage.setItem('cache_participants', JSON.stringify(partsRes.data))
      }
      if (colRes?.data && colRes.data.length > 0) {
        const val = colRes.data[0].value
        if (val) {
          try {
            const parsed = JSON.parse(val)
            if (parsed && typeof parsed === 'object') {
              setTeamColors(parsed)
              localStorage.setItem('cache_team_colors', val)
            }
          } catch (e) {
            console.error(e)
          }
        }
      }
      setTeams(tmsRes?.data || [])
      setCategories(catsRes?.data || [])
    } catch (err) {
      console.error('Error fetching participants:', err)
    } finally {
      setFetching(false)
    }
  }

  function startEdit(p) {
    setEditing(p)
    setPName(p.name)
    setTeamId(p.team_id || '')
    setCategoryId(p.category_id || '')
    setChessNumber(p.chess_number || '')
    setError(''); setSuccess('')
    setPanelOpen(true)
  }

  function cancelEdit() {
    setEditing(null)
    setPName(''); setTeamId(''); setCategoryId(''); setChessNumber('')
    setError(''); setSuccess('')
    setPanelOpen(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!pName.trim()) { setError('Participant name is required.'); return }
    setLoading(true); setError(''); setSuccess('')

    const payload = {
      name: pName.trim(),
      team_id: teamId || null,
      category_id: categoryId || null,
      chess_number: chessNumber.trim() || null,
    }

    if (editing) {
      const { error } = await supabase.from('participants').update(payload).eq('id', editing.id)
      setLoading(false)
      if (error) { setError(error.message); return }
      setSuccess('Participant updated!'); cancelEdit()
    } else {
      const { error } = await supabase.from('participants').insert([payload])
      setLoading(false)
      if (error) { setError(error.message); return }
      setSuccess('Participant added!')
      setPName(''); setTeamId(''); setCategoryId(''); setChessNumber('')
    }
    setTimeout(() => setSuccess(''), 2500)
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    const part = participants.find(p => p.id === id)
    const nameStr = part ? ` "${part.name}"` : ""
    setDeleteConfirm({
      message: `Are you sure you want to delete participant${nameStr}? This will permanently remove their records and all their competition registrations.`,
      onConfirm: async () => {
        if (editing?.id === id) cancelEdit()
        await supabase.from('participants').delete().eq('id', id)
      }
    })
  }

  return (
    <>
      <div className={`section-root${panelOpen ? ' panel-open' : ''}`}>
      <div className="section-list">
        <div className="list-header">
          <span className="list-title">All Participants</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            <div style={{ position: 'relative' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                   style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--text-muted)' }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="dash-search-input"
                style={{ paddingLeft: 30, paddingRight: search ? 30 : 10 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search participants…"
              />
              {search && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                     onClick={() => setSearch('')}
                     style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
                     onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
                     onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
            </div>
            <span className="list-count">{sortedParticipants.length} total</span>
            <button
              className={`btn-cancel-edit ${bulkMode ? 'active' : ''}`}
              onClick={() => {
                setBulkMode(!bulkMode)
                if (bulkMode) setSelectedIds([])
              }}
              style={{ background: bulkMode ? 'var(--accent-dim)' : '', borderColor: bulkMode ? 'var(--accent)' : '', color: bulkMode ? 'var(--accent-light)' : '' }}
              title="Toggle Select Mode"
            >
              {bulkMode ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Cancel Selection
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Select
                </>
              )}
            </button>
            {bulkMode ? (
              <>
                {selectedIds.length > 0 ? (
                  <>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent-light)', marginLeft: 10, display: 'inline-block', minWidth: 90, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {selectedIds.length} Selected
                    </span>
                    <button
                      className="btn-cancel-edit"
                      onClick={handleBulkDelete}
                      style={{ background: 'rgba(220, 38, 38, 0.15)', borderColor: 'rgba(220, 38, 38, 0.3)', color: '#ef4444' }}
                    >
                      <IconTrash /> Delete
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 10, display: 'inline-block', minWidth: 90, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    Select items...
                  </span>
                )}
              </>
            ) : (
              <>
                <button
                  className="btn-cancel-edit"
                  onClick={handleDownloadAllPDF}
                  disabled={sortedParticipants.length === 0 || pdfProgress !== null}
                  title="Download all filtered participant cards as a single PDF"
                >
                  {pdfProgress ? (
                    <>
                      <div className="spin" style={{ width: 12, height: 12, borderWidth: 2, marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} />
                      <span>{pdfProgress}</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      Download PDF
                    </>
                  )}
                </button>
                <button
                  className="btn-cancel-edit"
                  onClick={handleExportCSV}
                  title="Export all participants to CSV backup"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export CSV
                </button>
                <button
                  className="btn-submit"
                  onClick={() => { setEditing(null); setMode('add'); setPanelOpen(true) }}
                >
                  <IconPlus /> Add
                </button>
              </>
            )}
          </div>
        </div>
        {fetching ? (
          <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
        ) : participants.length === 0 ? (
          <div className="empty-state"><IconUser /><p>No participants yet.</p></div>
        ) : (
          <div style={{ position: 'relative' }}>
          <table className={`data-table ${bulkMode ? 'bulk-mode-active' : ''}`}>
            <thead>
              <tr>
                {bulkMode && (
                  <th className="th-checkbox">
                    <input
                      type="checkbox"
                      className="bulk-checkbox"
                      checked={selectedIds.length === sortedParticipants.length && sortedParticipants.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(sortedParticipants.map(p => p.id))
                        else setSelectedIds([])
                      }}
                    />
                  </th>
                )}
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none', width: '32%' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    Name {renderSortIndicator('name')}
                  </div>
                </th>
                <th onClick={() => handleSort('team')} style={{ cursor: 'pointer', userSelect: 'none', width: '26%' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    Team {renderSortIndicator('team')}
                  </div>
                </th>
                <th onClick={() => handleSort('category')} style={{ cursor: 'pointer', userSelect: 'none', width: '26%' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    Category {renderSortIndicator('category')}
                  </div>
                </th>
                <th onClick={() => handleSort('chess')} style={{ cursor: 'pointer', userSelect: 'none', width: '11%' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    Chess # {renderSortIndicator('chess')}
                  </div>
                </th>
                <th style={{ width: '5%' }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedParticipants.map((p, index) => {
                const tId = p.team_id || p.teams?.id
                const tColor = (tId && teamColors) ? teamColors[tId] : null
                const isSelected = selectedIds.includes(p.id)
                return (
                  <tr
                    key={p.id}
                    className={`${editing?.id === p.id ? 'row-editing' : ''} ${isSelected ? 'row-selected' : ''}`}
                    onClick={(e) => {
                      if (!bulkMode) return
                      e.stopPropagation()
                      
                      // Clear text selection caused by shift-click
                      if (e.shiftKey && window.getSelection) {
                        window.getSelection().removeAllRanges()
                      }

                      const checked = !isSelected
                      if (e.shiftKey && lastSelectedIndex !== null) {
                        const start = Math.min(index, lastSelectedIndex)
                        const end = Math.max(index, lastSelectedIndex)
                        const rangeIds = sortedParticipants.slice(start, end + 1).map(item => item.id)
                        if (checked) {
                          setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])))
                        } else {
                          setSelectedIds(prev => prev.filter(id => !rangeIds.includes(id)))
                        }
                      } else {
                        if (checked) setSelectedIds(prev => [...prev, p.id])
                        else setSelectedIds(prev => prev.filter(id => id !== p.id))
                      }
                      setLastSelectedIndex(index)
                    }}
                  >
                    {bulkMode && (
                      <td className="td-checkbox">
                        <input
                          type="checkbox"
                          className="bulk-checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            // Handled by tr onClick
                          }}
                        />
                      </td>
                    )}
                    <td className="td-name" style={{ padding: 0 }}>
                      <button
                        className="td-link-plain"
                        style={{
                          textAlign: 'left',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          display: 'block',
                          width: '100%',
                          height: '100%',
                          padding: '12px 14px',
                          background: 'none',
                          border: 'none'
                        }}
                        onClick={async (e) => {
                          e.stopPropagation()
                          setViewingCompetitionsParticipant(p)
                          setLoadingParticipantComps(true)
                          try {
                            const { data: regs, error: regsErr } = await supabase
                              .from('competition_participants')
                              .select('competition_id, competitions:competitions(id, name, competition_type, stages(name), competition_schedule(scheduled_date, estimated_duration_mins))')
                              .eq('participant_id', p.id)
                            
                            if (regsErr) {
                              console.error('Error fetching participant competitions:', regsErr)
                              const { data: simpleRegs } = await supabase
                                .from('competition_participants')
                                .select('competition_id')
                                .eq('participant_id', p.id)
                              
                              if (simpleRegs && simpleRegs.length > 0) {
                                const compIds = simpleRegs.map(r => r.competition_id)
                                const { data: compList } = await supabase
                                  .from('competitions')
                                  .select('id, name, competition_type, stages(name), competition_schedule(scheduled_date, estimated_duration_mins)')
                                  .in('id', compIds)
                                
                                setParticipantComps((compList || []).map(c => ({ competitions: c })))
                              } else {
                                setParticipantComps([])
                              }
                            } else {
                              setParticipantComps(regs || [])
                            }
                          } catch (err) {
                            console.error('Failed to fetch participant competitions:', err)
                            setParticipantComps([])
                          } finally {
                            setLoadingParticipantComps(false)
                          }
                        }}
                      >
                        {p.name}
                      </button>
                    </td>
                    <td>
                      {p.teams?.name ? (
                        <span
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: 11
                          }}
                        >
                          <span style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: tColor || 'var(--text-muted)',
                            flexShrink: 0,
                            boxShadow: tColor ? `0 0 6px ${tColor}` : 'none'
                          }} />
                          {p.teams.name}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                      )}
                    </td>
                    <td>
                      {p.categories?.name
                        ? <button className="td-link-plain" onClick={() => navigateTo('categories')}>{p.categories.name}</button>
                        : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span>{p.chess_number || '—'}</span>
                        <button
                          className="btn-icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            setChestCardParticipant(p)
                          }}
                          title="Generate & Download Chest Card"
                          style={{
                            color: 'var(--accent-light)',
                            background: 'rgba(79, 156, 249, 0.1)',
                            border: '1px solid rgba(79, 156, 249, 0.25)',
                            padding: '3px 6px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                            <rect x="3" y="4" width="18" height="16" rx="2" />
                            <circle cx="9" cy="10" r="2" />
                            <path d="M15 8h2" />
                            <path d="M15 12h2" />
                            <path d="M7 16h10" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-icon" onClick={() => startEdit(p)}><IconEdit /></button>
                        <button className="btn-delete" onClick={(e) => handleDelete(p.id, e)}><IconTrash /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {chestCardParticipant && (
        <ChestCardModal
          participant={chestCardParticipant}
          onClose={() => setChestCardParticipant(null)}
        />
      )}

      <div className="section-form-panel">
        {!editing && (
          <div className="bulk-mode-tabs">
            <button className={`bulk-tab ${mode === 'add' ? 'active' : ''}`} type="button" onClick={() => setMode('add')}>Add</button>
            <button className={`bulk-tab ${mode === 'import' ? 'active' : ''}`} type="button" onClick={() => setMode('import')}>Import CSV</button>
            <button className="btn-cancel-edit" style={{ marginLeft: 'auto' }} onClick={() => { cancelEdit(); setPanelOpen(false) }}>✕</button>
          </div>
        )}
        {editing && (
          <div className="form-panel-header">
            <p className="form-panel-title">Edit Participant</p>
            <button className="btn-cancel-edit" onClick={cancelEdit}>✕ Cancel</button>
          </div>
        )}
        {(mode === 'add' || editing) && (
          <form onSubmit={handleSubmit}>
            <div className="form-fields">
              <div className="field">
                <label className="field-lbl">Participant Name</label>
                <input className="field-inp" value={pName}
                  onChange={e => { setPName(e.target.value); setError('') }} />
              </div>
              <div className="field">
                <label className="field-lbl">Team</label>
                <FormSingleSelect
                  label="Select Team"
                  allItems={teams}
                  selectedId={teamId}
                  onSelect={setTeamId}
                />
              </div>
              <div className="field">
                <label className="field-lbl">Category</label>
                <FormSingleSelect
                  label="Select Category"
                  allItems={categories}
                  selectedId={categoryId}
                  onSelect={setCategoryId}
                />
              </div>
              <div className="field">
                <label className="field-lbl">Chess Number <span style={{ color: 'var(--text-muted)', fontWeight: 400, letterSpacing: 0 }}>(Optional)</span></label>
                <input className="field-inp" value={chessNumber}
                  onChange={e => setChessNumber(e.target.value)} />
              </div>
              {error && <p className="form-error">⚠ {error}</p>}
              {success && <p className="form-success">✓ {success}</p>}
              <button className="btn-submit" type="submit" disabled={loading}>
                {loading ? <span className="spin" /> : editing ? <IconCheck /> : <IconPlus />}
                {loading ? 'Saving...' : editing ? 'Save Changes' : 'Add Participant'}
              </button>
            </div>
          </form>
        )}
        {mode === 'import' && !editing && (
          <BulkImporter columns={PART_COLS} sampleRows={PART_SAMPLE} onImport={handleBulkImport} filename="participants_template.csv" />
        )}
      </div>
    </div>

      {deleteConfirm && createPortal(
        <div className="dash-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="dash-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#e07c7c' }}>
              Confirm Delete
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 20 }}>
              {deleteConfirm.message}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn-cancel-edit" 
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-delete" 
                style={{ padding: '8px 16px', background: '#e07c7c', color: '#0e0b07', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                onClick={async () => {
                  await deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {viewingCompetitionsParticipant && createPortal(
        <div className="db-popup-backdrop" onClick={() => setViewingCompetitionsParticipant(null)}>
          <div className="db-popup" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            {/* Topbar */}
            <div className="db-popup-topbar" style={{ background: 'linear-gradient(90deg, rgba(79,156,249,0.15), transparent)', borderBottom: '1px solid rgba(79,156,249,0.2)' }}>
              <div>
                <span className="db-popup-section">Participant Competitions</span>
                <h2 className="db-popup-title" style={{ color: '#4f9cf9' }}>{viewingCompetitionsParticipant.name}</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="db-popup-count" style={{ color: '#4f9cf9', borderColor: 'rgba(79,156,249,0.3)', background: 'rgba(79,156,249,0.12)' }}>
                  {participantComps.length}
                </span>
                <button className="db-popup-close" onClick={() => setViewingCompetitionsParticipant(null)}>✕</button>
              </div>
            </div>

            {/* Badges info row */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {viewingCompetitionsParticipant.chess_number && (
                <span style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', color: '#F97316', padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <line x1="7" y1="8" x2="17" y2="8" />
                    <line x1="7" y1="12" x2="13" y2="12" />
                    <line x1="7" y1="16" x2="10" y2="16" />
                  </svg>
                  Chess #{viewingCompetitionsParticipant.chess_number}
                </span>
              )}
              {viewingCompetitionsParticipant.teams?.name && (
                <span style={{ background: 'rgba(79,156,249,0.12)', border: '1px solid rgba(79,156,249,0.25)', color: '#4f9cf9', padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                  {viewingCompetitionsParticipant.teams.name}
                </span>
              )}
              {viewingCompetitionsParticipant.categories?.name && (
                <span style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '3px 10px', borderRadius: 4, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  {viewingCompetitionsParticipant.categories.name}
                </span>
              )}
            </div>

            {/* Competitions List */}
            <div className="db-popup-list">
              {loadingParticipantComps ? (
                <div style={{ padding: '24px 0', textAlign: 'center' }}><div className="spin" style={{ borderTopColor: '#4f9cf9' }} /></div>
              ) : participantComps.length === 0 ? (
                <div style={{ padding: '24px 20px', color: 'rgba(255,255,255,0.35)', fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>
                  No competitions registered for this participant.
                </div>
              ) : (
                participantComps.map((r, i) => {
                  const c = r.competitions
                  const sched = Array.isArray(c?.competition_schedule) ? c.competition_schedule[0] : c?.competition_schedule
                  const schedDate = sched?.scheduled_date
                    ? new Date(sched.scheduled_date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
                    : null
                  const isStage = c?.competition_type === 'stage'
                  return (
                    <div key={i} className="db-popup-item">
                      <span className="db-popup-num">{i + 1}</span>
                      <div className="db-popup-info">
                        <span className="db-popup-name">{c?.name}</span>
                        <span className="db-popup-cat" style={{ color: isStage ? '#fb923c' : '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {isStage ? (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                              Stage · {c?.stages?.name || 'Assigned'}
                            </>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 8v8" />
                                <path d="M8 12h8" />
                              </svg>
                              Off-Stage
                            </>
                          )}
                        </span>
                      </div>
                      {schedDate && (
                        <span style={{ fontSize: 11, background: 'rgba(249,115,22,0.12)', color: '#F97316', padding: '2px 8px', borderRadius: 4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          {schedDate}
                        </span>
                      )}
                      <span className="db-popup-dot" style={{ background: isStage ? '#F97316' : '#4f9cf9' }} />
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Hidden Card container for PDF generation */}
      {pdfParticipant && (
        <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', zIndex: -9999 }}>
          <div
            ref={pdfCardRef}
            style={{
              width: 1051,
              height: 574,
              boxSizing: 'border-box',
              position: 'relative',
              backgroundImage: 'url(/chest_card_bg.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              fontFamily: "'Poppins', sans-serif",
              color: '#ffffff',
              padding: '84px 0 223px',
              fontSize: '1.954312rem'
            }}
          >
            <div style={{ margin: '0 auto', position: 'relative', width: 875 }} className="group">
              <div style={{ float: 'left', position: 'relative', width: 209 }}>
                <div
                  style={{
                    width: 209,
                    height: 209,
                    backgroundColor: '#ffffff',
                    padding: 6,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  <QRCodeSVG
                    value={pdfParticipant.chess_number && pdfParticipant.chess_number !== '—' ? `${window.location.origin}/#${pdfParticipant.chess_number}` : window.location.origin}
                    size={197}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                  />
                </div>
                <p
                  style={{
                    margin: '37px 0 0',
                    fontSize: '3.079191rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    lineHeight: 1,
                    color: '#ffffff'
                  }}
                >
                  {pdfParticipant.chess_number || '—'}
                </p>
              </div>
              <p
                style={{
                  float: 'right',
                  margin: '49px 9px 0 0',
                  width: 359,
                  fontWeight: 500,
                  lineHeight: '48.32482px',
                  color: '#ffffff',
                  overflow: 'visible'
                }}
              >
                <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{(pdfParticipant.name || '').toUpperCase()}</span>
                <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{(pdfParticipant.teams?.name || '').toUpperCase()}</span>
                <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{(pdfParticipant.categories?.name || '').toUpperCase()}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
