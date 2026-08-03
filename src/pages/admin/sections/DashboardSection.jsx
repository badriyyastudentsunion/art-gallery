// src/pages/admin/sections/DashboardSection.jsx
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../lib/supabase'
import './DashboardSection.css'

const IcoShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IcoStar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const IcoMic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
)

function formatRelativeTime(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 5) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function DashboardSection() {
  const [stats, setStats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_dash_stats') || 'null') } catch { return null }
  })
  const [teamPoints, setTeamPoints] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_dash_teampoints') || '[]') } catch { return [] }
  })
  const [teamRegs, setTeamRegs] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(() => !stats)
  const [popup, setPopup] = useState(null) // { title, items, color, sectionLabel }

  useEffect(() => {
    fetchStats()

    const channel = supabase
      .channel('schema-db-changes-dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_reports' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'judge_results' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_results' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_schedule' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, fetchStats)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchStats() {
    const [
      { data: comps },
      { data: reports },
      { data: judgeResults },
      { data: pubResults },
      { data: ciRows },
      { data: cjRows },
      { data: teamsRows },
      { data: participantsRows },
      { data: scheduleRows },
      { data: settings },
      // Recent activities rows queries
      { data: recentPubResults },
      { data: recentJudgeResults },
      { data: recentReports },
      { data: recentParticipants },
      { data: recentSchedule }
    ] = await Promise.all([
      supabase.from('competitions').select('id, name, categories(name), announcer_id').order('name'),
      supabase.from('competition_reports').select('competition_id'),
      supabase.from('judge_results').select('competition_id'),
      supabase.from('competition_results').select('competition_id, published, placement_points, grade_points, participants(name, team_id, teams(name))').eq('published', true),
      supabase.from('competition_invigilators').select('competition_id, invigilator_id'),
      supabase.from('competition_judges').select('competition_id, judge_id'),
      supabase.from('teams').select('id, name'),
      supabase.from('participants').select('id, team_id'),
      supabase.from('competition_schedule').select('competition_id, status'),
      supabase.from('app_settings').select('*'),

      // Activities queries
      supabase.from('competition_results').select('competition_id, updated_at, published, competitions(name)').eq('published', true).order('updated_at', { ascending: false }).limit(15),
      supabase.from('judge_results').select('competition_id, created_at, competitions(name)').order('created_at', { ascending: false }).limit(15),
      supabase.from('competition_reports').select('competition_id, created_at, competitions(name)').order('created_at', { ascending: false }).limit(15),
      supabase.from('participants').select('name, created_at, teams(name)').order('created_at', { ascending: false }).limit(15),
      supabase.from('competition_schedule').select('competition_id, status, updated_at, competitions(name)').order('updated_at', { ascending: false }).limit(15)
    ])

    const activeSetting = settings?.find(s => s.key === 'leaderboard_suspense_active')
    const threshSetting = settings?.find(s => s.key === 'leaderboard_reveal_threshold')
    const seqSetting = settings?.find(s => s.key === 'announcer_sequence')

    const suspenseActive = activeSetting?.value === 'true'
    const revealThreshold = parseInt(threshSetting?.value || '10')
    let seqIds = []
    try {
      if (seqSetting?.value) seqIds = JSON.parse(seqSetting.value)
    } catch (e) {}

    const all = comps || []
    const reportedSet  = new Set((reports || []).map(r => r.competition_id))
    const judgedSet    = new Set((judgeResults || []).map(r => r.competition_id))
    const publishedSet = new Set((pubResults || []).filter(r => r.published).map(r => r.competition_id))
    const hasInvigSet  = new Set((ciRows || []).map(r => r.competition_id))
    const hasJudgeSet  = new Set((cjRows || []).map(r => r.competition_id))
    const hasAnncSet   = new Set(all.filter(c => c.announcer_id).map(c => c.id))
    const completedScheduleSet = new Set((scheduleRows || []).filter(s => s.status === 'completed').map(s => s.competition_id))

    const seqSet = new Set(seqIds)
    const publishedSeqCount = seqIds.filter(id => publishedSet.has(id)).length
    const isSuspense = suspenseActive && (publishedSeqCount < revealThreshold) && (seqIds.length > 0)

    const pubRows = pubResults || []
    const pointsResults = isSuspense ? pubRows.filter(r => !seqSet.has(r.competition_id)) : pubRows

    const computedStats = {
      total: all,
      teams: (teamsRows || []).length,
      participants: (participantsRows || []).length,
      published: isSuspense ? new Set(pubRows.filter(r => !seqSet.has(r.competition_id)).map(r => r.competition_id)).size : publishedSet.size,
      isSuspense,
      suspenseCount: publishedSeqCount,
      suspenseThreshold: revealThreshold,

      invigPending:   all.filter(c => hasInvigSet.has(c.id) && !reportedSet.has(c.id)),
      invigCompleted: all.filter(c => hasInvigSet.has(c.id) && reportedSet.has(c.id)),
      invigNone:      all.filter(c => !hasInvigSet.has(c.id)),
      judgePending:   all.filter(c => hasJudgeSet.has(c.id) && completedScheduleSet.has(c.id) && !judgedSet.has(c.id)),
      judgeCompleted: all.filter(c => hasJudgeSet.has(c.id) && judgedSet.has(c.id)),
      judgeNone:      all.filter(c => !hasJudgeSet.has(c.id)),
      anncPending:    all.filter(c => hasAnncSet.has(c.id) && judgedSet.has(c.id) && !publishedSet.has(c.id)),
      anncDone:       all.filter(c => publishedSet.has(c.id)),
      anncNone:       all.filter(c => !hasAnncSet.has(c.id)),
    }

    setStats(computedStats)

    const teamMap = {}
    ;(teamsRows || []).forEach(t => { teamMap[t.name] = { name: t.name, pts: 0 } })
    pointsResults.forEach(r => {
      const team = r.participants?.teams
      if (!team) return
      if (!teamMap[team.name]) teamMap[team.name] = { name: team.name, pts: 0 }
      teamMap[team.name].pts += (r.placement_points || 0) + (r.grade_points || 0)
    })
    const sortedTeamPoints = Object.values(teamMap).sort((a, b) => b.pts - a.pts)
    setTeamPoints(sortedTeamPoints)

    // Calculate team registration counts
    const regMap = {}
    ;(teamsRows || []).forEach(t => { regMap[t.id] = { name: t.name, count: 0 } })
    if (participantsRows) {
      participantsRows.forEach(p => {
        if (p.team_id && regMap[p.team_id]) {
          regMap[p.team_id].count++
        }
      })
    }
    const sortedTeamRegs = Object.values(regMap).sort((a, b) => b.count - a.count)
    setTeamRegs(sortedTeamRegs)

    // Build Live updates log list
    const activeList = []
    if (recentPubResults) {
      const seenPub = new Set()
      recentPubResults.forEach(r => {
        if (!r.competitions?.name || seenPub.has(r.competition_id)) return
        seenPub.add(r.competition_id)
        activeList.push({
          text: `${r.competitions.name} result published`,
          time: new Date(r.updated_at || Date.now()),
          icon: '🏆'
        })
      })
    }
    if (recentJudgeResults) {
      const seenJudge = new Set()
      recentJudgeResults.forEach(r => {
        if (!r.competitions?.name || seenJudge.has(r.competition_id)) return
        seenJudge.add(r.competition_id)
        activeList.push({
          text: `${r.competitions.name} judged`,
          time: new Date(r.created_at || Date.now()),
          icon: '⭐'
        })
      })
    }
    if (recentReports) {
      const seenReport = new Set()
      recentReports.forEach(r => {
        if (!r.competitions?.name || seenReport.has(r.competition_id)) return
        seenReport.add(r.competition_id)
        activeList.push({
          text: `Exam report submitted: ${r.competitions.name}`,
          time: new Date(r.created_at || Date.now()),
          icon: '📋'
        })
      })
    }
    if (recentParticipants) {
      recentParticipants.forEach(r => {
        if (!r.name) return
        activeList.push({
          text: `New member: ${r.name} (${r.teams?.name || 'No Team'})`,
          time: new Date(r.created_at || Date.now()),
          icon: '👤'
        })
      })
    }
    if (recentSchedule) {
      const seenSched = new Set()
      recentSchedule.forEach(r => {
        if (!r.competitions?.name || seenSched.has(r.competition_id) || !r.status) return
        seenSched.add(r.competition_id)
        activeList.push({
          text: `${r.competitions.name} marked ${r.status}`,
          time: new Date(r.updated_at || Date.now()),
          icon: r.status === 'completed' ? '✅' : '⏳'
        })
      })
    }

    const sortedActivities = activeList
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 30)

    setActivities(sortedActivities)

    try {
      localStorage.setItem('cache_dash_stats', JSON.stringify(computedStats))
      localStorage.setItem('cache_dash_teampoints', JSON.stringify(sortedTeamPoints))
    } catch {}

    setLoading(false)
  }

  const openPopup = (title, items, color, sectionLabel) => {
    if (!items.length) return
    setPopup({ title, items, color, sectionLabel })
  }

  const SECTIONS = stats ? [
    {
      id: 'invig', label: 'Invigilator', Icon: IcoShield, accent: '#4f9cf9',
      rows: [
        { label: 'Pending',      count: stats.invigPending.length,   items: stats.invigPending,   color: '#ff6b6b', urgent: true },
        { label: 'Completed',    count: stats.invigCompleted.length, items: stats.invigCompleted, color: '#51cf66' },
      ],
    },
    {
      id: 'judge', label: 'Judgement', Icon: IcoStar, accent: '#f7c948',
      rows: [
        { label: 'Pending',      count: stats.judgePending.length,   items: stats.judgePending,   color: '#ff6b6b', urgent: true },
        { label: 'Completed',    count: stats.judgeCompleted.length, items: stats.judgeCompleted, color: '#51cf66' },
      ],
    },
    {
      id: 'annc', label: 'Announcement', Icon: IcoMic, accent: '#cc5de8',
      rows: [
        { label: 'Pending',      count: stats.anncPending.length,    items: stats.anncPending,    color: '#ff6b6b', urgent: true },
        { label: 'Announced',    count: stats.anncDone.length,       items: stats.anncDone,       color: '#51cf66' },
      ],
    },
  ] : []

  return (
    <div className="db-shell">
      {loading ? (
        <div className="db-loading">
          <div className="spin" style={{ borderTopColor: '#4f9cf9', width: 22, height: 22 }} />
        </div>
      ) : (
        <div className="db-scroll">

          {/* ── Title ── */}
          <div className="db-topline">
            <p className="db-eyebrow">Admin · Overview</p>
            <h1 className="db-title">Dashboard</h1>
          </div>

          {/* ── KPIs — inline numbers, divided by thin lines ── */}
          <div className="db-kpis">
            {[
              { label: 'Competitions', value: stats?.total.length ?? 0, color: '#4f9cf9', startColor: '#60a5fa' },
              { label: 'Teams',        value: stats?.teams ?? 0,         color: '#38bdf8', startColor: '#38bdf8' },
              { label: 'Participants', value: stats?.participants ?? 0,  color: '#fbbf24', startColor: '#fbbf24' },
            ].map((k, i) => (
              <div key={k.label} className="db-kpi-item">
                {i > 0 && <div className="db-kpi-divider" />}
                <span className="db-kpi-num" style={{ color: k.color }}>{k.value}</span>
                <span className="db-kpi-lbl">{k.label}</span>
              </div>
            ))}
          </div>

          <div className="db-rule" />

          {/* ── Status sections — 3 columns, flat rows ── */}
          <div className="db-status-grid">
            {SECTIONS.map((sec, si) => (
              <div key={sec.id} className="db-sec">
                {si > 0 && <div className="db-sec-vsep" />}

                {/* Section title */}
                <div className="db-sec-head">
                  <span className="db-sec-icon" style={{ color: sec.accent }}><sec.Icon /></span>
                  <span className="db-sec-label">{sec.label}</span>
                </div>

                {/* Rows */}
                {sec.rows.map(row => (
                  <button
                    key={row.label}
                    className={`db-row${row.urgent && row.count > 0 ? ' db-row-urgent' : ''}`}
                    onClick={() => openPopup(`${row.label}`, row.items, row.color, sec.label)}
                    disabled={!row.count}
                  >
                    <span className="db-row-label" style={{ opacity: row.count > 0 ? 0.65 : 0.25 }}>
                      {row.label}
                    </span>
                    <span className="db-row-count" style={{
                      backgroundImage: row.count > 0
                        ? `linear-gradient(135deg, ${row.color}, ${row.color}99)`
                        : undefined,
                      WebkitBackgroundClip: row.count > 0 ? 'text' : undefined,
                      WebkitTextFillColor: row.count > 0 ? 'transparent' : 'rgba(255,255,255,0.1)',
                      backgroundClip: row.count > 0 ? 'text' : undefined,
                    }}>
                      {row.count}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="db-rule" />

          {/* ── Split Layout: Leaderboard & Activity Stream ── */}
          <div className="db-bottom-layout">
            {/* Left Column: Team Points and Registrations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32, width: '100%', minWidth: 0 }}>
              {/* Leaderboard */}
              {teamPoints.length > 0 && (
                <div className="db-lb">
                  <div className="db-lb-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="db-lb-title">Team Points</span>
                      {stats?.isSuspense && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          background: 'rgba(255, 71, 87, 0.15)',
                          color: '#ff4757',
                          border: '1px solid rgba(255, 71, 87, 0.25)',
                          padding: '2px 8px',
                          borderRadius: 4,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <span>🔒 Withheld ({stats.suspenseCount}/{stats.suspenseThreshold})</span>
                        </span>
                      )}
                    </div>
                    {(stats?.published ?? 0) > 0 && (
                      <div className="db-lb-pub">
                        <span className="db-lb-pub-num">{String(stats.published).padStart(2, '0')}</span>
                        <div className="db-lb-pub-lbl">
                          <span>RESULTS</span>
                          <span>PUBLISHED</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="db-lb-list">
                    {teamPoints.map((t, i) => {
                      const maxPts = Math.max(...teamPoints.map(x => x.pts), 1)
                      const pct = Math.round((t.pts / maxPts) * 100)
                      const rankColors = ['#f7c948', '#b2bec3', '#cd7f32']
                      const barGrad = i === 0
                        ? 'linear-gradient(90deg,#f7c948,#ff9f43)'
                        : i === 1 ? 'linear-gradient(90deg,#b2bec3,#868e96)'
                        : i === 2 ? 'linear-gradient(90deg,#cd7f32,#a0622a)'
                        : 'linear-gradient(90deg,rgba(79,156,249,0.5),rgba(79,156,249,0.2))'
                      return (
                        <div key={t.name} className="db-lb-row">
                          <span className="db-lb-rank" style={{ color: rankColors[i] || 'rgba(255,255,255,0.2)' }}>
                            {i + 1}
                          </span>
                          <span className="db-lb-name">{t.name}</span>
                          <div className="db-lb-bar-bg">
                            <div className="db-lb-bar" style={{ width: `${pct}%`, background: barGrad, opacity: t.pts === 0 ? 0.07 : 1 }} />
                          </div>
                          <span className="db-lb-pts" style={{
                            backgroundImage: t.pts > 0
                              ? (i === 0 ? 'linear-gradient(135deg,#f7c948,#ff9f43)'
                                : 'linear-gradient(135deg,rgba(255,255,255,0.85),rgba(255,255,255,0.4))')
                              : undefined,
                            WebkitBackgroundClip: t.pts > 0 ? 'text' : undefined,
                            WebkitTextFillColor: t.pts > 0 ? 'transparent' : 'rgba(255,255,255,0.12)',
                            backgroundClip: t.pts > 0 ? 'text' : undefined,
                          }}>{t.pts}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Team Registrations */}
              {teamRegs.length > 0 && (
                <div className="db-lb">
                  <div className="db-lb-head" style={{ marginBottom: 12 }}>
                    <span className="db-lb-title">Team Registrations (രജിസ്ട്രേഷൻ ശതമാനം)</span>
                  </div>
                  <div className="db-lb-list">
                    {teamRegs.map((r, i) => {
                      const maxCount = Math.max(...teamRegs.map(x => x.count), 1)
                      const pct = Math.round((r.count / maxCount) * 100)
                      return (
                        <div key={r.name} className="db-lb-row">
                          <span className="db-lb-rank" style={{ color: 'rgba(255,255,255,0.15)' }}>
                            {i + 1}
                          </span>
                          <span className="db-lb-name">{r.name}</span>
                          <div className="db-lb-bar-bg">
                            <div className="db-lb-bar" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #38bdf8, #4f9cf9)', opacity: r.count === 0 ? 0.07 : 1 }} />
                          </div>
                          <span className="db-lb-pts" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                            {r.count} registered
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Live Updates & Activity Stream */}
            <div className="db-activity">
              <div className="db-activity-head">
                <span className="db-activity-title">Live Actions & Updates</span>
                <span className="db-activity-pulse-dot" />
              </div>
              <div className="db-activity-list">
                {activities.length === 0 ? (
                  <div className="db-activity-empty">
                    <span>No recent activity logged.</span>
                  </div>
                ) : (
                  activities.map((act, idx) => (
                    <div key={idx} className="db-activity-item">
                      <span className="db-activity-icon">{act.icon}</span>
                      <div className="db-activity-info">
                        <span className="db-activity-text" title={act.text}>{act.text}</span>
                        <span className="db-activity-time">{formatRelativeTime(act.time)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Popup modal (centered, not full screen) ── */}
      {popup && createPortal(
        <div className="db-popup-backdrop" onClick={() => setPopup(null)}>
          <div className="db-popup" onClick={e => e.stopPropagation()}>
            {/* Colored top bar */}
            <div className="db-popup-topbar" style={{ background: `linear-gradient(90deg, ${popup.color}22, transparent)`, borderBottom: `1px solid ${popup.color}30` }}>
              <div>
                <span className="db-popup-section">{popup.sectionLabel}</span>
                <h2 className="db-popup-title" style={{ color: popup.color }}>{popup.title}</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="db-popup-count" style={{ color: popup.color, borderColor: `${popup.color}30`, background: `${popup.color}15` }}>
                  {popup.items.length}
                </span>
                <button className="db-popup-close" onClick={() => setPopup(null)}>✕</button>
              </div>
            </div>
            {/* List */}
            <div className="db-popup-list">
              {popup.items.map((c, i) => (
                <div key={c.id} className="db-popup-item">
                  <span className="db-popup-num">{i + 1}</span>
                  <div className="db-popup-info">
                    <span className="db-popup-name">{c.name}</span>
                    {c.categories?.name && <span className="db-popup-cat">{c.categories.name}</span>}
                  </div>
                  <span className="db-popup-dot" style={{ background: popup.color }} />
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
