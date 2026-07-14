// src/pages/admin/sections/CompetitionsSection.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import '../sections.css'
import './competitions.css'
import BulkImporter from '../../../components/BulkImporter'

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
const IconTrophy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
  </svg>
)
const IconChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

function Checkbox({ checked, onChange, label }) {
  return (
    <label className="field-check" onClick={onChange} style={{ userSelect: 'none' }}>
      <div className={`check-box ${checked ? 'checked' : ''}`} />
      <span className={`check-label ${checked ? 'checked' : ''}`}>{label}</span>
    </label>
  )
}

// ── Inline multi-select dropdown ──
function MultiSelectDropdown({ label, allItems, selectedIds, onToggle, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedCount = selectedIds.length

  return (
    <div className="ci-dropdown" ref={ref}>
      <button
        type="button"
        className={`ci-dropdown-btn ${selectedCount > 0 ? 'ci-dropdown-btn--filled' : ''}`}
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        disabled={disabled}
      >
        <span>{selectedCount > 0 ? `${label} · ${selectedCount}` : label}</span>
        <IconChevron />
      </button>
      {open && (
        <div className="ci-dropdown-menu" onClick={e => e.stopPropagation()}>
          {allItems.length === 0 ? (
            <p className="ci-dropdown-empty">No {label.toLowerCase()}s yet</p>
          ) : (
            allItems.map(item => {
              const isSelected = selectedIds.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`ci-dropdown-item ${isSelected ? 'ci-dropdown-item--selected' : ''}`}
                  onClick={() => onToggle(item.id, isSelected)}
                  disabled={disabled}
                >
                  <span className="ci-dropdown-check">{isSelected ? '✓' : ''}</span>
                  <span>{item.name}</span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ── Inline single-select dropdown ──
function SingleSelectDropdown({ label, allItems, selectedId, onSelect, disabled }) {
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
    <div className="ci-dropdown" ref={ref}>
      <button
        type="button"
        className={`ci-dropdown-btn ${selected ? 'ci-dropdown-btn--filled' : ''}`}
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        disabled={disabled}
      >
        <span>{selected ? selected.name : label}</span>
        <IconChevron />
      </button>
      {open && (
        <div className="ci-dropdown-menu" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            className="ci-dropdown-item"
            onClick={() => { onSelect(null); setOpen(false) }}
            disabled={disabled}
          >
            <span className="ci-dropdown-check">{!selectedId ? '✓' : ''}</span>
            <span style={{ color: 'var(--text-muted)' }}>— None —</span>
          </button>
          {allItems.map(item => (
            <button
              key={item.id}
              type="button"
              className={`ci-dropdown-item ${selectedId === item.id ? 'ci-dropdown-item--selected' : ''}`}
              onClick={() => { onSelect(item.id); setOpen(false) }}
              disabled={disabled}
            >
              <span className="ci-dropdown-check">{selectedId === item.id ? '✓' : ''}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
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

export default function CompetitionsSection({ navigateTo }) {
  const [competitions, setCompetitions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_competitions') || '[]') } catch { return [] }
  })
  const [categories, setCategories] = useState([])
  const [allStages, setAllStages] = useState([])
  const [allInvig, setAllInvig] = useState([])
  const [allJudges, setAllJudges] = useState([])
  const [allAnnouncers, setAllAnnouncers] = useState([])
  // map: competition_id → { invig: [id,...], judges: [id,...] }
  const [assignMap, setAssignMap] = useState({})
  const [participantCounts, setParticipantCounts] = useState({})

  const [fetching, setFetching] = useState(() => !competitions.length)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(null)
  const [search, setSearch] = useState('')

  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('1')
  const [competitionType, setCompetitionType] = useState('off-stage') // 'stage' | 'off-stage'
  const [groupSize, setGroupSize] = useState('1') // 1=individual, 2, 3, 45
  const [mode, setMode] = useState('add')

  // Participants drill-down
  const [selected, setSelected] = useState(null)
  const [assigned, setAssigned] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [removing, setRemoving] = useState(false)

  const COMP_COLS = [
    { key: 'name', label: 'name' },
    { key: 'category_name', label: 'category_name' },
    { key: 'max_participants', label: 'max_participants' },
    { key: 'is_stage', label: 'is_stage' },
    { key: 'is_group', label: 'is_group' },
  ]
  const COMP_SAMPLE = []

  async function handleBulkImport(rows) {
    const { data: cats } = await supabase.from('categories').select('id, name')
    const catMap = Object.fromEntries((cats || []).map(c => [c.name.toLowerCase(), c.id]))
    let imported = 0; const errors = []
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r.name?.trim()) { errors.push({ row: i + 2, msg: 'name required' }); continue }
      const { error } = await supabase.from('competitions').insert([{
        name: r.name.trim(),
        category_id: r.category_name?.trim() ? (catMap[r.category_name.trim().toLowerCase()] || null) : null,
        max_participants: parseInt(r.max_participants) || 1,
        is_stage: r.is_stage?.toLowerCase() === 'true' || r.is_stage === '1',
        is_group: r.is_group?.toLowerCase() === 'true' || r.is_group === '1',
      }])
      if (error) errors.push({ row: i + 2, msg: error.message }); else imported++
    }
    return { imported, errors }
  }

  useEffect(() => {
    fetchAll()
    const channel = supabase
      .channel('realtime:competitions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchAll() {
    const [
      { data: comps },
      { data: cats },
      { data: stages },
      { data: invigs },
      { data: judges },
      { data: announcers },
      { data: ciRows },
      { data: cjRows },
      { data: cpRows },
    ] = await Promise.all([
      supabase.from('competitions').select('*, categories(name), stages(name), announcers(name)').order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('stages').select('id, name').order('name'),
      supabase.from('invigilators').select('id, name').order('name'),
      supabase.from('judges').select('id, name').order('name'),
      supabase.from('announcers').select('id, name').order('name'),
      supabase.from('competition_invigilators').select('competition_id, invigilator_id'),
      supabase.from('competition_judges').select('competition_id, judge_id'),
      supabase.from('competition_participants').select('competition_id'),
    ])

    if (comps) {
      setCompetitions(comps)
      localStorage.setItem('cache_competitions', JSON.stringify(comps))
    }
    setCategories(cats || [])
    setAllStages(stages || [])
    setAllInvig(invigs || [])
    setAllJudges(judges || [])
    setAllAnnouncers(announcers || [])

    // Build assignment map
    const map = {}
    ;(comps || []).forEach(c => { map[c.id] = { invig: [], judges: [] } })
    ;(ciRows || []).forEach(r => { if (map[r.competition_id]) map[r.competition_id].invig.push(r.invigilator_id) })
    ;(cjRows || []).forEach(r => { if (map[r.competition_id]) map[r.competition_id].judges.push(r.judge_id) })
    setAssignMap(map)

    // Build participant counts map
    const counts = {}
    ;(comps || []).forEach(c => { counts[c.id] = 0 })
    ;(cpRows || []).forEach(r => {
      if (counts[r.competition_id] !== undefined) {
        counts[r.competition_id]++
      }
    })
    setParticipantCounts(counts)

    setFetching(false)
  }

  // ── Inline assignment handlers ──

  async function handleStageChange(compId, stageId) {
    setSaving(compId)
    await supabase.from('competitions').update({ stage_id: stageId }).eq('id', compId)
    await fetchAll()
    setSaving(null)
  }

  async function handleAnnouncerChange(compId, announcerId) {
    setSaving(compId)
    await supabase.from('competitions').update({ announcer_id: announcerId }).eq('id', compId)
    await fetchAll()
    setSaving(null)
  }

  async function handleToggleInvig(compId, invigId, isAssigned) {
    setSaving(compId)
    if (isAssigned) {
      await supabase.from('competition_invigilators').delete().eq('competition_id', compId).eq('invigilator_id', invigId)
    } else {
      await supabase.from('competition_invigilators').insert([{ competition_id: compId, invigilator_id: invigId }])
    }
    await fetchAll()
    setSaving(null)
  }

  async function handleToggleJudge(compId, judgeId, isAssigned) {
    setSaving(compId)
    if (isAssigned) {
      await supabase.from('competition_judges').delete().eq('competition_id', compId).eq('judge_id', judgeId)
    } else {
      await supabase.from('competition_judges').insert([{ competition_id: compId, judge_id: judgeId }])
    }
    await fetchAll()
    setSaving(null)
  }

  // ── Participants detail ──

  async function openParticipants(comp, e) {
    e.stopPropagation()
    setSelected(comp); setEditing(null); setLoadingDetail(true)
    const { data } = await supabase
      .from('competition_participants')
      .select('participant_id, participants(id, name, chess_number, teams(name))')
      .eq('competition_id', comp.id)
    setAssigned((data || []).map(r => r.participants).filter(Boolean))
    setLoadingDetail(false)
  }

  async function removeParticipant(participantId) {
    if (!selected) return
    setRemoving(true)
    await supabase.from('competition_participants').delete()
      .eq('competition_id', selected.id).eq('participant_id', participantId)
    const { data } = await supabase
      .from('competition_participants')
      .select('participant_id, participants(id, name, chess_number, teams(name))')
      .eq('competition_id', selected.id)
    setAssigned((data || []).map(r => r.participants).filter(Boolean))
    setRemoving(false)
  }

  // ── Edit / Submit ──

  function startEdit(comp, e) {
    e?.stopPropagation()
    setSelected(null)
    setEditing(comp)
    setName(comp.name)
    setCategoryId(comp.category_id || '')
    setMaxParticipants(String(comp.max_participants || 1))
    setCompetitionType(comp.competition_type || (comp.is_stage ? 'stage' : 'off-stage'))
    setGroupSize(String(comp.group_size || 1))
    setError(''); setSuccess('')
  }

  function cancelEdit() {
    setEditing(null)
    setName(''); setCategoryId(''); setMaxParticipants('1'); setCompetitionType('off-stage'); setGroupSize('1')
    setError(''); setSuccess('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Competition name is required.'); return }
    setLoading(true); setError(''); setSuccess('')
    const gs = parseInt(groupSize) || 1
    const payload = {
      name: name.trim(),
      category_id: categoryId || null,
      max_participants: parseInt(maxParticipants) || 1,
      competition_type: competitionType,
      is_stage: competitionType === 'stage',
      group_size: gs,
      is_group: gs > 1,
    }
    if (editing) {
      const { error } = await supabase.from('competitions').update(payload).eq('id', editing.id)
      setLoading(false)
      if (error) { setError(error.message); return }
      setSuccess('Competition updated!'); cancelEdit()
    } else {
      const { error } = await supabase.from('competitions').insert([payload])
      setLoading(false)
      if (error) { setError(error.message); return }
      setSuccess('Competition added!')
      setName(''); setCategoryId(''); setMaxParticipants('1'); setCompetitionType('off-stage'); setGroupSize('1')
    }
    setTimeout(() => setSuccess(''), 2500)
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (editing?.id === id) cancelEdit()
    await supabase.from('competitions').delete().eq('id', id)
  }

  return (
    <div className="section-root">
      <div className="section-list">

        {selected ? (
          /* ── Participants Detail ── */
          <>
            <div className="list-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
              <button className="td-link-plain" style={{ fontSize: 11, letterSpacing: 0.5 }} onClick={() => setSelected(null)}>
                ← Back to Competitions
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span className="list-title">{selected.name}</span>
                <span className="list-count">{assigned.length} / {selected.max_participants} assigned</span>
              </div>
            </div>

            {loadingDetail ? (
              <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
            ) : assigned.length === 0 ? (
              <div className="empty-state">
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No participants assigned — teams assign from their dashboard.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Name</th><th>Team</th><th>Chess #</th></tr></thead>
                <tbody>
                  {assigned.map(p => (
                    <tr key={p.id}>
                      <td className="td-name">{p.name}</td>
                      <td>{p.teams?.name ? <span className="td-badge">{p.teams.name}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--text-muted)' }}>{p.chess_number || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          /* ── Competitions List in a beautiful structured Table with inline dropdowns ── */
          <>
            <div className="list-header" style={{ gap: 10 }}>
              <span className="list-title">All Competitions</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                <input
                  className="field-inp"
                  style={{ padding: '5px 10px', fontSize: 12, width: 180 }}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search competitions…"
                />
                <span className="list-count">{competitions.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.categories?.name?.toLowerCase().includes(search.toLowerCase())).length} total</span>
              </div>
            </div>
            {fetching ? (
              <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
            ) : competitions.length === 0 ? (
              <div className="empty-state"><IconTrophy /><p>No competitions yet.</p></div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Competition</th>
                    <th>Stage</th>
                    <th>Invigilator</th>
                    <th>Judge</th>
                    <th>Announcer</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {competitions
                    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.categories?.name?.toLowerCase().includes(search.toLowerCase()))
                    .map(c => {
                    const isSaving = saving === c.id
                    const myInvig = assignMap[c.id]?.invig || []
                    const myJudges = assignMap[c.id]?.judges || []
                    return (
                      <tr key={c.id} className={editing?.id === c.id ? 'row-editing' : ''}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span className="td-name">{c.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {c.categories?.name && (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                                  {c.categories.name}
                                </span>
                              )}
                              <button
                                onClick={e => openParticipants(c, e)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'rgba(201, 148, 63, 0.06)',
                                  border: '1px solid rgba(201, 148, 63, 0.15)',
                                  color: 'var(--accent-light)',
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                  fontFamily: 'inherit',
                                  transition: 'all 0.15s'
                                }}
                                className="ci-participants-badge"
                                title="View participants"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                  <circle cx="9" cy="7" r="4" />
                                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                                <span style={{ fontWeight: 600 }}>
                                  {participantCounts[c.id] || 0} / {c.max_participants}
                                </span>
                              </button>
                            </div>
                          </div>
                        </td>
                        <td>
                          <SingleSelectDropdown
                            label="Stage"
                            allItems={allStages}
                            selectedId={c.stage_id}
                            onSelect={id => handleStageChange(c.id, id)}
                            disabled={isSaving}
                          />
                        </td>
                        <td>
                          <MultiSelectDropdown
                            label="Invigilator"
                            allItems={allInvig}
                            selectedIds={myInvig}
                            onToggle={(id, isA) => handleToggleInvig(c.id, id, isA)}
                            disabled={isSaving}
                          />
                        </td>
                        <td>
                          <MultiSelectDropdown
                            label="Judge"
                            allItems={allJudges}
                            selectedIds={myJudges}
                            onToggle={(id, isA) => handleToggleJudge(c.id, id, isA)}
                            disabled={isSaving}
                          />
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          {/* Announcer: single click assign/unassign */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {allAnnouncers.length === 0
                              ? <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                              : allAnnouncers.map(ann => {
                                  const isAssigned = c.announcer_id === ann.id
                                  return (
                                    <button key={ann.id} type="button"
                                      onClick={() => handleAnnouncerChange(c.id, isAssigned ? null : ann.id)}
                                      disabled={isSaving}
                                      style={{
                                        fontSize: 10, padding: '2px 7px', borderRadius: 3,
                                        border: `1px solid ${isAssigned ? 'rgba(201,148,63,0.4)' : 'var(--border-subtle)'}`,
                                        background: isAssigned ? 'rgba(201,148,63,0.12)' : 'transparent',
                                        color: isAssigned ? 'var(--accent-light)' : 'var(--text-muted)',
                                        cursor: 'pointer', fontFamily: 'inherit',
                                        transition: 'all 0.15s',
                                      }}
                                    >
                                      {isAssigned ? '✓ ' : ''}{ann.name}
                                    </button>
                                  )
                                })
                            }
                          </div>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                            {isSaving && <div className="spin" style={{ width: 12, height: 12, borderTopColor: 'var(--accent-light)' }} />}
                            <button className="btn-icon" onClick={e => { e.stopPropagation(); startEdit(c, e) }}><IconEdit /></button>
                            <button className="btn-delete" onClick={e => { e.stopPropagation(); handleDelete(c.id, e) }}><IconTrash /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      <div className="section-form-panel">
        {!editing && (
          <div className="bulk-mode-tabs">
            <button className={`bulk-tab ${mode === 'add' ? 'active' : ''}`} type="button" onClick={() => setMode('add')}>Add</button>
            <button className={`bulk-tab ${mode === 'import' ? 'active' : ''}`} type="button" onClick={() => setMode('import')}>Import CSV</button>
          </div>
        )}
        {editing && (
          <div className="form-panel-header">
            <p className="form-panel-title">Edit Competition</p>
            <button className="btn-cancel-edit" onClick={cancelEdit}>✕ Cancel</button>
          </div>
        )}
        {(mode === 'add' || editing) && (
          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="form-fields">
              <div className="field">
                <label className="field-lbl">Competition Name</label>
                <input className="field-inp" value={name}
                  onChange={e => { setName(e.target.value); setError('') }} />
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
                <label className="field-lbl">Maximum Participants</label>
                <input className="field-inp" type="number" min="1" value={maxParticipants}
                  onChange={e => setMaxParticipants(e.target.value)} />
              </div>
              <div className="field">
                <label className="field-lbl">Competition Type</label>
                <div className="radio-group">
                  {[['off-stage', 'Off-Stage'], ['stage', 'Stage']].map(([val, lbl]) => (
                    <label key={val} className={`radio-opt ${competitionType === val ? 'active' : ''}`}
                      onClick={() => setCompetitionType(val)}>
                      <span className={`radio-dot ${competitionType === val ? 'active' : ''}`} />
                      {lbl}
                    </label>
                  ))}
                </div>
              </div>
              <div className="field">
                <label className="field-lbl">Group Size</label>
                <div className="radio-group">
                  {[['1','Individual'],['2','2 Members'],['3','3 Members'],['45','4–5 Members']].map(([val, lbl]) => (
                    <label key={val} className={`radio-opt ${groupSize === val ? 'active' : ''}`}
                      onClick={() => setGroupSize(val)}>
                      <span className={`radio-dot ${groupSize === val ? 'active' : ''}`} />
                      {lbl}
                    </label>
                  ))}
                </div>
              </div>
              {error && <p className="form-error">⚠ {error}</p>}
              {success && <p className="form-success">✓ {success}</p>}
              <button className="btn-submit" type="submit" disabled={loading}>
                {loading ? <span className="spin" /> : editing ? <IconCheck /> : <IconPlus />}
                {loading ? 'Saving...' : editing ? 'Save Changes' : 'Add Competition'}
              </button>
            </div>
          </form>
        )}
        {mode === 'import' && !editing && (
          <BulkImporter
            columns={COMP_COLS}
            sampleRows={COMP_SAMPLE}
            onImport={handleBulkImport}
            filename="competitions_template.csv"
          />
        )}
      </div>
    </div>
  )
}
