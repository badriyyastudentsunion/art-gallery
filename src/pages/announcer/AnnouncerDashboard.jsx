// src/pages/announcer/AnnouncerDashboard.jsx
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase, safeRemoveChannel } from '../../lib/supabase'
import './announcer.css'

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
const IcoLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
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
const IcoSuccess = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 44, height: 44, color: '#2ed573' }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)
const IcoSpeaker = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <path d="M11 5L6 9H2v6h4l5 4V5z"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
  </svg>
)

export default function AnnouncerDashboard() {
  const { user, logout } = useAuth()
  const announcerId = user?.announcerId || user?.id

  const [competitions, setCompetitions] = useState(() => {
    try {
      const cached = localStorage.getItem(`cache_annc_comps_${announcerId}`)
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [selected, setSelected] = useState(null)
  const [results, setResults] = useState([]) // aggregated results
  const [fetching, setFetching] = useState(() => {
    try {
      const cached = localStorage.getItem(`cache_annc_comps_${announcerId}`)
      return !cached
    } catch { return true }
  })
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [anncTab, setAnncTab] = useState('pending') // 'pending' or 'completed'
  const [suspenseActive, setSuspenseActive] = useState(false)
  const [revealThreshold, setRevealThreshold] = useState(10)
  const [sequenceIds, setSequenceIds] = useState([])
  const [revealedByAdmin, setRevealedByAdmin] = useState(false)

  const selectedRef = useRef(selected)
  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  useEffect(() => {
    fetchCompetitions(competitions.length === 0)

    const channelName = `annc-rt-${announcerId || 'all'}`
    const refreshAll = () => {
      fetchCompetitions(false)
      if (selectedRef.current) {
        openCompetition(selectedRef.current, false)
      }
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'judge_results' }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_reports' }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_results' }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_schedule' }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, refreshAll)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [announcerId])

  // Handle hardware/browser back swipe to close detail view instead of exiting app
  useEffect(() => {
    const handlePopState = () => {
      if (selected) {
        setSelected(null);
        setPublished(false);
      }
    };
    if (selected) {
      window.history.pushState({ type: 'annc-detail' }, '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selected]);

  async function togglePublicReveal() {
    const nextVal = !revealedByAdmin
    try {
      await supabase.from('app_settings').upsert({ key: 'leaderboard_revealed_by_admin', value: nextVal ? 'true' : 'false' })
      setRevealedByAdmin(nextVal)
      fetchCompetitions(false)
    } catch (err) {
      console.error(err)
    }
  }

  async function fetchCompetitions(isInitial = false) {
    if (!announcerId) { setFetching(false); return }
    if (isInitial && competitions.length === 0) setFetching(true)

    try {
      const { data } = await supabase.rpc('get_announcer_dashboard_data', { p_announcer_id: announcerId })
      
      if (data) {
        const comps = data.competitions || []
        const settingsMap = data.settings || {}

        const active = settingsMap['leaderboard_suspense_active'] === 'true'
        const thresh = parseInt(settingsMap['leaderboard_reveal_threshold'] || '10')
        let seqIds = []
        try {
          if (settingsMap['announcer_sequence']) seqIds = JSON.parse(settingsMap['announcer_sequence'])
        } catch (e) {}

        setSuspenseActive(active)
        setRevealThreshold(thresh)
        setSequenceIds(seqIds)
        setRevealedByAdmin(settingsMap['leaderboard_revealed_by_admin'] === 'true')

        let mapped = comps.map(c => ({
          ...c,
          hasJudgeResults: !!c.hasJudgeResults,
          published: !!c.published,
          published_at: c.published_at || null,
        }))

        const publishedSorted = mapped.filter(c => c.published && c.published_at)
          .sort((a, b) => new Date(a.published_at) - new Date(b.published_at))
        publishedSorted.forEach((c, i) => { c.announcementNumber = i + 1 })

        if (seqIds.length > 0) {
          const seqSet = new Set(seqIds)
          mapped.sort((a, b) => {
            const aInSeq = seqSet.has(a.id)
            const bInSeq = seqSet.has(b.id)
            if (aInSeq && bInSeq) return seqIds.indexOf(a.id) - seqIds.indexOf(b.id)
            if (aInSeq) return -1
            if (bInSeq) return 1
            return a.name.localeCompare(b.name)
          })
        }

        setCompetitions(mapped)
        try {
          localStorage.setItem(`cache_annc_comps_${announcerId}`, JSON.stringify(mapped))
        } catch (e) {}
      }
    } catch (err) {
      console.error("Error fetching announcer comps:", err)
    } finally {
      setFetching(false)
    }
  }

  async function openCompetition(comp, isInitial = true) {
    if (!comp.hasJudgeResults) return

    setSelected(comp)
    setPublished(comp.published)
    if (isInitial) setLoadingDetail(true)

    try {
      const { data } = await supabase.rpc('get_announcer_competition_detail', { p_comp_id: comp.id })
      setResults(data || [])
    } catch (err) {
      console.error("Error loading announcer detail:", err)
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handlePublish() {
    if (!selected || !results.length) return
    setPublishing(true)

    const rows = results.map(r => {
      return {
        competition_id: selected.id,
        participant_id: r.participant?.id || null,
        position: r.position,
        grade: r.grade,
        avg_points: r.avg_points,
        placement_points: r.placement_points,
        grade_points: r.grade_points,
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

  const pendingComps = competitions.filter(c => !c.published)
  const completedComps = competitions.filter(c => c.published)
  const displayedComps = anncTab === 'pending' ? pendingComps : completedComps

  return (
    <div className="ann-root">
      <header className="ann-topbar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {selected && (
              <button className="ann-back" onClick={() => window.history.back()}><IcoBack /></button>
            )}
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                {selected ? 'Announcement' : 'Announcer'}
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {selected ? selected.name : user?.name || user?.username}
              </p>
            </div>
          </div>
          <button className="ann-logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="ann-main">
        {!selected ? (
          <div className="ann-list" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* PWA-style Navigation Tabs */}
            <div className="ann-tab-bar" style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 3 }}>
              {['pending', 'completed'].map(tab => {
                const count = tab === 'pending' ? pendingComps.length : completedComps.length
                return (
                  <button
                    key={tab}
                    className={`ann-tab ${anncTab === tab ? 'active' : ''}`}
                    onClick={() => setAnncTab(tab)}
                    style={{
                      flex: 1,
                      background: anncTab === tab ? 'var(--accent-light)' : 'none',
                      border: 'none',
                      color: anncTab === tab ? '#0e0b07' : 'var(--text-muted)',
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
                      background: anncTab === tab ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)',
                      color: anncTab === tab ? '#0e0b07' : 'var(--text-muted)',
                      fontWeight: 700
                    }}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {suspenseActive && (
              <div style={{
                background: revealedByAdmin ? 'rgba(46, 213, 115, 0.08)' : (completedComps.length >= revealThreshold ? 'rgba(247, 201, 72, 0.1)' : 'rgba(255, 255, 255, 0.03)'),
                border: `1px solid ${revealedByAdmin ? 'rgba(46, 213, 115, 0.25)' : (completedComps.length >= revealThreshold ? 'rgba(247, 201, 72, 0.35)' : 'rgba(255, 255, 255, 0.08)')}`,
                borderRadius: 8,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                margin: '8px 0 4px 0'
              }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: revealedByAdmin ? '#2ed573' : (completedComps.length >= revealThreshold ? '#f7c948' : 'var(--text-muted)'),
                  whiteSpace: 'nowrap'
                }}>
                  {revealedByAdmin ? '✓ Public Live' : (completedComps.length >= revealThreshold ? `⚡ ${completedComps.length}/${revealThreshold} Published` : `Suspense: ${completedComps.length}/${revealThreshold}`)}
                </span>

                <button
                  type="button"
                  onClick={togglePublicReveal}
                  disabled={!revealedByAdmin && completedComps.length < revealThreshold}
                  style={{
                    background: revealedByAdmin ? 'rgba(239, 68, 68, 0.15)' : (completedComps.length >= revealThreshold ? '#f7c948' : 'rgba(255,255,255,0.05)'),
                    color: revealedByAdmin ? '#f87171' : (completedComps.length >= revealThreshold ? '#000' : 'rgba(255,255,255,0.3)'),
                    border: revealedByAdmin ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontWeight: 800,
                    fontSize: 11,
                    cursor: (!revealedByAdmin && completedComps.length < revealThreshold) ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  {revealedByAdmin ? '🔒 Hide' : (completedComps.length >= revealThreshold ? '🚀 Publish Leaderboard' : `${completedComps.length}/${revealThreshold}`)}
                </button>
              </div>
            )}

            <p className="ann-section-label" style={{ margin: '6px 0 0 0' }}>
              {anncTab === 'pending' ? 'Ready for Announcement' : 'Published Results'}
            </p>

            {fetching ? (
              <div className="ann-center"><div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} /></div>
            ) : displayedComps.length === 0 ? (
              <div className="ann-center">
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No {anncTab} competitions.</p>
              </div>
            ) : (() => {
              return (
                <div className="ann-group-box">
                  {displayedComps.map(c => {
                    const s = Array.isArray(c.competition_schedule) ? c.competition_schedule[0] : c.competition_schedule
                    const isLocked = !c.hasJudgeResults
                    const isSequenceLocked = suspenseActive && sequenceIds.length > 0 && sequenceIds.includes(c.id) && sequenceIds[0] !== c.id && !c.published
                    return (
                      <div key={c.id}
                        className={`ann-comp-card ${c.published ? 'done' : ''} ${isLocked ? 'locked' : ''}`}
                        onClick={() => openCompetition(c)}
                        style={{
                          opacity: isLocked ? 0.45 : 1,
                          cursor: isLocked ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <div className={`ann-comp-icon ${c.published ? 'done-icon' : ''}`}>
                          {c.published ? <IcoDone /> : (c.competition_type === 'stage' ? <IcoStage /> : <IcoOffStage />)}
                        </div>
                        <div className="ann-comp-body" style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <p className="ann-comp-name" style={{ margin: 0 }}>{c.name}</p>
                            {c.announcementNumber && (
                              <span style={{
                                fontSize: 10, fontWeight: 800, color: '#f7c948',
                                background: 'rgba(247,201,72,0.12)', border: '1px solid rgba(247,201,72,0.35)',
                                padding: '1px 7px', borderRadius: 20, flexShrink: 0
                              }}>#{c.announcementNumber}</span>
                            )}
                          </div>
                          <div className="ann-comp-meta">
                            {c.categories?.name && <span>{c.categories.name}</span>}
                            <span style={{ color: c.competition_type === 'stage' ? 'var(--accent-light)' : '#7baede' }}>
                              {c.competition_type === 'stage' ? 'Stage' : 'Off-Stage'}
                            </span>
                            {s?.scheduled_date && <span>{new Date(s.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span className={`ann-status-badge ${c.published ? 'done' : isLocked ? 'locked' : 'ready'}`}>
                            {c.published ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <IcoDone />
                                <span>Published</span>
                              </span>
                            ) : isSequenceLocked ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <IcoLock />
                                <span>Locked in Queue</span>
                              </span>
                            ) : !c.hasJudgeResults ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <IcoLock />
                                <span>Awaiting Scores</span>
                              </span>
                            ) : (
                              <span>Ready to Publish</span>
                            )}
                          </span>
                          {!isLocked && <IcoChevron />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        ) : (
          <div className="ann-result-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="ann-info-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, margin: 0 }}>Results Announcement</p>
                <p style={{ fontWeight: 700, fontSize: 15, marginTop: 4, margin: '4px 0 0 0', color: 'var(--text-primary)' }}>{selected.name}</p>
                {!published && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, margin: '2px 0 0 0' }}>Review the final computed scores below before publishing.</p>}
              </div>
            </div>

            {loadingDetail ? (
              <div className="ann-center"><div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} /></div>
            ) : results.length === 0 ? (
              <div className="ann-center"><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No results available.</p></div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {results.map(r => (
                    <div
                      key={r.code_letter}
                      style={{
                        background: r.position <= 3 ? 'rgba(79, 156, 249, 0.04)' : 'var(--bg-card)',
                        border: `1px solid ${r.position <= 3 ? 'rgba(79, 156, 249, 0.2)' : 'var(--border-subtle)'}`,
                        borderRadius: '12px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: r.position === 1 ? 'rgba(247, 201, 72, 0.15)' : r.position === 2 ? 'rgba(178, 190, 195, 0.15)' : r.position === 3 ? 'rgba(205, 127, 50, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${r.position === 1 ? '#f7c948' : r.position === 2 ? '#b2bec3' : r.position === 3 ? '#cd7f32' : 'var(--border-subtle)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '14px',
                            color: r.position === 1 ? '#f7c948' : r.position === 2 ? '#b2bec3' : r.position === 3 ? '#cd7f32' : 'var(--text-muted)',
                            flexShrink: 0
                          }}
                        >
                          #{r.position}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {r.participant?.name || `Code ${r.code_letter}`}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            {r.participant?.teams?.name && (
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 4 }}>
                                {r.participant.teams.name}
                              </span>
                            )}
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Code {r.code_letter}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-light)', display: 'block' }}>
                            {r.placement_points + r.grade_points} <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)' }}>pts</span>
                          </span>
                        </div>

                        {r.grade && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '3px 7px',
                              borderRadius: '4px',
                              background: 'rgba(46, 213, 115, 0.1)',
                              border: '1px solid rgba(46, 213, 115, 0.25)',
                              color: '#2ed573'
                            }}
                          >
                            {r.grade}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {published ? (
                  <div className="ann-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '28px 20px', marginTop: 14 }}>
                    <IcoSuccess />
                    <p style={{ color: '#2ed573', fontWeight: 700, fontSize: 16, margin: '8px 0 0 0' }}>Results Published Successfully</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Results are now live on public leaderboard & team scores.</p>
                    <button className="ann-publish-btn" style={{ marginTop: 16, width: '100%', maxWidth: 200, background: 'var(--accent-light)', color: '#0e0b07' }} onClick={() => window.history.back()}>
                      <IcoBack />
                      <span>Go Back</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                    <button
                      className="ann-publish-btn"
                      disabled={publishing}
                      onClick={handlePublish}
                      style={{
                        width: '100%',
                        height: 42,
                        padding: 0,
                        background: '#2ed573',
                        color: '#0e0b07',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: publishing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      {publishing ? (
                        <span className="spin" style={{ width: 14, height: 14 }} />
                      ) : (
                        <>
                          <IcoSpeaker />
                          <span>Publish Results</span>
                        </>
                      )}
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
