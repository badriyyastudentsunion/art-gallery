// src/pages/judge/JudgeDashboard.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import './judge.css'

function calcGrade(points, grades) {
  if (!grades?.length) return '—'
  const g = grades.find(g => points >= g.min_percent && points <= g.max_percent)
  return g?.grade || '—'
}

export default function JudgeDashboard() {
  const { user, logout } = useAuth()
  const [competitions, setCompetitions] = useState([])
  const [selected, setSelected] = useState(null)
  const [codeEntries, setCodeEntries] = useState([]) // [{ code_letter, points, grade }]
  const [grades, setGrades] = useState([])
  const [fetching, setFetching] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const judgeId = user?.judgeId || user?.id

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    if (!judgeId) { setFetching(false); return }

    const [{ data: cjRows }, { data: gradeData }] = await Promise.all([
      supabase.from('competition_judges').select('competition_id').eq('judge_id', judgeId),
      supabase.from('point_settings').select('*').order('max_percent', { ascending: false }),
    ])
    setGrades(gradeData || [])

    if (!cjRows?.length) { setFetching(false); return }
    const ids = cjRows.map(r => r.competition_id)

    const { data: comps } = await supabase
      .from('competitions')
      .select('*, categories(name), competition_schedule(scheduled_date, scheduled_time, stage_number)')
      .in('id', ids)
      .order('created_at')

    // Check report status (invigilator must submit before judge can enter)
    const { data: reports } = await supabase
      .from('competition_reports')
      .select('competition_id')
      .in('competition_id', ids)

    const reportedSet = new Set((reports || []).map(r => r.competition_id))

    // Check judge results
    const { data: existing } = await supabase
      .from('judge_results')
      .select('competition_id')
      .eq('judge_id', judgeId)
      .in('competition_id', ids)

    const submittedSet = new Set((existing || []).map(r => r.competition_id))

    setCompetitions((comps || []).map(c => ({
      ...c,
      reported: reportedSet.has(c.id),
      submitted: submittedSet.has(c.id),
    })))
    setFetching(false)
  }

  // Handle hardware/browser back swipe to close detail view instead of exiting app
  useEffect(() => {
    const handlePopState = (e) => {
      if (selected) {
        setSelected(null);
        setSubmitted(false);
      }
    };
    if (selected) {
      window.history.pushState({ type: 'judge-detail' }, '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selected]);

  async function openCompetition(comp) {
    if (!comp.reported) return // can't enter until invigilator reports
    setSelected(comp)
    setSubmitted(comp.submitted)
    setLoadingDetail(true)

    // Load invigilator reports (code letters for this competition)
    const { data: reports } = await supabase
      .from('competition_reports')
      .select('code_letter, chess_number, participant_id')
      .eq('competition_id', comp.id)
      .order('code_letter')

    // Load existing judge entries if any
    const { data: existing } = await supabase
      .from('judge_results')
      .select('*')
      .eq('competition_id', comp.id)
      .eq('judge_id', judgeId)

    const existingMap = Object.fromEntries((existing || []).map(r => [r.code_letter, r]))

    const entries = (reports || []).map(r => ({
      code_letter: r.code_letter,
      points: existingMap[r.code_letter]?.points_raw ?? '',
      grade: existingMap[r.code_letter]?.grade ?? '',
    }))

    setCodeEntries(entries)
    setLoadingDetail(false)
  }

  function updatePoints(code, val) {
    const num = Math.min(100, Math.max(0, parseInt(val) || 0))
    setCodeEntries(prev => prev.map(e =>
      e.code_letter === code
        ? { ...e, points: isNaN(parseInt(val)) ? '' : num, grade: isNaN(parseInt(val)) ? '' : calcGrade(num, grades) }
        : e
    ))
  }

  async function handleSubmit() {
    const valid = codeEntries.filter(e => e.points !== '' && e.points !== undefined)
    if (!valid.length) return
    setSubmitting(true)

    const rows = valid.map(e => ({
      competition_id: selected.id,
      judge_id: judgeId,
      code_letter: e.code_letter,
      points_raw: parseInt(e.points),
      grade: e.grade,
    }))

    await supabase.from('judge_results').upsert(rows, {
      onConflict: 'competition_id,judge_id,code_letter'
    })

    setSubmitting(false)
    setSubmitted(true)
    await fetchData()
  }

  return (
    <div className="judge-root">
      <header className="judge-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {selected && (
            <button className="judge-back" onClick={() => window.history.back()}>←</button>
          )}
          <div>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Judge Panel</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {selected ? selected.name : user?.name || user?.username}
            </p>
          </div>
        </div>
        <button className="judge-logout" onClick={logout}>Logout</button>
      </header>

      <main className="judge-main">
        {!selected ? (
          <div className="judge-list">
            <p className="judge-section-label">Assigned Competitions</p>
            {fetching ? (
              <div className="judge-center"><div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} /></div>
            ) : competitions.length === 0 ? (
              <div className="judge-center"><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No competitions assigned.</p></div>
            ) : competitions.map(c => {
              const s = c.competition_schedule?.[0]
              const isLocked = !c.reported
              return (
                <div key={c.id}
                  className={`judge-comp-card ${c.submitted ? 'done' : ''} ${isLocked ? 'locked' : ''}`}
                  onClick={() => openCompetition(c)}
                >
                  <div style={{ flex: 1 }}>
                    <p className="judge-comp-name">{c.name}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {c.categories?.name && <span className="judge-chip">{c.categories.name}</span>}
                      <span className="judge-chip" style={{ color: c.competition_type === 'stage' ? 'var(--accent-light)' : '#7baede' }}>
                        {c.competition_type === 'stage' ? 'Stage' : 'Off-Stage'}
                      </span>
                    </div>
                    {s && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {s.scheduled_date && new Date(s.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        {s.scheduled_time && ` · ${s.scheduled_time.slice(0, 5)}`}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span className={`judge-status-badge ${c.submitted ? 'done' : isLocked ? 'locked' : 'pending'}`}>
                      {c.submitted ? '✓ Submitted' : isLocked ? '🔒 Awaiting Report' : 'Enter Scores'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="judge-score-wrap">
            <div className="judge-info-card">
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Score Entry</p>
              <p style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{selected.name}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Enter scores out of 100 for each code letter. Names are hidden.</p>
            </div>

            {loadingDetail ? (
              <div className="judge-center"><div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} /></div>
            ) : submitted ? (
              <div className="judge-center" style={{ gap: 12 }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <p style={{ fontWeight: 600 }}>Scores Submitted!</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Waiting for announcer to publish.</p>

                {/* Show submitted scores */}
                {codeEntries.length > 0 && (
                  <div style={{ width: '100%', marginTop: 8 }}>
                    <table className="judge-score-table">
                      <thead><tr><th>Code</th><th>Points</th><th>Grade</th></tr></thead>
                      <tbody>
                        {codeEntries.map(e => (
                          <tr key={e.code_letter}>
                            <td><span style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent-light)' }}>{e.code_letter}</span></td>
                            <td style={{ fontWeight: 600 }}>{e.points}</td>
                            <td><span className="judge-grade-badge">{e.grade}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <button className="judge-submit-btn" style={{ marginTop: 12 }} onClick={() => window.history.back()}>← Back</button>
              </div>
            ) : codeEntries.length === 0 ? (
              <div className="judge-center"><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No participants reported yet.</p></div>
            ) : (
              <>
                <table className="judge-score-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Points (0–100)</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codeEntries.map(e => (
                      <tr key={e.code_letter}>
                        <td>
                          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent-light)', letterSpacing: 1 }}>
                            {e.code_letter}
                          </span>
                        </td>
                        <td>
                          <input
                            className="judge-points-input"
                            type="number"
                            min="0"
                            max="100"
                            value={e.points}
                            onChange={ev => updatePoints(e.code_letter, ev.target.value)}
                          />
                        </td>
                        <td>
                          {e.grade
                            ? <span className="judge-grade-badge">{e.grade}</span>
                            : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="judge-submit-btn"
                    disabled={submitting || codeEntries.some(e => e.points === '' || e.points === undefined)}
                    onClick={handleSubmit}
                  >
                    {submitting ? <span className="spin" style={{ width: 14, height: 14 }} /> : '✓ Submit Scores'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}