// src/pages/admin/sections/CategoriesSection.jsx
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
const IconTag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
)

export default function CategoriesSection({ navigateTo }) {
  const [categories, setCategories] = useState(() => {
    try {
      const cached = localStorage.getItem('cache_categories')
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [fetching, setFetching] = useState(() => !categories.length)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(null)
  const [mode, setMode] = useState('add')
  const [name, setName] = useState('')
  const [isGeneral, setIsGeneral] = useState(false)

  // Drill-down
  const [selected, setSelected] = useState(null)
  const [detailComps, setDetailComps] = useState([])
  const [detailParts, setDetailParts] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailTab, setDetailTab] = useState('competitions') // 'competitions' | 'participants'

  const CATS_COLS = [{ key: 'name', label: 'name' }]
  const CATS_SAMPLE = []

  async function handleBulkImport(rows) {
    let imported = 0; const errors = []
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r.name?.trim()) { errors.push({ row: i + 2, msg: 'name required' }); continue }
      const { error } = await supabase.from('categories').insert([{ name: r.name.trim() }])
      if (error) errors.push({ row: i + 2, msg: error.code === '23505' ? 'already exists' : error.message }); else imported++
    }
    return { imported, errors }
  }

  useEffect(() => {
    fetchCategories()
    const channel = supabase
      .channel('realtime:categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchCategories)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchCategories(showSpinner = false) {
    if (showSpinner) setFetching(true)
    const { data } = await supabase.from('categories').select('*').order('created_at', { ascending: false })
    if (data) {
      setCategories(data)
      localStorage.setItem('cache_categories', JSON.stringify(data))
    }
    setFetching(false)
  }

  async function openCategory(cat) {
    setSelected(cat); setEditing(null)
    setLoadingDetail(true); setDetailTab('competitions')
    const [{ data: comps }, { data: parts }] = await Promise.all([
      supabase.from('competitions').select('id, name, max_participants, is_stage, is_group').eq('category_id', cat.id).order('name'),
      supabase.from('participants').select('id, name, chess_number, teams(name)').eq('category_id', cat.id).order('name'),
    ])
    setDetailComps(comps || [])
    setDetailParts(parts || [])
    setLoadingDetail(false)
  }

  function startEdit(cat, e) {
    e.stopPropagation()
    setEditing(cat); setName(cat.name); setIsGeneral(cat.is_general || false)
    setSelected(null); setError(''); setSuccess('')
  }

  function cancelEdit() {
    setEditing(null); setName(''); setIsGeneral(false)
    setError(''); setSuccess('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Category name is required.'); return }
    setLoading(true); setError(''); setSuccess('')
    if (editing) {
      const { error } = await supabase.from('categories').update({ name: name.trim(), is_general: isGeneral }).eq('id', editing.id)
      setLoading(false)
      if (error) { setError(error.code === '23505' ? 'Category already exists.' : error.message); return }
      setSuccess('Category updated!'); cancelEdit()
    } else {
      const { error } = await supabase.from('categories').insert([{ name: name.trim(), is_general: isGeneral }])
      setLoading(false)
      if (error) { setError(error.code === '23505' ? 'Category already exists.' : error.message); return }
      setSuccess('Category added!'); setName(''); setIsGeneral(false)
    }
    setTimeout(() => setSuccess(''), 2500)
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (editing?.id === id) cancelEdit()
    if (selected?.id === id) setSelected(null)
    await supabase.from('categories').delete().eq('id', id)
  }

  return (
    <div className="section-root">
      <div className="section-list">

        {selected ? (
          /* ── Category Detail ── */
          <>
            <div className="list-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
              <button className="td-link-plain"
                style={{ fontSize: 11, letterSpacing: 0.5 }}
                onClick={() => setSelected(null)}>
                ← Back to Categories
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span className="list-title">{selected.name}</span>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span className="list-count">{detailComps.length} competitions</span>
                  <span className="list-count">{detailParts.length} participants</span>
                </div>
              </div>
              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-subtle)', width: '100%', marginTop: 4 }}>
                {['competitions', 'participants'].map(tab => (
                  <button key={tab} onClick={() => setDetailTab(tab)}
                    style={{
                      background: 'none', border: 'none', borderBottom: `2px solid ${detailTab === tab ? 'var(--accent-light)' : 'transparent'}`,
                      color: detailTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontFamily: 'inherit', fontSize: 10, fontWeight: 600, letterSpacing: '1px',
                      textTransform: 'uppercase', padding: '6px 14px 8px', cursor: 'pointer',
                      marginBottom: -1, transition: 'all 0.2s'
                    }}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {loadingDetail ? (
              <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
            ) : detailTab === 'competitions' ? (
              detailComps.length === 0 ? (
                <div className="empty-state">
                  <IconTag /><p>No competitions in this category.</p>
                  {navigateTo && <button className="td-link-plain" style={{ marginTop: 8, fontSize: 12 }} onClick={() => navigateTo('competitions')}>Go to Competitions →</button>}
                </div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Competition</th><th>Max</th><th>Type</th></tr></thead>
                  <tbody>
                    {detailComps.map(c => (
                      <tr key={c.id} className="row-clickable" onClick={() => navigateTo?.('competitions')}>
                        <td className="td-name">{c.name}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{c.max_participants}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {c.is_stage && <span className="td-badge" style={{ fontSize: 9 }}>STAGE</span>}
                            {c.is_group && <span className="td-badge" style={{ fontSize: 9 }}>GROUP</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              detailParts.length === 0 ? (
                <div className="empty-state">
                  <IconTag /><p>No participants in this category.</p>
                  {navigateTo && <button className="td-link-plain" style={{ marginTop: 8, fontSize: 12 }} onClick={() => navigateTo('participants')}>Go to Participants →</button>}
                </div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>#</th><th>Name</th><th>Team</th><th>Chess #</th></tr></thead>
                  <tbody>
                    {detailParts.map((p, i) => (
                      <tr key={p.id} className="row-clickable" onClick={() => navigateTo?.('participants')}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 11, width: 28 }}>{i + 1}</td>
                        <td className="td-name">{p.name}</td>
                        <td>{p.teams?.name ? <span className="td-badge">{p.teams.name}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--text-muted)' }}>{p.chess_number || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </>
        ) : (
          /* ── Categories List ── */
          <>
            <div className="list-header">
              <span className="list-title">All Categories</span>
              <span className="list-count">{categories.length} total</span>
            </div>
            {fetching ? (
              <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
            ) : categories.length === 0 ? (
              <div className="empty-state"><IconTag /><p>No categories yet.</p></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Category Name</th><th>Type</th><th></th></tr></thead>
                <tbody>
                  {categories.map(c => (
                    <tr key={c.id}
                      className={`row-clickable ${editing?.id === c.id ? 'row-editing' : ''}`}
                      onClick={() => openCategory(c)}
                    >
                      <td className="td-name">{c.name}</td>
                      <td>
                        {c.is_general
                          ? <span className="td-badge" style={{ fontSize: 9, background: 'rgba(100,180,100,0.1)', borderColor: 'rgba(100,180,100,0.3)', color: '#7bc47b' }}>GENERAL</span>
                          : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" onClick={(e) => startEdit(c, e)}><IconEdit /></button>
                          <button className="btn-delete" onClick={(e) => handleDelete(c.id, e)}><IconTrash /></button>
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
        {!editing && (
          <div className="bulk-mode-tabs">
            <button className={`bulk-tab ${mode === 'add' ? 'active' : ''}`} type="button" onClick={() => setMode('add')}>Add</button>
            <button className={`bulk-tab ${mode === 'import' ? 'active' : ''}`} type="button" onClick={() => setMode('import')}>Import CSV</button>
          </div>
        )}
        {editing && (
          <div className="form-panel-header">
            <p className="form-panel-title">Edit Category</p>
            <button className="btn-cancel-edit" onClick={cancelEdit}>✕ Cancel</button>
          </div>
        )}
        {(mode === 'add' || editing) && (
          <form onSubmit={handleSubmit}>
            <div className="form-fields">
              <div className="field">
                <label className="field-lbl">Category Name</label>
                <input className="field-inp" value={name}
                  onChange={e => { setName(e.target.value); setError('') }} />
              </div>
              <div className="field">
                <label className="field-check" onClick={() => setIsGeneral(v => !v)} style={{ userSelect: 'none' }}>
                  <div className={`check-box ${isGeneral ? 'checked' : ''}`} />
                  <span className={`check-label ${isGeneral ? 'checked' : ''}`}>General Category</span>
                </label>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, paddingLeft: 22 }}>Unlimited registration. Excluded from awards.</p>
              </div>
              {error && <p className="form-error">⚠ {error}</p>}
              {success && <p className="form-success">✓ {success}</p>}
              <button className="btn-submit" type="submit" disabled={loading}>
                {loading ? <span className="spin" /> : editing ? <IconCheck /> : <IconPlus />}
                {loading ? 'Saving...' : editing ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </form>
        )}
        {mode === 'import' && !editing && (
          <BulkImporter columns={CATS_COLS} sampleRows={CATS_SAMPLE} onImport={handleBulkImport} filename="categories_template.csv" />
        )}
      </div>
    </div>
  )
}
