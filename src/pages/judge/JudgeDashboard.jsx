// src/pages/judge/JudgeDashboard.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import HeaderInstallButton from '../../components/HeaderInstallButton'
import './judge.css'

// ── SVG Icons ──
const IcoBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const IcoChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, opacity: 0.5, color: 'var(--text-muted)' }}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
const IcoLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const IcoDone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IcoRules = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)
const IcoTime = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)
const IcoTarget = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
)
const IcoClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const IcoLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)
const IcoSuccess = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 44, height: 44, color: '#2ed573' }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)
const IcoStage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
)
const IcoOffStage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M18 2L22 6L9 19L5 15L18 2Z" />
    <path d="M9 19L3 21L5 15" />
    <path d="M14 6L18 10" />
  </svg>
)
const IcoEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
)

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
  const [viewingRules, setViewingRules] = useState(null)
  const [judgeTab, setJudgeTab] = useState('pending') // 'pending' or 'completed'

  const judgeId = user?.judgeId || user?.id

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('schema-db-changes-judge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_schedule' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'judge_results' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_judges' }, fetchData)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [judgeId])

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
      .select('*, categories(name), competition_schedule(status, scheduled_date, estimated_duration_mins)')
      .in('id', ids)
      .order('created_at')

    // Check judge results
    const { data: existing } = await supabase
      .from('judge_results')
      .select('competition_id')
      .eq('judge_id', judgeId)
      .in('competition_id', ids)

    const submittedSet = new Set((existing || []).map(r => r.competition_id))

    setCompetitions((comps || []).map(c => {
      const schedule = c.competition_schedule
      const isCompleted = Array.isArray(schedule)
        ? schedule.some(sch => sch && sch.status === 'completed')
        : (schedule && schedule.status === 'completed')
      return {
        ...c,
        reported: !!isCompleted,
        submitted: submittedSet.has(c.id),
      }
    }))
    setFetching(false)
  }

  // Handle hardware/browser back swipe to close detail view instead of exiting app
  useEffect(() => {
    const handlePopState = () => {
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

    try {
      // Load invigilator reports (code letters for this competition)
      const { data: reports } = await supabase
        .from('competition_reports')
        .select('code_letter, chess_number, participant_id')
        .eq('competition_id', comp.id)
        .order('code_letter')

      // Load existing judge entries if any
      let existing = []
      if (judgeId) {
        const { data } = await supabase
          .from('judge_results')
          .select('*')
          .eq('competition_id', comp.id)
          .eq('judge_id', judgeId)
        existing = data || []
      }

      const existingMap = Object.fromEntries((existing || []).filter(r => r && r.code_letter).map(r => [r.code_letter, r]))

      const entries = (reports || []).filter(r => r && r.code_letter).map(r => ({
        code_letter: r.code_letter,
        points: existingMap[r.code_letter]?.points_raw ?? '',
        grade: existingMap[r.code_letter]?.grade ?? '',
      }))

      setCodeEntries(entries)
    } catch (err) {
      console.error("Error loading competition details:", err)
    } finally {
      setLoadingDetail(false)
    }
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

  const pendingComps = competitions.filter(c => !c.submitted)
  const completedComps = competitions.filter(c => c.submitted)
  const displayedComps = judgeTab === 'pending' ? pendingComps : completedComps

  return (
    <div className="judge-root">
      <header className="judge-topbar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {selected && (
              <button className="judge-back" onClick={() => window.history.back()}>
                <IcoBack />
              </button>
            )}
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                {selected ? 'Score Entry' : 'Judge Panel'}
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {selected ? selected.name : user?.name || user?.username}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HeaderInstallButton />
            <button className="judge-logout" onClick={logout}>Logout</button>
          </div>
        </div>
      </header>

      <main className="judge-main">
        {!selected ? (
          <div className="judge-list" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* PWA-style Navigation Tabs */}
            <div className="judge-tab-bar" style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 3 }}>
              {['pending', 'completed'].map(tab => {
                const count = tab === 'pending' ? pendingComps.length : completedComps.length
                return (
                  <button
                    key={tab}
                    className={`judge-tab ${judgeTab === tab ? 'active' : ''}`}
                    onClick={() => setJudgeTab(tab)}
                    style={{
                      flex: 1,
                      background: judgeTab === tab ? 'var(--accent-light)' : 'none',
                      border: 'none',
                      color: judgeTab === tab ? '#0e0b07' : 'var(--text-muted)',
                      fontFamily: 'inherit',
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '7px 0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <span>{tab === 'pending' ? 'Pending' : 'Completed'}</span>
                    <span style={{
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: judgeTab === tab ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)',
                      color: judgeTab === tab ? '#0e0b07' : 'var(--text-muted)',
                      fontWeight: 700
                    }}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            <p className="judge-section-label" style={{ margin: '6px 0 0 0' }}>
              {judgeTab === 'pending' ? 'Active Competitions' : 'Completed Evaluations'}
            </p>

            {fetching ? (
              <div className="judge-center"><div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} /></div>
            ) : displayedComps.length === 0 ? (
              <div className="judge-center">
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No {judgeTab} competitions.</p>
              </div>
            ) : (
              <div className="judge-group-box">
                {displayedComps.map(c => {
                  const s = Array.isArray(c.competition_schedule) ? c.competition_schedule[0] : c.competition_schedule
                  const isLocked = !c.reported
                  return (
                    <div key={c.id}
                      className={`judge-comp-card ${c.submitted ? 'done' : ''} ${isLocked ? 'locked' : ''}`}
                      onClick={() => openCompetition(c)}
                      style={{
                        opacity: isLocked ? 0.45 : 1,
                        cursor: isLocked ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <div className={`judge-comp-icon ${c.submitted ? 'done-icon' : ''}`}>
                        {c.submitted ? <IcoDone /> : (c.competition_type === 'stage' ? <IcoStage /> : <IcoOffStage />)}
                      </div>
                      <div className="judge-comp-body" style={{ flex: 1, minWidth: 0 }}>
                        <p className="judge-comp-name">{c.name}</p>
                        <div className="judge-comp-meta">
                          {c.categories?.name && <span>{c.categories.name}</span>}
                          <span style={{ color: c.competition_type === 'stage' ? 'var(--accent-light)' : '#7baede' }}>
                            {c.competition_type === 'stage' ? 'Stage' : 'Off-Stage'}
                          </span>
                          {s?.scheduled_date && <span>{new Date(s.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span className={`judge-status-badge ${c.submitted ? 'done' : isLocked ? 'locked' : 'pending'}`}>
                          {c.submitted ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <IcoDone />
                              <span>Submitted</span>
                            </span>
                          ) : isLocked ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <IcoLock />
                              <span>Awaiting Report</span>
                            </span>
                          ) : (
                            <span>Enter Scores</span>
                          )}
                        </span>
                        {!isLocked && <IcoChevron />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="judge-score-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="judge-info-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, margin: 0 }}>Score Entry Panel</p>
                <p style={{ fontWeight: 700, fontSize: 15, marginTop: 4, margin: '4px 0 0 0', color: 'var(--text-primary)' }}>{selected.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, margin: '2px 0 0 0', lineHeight: 1.4 }}>Enter scores out of 100 for each code letter. Names are hidden.</p>
              </div>
              {(selected.rules_description || selected.rules_duration || selected.mark_criteria) && (
                <button
                  type="button"
                  onClick={() => setViewingRules(selected)}
                  style={{
                    background: 'rgba(237, 33, 36, 0.08)',
                    borderColor: 'rgba(237, 33, 36, 0.25)',
                    color: '#ff6b6b',
                    fontSize: '11px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <IcoRules />
                  <span>നിയമാവലി</span>
                </button>
              )}
            </div>

            {loadingDetail ? (
              <div className="judge-center"><div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} /></div>
            ) : submitted ? (
              <div className="judge-center" style={{ gap: 12, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '32px 20px' }}>
                <IcoSuccess />
                <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>Scores Submitted Successfully</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Waiting for announcer to publish result.</p>

                {/* Show submitted scores */}
                {codeEntries.length > 0 && (
                  <div style={{ width: '100%', marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {codeEntries.map(e => (
                      <div
                        key={e.code_letter}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent-light)' }}>
                            {e.code_letter}
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Participant {e.code_letter}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{e.points} pt</span>
                          {e.grade && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(46,213,115,0.1)', border: '1px solid rgba(46,213,115,0.2)', color: '#2ed573' }}>
                              {e.grade}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button className="judge-submit-btn" style={{ marginTop: 16, width: '100%', maxWidth: 200 }} onClick={() => window.history.back()}>
                  <IcoBack />
                  <span>Go Back</span>
                </button>
              </div>
            ) : codeEntries.length === 0 ? (
              <div className="judge-center"><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No participants reported yet.</p></div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {codeEntries.map(e => (
                    <div
                      key={e.code_letter}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            background: 'rgba(79, 156, 249, 0.06)',
                            border: '1px solid rgba(79, 156, 249, 0.18)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '15px',
                            color: 'var(--accent-light)'
                          }}
                        >
                          {e.code_letter}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Participant {e.code_letter}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            Evaluation code letter
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {e.grade && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '3px 7px',
                              borderRadius: '4px',
                              background: 'rgba(79, 156, 249, 0.08)',
                              border: '1px solid rgba(79, 156, 249, 0.2)',
                              color: 'var(--accent-light)'
                            }}
                          >
                            {e.grade} Grade
                          </span>
                        )}
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={e.points}
                            onChange={ev => updatePoints(e.code_letter, ev.target.value)}
                            style={{
                              width: '74px',
                              height: '36px',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-primary)',
                              fontFamily: 'inherit',
                              fontSize: '14px',
                              fontWeight: 700,
                              textAlign: 'center',
                              borderRadius: '8px',
                              outline: 'none',
                              paddingRight: '22px'
                            }}
                            className="judge-score-input-field"
                          />
                          <span style={{
                            position: 'absolute',
                            right: '6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '8px',
                            color: 'var(--text-muted)',
                            pointerEvents: 'none'
                          }}>
                            /100
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="judge-submit-btn"
                    disabled={submitting || codeEntries.some(e => e.points === '' || e.points === undefined)}
                    onClick={handleSubmit}
                    style={{ width: '100%', height: 42, padding: 0 }}
                  >
                    {submitting ? (
                      <span className="spin" style={{ width: 14, height: 14 }} />
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <IcoEdit />
                        <span>Submit Scores</span>
                      </span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Rules View Modal */}
      {viewingRules && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }} onClick={() => setViewingRules(null)}>
          <div style={{ background: '#12161f', border: '1px solid var(--border-subtle)', borderRadius: 16, maxWidth: 440, width: '100%', padding: 20, textAlign: 'left', color: 'var(--text-primary)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
              <div>
                <span style={{ fontSize: 10, color: 'var(--accent-light)', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>മത്സര നിയമാവലി</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>
                  {viewingRules.name}
                </h3>
              </div>
              <button style={{ background: 'none', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setViewingRules(null)}>
                <IcoClose />
              </button>
            </div>

            {(() => {
              const desc = viewingRules.rules_description
              const duration = viewingRules.rules_duration
              const criteria = []
              if (viewingRules.mark_criteria) {
                viewingRules.mark_criteria.split(',').forEach(item => {
                  const parts = item.split(/[:=]/)
                  if (parts.length >= 2) {
                    criteria.push({ label: parts[0].trim(), mark: parts.slice(1).join(':').trim() })
                  } else if (parts[0].trim()) {
                    criteria.push({ label: parts[0].trim(), mark: '' })
                  }
                })
              }
              const totalMarks = criteria.reduce((sum, item) => sum + (parseFloat(item.mark) || 0), 0)

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
                  {(duration || totalMarks > 0) && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {duration && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent-dim)', border: '1px solid var(--border-subtle)', color: 'var(--accent-light)', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
                          <IcoTime />
                          <span>സമയം: {duration}</span>
                        </div>
                      )}
                      {totalMarks > 0 && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(46, 213, 115, 0.1)', border: '1px solid rgba(46, 213, 115, 0.25)', color: '#2ed573', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
                          <IcoTarget />
                          <span>ആകെ മാർക്ക്: {totalMarks}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {desc && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: '4px solid var(--accent)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-line'
                    }}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>വിശദീകരണം / Topic</p>
                      {desc}
                    </div>
                  )}

                  {criteria.length > 0 && (
                    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                        മാർക്ക് വിഭജനം (Evaluation Criteria)
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: 'rgba(0,0,0,0.1)', color: 'var(--text-muted)', fontSize: 11, textAlign: 'left' }}>
                            <th style={{ padding: '6px 12px' }}>വിഷയം / Section</th>
                            <th style={{ padding: '6px 12px', width: 100, textAlign: 'right' }}>മാർക്ക്</th>
                          </tr>
                        </thead>
                        <tbody>
                          {criteria.map((item, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 500 }}>{item.label || '—'}</td>
                              <td style={{ padding: '8px 12px', color: 'var(--accent-light)', fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                {item.mark ? `${item.mark} മാർക്ക്` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}