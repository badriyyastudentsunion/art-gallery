// src/components/PublicSchedule.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LogoLoader from './LogoLoader'
import './PublicSchedule.css'

/* ══════════ SVG PRO ICONS (No Emojis) ══════════ */
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

  // Drag Scroll Refs & State
  const tabsWrapRef = useRef(null)
  const dragStart = useRef({ x: 0, scrollLeft: 0, hasMoved: false })
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = (e) => {
    if (!tabsWrapRef.current) return
    setIsDragging(true)
    dragStart.current = {
      x: e.pageX,
      scrollLeft: tabsWrapRef.current.scrollLeft,
      hasMoved: false
    }
  }

  const handleMouseMove = (e) => {
    if (!isDragging || !tabsWrapRef.current) return
    const dx = e.pageX - dragStart.current.x
    if (Math.abs(dx) > 5) {
      dragStart.current.hasMoved = true
    }
    tabsWrapRef.current.scrollLeft = dragStart.current.scrollLeft - dx
  }

  const handleMouseUpOrLeave = () => {
    setIsDragging(false)
  }

  const handleTabClick = (date, e) => {
    if (dragStart.current.hasMoved) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    setSelectedDate(date)
  }

  // Auto-center today's or selected date
  useEffect(() => {
    if (!fetching && selectedDate && tabsWrapRef.current) {
      const timer = setTimeout(() => {
        const activeEl = tabsWrapRef.current?.querySelector('.pub-sched-tab.active')
        if (activeEl) {
          activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [selectedDate, fetching])

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
        scheduled_time,
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
        // Pick the first upcoming date >= todayStr
        const upcoming = uniqueDates.find(d => d >= todayStr)
        if (upcoming) {
          setSelectedDate(upcoming)
        } else {
          // If all dates are past, pick the latest / last date
          setSelectedDate(uniqueDates[uniqueDates.length - 1])
        }
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
        const { data } = await supabase
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

  // Off-stage / Unassigned stage items for this date
  const offStageItems = dateSchedules.filter(s => !s.competitions?.stage_id)
  if (offStageItems.length > 0) {
    stageGroups['off-stage'] = {
      stage: { id: 'off-stage', name: 'Off-Stage / Written Events', location: 'Various Venues' },
      items: offStageItems
    }
  }

  const formatDate = (dateStr) => {
    const todayStr = new Date().toISOString().split('T')[0]
    const formatted = new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' })
    if (dateStr === todayStr) {
      return `Today (${formatted})`
    }
    return formatted
  }

  function formatMinsTo12h(totalMins) {
    if (totalMins === null || totalMins === undefined) return "TBD";
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 || 12;
    return `${String(displayH).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  function getSessionName(totalMins) {
    if (totalMins === null || totalMins === undefined) return null;
    const h = Math.floor(totalMins / 60);
    if (h < 12) return "Morning Session";
    if (h < 16) return "Afternoon Session";
    return "Evening Session";
  }

  const todayStr = new Date().toISOString().split('T')[0]

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
      <div 
        ref={tabsWrapRef}
        className="pub-sched-tabs-wrap"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        {dates.length === 0 ? (
          <div className="pub-sched-no-dates">No dates scheduled yet.</div>
        ) : (
          <div className="pub-sched-tabs" style={{ display: 'flex', width: 'max-content' }}>
            {dates.map(date => (
              <button 
                key={date} 
                className={`pub-sched-tab ${selectedDate === date ? 'active' : ''} ${date < todayStr ? 'past' : ''}`}
                onClick={(e) => handleTabClick(date, e)}
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
          <div className="pub-sched-stage-list">
            {Object.values(stageGroups).map(group => {
              if (!group || group.items.length === 0) return null
              const stg = group.stage

              // Calculate start times sequentially across all items
              let currentMins = null;
              const itemsWithTime = group.items.map(item => {
                let startMins = null;
                let isAnchor = false;
                
                if (item.scheduled_time) {
                  const [h, m] = item.scheduled_time.split(':').map(Number);
                  startMins = h * 60 + m;
                  currentMins = startMins;
                  isAnchor = true;
                } else if (currentMins !== null) {
                  startMins = currentMins;
                }
                
                if (currentMins !== null) {
                  const dur = parseInt(item.estimated_duration_mins) || 30;
                  currentMins = currentMins + dur;
                }
                
                return {
                  ...item,
                  computed_start_mins: startMins,
                  is_anchor: isAnchor
                };
              });

              const hasOngoing = itemsWithTime.some(i => i.status === 'ongoing');

              return (
                <div key={stg.id} className="pub-stage-group-card">
                  <div className="pub-stage-group-header">
                    <div>
                      <h3 className="pub-stage-name">{stg.name}</h3>
                      {stg.location && <span className="pub-stage-loc">{stg.location}</span>}
                    </div>
                    {hasOngoing && (
                      <span className="pub-stage-on-air">
                        <span className="pub-live-dot-red" /> ON AIR
                      </span>
                    )}
                  </div>

                  <div className="pub-stage-items-wrap">
                    {itemsWithTime.map((item, index) => {
                      const comp = item.competitions
                      const hasRules = comp && (comp.rules_description || comp.rules_duration || comp.mark_criteria)
                      const isOngoing = item.status === 'ongoing'
                      const isCompleted = item.status === 'completed'
                      
                      // Session divider detection
                      const currentSession = getSessionName(item.computed_start_mins)
                      const prevItem = index > 0 ? itemsWithTime[index - 1] : null
                      const prevSession = prevItem ? getSessionName(prevItem.computed_start_mins) : null
                      const showSessionDivider = currentSession && (index === 0 || currentSession !== prevSession)
                      
                      // Break divider detection
                      let showBreakDivider = false
                      let gapMins = 0
                      if (item.is_anchor && prevItem && prevItem.computed_start_mins !== null) {
                        const prevEndMins = prevItem.computed_start_mins + (parseInt(prevItem.estimated_duration_mins) || 30)
                        if (item.computed_start_mins > prevEndMins + 15) {
                          showBreakDivider = true;
                          gapMins = item.computed_start_mins - prevEndMins;
                        }
                      }

                      const sessionIcon = currentSession === 'Morning Session' ? '☀️' 
                                        : currentSession === 'Afternoon Session' ? '⛅' 
                                        : '🌙';

                      return (
                        <div key={item.id}>
                          {showSessionDivider && (
                            <div className="pub-sched-session-divider">
                              <span>{sessionIcon} {currentSession}</span>
                            </div>
                          )}
                          {showBreakDivider && !showSessionDivider && (
                            <div className="pub-sched-break-divider">
                              <span>Break ({gapMins} mins)</span>
                            </div>
                          )}
                          
                          <div 
                            className={`pub-sched-item-row ${isOngoing ? "ongoing" : isCompleted ? "completed" : ""}`}
                            onClick={() => handleCompClick(comp)}
                          >
                            <span 
                              className="pub-sched-status-dot" 
                              style={{ 
                                background: isOngoing ? "#ff4757" : isCompleted ? "#2ed573" : "rgba(255,255,255,0.25)", 
                                boxShadow: isOngoing ? "0 0 8px #ff4757" : undefined 
                              }} 
                            />
                            
                            <div className="pub-sched-item-info">
                              <div className="pub-sched-title-wrap">
                                <span className="pub-sched-comp-name" style={{ textDecoration: isCompleted ? "line-through" : "none" }}>
                                  {comp?.name}
                                </span>
                                {hasRules && (
                                  <span className="pub-sched-rules-badge">
                                    Rules / Details
                                  </span>
                                )}
                              </div>
                              <span className="pub-sched-cat-name">{comp?.categories?.name || 'General'}</span>
                            </div>
                            
                            <div className="pub-sched-time-wrap">
                              {item.computed_start_mins !== null && (
                                <span 
                                  className="pub-sched-time-tag"
                                  style={{
                                    color: item.is_anchor ? "#2ed573" : "rgba(255,255,255,0.6)",
                                    fontWeight: item.is_anchor ? 700 : 500
                                  }}
                                >
                                  {item.is_anchor ? "" : "~"}{formatMinsTo12h(item.computed_start_mins)}
                                </span>
                              )}
                              <span className={`pub-sched-pill ${isOngoing ? "live" : ""}`}>
                                {isOngoing ? "Live" : item.estimated_duration_mins ? `${item.estimated_duration_mins}m` : "Soon"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
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
                  മത്സര വിവരങ്ങൾ
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
                  <span className="pub-detail-label">Rules & Guidelines</span>
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
                          <span className="pub-part-code">#{p.chess_number}</span>
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
