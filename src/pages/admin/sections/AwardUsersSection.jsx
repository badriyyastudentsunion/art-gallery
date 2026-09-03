// src/pages/admin/sections/AwardUsersSection.jsx
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
const IconAward = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="7"/>
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
  </svg>
)

export default function AwardUsersSection() {
  const [rows, setRows] = useState([])
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    fetchAll()
    const ch = supabase.channel('rt:award_users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'award_users' }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function fetchAll() {
    const { data } = await supabase.from('award_users').select('id, name, username, password, created_at').order('name')
    if (data) {
      setRows(data)
    }
    setFetching(false)
  }

  function startEdit(row, e) {
    e?.stopPropagation()
    setEditing(row)
    setName(row.name)
    setUsername(row.username)
    setPassword(row.password)
    setError('')
    setSuccess('')
    setPanelOpen(true)
  }

  function cancelEdit() {
    setEditing(null)
    setName('')
    setUsername('')
    setPassword('')
    setError('')
    setSuccess('')
    setPanelOpen(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !username.trim() || !password.trim()) {
      setError('All fields required.')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    const payload = {
      name: name.trim(),
      username: username.trim().toLowerCase(),
      password: password.trim()
    }
    if (editing) {
      const { error: err } = await supabase.from('award_users').update(payload).eq('id', editing.id)
      setLoading(false)
      if (err) {
        setError(err.message)
        return
      }
      setSuccess('Distributor updated successfully!')
      setTimeout(() => cancelEdit(), 800)
    } else {
      const { error: err } = await supabase.from('award_users').insert([payload])
      setLoading(false)
      if (err) {
        setError(err.message)
        return
      }
      setSuccess('Award distributor added successfully!')
      setName('')
      setUsername('')
      setPassword('')
      setTimeout(() => setPanelOpen(false), 800)
    }
  }

  async function handleDelete(id, e) {
    e?.stopPropagation()
    setDeleteConfirm({
      message: 'Are you sure you want to delete this distributor account? This cannot be undone.',
      onConfirm: async () => {
        const { error: err } = await supabase.from('award_users').delete().eq('id', id)
        if (err) console.error(err.message)
      }
    })
  }

  return (
    <>
    <div className={`section-root${panelOpen ? ' panel-open' : ''}`}>
      <div className="section-list">
        <div className="list-header">
          <span className="list-title">Award Corner Users</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="list-count">{rows.length} total</span>
            <button
              className="btn-submit"
              style={{ padding: '6px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => { setEditing(null); setPanelOpen(true) }}
            >
              <IconPlus /> Add User
            </button>
          </div>
        </div>
        {fetching ? (
          <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <IconAward />
            <p>No award distributors created yet.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Password</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className={editing?.id === r.id ? 'row-editing' : ''}>
                  <td className="td-name">{r.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>@{r.username}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.password}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
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
        <div className="form-panel-header">
          <p className="form-panel-title">{editing ? 'Edit User' : 'Add User'}</p>
          <button className="btn-cancel-edit" onClick={cancelEdit}>✕</button>
        </div>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-fields">
            <div className="field">
              <label className="field-lbl">Distributor Name</label>
              <input className="field-inp" value={name} onChange={e => { setName(e.target.value); setError('') }} placeholder="e.g. Counter 1" />
            </div>
            <div className="field">
              <label className="field-lbl">Username</label>
              <input className="field-inp" value={username} onChange={e => { setUsername(e.target.value); setError('') }} placeholder="e.g. award1" />
            </div>
            <div className="field">
              <label className="field-lbl">Password</label>
              <input className="field-inp" type="text" value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="Enter password" />
            </div>
            {error && <p className="form-error">⚠ {error}</p>}
            {success && <p className="form-success">✓ {success}</p>}
            <button className="btn-submit" type="submit" disabled={loading}>
              {loading ? <span className="spin" /> : editing ? <IconCheck /> : <IconPlus />}
              {loading ? 'Saving...' : editing ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
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
