// src/pages/admin/sections/StagesSection.jsx
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
const IconStage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18"/><path d="M9 21V9"/>
  </svg>
)

export default function StagesSection() {
  const [rows, setRows] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_stages') || '[]') } catch { return [] }
  })
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(null)

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [capacity, setCapacity] = useState('')

  useEffect(() => {
    fetchAll()
    const ch = supabase.channel('rt:stages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stages' }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function fetchAll() {
    const { data } = await supabase.from('stages').select('*').order('name')
    if (data) { setRows(data); localStorage.setItem('cache_stages', JSON.stringify(data)) }
    setFetching(false)
  }

  function startEdit(row, e) {
    e?.stopPropagation()
    setEditing(row); setName(row.name); setLocation(row.location || ''); setCapacity(String(row.capacity || ''))
    setError(''); setSuccess('')
  }

  function cancelEdit() {
    setEditing(null); setName(''); setLocation(''); setCapacity('')
    setError(''); setSuccess('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Stage name is required.'); return }
    setLoading(true); setError(''); setSuccess('')
    const payload = {
      name: name.trim(),
      location: location.trim() || null,
      capacity: parseInt(capacity) || 0,
    }
    if (editing) {
      const { error: err } = await supabase.from('stages').update(payload).eq('id', editing.id)
      setLoading(false)
      if (err) { setError(err.message); return }
      setSuccess('Updated!'); cancelEdit()
    } else {
      const { error: err } = await supabase.from('stages').insert([payload])
      setLoading(false)
      if (err) { setError(err.message); return }
      setSuccess('Stage added!'); setName(''); setLocation(''); setCapacity('')
    }
    fetchAll()
    setTimeout(() => setSuccess(''), 2500)
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (editing?.id === id) cancelEdit()
    await supabase.from('stages').delete().eq('id', id)
    fetchAll()
  }

  return (
    <div className="section-root">
      <div className="section-list">
        <div className="list-header">
          <span className="list-title">All Stages</span>
          <span className="list-count">{rows.length} total</span>
        </div>
        {fetching ? (
          <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
        ) : rows.length === 0 ? (
          <div className="empty-state"><IconStage /><p>No stages yet.</p></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Location</th><th>Capacity</th><th></th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className={`row-clickable ${editing?.id === r.id ? 'row-editing' : ''}`}>
                  <td className="td-name">{r.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.location || '—'}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--text-muted)' }}>
                    {r.capacity > 0 ? r.capacity : '—'}
                  </td>
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
      </div>

      <div className="section-form-panel">
        {editing && (
          <div className="form-panel-header">
            <p className="form-panel-title">Edit Stage</p>
            <button className="btn-cancel-edit" onClick={cancelEdit}>✕ Cancel</button>
          </div>
        )}
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-fields">
            <div className="field">
              <label className="field-lbl">Stage Name</label>
              <input className="field-inp" value={name} onChange={e => { setName(e.target.value); setError('') }} />
            </div>
            <div className="field">
              <label className="field-lbl">Location <span style={{ opacity: 0.5 }}>(optional)</span></label>
              <input className="field-inp" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-lbl">Capacity <span style={{ opacity: 0.5 }}>(optional)</span></label>
              <input className="field-inp" type="number" min="0" value={capacity} onChange={e => setCapacity(e.target.value)} />
            </div>
            {error && <p className="form-error">⚠ {error}</p>}
            {success && <p className="form-success">✓ {success}</p>}
            <button className="btn-submit" type="submit" disabled={loading}>
              {loading ? <span className="spin" /> : editing ? <IconCheck /> : <IconPlus />}
              {loading ? 'Saving...' : editing ? 'Save Changes' : 'Add Stage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}