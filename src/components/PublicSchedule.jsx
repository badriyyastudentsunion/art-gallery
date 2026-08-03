// src/components/PublicSchedule.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LogoLoader from './LogoLoader'
import './PublicSchedule.css'

/* ══════════ SVG PRO ICONS (No Emojis) ══════════ */
const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11, marginRight: 5 }}>
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
)

const IconFastForward = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11, marginRight: 5 }}>
    <polygon points="13 19 22 12 13 5 13 19"/>
    <polygon points="2 19 11 12 2 5 2 19"/>
  </svg>
)

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11, marginRight: 5 }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const IconCheckCircle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11, marginRight: 5 }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

export default function PublicSchedule({ onBack }) {
  const { user } = useAuth() || {}
  const [stages, setStages] = useState([])
  const [schedules, setSchedules] = useState([])
  const [dates, setDates] = useState([])
  
  const [selectedDate, setSelectedDate] = useState('')
  const [fetching, setFetching] = useState(true)

  // Details Modal States
  const [activeComp, setActiveComp] = useState(null)
  const [compParticipants, setCompParticipants] = useState([])
  const [loadingPart, setLoadingPart] = useState(false)

  useEffect(() => {
    fetchInitialData()
    const ch = supabase.channel('public-schedule-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_schedule' }, () => {
        fetchScheduleData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, () => {
        fetchScheduleData()
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function fetchInitialData() {
    const { data: stgs } = await supabase.from('stages').select('id, name, location').order('name')
    setStages(stgs || [])
    await fetchScheduleData()
  }

  async function fetchScheduleData() {
    const { data: scheds } = await supabase
      .from('competition_schedule')
      .select(`
        id,
        scheduled_date,
        sequence_order,
        estimated_duration_mins,
        status,
        actual_start_time,
        actual_end_time,
        competition_id,
        competitions (
          id,
          name,
          competition_type,
          stage_id,
          stages (name, location),
          categories (name),
          rules_description,
          rules_duration,
          mark_criteria
        )
      `)
      .order('sequence_order', { ascending: true })

    const list = scheds || []
    setSchedules(list)

    // Extract unique sorted dates
    const uniqueDates = [...new Set(list.map(s => s.scheduled_date).filter(Boolean))].sort()
    setDates(uniqueDates)

    if (uniqueDates.length > 0 && !selectedDate) {
      const todayStr = new Date().toISOString().split('T')[0]
      if (uniqueDates.includes(todayStr)) {
        setSelectedDate(todayStr)
      } else {
        setSelectedDate(uniqueDates[0])
      }
    }
    setFetching(false)
  }

  // Fetch team participants when a competition is clicked
  async function handleCompClick(comp) {
    if (!comp) return
    setActiveComp(comp)
    setCompParticipants([])

    if (user?.role === 'Team' && user?.teamId) {
      setLoadingPart(true)
      try {
        const { data, error } = await supabase
          .from('competition_participants')
          .select('participant_id, participants!inner(name, chess_number, team_id)')
          .eq('competition_id', comp.id)
          .eq('participants.team_id', user.teamId)

        if (data) {
          setCompParticipants(data.map(d => d.participants))
        }
      } catch (err) {
        console.error('Error fetching team participants:', err)
      } finally {
        setLoadingPart(false)
      }
    }
  }

  // Filter schedule items by selected date
  const dateSchedules = schedules.filter(s => s.scheduled_date === selectedDate)

  // Group by stage_id
  const stageGroups = {}
  stages.forEach(stg => {
    stageGroups[stg.id] = {
      stage: stg,
      items: dateSchedules.filter(s => s.competitions?.stage_id === stg.id)
    }
  })

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' })
  }

  return (
    <div className="pub-sched-root">
      {/* Header */}
      <div className="pub-sched-header">
        {onBack && (
          <button className="pub-sched-back" onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            <span>Back</span>
          </button>
        )}
        <div className="pub-sched-brand">
          <span className="pub-sched-badge">LIVE</span>
          <h2 className="pub-sched-title">Festival Schedule</h2>
        </div>
      </div>

      {/* Date Tabs */}
      <div className="pub-sched-tabs-wrap">
        {dates.length === 0 ? (
          <div className="pub-sched-no-dates">No dates scheduled yet.</div>
        ) : (
          <div className="pub-sched-tabs">
            {dates.map(date => (
              <button 
                key={date} 
                className={`pub-sched-tab ${selectedDate === date ? 'active' : ''}`}
                onClick={() => setSelectedDate(date)}
              >
                {formatDate(date)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Board */}
      <div className="pub-sched-board">
        {fetching ? (
          <LogoLoader text="Fetching live schedule..." />
        ) : Object.keys(stageGroups).every(sid => stageGroups[sid].items.length === 0) ? (
          <div className="pub-sched-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p>No competitions scheduled for this day.</p>
          </div>
        ) : (
          <div className="pub-sched-stages-grid">
            {stages.map(stg => {
              const group = stageGroups[stg.id]
              if (group.items.length === 0) return null

              // Categorize items
              const ongoing = group.items.find(item => item.status === 'ongoing')
              const completed = group.items.filter(item => item.status === 'completed')
              const upcoming = group.items.filter(item => item.status === 'scheduled')

              // Next Up is the first upcoming item
              const nextUp = upcoming[0]
              const restUpcoming = upcoming.slice(1)

              return (
                <div key={stg.id} className={`pub-stage-card ${ongoing ? 'has-live' : ''}`}>
                  <div className="pub-stage-header">
                    <span className="pub-stage-name">{stg.name}</span>
                    {ongoing && (
                      <span className="pub-sched-badge" style={{ fontSize: 9, padding: '2px 6px', background: 'rgba(255,71,87,0.15)', border: '1px solid rgba(255,71,87,0.3)', color: '#ff4757', animation: 'pulse 1.5s infinite' }}>
                        LIVE
                      </span>
                    )}
                    {stg.location && <span className="pub-stage-loc">{stg.location}</span>}
                  </div>

                  <div className="pub-stage-body">
                    {/* CURRENTLY RUNNING */}
                    {ongoing && (
                      <div className="pub-section-running">
                        <span className="pub-section-label">
                          <IconPlay /> CURRENTLY RUNNING
                        </span>
                        <div className="pub-item ongoing" onClick={() => handleCompClick(ongoing.competitions)} style={{ cursor: 'pointer' }}>
                          <div className="pub-item-main">
                            <span className="pub-item-title">{ongoing.competitions?.name}</span>
                            <span className="pub-item-category">{ongoing.competitions?.categories?.name}</span>
                          </div>
                          <div className="pub-item-timer">
                            <LiveTimer startTime={ongoing.actual_start_time} duration={ongoing.estimated_duration_mins} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* NEXT UP */}
                    <div className="pub-section-next">
                      <span className="pub-section-label">
                        <IconFastForward /> NEXT UP
                      </span>
                      {nextUp ? (
                        <div className="pub-item next" onClick={() => handleCompClick(nextUp.competitions)}>
                          <div className="pub-item-main">
                            <span className="pub-item-title">{nextUp.competitions?.name}</span>
                            <span className="pub-item-category">{nextUp.competitions?.categories?.name}</span>
                          </div>
                          <div className="pub-item-time-est">
                            {nextUp.estimated_duration_mins ? `${nextUp.estimated_duration_mins} mins` : '—'}
                          </div>
                        </div>
                      ) : (
                        <div className="pub-item empty-next">
                          <span>Stage is clear</span>
                        </div>
                      )}
                    </div>

                    {/* UPCOMING QUEUE */}
                    {restUpcoming.length > 0 && (
                      <div className="pub-section-upcoming">
                        <span className="pub-section-label">
                          <IconCalendar /> UPCOMING QUEUE
                        </span>
                        <div className="pub-upcoming-list">
                          {restUpcoming.map(item => (
                            <div 
                              key={item.id} 
                              className="pub-upcoming-item"
                              onClick={() => handleCompClick(item.competitions)}
                            >
                              <span className="pub-upcoming-title">{item.competitions?.name}</span>
                              <span className="pub-upcoming-category">{item.competitions?.categories?.name}</span>
                              <span className="pub-upcoming-duration">{item.estimated_duration_mins}m</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* COMPLETED */}
                    {completed.length > 0 && (
                      <div className="pub-section-completed">
                        <span className="pub-section-label">
                          <IconCheckCircle /> COMPLETED
                        </span>
                        <div className="pub-completed-list">
                          {completed.map(item => (
                            <div 
                              key={item.id} 
                              className="pub-completed-item"
                              onClick={() => handleCompClick(item.competitions)}
                              style={{ cursor: 'pointer' }}
                            >
                              <span className="pub-completed-title">{item.competitions?.name}</span>
                              <span className="pub-completed-category">{item.competitions?.categories?.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Competition Details & Team Participants Modal ── */}
      {activeComp && (
        <div className="pub-modal-overlay" onClick={() => setActiveComp(null)}>
          <div className="pub-modal" onClick={e => e.stopPropagation()}>
            <div className="pub-modal-head">
              <div>
                <span style={{ fontSize: 10, color: 'var(--accent, #4f9cf9)', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  Competition Details
                </span>
                <h3 className="pub-modal-title">{activeComp.name}</h3>
              </div>
              <button className="pub-modal-close" onClick={() => setActiveComp(null)}>
                <IconX />
              </button>
            </div>

            <div className="pub-modal-body">
              <div className="pub-detail-row">
                <span className="pub-detail-label">Category</span>
                <span className="pub-detail-value">{activeComp.categories?.name || 'General'}</span>
              </div>

              {activeComp.rules_duration && (
                <div className="pub-detail-row">
                  <span className="pub-detail-label">Time Duration</span>
                  <span className="pub-detail-value">{activeComp.rules_duration}</span>
                </div>
              )}

              {activeComp.rules_description && (
                <div className="pub-detail-row">
                  <span className="pub-detail-label">Rules Description</span>
                  <span className="pub-detail-value" style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                    {activeComp.rules_description}
                  </span>
                </div>
              )}

              {/* Team Leader registered participants list */}
              {user?.role === 'Team' && (
                <div className="pub-detail-row" style={{ marginTop: 12, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 16 }}>
                  <span className="pub-detail-label">Your Registered Participants ({user.username})</span>
                  {loadingPart ? (
                    <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
                      <div className="spin" style={{ width: 20, height: 20, borderTopColor: 'var(--accent)' }} />
                    </div>
                  ) : compParticipants.length === 0 ? (
                    <div style={{ padding: 14, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 8 }}>
                      No participants from your team are registered in this competition.
                    </div>
                  ) : (
                    <div className="pub-part-list">
                      {compParticipants.map((p, idx) => (
                        <div key={p.chess_number || idx} className="pub-part-item">
                          <span className="pub-part-name">{p.name}</span>
                          <span className="pub-part-code">{p.chess_number}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LiveTimer({ startTime, duration }) {
  const [elapsed, setElapsed] = useState('00:00')

  useEffect(() => {
    if (!startTime) return
    const start = new Date(startTime).getTime()

    const timer = setInterval(() => {
      const diff = Math.max(0, Date.now() - start)
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      
      const pad = (n) => String(n).padStart(2, '0')
      setElapsed(`${pad(minutes)}:${pad(seconds)}`)
    }, 1000)

    return () => clearInterval(timer)
  }, [startTime])

  return (
    <div className="live-timer-container">
      <span className="live-timer-time">{elapsed}</span>
      <span className="live-timer-label">elapsed / {duration}m</span>
    </div>
  )
}
