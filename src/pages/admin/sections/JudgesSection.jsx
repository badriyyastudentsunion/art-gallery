// src/pages/admin/sections/JudgesSection.jsx
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../lib/supabase'
import '../sections.css'

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
const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z"/>
  </svg>
)

export default function JudgesSection({ navigateTo }) {
  const [rows, setRows] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_judges') || '[]') } catch { return [] }
  })
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [selected, setSelected] = useState(null)
  const [assignedComps, setAssignedComps] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null)

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setBulkMode(false)
        setSelectedIds([])
        setPanelOpen(false)
        setEditing(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    fetchAll()
    const ch = supabase.channel('rt:judges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'judges' }, () => { fetchAll(); setSelectedIds([]) })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function fetchAll() {
    const { data } = await supabase.from('judges').select('id, name, username, password, created_at').order('name')
    if (data) { setRows(data); localStorage.setItem('cache_judges', JSON.stringify(data)) }
    setFetching(false)
  }

  async function openDetail(row) {
    setSelected(row); setEditing(null); setLoadingDetail(true)
    const { data } = await supabase
      .from('competition_judges')
      .select('competition_id, competitions(id, name, categories(name))')
      .eq('judge_id', row.id)
    setAssignedComps((data || []).map(r => r.competitions).filter(Boolean))
    setLoadingDetail(false)
  }

  function startEdit(row, e) {
    e?.stopPropagation()
    setSelected(null)
    setEditing(row); setName(row.name); setUsername(row.username); setPassword(row.password)
    setError(''); setSuccess('')
    setPanelOpen(true)
  }

  function cancelEdit() {
    setEditing(null); setName(''); setUsername(''); setPassword('')
    setError(''); setSuccess('')
    setPanelOpen(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !username.trim() || !password.trim()) { setError('All fields required.'); return }
    setLoading(true); setError(''); setSuccess('')
    const payload = { name: name.trim(), username: username.trim().toLowerCase(), password: password.trim() }
    if (editing) {
      const { error: err } = await supabase.from('judges').update(payload).eq('id', editing.id)
      setLoading(false)
      if (err) { setError(err.message); return }
      setSuccess('Updated!'); cancelEdit()
    } else {
      const { error: err } = await supabase.from('judges').insert([payload])
      setLoading(false)
      if (err) { setError(err.message); return }
      setSuccess('Judge added!'); setName(''); setUsername(''); setPassword('')
    }
    fetchAll()
    setTimeout(() => setSuccess(''), 2500)
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    const judge = rows.find(r => r.id === id)
    const nameStr = judge ? ` "${judge.name}"` : ""
    setDeleteConfirm({
      message: `Are you sure you want to delete judge${nameStr}? This cannot be undone.`,
      onConfirm: async () => {
        if (editing?.id === id) cancelEdit()
        if (selected?.id === id) setSelected(null)
        await supabase.from('judges').delete().eq('id', id)
        fetchAll()
      }
    })
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return
    setDeleteConfirm({
      message: `Are you sure you want to delete ${selectedIds.length} judge(s)? This cannot be undone.`,
      onConfirm: async () => {
        setLoading(true)
        const { error } = await supabase.from('judges').delete().in('id', selectedIds)
        setLoading(false)
        if (error) {
          alert(`Error deleting judges: ${error.message}`)
        } else {
          setSelectedIds([])
          setBulkMode(false)
          fetchAll()
        }
      }
    })
  }

  return (
    <>
      <div className={`section-root${panelOpen ? ' panel-open' : ''}`}>
      <div className="section-list">
        {selected ? (
          <>
            <div className="list-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
              <button className="td-link-plain" style={{ fontSize: 11, letterSpacing: 0.5, display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }} onClick={() => setSelected(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, display: 'block', flexShrink: 0 }}>
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Back to Judges</span>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span className="list-title">{selected.name}</span>
                <span className="list-count" style={{ fontFamily: 'monospace', fontSize: 10 }}>@{selected.username}</span>
              </div>
            </div>
            {loadingDetail ? (
              <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
            ) : (
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent-light)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 12 }}>
                  Assigned Competitions ({assignedComps.length})
                </p>
                {assignedComps.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
                    No competitions assigned — assign from Competitions page.
                  </p>
                ) : (
                  <table className="data-table">
                    <thead><tr><th>Competition</th><th>Category</th></tr></thead>
                    <tbody>
                      {assignedComps.map(c => (
                        <tr key={c.id} className="row-clickable" onClick={() => navigateTo?.('competitions')}>
                          <td className="td-name">{c.name}</td>
                          <td>{c.categories?.name ? <span className="td-badge">{c.categories.name}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="list-header">
              <span className="list-title">All Judges</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                <span className="list-count">{rows.length} total</span>
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
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent-light)', marginLeft: 10 }}>
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
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 10 }}>
                        Select items...
                      </span>
                    )}
                  </>
                ) : (
                  <button
                    className="btn-submit"
                    style={{ padding: '6px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => { setEditing(null); setSelected(null); setPanelOpen(true) }}
                  >
                    <IconPlus /> Add
                  </button>
                )}
              </div>
            </div>
            {fetching ? (
              <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
            ) : rows.length === 0 ? (
              <div className="empty-state"><IconStar /><p>No judges yet.</p></div>
            ) : (
              <table className={`data-table ${bulkMode ? 'bulk-mode-active' : ''}`}>
                <thead>
                  <tr>
                    {bulkMode && (
                      <th className="th-checkbox">
                        <input
                          type="checkbox"
                          className="bulk-checkbox"
                          checked={selectedIds.length === rows.length && rows.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds(rows.map(r => r.id))
                            else setSelectedIds([])
                          }}
                        />
                      </th>
                    )}
                    <th>Name</th>
                    <th>Username</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, index) => {
                    const isSelected = selectedIds.includes(r.id)
                    return (
                    <tr key={r.id}
                      className={`row-clickable ${editing?.id === r.id ? 'row-editing' : ''} ${isSelected ? 'row-selected' : ''}`}
                      onClick={(e) => {
                        if (!bulkMode) {
                          openDetail(r)
                          return
                        }
                        e.stopPropagation()
                        if (e.shiftKey && window.getSelection) {
                          window.getSelection().removeAllRanges()
                        }
                        const checked = !isSelected
                        if (e.shiftKey && lastSelectedIndex !== null) {
                          const start = Math.min(index, lastSelectedIndex)
                          const end = Math.max(index, lastSelectedIndex)
                          const rangeIds = rows.slice(start, end + 1).map(item => item.id)
                          if (checked) {
                            setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])))
                          } else {
                            setSelectedIds(prev => prev.filter(id => !rangeIds.includes(id)))
                          }
                        } else {
                          if (checked) setSelectedIds(prev => [...prev, r.id])
                          else setSelectedIds(prev => prev.filter(id => id !== r.id))
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
                      <td className="td-name">{r.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>@{r.username}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" onClick={e => startEdit(r, e)}><IconEdit /></button>
                          <button className="btn-delete" onClick={e => handleDelete(r.id, e)}><IconTrash /></button>
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
        <div className="form-panel-header">
          <p className="form-panel-title">{editing ? 'Edit Judge' : 'Add Judge'}</p>
          <button className="btn-cancel-edit" onClick={cancelEdit}>✕</button>
        </div>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-fields">
            <div className="field">
              <label className="field-lbl">Full Name</label>
              <input className="field-inp" value={name} onChange={e => { setName(e.target.value); setError('') }} />
            </div>
            <div className="field">
              <label className="field-lbl">Username</label>
              <input className="field-inp" value={username} onChange={e => { setUsername(e.target.value); setError('') }} />
            </div>
            <div className="field">
              <label className="field-lbl">Password</label>
              <input className="field-inp" type={editing ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError('') }} />
            </div>
            {error && <p className="form-error">⚠ {error}</p>}
            {success && <p className="form-success">✓ {success}</p>}
            <button className="btn-submit" type="submit" disabled={loading}>
              {loading ? <span className="spin" /> : editing ? <IconCheck /> : <IconPlus />}
              {loading ? 'Saving...' : editing ? 'Save Changes' : 'Add Judge'}
            </button>
          </div>
        </form>
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
    </>
  )
}