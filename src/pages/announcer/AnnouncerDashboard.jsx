// src/pages/announcer/AnnouncerDashboard.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import './announcer.css'

export default function AnnouncerDashboard() {
  const { user, logout } = useAuth()
  const [competitions, setCompetitions] = useState([])
  const [selected, setSelected] = useState(null)
  const [results, setResults] = useState([]) // aggregated results
  const [fetching, setFetching] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)

  const announcerId = user?.announcerId || user?.id

  useEffect(() => { fetchCompetitions() }, [])

  async function fetchCompetitions() {
    if (!announcerId) { setFetching(false); return }

    const { data: comps } = await supabase
      .from('competitions')
      .select('*, categories(name), competition_schedule(scheduled_date, scheduled_time)')
      .eq('announcer_id', announcerId)
      .order('created_at')

    // Check judge results per competition
    const ids = (comps || []).map(c => c.id)
    const { data: judgeResults } = ids.length
      ? await supabase.from('judge_results').select('competition_id').in('competition_id', ids)
      : { data: [] }

    const { data: pubResults } = ids.length
      ? await supabase.from('competition_results').select('competition_id, published').in('competition_id', ids)
      : { data: [] }

    const hasJudgeSet = new Set((judgeResults || []).map(r => r.competition_id))
    const pubMap = {}
    ;(pubResults || []).forEach(r => { pubMap[r.competition_id] = r.published })

    setCompetitions((comps || []).map(c => ({
      ...c,
      hasJudgeResults: hasJudgeSet.has(c.id),
      published: pubMap[c.id] || false,
    })))
    setFetching(false)
  }

  async function openCompetition(comp) {
    if (!comp.hasJudgeResults) return
    setSelected(comp)
    setPublished(comp.published)
    setLoadingDetail(true)

    // Aggregate judge results (average if multiple judges)
    const { data: jResults } = await supabase
      .from('judge_results')
      .select('code_letter, points_raw, grade, judge_id')
      .eq('competition_id', comp.id)
      .order('code_letter')

    // Group by code_letter, average points
    const codeMap = {}
    ;(jResults || []).forEach(r => {
      if (!codeMap[r.code_letter]) codeMap[r.code_letter] = { points: [], grades: [] }
      codeMap[r.code_letter].points.push(r.points_raw)
      codeMap[r.code_letter].grades.push(r.grade)
    })

    // Look up participants from reports
    const { data: reports } = await supabase
      .from('competition_reports')
      .select('code_letter, participant_id, participants(id, name, teams(name))')
      .eq('competition_id', comp.id)

    const partMap = {}
    ;(reports || []).forEach(r => { partMap[r.code_letter] = r.participants })

    const aggregated = Object.entries(codeMap).map(([code, data]) => {
      const avg = data.points.reduce((a, b) => a + b, 0) / data.points.length
      const grade = data.grades[0] // use first judge's grade (or recalc)
      return {
        code_letter: code,
        avg_points: Math.round(avg * 10) / 10,
        grade,
        participant: partMap[code],
      }
    }).sort((a, b) => b.avg_points - a.avg_points)

    // Assign positions (handle ties)
    let pos = 1
    aggregated.forEach((r, i) => {
      if (i > 0 && r.avg_points < aggregated[i - 1].avg_points) pos = i + 1
      r.position = pos
    })

    setResults(aggregated)
    setLoadingDetail(false)
  }

  async function handlePublish() {
    if (!selected || !results.length) return
    setPublishing(true)

    // Load placement points
    const { data: placements } = await supabase.from('placement_points').select('*')
    const { data: gradeSettings } = await supabase.from('point_settings').select('*')

    const rows = results.map(r => {
      // Grade points
      const gs = gradeSettings?.find(g => g.grade === r.grade)
      const gradePoints = gs?.points || 0

      // Placement points by competition type
      const gs2 = selected.group_size || 1
      const catKey = gs2 === 1 ? 'individual' : gs2 === 2 ? 'group_2' : gs2 === 3 ? 'group_3' : 'group_45'
      const pp = placements?.find(p => p.competition_category === catKey && p.position === r.position)
      const placementPts = r.position <= 3 ? (pp?.points || 0) : 0

      return {
        competition_id: selected.id,
        participant_id: r.participant?.id || null,
        position: r.position,
        grade: r.grade,
        avg_points: r.avg_points,
        placement_points: placementPts,
        grade_points: gradePoints,
        published: true,
        published_at: new Date().toISOString(),
        published_by: announcerId,
      }
    })

    await supabase.from('competition_results').upsert(rows, { onConflict: 'competition_id,participant_id' })

    setPublishing(false)
    setPublished(true)
    await fetchCompetitions()
  }

  const pendingCount = competitions.filter(c => c.hasJudgeResults && !c.published).length

  return (
    <div className="ann-root">
      <header className="ann-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {selected && (
            <button className="ann-back" onClick={() => { setSelected(null); setPublished(false) }}>←</button>
          )}
          <div>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Announcer</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {selected ? selected.name : user?.name || user?.username}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!selected && pendingCount > 0 && (
            <span style={{ fontSize: 10, background: 'rgba(201,148,63,0.12)', color: 'var(--accent-light)', border: '1px solid rgba(201,148,63,0.25)', padding: '3px 8px', borderRadius: 3 }}>
              {pendingCount} pending
            </span>
          )}
          <button className="ann-logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="ann-main">
        {!selected ? (
          <div className="ann-list">
            <p className="ann-section-label">Competitions</p>
            {fetching ? (
              <div className="ann-center"><div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} /></div>
            ) : competitions.length === 0 ? (
              <div className="ann-center"><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No competitions assigned.</p></div>
            ) : competitions.map(c => {
              const s = c.competition_schedule?.[0]
              const isLocked = !c.hasJudgeResults
              return (
                <div key={c.id}
                  className={`ann-comp-card ${c.published ? 'done' : ''} ${isLocked ? 'locked' : ''}`}
                  onClick={() => openCompetition(c)}
                >
                  <div style={{ flex: 1 }}>
                    <p className="ann-comp-name">{c.name}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {c.categories?.name && <span className="ann-chip">{c.categories.name}</span>}
                    </div>
                    {s && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {s.scheduled_date && new Date(s.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        {s.scheduled_time && ` · ${s.scheduled_time.slice(0, 5)}`}
                      </p>
                    )}
                  </div>
                  <span className={`ann-status-badge ${c.published ? 'done' : isLocked ? 'locked' : 'ready'}`}>
                    {c.published ? '✓ Published' : isLocked ? '⏳ Awaiting Scores' : '📋 Ready to Publish'}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="ann-result-wrap">
            <div className="ann-info-card">
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Results Preview</p>
              <p style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{selected.name}</p>
              {!published && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Review the results below, then publish.</p>}
            </div>

            {loadingDetail ? (
              <div className="ann-center"><div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} /></div>
            ) : results.length === 0 ? (
              <div className="ann-center"><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No results available.</p></div>
            ) : (
              <>
                <table className="ann-result-table">
                  <thead>
                    <tr>
                      <th>Pos</th>
                      <th>Participant</th>
                      <th>Team</th>
                      <th>Avg</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => (
                      <tr key={r.code_letter} className={r.position <= 3 ? 'top-row' : ''}>
                        <td>
                          <span className={`ann-pos-badge pos-${r.position <= 3 ? r.position : 'other'}`}>
                            {r.position <= 3 ? ['🥇', '🥈', '🥉'][r.position - 1] : r.position}
                          </span>
                        </td>
                        <td className="ann-name">{r.participant?.name || `Code ${r.code_letter}`}</td>
                        <td>
                          {r.participant?.teams?.name
                            ? <span className="ann-chip">{r.participant.teams.name}</span>
                            : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ fontWeight: 600 }}>{r.avg_points}</td>
                        <td><span className="ann-grade-badge">{r.grade}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {published ? (
                  <div className="ann-center" style={{ paddingTop: 20, paddingBottom: 0 }}>
                    <p style={{ color: '#7bc47b', fontWeight: 600, fontSize: 13 }}>✓ Results Published</p>
                    <button className="ann-logout" style={{ marginTop: 8 }} onClick={() => setSelected(null)}>← Back</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                    <button className="ann-publish-btn" disabled={publishing} onClick={handlePublish}>
                      {publishing ? <span className="spin" style={{ width: 14, height: 14 }} /> : '📢 Publish Results'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
