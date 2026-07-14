// src/pages/admin/sections/ResultsSection.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import '../sections.css'

export default function ResultsSection() {
  const [unlocked, setUnlocked] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [dbPassword, setDbPassword] = useState('er')
  const [gradeSettings, setGradeSettings] = useState([])

  const [competitions, setCompetitions] = useState([])
  const [categories, setCategories] = useState([])
  const [awards, setAwards] = useState({ kala: [], sarga: [] }) // Kalaprathipa / Sargaprathipa
  const [fetching, setFetching] = useState(true)

  const [selected, setSelected] = useState(null)
  const [resultDetail, setResultDetail] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')

  useEffect(() => {
    // Fetch password from DB
    supabase.from('app_settings').select('value').eq('key', 'results_password').single()
      .then(({ data }) => { if (data) setDbPassword(data.value) })
  }, [])

  useEffect(() => {
    if (unlocked) fetchCompetitions()
  }, [unlocked])

  function tryUnlock(e) {
    e.preventDefault()
    if (pwInput === dbPassword) {
      setUnlocked(true)
      setPwError('')
    } else {
      setPwError('Incorrect password.')
    }
  }

  async function fetchCompetitions() {
    const [{ data: comps }, { data: cats }, { data: judgeResults }, { data: gs }, { data: pubResults }] = await Promise.all([
      supabase.from('competitions').select('*, categories(id, name, is_general)').order('name'),
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('judge_results').select('competition_id'),
      supabase.from('point_settings').select('*').order('max_percent', { ascending: false }),
      supabase.from('competition_results').select('*, participants(name, teams(name)), competitions(name, competition_type, categories(is_general))').eq('published', true),
    ])
    setGradeSettings(gs || [])
    const judgedSet = new Set((judgeResults || []).map(r => r.competition_id))
    setCompetitions((comps || []).filter(c => judgedSet.has(c.id)))
    setCategories(cats || [])

    // ── Kalaprathipa (stage, non-general) / Sargaprathipa (off-stage, non-general) ──
    const stageResults   = (pubResults || []).filter(r => r.competitions?.competition_type === 'stage'     && !r.competitions?.categories?.is_general && r.position === 1)
    const offStageResults= (pubResults || []).filter(r => r.competitions?.competition_type === 'off-stage'  && !r.competitions?.categories?.is_general && r.position === 1)

    // Group by participant/team for total points
    const computeAward = (rows) => {
      const map = {}
      rows.forEach(r => {
        const key = r.participants?.name || r.participant_id
        if (!map[key]) map[key] = { name: r.participants?.name || '—', team: r.participants?.teams?.name || '—', pts: 0 }
        map[key].pts += (r.placement_points || 0) + (r.grade_points || 0)
      })
      const sorted = Object.values(map).sort((a, b) => b.pts - a.pts)
      if (!sorted.length) return []
      const maxPts = sorted[0].pts
      return sorted.filter(r => r.pts === maxPts) // all with max (tie support)
    }
    setAwards({ kala: computeAward(stageResults), sarga: computeAward(offStageResults) })
    setFetching(false)
  }

  async function openResult(comp) {
    setSelected(comp)
    setLoadingDetail(true)

    // Judge results for this competition
    const { data: jResults } = await supabase
      .from('judge_results')
      .select('code_letter, points_raw, grade')
      .eq('competition_id', comp.id)

    // Invigilator reports (code → participant)
    const { data: reports } = await supabase
      .from('competition_reports')
      .select('code_letter, participant_id, participants(id, name, teams(name))')
      .eq('competition_id', comp.id)

    // Aggregate by code_letter (multiple judges → average)
    const codeMap = {}
    ;(jResults || []).forEach(r => {
      if (!codeMap[r.code_letter]) codeMap[r.code_letter] = { points: [], grade: r.grade }
      codeMap[r.code_letter].points.push(r.points_raw)
    })

    const partMap = {}
    ;(reports || []).forEach(r => { partMap[r.code_letter] = r.participants })

    const aggregated = Object.entries(codeMap).map(([code, data]) => {
      const avg = data.points.reduce((a, b) => a + b, 0) / data.points.length
      const rounded = Math.round(avg * 10) / 10
      // Recalculate grade from avg
      const gs = gradeSettings.find(g => rounded >= g.min_percent && rounded <= g.max_percent)
      return {
        code_letter: code,
        avg_points: rounded,
        grade: gs?.grade || data.grade || '—',
        participant: partMap[code],
      }
    }).sort((a, b) => b.avg_points - a.avg_points)

    // Assign positions with tie support
    let pos = 1
    aggregated.forEach((r, i) => {
      if (i > 0 && r.avg_points < aggregated[i - 1].avg_points) pos = i + 1
      r.position = pos
    })

    setResultDetail(aggregated)
    setLoadingDetail(false)
  }

  // Kalaprathipa (stage, non-general) and Sargaprathipa (off-stage, non-general)
  function computeAwards(comps, results) {
    // We need per-team total from published results for stage/off-stage
    // For simplicity, show 1st place winners per comp type
    const stage    = comps.filter(c => c.competition_type === 'stage'     && !c.categories?.is_general)
    const offStage = comps.filter(c => c.competition_type === 'off-stage'  && !c.categories?.is_general)
    return { stage, offStage }
  }

  // Filtered competition list
  const filtered = competitions.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const matchCat    = !catFilter || c.category_id === catFilter
    return matchSearch && matchCat
  })

  if (!unlocked) {
    return (
      <div className="dash-root" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={tryUnlock} style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 280, padding: '32px 24px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
          <div style={{ textAlign: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32, margin: '0 auto 12px' }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Results Section</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enter password to access</p>
          </div>
          <div className="field">
            <label className="field-lbl">Password</label>
            <input className="field-inp" type="password" autoComplete="off"
              value={pwInput} onChange={e => { setPwInput(e.target.value); setPwError('') }} />
          </div>
          {pwError && <p className="form-error">⚠ {pwError}</p>}
          <button className="btn-submit" type="submit">Unlock</button>
        </form>
      </div>
    )
  }

  return (
    <div className="dash-root">
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
        {selected && (
          <button onClick={() => { setSelected(null); setResultDetail([]) }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-light)', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>←</button>
        )}
        <span className="list-title" style={{ fontSize: 15 }}>
          {selected ? selected.name : 'Results'}
        </span>
        {!selected && (
          <button onClick={() => setUnlocked(false)}
            style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: 11, padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}>
            🔒 Lock
          </button>
        )}
      </div>

      {!selected ? (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Filters */}
          <div style={{ padding: '16px 28px', display: 'flex', gap: 10, borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            <input className="field-inp" style={{ padding: '6px 10px', fontSize: 12, width: 220 }}
              value={search} onChange={e => setSearch(e.target.value)} placeholder="Search competitions…" />
            <select className="field-select" style={{ width: 180, padding: '6px 10px', fontSize: 12 }}
              value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* ── Kalaprathipa / Sargaprathipa ── */}
          {(awards.kala.length > 0 || awards.sarga.length > 0) && (
            <div style={{ display: 'flex', gap: 14, padding: '16px 28px', flexWrap: 'wrap' }}>
              {[
                { label: '🏆 Kalaprathipa', subtitle: 'Top Stage Performer', list: awards.kala, color: 'var(--accent-light)', bg: 'rgba(201,148,63,0.08)' },
                { label: '🏅 Sargaprathipa', subtitle: 'Top Off-Stage Performer', list: awards.sarga, color: '#7baede', bg: 'rgba(100,150,220,0.08)' },
              ].map(award => award.list.length > 0 && (
                <div key={award.label} style={{ flex: 1, minWidth: 200, padding: '14px 16px', background: award.bg, border: `1px solid ${award.color}40`, borderRadius: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: award.color, marginBottom: 6 }}>{award.label}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>{award.subtitle}</p>
                  {award.list.map((w, i) => (
                    <div key={i} style={{ marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{w.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{w.team} · {w.pts} pts</span>
                    </div>
                  ))}
                  {award.list.length > 1 && (
                    <p style={{ fontSize: 10, color: award.color, marginTop: 4 }}>⚠ {award.list.length} winners (tie)</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {fetching ? (
            <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No judged competitions yet.</p>
            </div>
          ) : (
            <table className="data-table" style={{ margin: '0' }}>
              <thead><tr><th>Competition</th><th>Category</th><th>Type</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="row-clickable" onClick={() => openResult(c)}>
                    <td className="td-name">{c.name}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.categories?.name || '—'}</td>
                    <td>
                      <span className="td-badge" style={{
                        fontSize: 9,
                        background: c.competition_type === 'stage' ? 'rgba(201,148,63,0.1)' : 'rgba(100,150,220,0.1)',
                        borderColor: c.competition_type === 'stage' ? 'rgba(201,148,63,0.3)' : 'rgba(100,150,220,0.3)',
                        color: c.competition_type === 'stage' ? 'var(--accent-light)' : '#7baede',
                      }}>
                        {c.competition_type === 'stage' ? 'STAGE' : 'OFF-STAGE'}
                      </span>
                    </td>
                    <td><span style={{ fontSize: 10, color: '#7bc47b' }}>✓ Judged</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* ── Result Detail ── */
        <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px' }}>
          {loadingDetail ? (
            <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} /></div>
          ) : resultDetail.length === 0 ? (
            <div className="empty-state"><p style={{ color: 'var(--text-muted)' }}>No results found.</p></div>
          ) : (
            <>
              <table className="data-table" style={{ marginBottom: 24 }}>
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Participant</th>
                    <th>Team</th>
                    <th>Avg Points</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {resultDetail.map((r, i) => (
                    <tr key={r.code_letter} style={{ background: r.position <= 3 ? 'rgba(201,148,63,0.04)' : undefined }}>
                      <td>
                        <span style={{ fontSize: r.position <= 3 ? 18 : 13 }}>
                          {r.position <= 3 ? ['🥇','🥈','🥉'][r.position - 1] : r.position}
                        </span>
                      </td>
                      <td className="td-name">{r.participant?.name || `Code ${r.code_letter}`}</td>
                      <td>
                        {r.participant?.teams?.name
                          ? <span className="td-badge">{r.participant.teams.name}</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.avg_points}</td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '2px 8px', background: 'rgba(201,148,63,0.1)', border: '1px solid rgba(201,148,63,0.25)', color: 'var(--accent-light)', fontSize: 12, fontWeight: 700, borderRadius: 3 }}>
                          {r.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* ── Tied positions note ── */}
              {(() => {
                const ties = {}
                resultDetail.forEach(r => {
                  if (r.position <= 3) {
                    if (!ties[r.position]) ties[r.position] = []
                    ties[r.position].push(r)
                  }
                })
                const tiedGroups = Object.entries(ties).filter(([, list]) => list.length > 1)
                if (!tiedGroups.length) return null
                return (
                  <div style={{ padding: '14px 16px', background: 'rgba(201,148,63,0.06)', border: '1px solid rgba(201,148,63,0.2)', borderRadius: 6, marginTop: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-light)', marginBottom: 8 }}>⚠ TIE DETECTED</p>
                    {tiedGroups.map(([pos, list]) => (
                      <p key={pos} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{['🥇','🥈','🥉'][pos - 1]} Position {pos}</strong>: {list.map(r => `${r.participant?.name || r.code_letter} (${r.avg_points} pts)`).join(' · ')}
                      </p>
                    ))}
                  </div>
                )
              })()}
            </>
          )}
        </div>
      )}
    </div>
  )
}
