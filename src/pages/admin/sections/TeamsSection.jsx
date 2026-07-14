// src/pages/admin/sections/TeamsSection.jsx
import { useState, useEffect } from 'react'
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
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

export default function TeamsSection({ navigateTo }) {
  const [teams, setTeams] = useState(() => {
    try {
      const cached = localStorage.getItem('cache_teams')
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [fetching, setFetching] = useState(() => !teams.length)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mode, setMode] = useState('add') // 'add' | 'import'
  const [editing, setEditing] = useState(null)

  // Drill-down
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [teamParticipants, setTeamParticipants] = useState([])
  const [loadingParts, setLoadingParts] = useState(false)

  // Permissions
  const [globalAssign, setGlobalAssign] = useState(true)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')

  const TEAMS_COLS = [{ key: 'name', label: 'name' }, { key: 'password', label: 'password' }]
  const TEAMS_SAMPLE = []

  async function handleBulkImport(rows) {
    let imported = 0; const errors = []
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r.name?.trim() || !r.password?.trim()) { errors.push({ row: i + 2, msg: 'name and password required' }); continue }
      const { error } = await supabase.from('teams').insert([{ name: r.name.trim(), password: r.password.trim() }])
      if (error) errors.push({ row: i + 2, msg: error.message }); else imported++
    }
    return { imported, errors }
  }

  useEffect(() => {
    fetchTeams()
    fetchSettings()
    const channel = supabase
      .channel('realtime:teams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, fetchTeams)
      .subscribe()

    const channelSettings = supabase
      .channel('realtime:settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchSettings)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(channelSettings)
    }
  }, [])

  async function fetchSettings() {
    const { data } = await supabase.from('settings').select('*').eq('key', 'global_assign').single()
    if (data) {
      setGlobalAssign(data.value === true || data.value === 'true')
    }
  }

  async function toggleGlobalAssign(e) {
    e.stopPropagation()
    const newVal = !globalAssign
    setGlobalAssign(newVal)
    await supabase.from('settings').upsert({ key: 'global_assign', value: newVal })
  }

  async function toggleTeamAssign(teamId, currentVal, e) {
    e.stopPropagation()
    const newVal = !currentVal
    await supabase.from('teams').update({ can_assign: newVal }).eq('id', teamId)
    fetchTeams()
  }

  async function fetchTeams(showSpinner = false) {
    if (showSpinner) setFetching(true)
    const { data } = await supabase.from('teams').select('*').order('created_at', { ascending: false })
    if (data) {
      setTeams(data)
      localStorage.setItem('cache_teams', JSON.stringify(data))
    }
    setFetching(false)
  }

  function startEdit(team) {
    setEditing(team)
    setName(team.name)
    setPassword(team.password)
    setError(''); setSuccess('')
  }

  function cancelEdit() {
    setEditing(null)
    setName(''); setPassword('')
    setError(''); setSuccess('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !password.trim()) { setError('All fields required.'); return }
    setLoading(true); setError(''); setSuccess('')

    if (editing) {
      const { error } = await supabase.from('teams').update({ name: name.trim(), password: password.trim() }).eq('id', editing.id)
      setLoading(false)
      if (error) { setError(error.message); return }
      setSuccess('Team updated!'); cancelEdit()
    } else {
      const { error } = await supabase.from('teams').insert([{ name: name.trim(), password: password.trim() }])
      setLoading(false)
      if (error) { setError(error.message); return }
      setSuccess('Team added!'); setName(''); setPassword('')
    }
    setTimeout(() => setSuccess(''), 2500)
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (editing?.id === id) cancelEdit()
    if (selectedTeam?.id === id) setSelectedTeam(null)
    await supabase.from('teams').delete().eq('id', id)
  }

  async function openTeam(team) {
    setSelectedTeam(team)
    setEditing(null)
    setLoadingParts(true)
    const { data } = await supabase
      .from('participants')
      .select('id, name, categories(name), chess_number')
      .eq('team_id', team.id)
      .order('name')
    setTeamParticipants(data || [])
    setLoadingParts(false)
  }

  return (
    <div className="section-root">
      {/* ── Teams list OR team detail ── */}
      <div className="section-list">

        {selectedTeam ? (
          /* ── Team Detail ── */
          <>
            <div className="list-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
              <button
                className="td-link-plain"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, letterSpacing: 0.5 }}
                onClick={() => setSelectedTeam(null)}
              >
                ← Back to Teams
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'space-between' }}>
                <span className="list-title">{selectedTeam.name}</span>
                <span className="list-count">{teamParticipants.length} participants</span>
              </div>
            </div>

            {loadingParts ? (
              <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
            ) : teamParticipants.length === 0 ? (
              <div className="empty-state">
                <IconUsers />
                <p>No participants in this team yet.</p>
                {navigateTo && (
                  <button className="td-link-plain" style={{ marginTop: 8, fontSize: 12 }}
                    onClick={() => navigateTo('participants')}>
                    Go to Participants →
                  </button>
                )}
              </div>
            ) : (
              <table className="data-table">
                <thead><tr><th>#</th><th>Name</th><th>Category</th><th>Chess #</th></tr></thead>
                <tbody>
                  {teamParticipants.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11, width: 28 }}>{i + 1}</td>
                      <td className="td-name">{p.name}</td>
                      <td>
                        {p.categories?.name
                          ? <button className="td-link-plain" onClick={() => navigateTo?.('categories')}>{p.categories.name}</button>
                          : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--text-muted)' }}>
                        {p.chess_number || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          /* ── Teams List ── */
          <>
            <div className="list-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="list-title">All Teams</span>
                <button
                  className="td-badge-link"
                  style={{
                    fontSize: 9,
                    background: globalAssign ? 'rgba(201,148,63,0.08)' : 'none',
                    borderColor: globalAssign ? 'var(--accent-light)' : 'var(--border-subtle)',
                    color: globalAssign ? 'var(--accent-light)' : 'var(--text-muted)'
                  }}
                  onClick={toggleGlobalAssign}
                >
                  Global Assign: {globalAssign ? 'ON' : 'OFF'}
                </button>
              </div>
              <span className="list-count">{teams.length} total</span>
            </div>
            {fetching ? (
              <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
            ) : teams.length === 0 ? (
              <div className="empty-state"><IconUsers /><p>No teams yet.</p></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Team Name</th><th>Permission</th><th></th></tr></thead>
                <tbody>
                  {teams.map(t => {
                    const effectivelyAllowed = globalAssign && (t.can_assign !== false);
                    return (
                      <tr key={t.id}
                        className={`row-clickable ${editing?.id === t.id ? 'row-editing' : ''}`}
                        onClick={() => openTeam(t)}
                      >
                        <td className="td-name">{t.name}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <button
                            className="td-badge-link"
                            style={{
                              fontSize: 9,
                              background: effectivelyAllowed ? 'rgba(201,148,63,0.08)' : 'rgba(248,113,113,0.05)',
                              borderColor: effectivelyAllowed ? 'rgba(201,148,63,0.3)' : 'rgba(248,113,113,0.2)',
                              color: effectivelyAllowed ? 'var(--accent-light)' : 'var(--error)'
                            }}
                            onClick={(e) => toggleTeamAssign(t.id, t.can_assign !== false, e)}
                          >
                            {effectivelyAllowed ? 'Allowed' : 'Blocked'}
                          </button>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn-icon" onClick={() => startEdit(t)} title="Edit"><IconEdit /></button>
                            <button className="btn-delete" onClick={(e) => handleDelete(t.id, e)} title="Delete"><IconTrash /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* Form / Import Panel */}
      <div className="section-form-panel">
        {/* Tab switcher */}
        {!editing && (
          <div className="bulk-mode-tabs">
            <button className={`bulk-tab ${mode === 'add' ? 'active' : ''}`} type="button" onClick={() => setMode('add')}>Add</button>
            <button className={`bulk-tab ${mode === 'import' ? 'active' : ''}`} type="button" onClick={() => setMode('import')}>Import CSV</button>
          </div>
        )}

        {/* Edit header */}
        {editing && (
          <div className="form-panel-header">
            <p className="form-panel-title">Edit Team</p>
            <button className="btn-cancel-edit" onClick={cancelEdit}>✕ Cancel</button>
          </div>
        )}

        {/* Add / Edit Form */}
        {(mode === 'add' || editing) && (
          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="form-fields">
              <div className="field">
                <label className="field-lbl">Team Name</label>
                <input className="field-inp" value={name}
                  onChange={e => { setName(e.target.value); setError('') }} />
              </div>
              <div className="field">
                <label className="field-lbl">Password</label>
                <input className="field-inp" type={editing ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }} />
              </div>
              {error && <p className="form-error">⚠ {error}</p>}
              {success && <p className="form-success">✓ {success}</p>}
              <button className="btn-submit" type="submit" disabled={loading}>
                {loading ? <span className="spin" /> : editing ? <IconCheck /> : <IconPlus />}
                {loading ? 'Saving...' : editing ? 'Save Changes' : 'Add Team'}
              </button>
            </div>
          </form>
        )}

        {/* Bulk Import */}
        {mode === 'import' && !editing && (
          <BulkImporter
            columns={TEAMS_COLS}
            sampleRows={TEAMS_SAMPLE}
            onImport={handleBulkImport}
            filename="teams_template.csv"
          />
        )}
      </div>
    </div>
  )
}
