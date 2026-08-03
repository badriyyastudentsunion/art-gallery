// src/pages/admin/sections/InvigilatorsSection.jsx
import { useState, useEffect } from 'react'
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
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <circle cx="12" cy="11" r="3"/>
  </svg>
)

export default function InvigilatorsSection({ navigateTo }) {
  const [rows, setRows] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_invigilators') || '[]') } catch { return [] }
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

  useEffect(() => {
    fetchAll()
    const ch = supabase.channel('rt:invigilators')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invigilators' }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function fetchAll() {
    const { data } = await supabase.from('invigilators').select('*').order('name')
    if (data) { setRows(data); localStorage.setItem('cache_invigilators', JSON.stringify(data)) }
    setFetching(false)
  }

  async function openDetail(row) {
    setSelected(row); setEditing(null); setLoadingDetail(true)
    const { data } = await supabase
      .from('competition_invigilators')
      .select('competition_id, competitions(id, name, categories(name))')
      .eq('invigilator_id', row.id)
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
      const { error: err } = await supabase.from('invigilators').update(payload).eq('id', editing.id)
      setLoading(false)
      if (err) { setError(err.message); return }
      setSuccess('Updated!'); cancelEdit()
    } else {
      const { error: err } = await supabase.from('invigilators').insert([payload])
      setLoading(false)
      if (err) { setError(err.message); return }
      setSuccess('Invigilator added!'); setName(''); setUsername(''); setPassword('')
    }
    fetchAll()
    setTimeout(() => setSuccess(''), 2500)
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (editing?.id === id) cancelEdit()
    if (selected?.id === id) setSelected(null)
    await supabase.from('invigilators').delete().eq('id', id)
    fetchAll()
  }

  return (
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
                <span>Back to Invigilators</span>
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
              <span className="list-title">All Invigilators</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="list-count">{rows.length} total</span>
                <button
                  className="btn-submit"
                  style={{ padding: '6px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => { setEditing(null); setSelected(null); setPanelOpen(true) }}
                >
                  <IconPlus /> Add
                </button>
              </div>
            </div>
            {fetching ? (
              <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
            ) : rows.length === 0 ? (
              <div className="empty-state"><IconShield /><p>No invigilators yet.</p></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Name</th><th>Username</th><th></th></tr></thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id}
                      className={`row-clickable ${editing?.id === r.id ? 'row-editing' : ''}`}
                      onClick={() => openDetail(r)}
                    >
                      <td className="td-name">{r.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>@{r.username}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" onClick={e => startEdit(r, e)}><IconEdit /></button>
                          <button className="btn-delete" onClick={e => handleDelete(r.id, e)}><IconTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      <div className="section-form-panel">
        <div className="form-panel-header">
          <p className="form-panel-title">{editing ? 'Edit Invigilator' : 'Add Invigilator'}</p>
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
              {loading ? 'Saving...' : editing ? 'Save Changes' : 'Add Invigilator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}