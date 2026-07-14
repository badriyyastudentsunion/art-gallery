// src/pages/admin/sections/ParticipantsSection.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import '../sections.css'
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
  const [fetching, setFetching] = useState(() => !participants.length)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(null)
  const [mode, setMode] = useState('add')

  const [pName, setPName] = useState('')
  const [teamId, setTeamId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [chessNumber, setChessNumber] = useState('')

  const PART_COLS = [
    { key: 'name', label: 'name' },
    { key: 'team_name', label: 'team_name' },
    { key: 'category_name', label: 'category_name' },
    { key: 'chess_number', label: 'chess_number' },
  ]
  const PART_SAMPLE = []

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
    fetchAll()
    const channel = supabase
      .channel('realtime:participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchAll(showSpinner = false) {
    if (showSpinner) setFetching(true)
    const [{ data: parts }, { data: tms }, { data: cats }] = await Promise.all([
      supabase.from('participants').select('*, teams(name), categories(name)').order('created_at', { ascending: false }),
      supabase.from('teams').select('id, name').order('name'),
      supabase.from('categories').select('id, name').order('name'),
    ])
    if (parts) {
      setParticipants(parts)
      localStorage.setItem('cache_participants', JSON.stringify(parts))
    }
    setTeams(tms || [])
    setCategories(cats || [])
    setFetching(false)
  }

  function startEdit(p) {
    setEditing(p)
    setPName(p.name)
    setTeamId(p.team_id || '')
    setCategoryId(p.category_id || '')
    setChessNumber(p.chess_number || '')
    setError(''); setSuccess('')
  }

  function cancelEdit() {
    setEditing(null)
    setPName(''); setTeamId(''); setCategoryId(''); setChessNumber('')
    setError(''); setSuccess('')
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
    if (editing?.id === id) cancelEdit()
    await supabase.from('participants').delete().eq('id', id)
  }

  return (
    <div className="section-root">
      <div className="section-list">
        <div className="list-header">
          <span className="list-title">All Participants</span>
          <span className="list-count">{participants.length} total</span>
        </div>
        {fetching ? (
          <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
        ) : participants.length === 0 ? (
          <div className="empty-state"><IconUser /><p>No participants yet.</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Team</th><th>Category</th><th>Chess #</th><th></th></tr>
            </thead>
            <tbody>
              {participants.map(p => (
                <tr key={p.id} className={editing?.id === p.id ? 'row-editing' : ''}>
                  <td className="td-name">{p.name}</td>
                  <td>
                    {p.teams?.name
                      ? <button className="td-badge-link" onClick={() => navigateTo('teams')}>{p.teams.name}</button>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                  </td>
                  <td>
                    {p.categories?.name
                      ? <button className="td-link-plain" onClick={() => navigateTo('categories')}>{p.categories.name}</button>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{p.chess_number || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-icon" onClick={() => startEdit(p)}><IconEdit /></button>
                      <button className="btn-delete" onClick={(e) => handleDelete(p.id, e)}><IconTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  )
}
