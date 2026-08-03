// src/pages/admin/sections/ScheduleSection.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import DatePicker from '../../../components/DatePicker'
import '../sections.css'
import './schedule.css'

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const IconGrid = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
)

const IconList = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)

const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const IconUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
    <polyline points="18 15 12 9 6 15"/>
  </svg>
)

const IconDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/>
    <path d="M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
)

const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const formatDateTab = (dateStr) => {
  if (!dateStr) return 'Unscheduled'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' })
}

export default function ScheduleSection() {
  const [competitions, setCompetitions] = useState([])
  const [stages, setStages] = useState([])
  const [schedules, setSchedules] = useState([])
  const [reportedSet, setReportedSet] = useState(new Set())
  const [judgedSet, setJudgedSet] = useState(new Set())
  const [publishedSet, setPublishedSet] = useState(new Set())
  
  const [fetching, setFetching] = useState(true)
  const [viewMode, setViewMode] = useState('board') // 'board' or 'table'
  const [selectedDate, setSelectedDate] = useState('')
  const [showAddDate, setShowAddDate] = useState(false)
  const [newDateVal, setNewDateVal] = useState('')
  const [customDates, setCustomDates] = useState([])

  const [pickerStage, setPickerStage] = useState(null) // Target stage when adding comp
  const [pickerSearch, setPickerSearch] = useState('')
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState(null)

  // Swapping IDs state
  const [swappingIds, setSwappingIds] = useState([])

  // Modal keyboard navigation and input focus refs
  const [activeIndex, setActiveIndex] = useState(0)
  const pickerInputRef = useRef(null)

  const skipRealtimeRef = useRef(false)
  const saveTimeoutRef = useRef(null)

  useEffect(() => {
    fetchAll()

    const channel = supabase
      .channel('schema-db-changes-sched-v8')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_schedule' }, () => {
        if (!skipRealtimeRef.current) fetchAll()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, () => {
        if (!skipRealtimeRef.current) fetchAll()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stages' }, () => {
        if (!skipRealtimeRef.current) fetchAll()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_reports' }, () => {
        if (!skipRealtimeRef.current) fetchAll()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'judge_results' }, () => {
        if (!skipRealtimeRef.current) fetchAll()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_results' }, () => {
        if (!skipRealtimeRef.current) fetchAll()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchAll() {
    const [
      { data: comps },
      { data: stgs },
      { data: scheds },
      { data: reports },
      { data: judgeRes },
      { data: pubRes },
    ] = await Promise.all([
      supabase.from('competitions').select('id, name, competition_type, stage_id, categories(name), stages(name)').order('name'),
      supabase.from('stages').select('*').order('name'),
      supabase.from('competition_schedule').select('*').order('sequence_order', { ascending: true }),
      supabase.from('competition_reports').select('competition_id'),
      supabase.from('judge_results').select('competition_id'),
      supabase.from('competition_results').select('competition_id, published').eq('published', true),
    ])

    setCompetitions(comps || [])
    setStages(stgs || [])
    setSchedules(scheds || [])
    
    setReportedSet(new Set((reports || []).map(r => r.competition_id)))
    setJudgedSet(new Set((judgeRes || []).map(r => r.competition_id)))
    setPublishedSet(new Set((pubRes || []).map(r => r.competition_id)))

    // Determine unique dates
    const dbDates = [...new Set((scheds || []).map(s => s.scheduled_date).filter(Boolean))].sort()
    const allDates = [...new Set([...dbDates, ...customDates])].sort()

    if (allDates.length > 0 && (!selectedDate || !allDates.includes(selectedDate))) {
      const todayStr = new Date().toISOString().split('T')[0]
      setSelectedDate(allDates.includes(todayStr) ? todayStr : allDates[0])
    }
    setFetching(false)
  }

  // All available unique dates
  const uniqueDates = [...new Set([
    ...schedules.map(s => s.scheduled_date).filter(Boolean),
    ...customDates
  ])].sort()

  function handleAddCustomDate(dateVal) {
    if (!dateVal) return
    if (!customDates.includes(dateVal)) {
      setCustomDates(prev => [...prev, dateVal])
    }
    setSelectedDate(dateVal)
    setShowAddDate(false)
    setNewDateVal('')
  }

  // Schedule map for quick access
  const schedMap = {}
  schedules.forEach(s => { schedMap[s.competition_id] = s })

  // Active date schedules
  const dateSchedules = schedules.filter(s => s.scheduled_date === selectedDate)

  // Compute status for each competition
  function getCompStatus(compId) {
    const sched = schedMap[compId]
    if (publishedSet.has(compId)) return { label: 'Published', class: 'published', icon: '🟢' }
    if (judgedSet.has(compId)) return { label: 'Judged', class: 'judged', icon: '🟣' }
    if (reportedSet.has(compId) || sched?.status === 'completed') return { label: 'Invigilated', class: 'completed', icon: '🟡' }
    if (sched?.status === 'ongoing') return { label: 'Running', class: 'ongoing', icon: '🔴' }
    if (sched?.scheduled_date) return { label: 'Scheduled', class: 'scheduled', icon: '🔘' }
    return { label: 'Unscheduled', class: 'unscheduled', icon: '⚪' }
  }

  // ID-BASED DYNAMIC MOVE SEQUENCE WITH SLIDING SWAP ANIMATION
  function moveSequence(stageId, compId, direction) {
    if (swappingIds.length > 0) return

    // Find current active schedules map
    const activeSchedMap = {}
    schedules.forEach(s => { activeSchedMap[s.competition_id] = s })

    // Get current sorted competitions for this stage
    const stageComps = competitions
      .filter(c => c.stage_id === stageId && activeSchedMap[c.id]?.scheduled_date === selectedDate)
      .sort((a, b) => (activeSchedMap[a.id]?.sequence_order || 0) - (activeSchedMap[b.id]?.sequence_order || 0))

    const index = stageComps.findIndex(c => c.id === compId)
    if (index === -1) return

    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= stageComps.length) return

    const itemA = stageComps[index]
    const itemB = stageComps[targetIdx]

    const schedA = activeSchedMap[itemA.id]
    const schedB = activeSchedMap[itemB.id]

    if (!schedA || !schedB) return

    const orderA = schedA.sequence_order || index + 1
    const orderB = schedB.sequence_order || targetIdx + 1

    // Apply dim/scale class to elements being swapped
    setSwappingIds([itemA.id, itemB.id])

    // Wait 140ms for scale down to complete before swapping DOM position
    setTimeout(() => {
      setSchedules(prev => {
        const next = prev.map(s => {
          if (s.id === schedA.id) return { ...s, sequence_order: orderB }
          if (s.id === schedB.id) return { ...s, sequence_order: orderA }
          return s
        })

        // Debounce DB save
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        skipRealtimeRef.current = true

        saveTimeoutRef.current = setTimeout(async () => {
          const latestSchedMap = {}
          next.forEach(s => { latestSchedMap[s.competition_id] = s })

          const sortedStageComps = competitions
            .filter(c => c.stage_id === stageId && latestSchedMap[c.id]?.scheduled_date === selectedDate)
            .sort((a, b) => (latestSchedMap[a.id]?.sequence_order || 0) - (latestSchedMap[b.id]?.sequence_order || 0))

          const updates = sortedStageComps.map((c, idx) => {
            const sched = latestSchedMap[c.id]
            if (sched) {
              return supabase
                .from('competition_schedule')
                .update({ sequence_order: idx + 1 })
                .eq('id', sched.id)
            }
            return null
          }).filter(Boolean)

          try {
            await Promise.all(updates)
          } catch (err) {
            console.error('Error saving sequence:', err)
          } finally {
            setTimeout(() => {
              skipRealtimeRef.current = false
            }, 300)
          }
        }, 500)

        return next
      })

      setSwappingIds([])
    }, 140)
  }

  // Update duration (Optimistic)
  async function updateDuration(compId, mins) {
    const sched = schedMap[compId]
    const est = parseInt(mins) || 0

    if (sched) {
      skipRealtimeRef.current = true
      setSchedules(prev => prev.map(s => s.id === sched.id ? { ...s, estimated_duration_mins: est } : s))
      await supabase.from('competition_schedule').update({ estimated_duration_mins: est }).eq('id', sched.id)
      setTimeout(() => { skipRealtimeRef.current = false }, 800)
    }
  }

  // Remove from schedule date & stage
  async function removeFromSchedule(compId) {
    const sched = schedMap[compId]
    skipRealtimeRef.current = true
    if (sched) {
      setSchedules(prev => prev.filter(s => s.id !== sched.id))
      await supabase.from('competition_schedule').delete().eq('id', sched.id)
    }
    setCompetitions(prev => prev.map(c => c.id === compId ? { ...c, stage_id: null } : c))
    await supabase.from('competitions').update({ stage_id: null }).eq('id', compId)
    setTimeout(() => { skipRealtimeRef.current = false }, 800)
  }

  // Assign unassigned competition to current date & stage
  async function assignCompToStage(comp, stageId) {
    // Check if already assigned elsewhere!
    const existingSched = schedMap[comp.id]
    if (existingSched?.scheduled_date) {
      alert(`"${comp.name}" is already scheduled on ${formatDateTab(existingSched.scheduled_date)}. Please remove it from its current schedule before assigning to a new stage/date.`)
      return
    }

    skipRealtimeRef.current = true
    setSavingId(comp.id)
    setCompetitions(prev => prev.map(c => c.id === comp.id ? { ...c, stage_id: stageId } : c))
    await supabase.from('competitions').update({ stage_id: stageId }).eq('id', comp.id)

    const nextSeq = (dateSchedules.length || 0) + 1

    if (existingSched) {
      setSchedules(prev => prev.map(s => s.id === existingSched.id ? { ...s, scheduled_date: selectedDate, sequence_order: nextSeq } : s))
      await supabase.from('competition_schedule').update({
        scheduled_date: selectedDate,
        sequence_order: nextSeq,
        estimated_duration_mins: existingSched.estimated_duration_mins || 30
      }).eq('id', existingSched.id)
    } else {
      const { data } = await supabase.from('competition_schedule').insert([{
        competition_id: comp.id,
        scheduled_date: selectedDate,
        estimated_duration_mins: 30,
        sequence_order: nextSeq
      }]).select().single()
      if (data) {
        setSchedules(prev => [...prev, data])
      }
    }

    setSavingId(null)
    setPickerSearch('')
    setActiveIndex(0)
    
    // Auto clear and refocus the input
    setTimeout(() => {
      pickerInputRef.current?.focus()
    }, 50)

    setTimeout(() => { skipRealtimeRef.current = false }, 800)
  }

  // Filtered competitions for search (table view & board)
  const filteredComps = competitions.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.categories?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.stages?.name?.toLowerCase().includes(search.toLowerCase())
  )

  // Matched competitions inside the picker modal
  const matchedComps = pickerStage
    ? competitions.filter(c =>
        !pickerSearch ||
        c.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        c.categories?.name?.toLowerCase().includes(pickerSearch.toLowerCase())
      )
    : []

  // Auto focus input when modal opens
  useEffect(() => {
    if (pickerStage) {
      setActiveIndex(0)
      setTimeout(() => {
        pickerInputRef.current?.focus()
      }, 50)
    }
  }, [pickerStage])

  // Keyboard navigation inside picker modal
  function handlePickerKeyDown(e) {
    if (e.key === 'Escape') {
      setPickerStage(null)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => Math.min(prev + 1, matchedComps.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = matchedComps[activeIndex]
      if (selected) {
        const isAlreadyScheduled = Boolean(schedMap[selected.id]?.scheduled_date)
        if (!isAlreadyScheduled) {
          assignCompToStage(selected, pickerStage.id)
        }
      }
    }
  }

  return (
    <div className="sched-root">
      {/* ── Header Bar ── */}
      <div className="sched-header">
        <div className="sched-top-row">
          <div className="sched-title-group">
            <h1>Schedule Manager</h1>
            <p>Organize event timeline by date, assign stage slots, and monitor live competition status</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                className="dash-search-input"
                style={{ paddingLeft: 28, width: 180 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search schedule…"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="sched-view-toggle">
              <button
                className={`sched-view-btn ${viewMode === 'board' ? 'active' : ''}`}
                onClick={() => setViewMode('board')}
              >
                <IconGrid />
                <span>Stage Board</span>
              </button>
              <button
                className={`sched-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                <IconList />
                <span>Table View</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Date Ribbon ── */}
        <div className="sched-date-bar">
          <span className="sched-date-label">Event Date:</span>
          
          {uniqueDates.length === 0 ? (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No scheduled dates yet. Click "+ Add Date" to begin:</span>
          ) : (
            uniqueDates.map(dateStr => {
              const count = schedules.filter(s => s.scheduled_date === dateStr).length
              return (
                <button
                  key={dateStr}
                  className={`sched-date-tab ${selectedDate === dateStr ? 'active' : ''}`}
                  onClick={() => setSelectedDate(dateStr)}
                >
                  <IconCalendar />
                  <span>{formatDateTab(dateStr)}</span>
                  <span className="sched-date-count">{count}</span>
                </button>
              )
            })
          )}

          {/* Add Date Button */}
          {showAddDate ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 20, border: '1px solid var(--accent)' }}>
              <DatePicker
                value={newDateVal}
                onChange={val => handleAddCustomDate(val)}
                placeholder="Select Date"
                style={{ maxWidth: 120, height: 26, fontSize: 11 }}
              />
              <button
                onClick={() => setShowAddDate(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button className="sched-add-date-btn" onClick={() => setShowAddDate(true)}>
              <IconPlus />
              <span>Add Date</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Main View Content ── */}
      {fetching ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spin" style={{ borderTopColor: 'var(--accent)', width: 24, height: 24 }} />
        </div>
      ) : viewMode === 'board' ? (
        /* 🎨 STAGE BOARD VIEW (ONLY SHOW ACTIVE STAGES) */
        <div className="sched-grid-container">
          {stages.map(stg => {
            // Find competitions assigned to this stage and selected date
            const stageComps = filteredComps.filter(c => {
              const s = schedMap[c.id]
              return c.stage_id === stg.id && s?.scheduled_date === selectedDate
            }).sort((a, b) => (schedMap[a.id]?.sequence_order || 0) - (schedMap[b.id]?.sequence_order || 0))

            return (
              <div key={stg.id} className="sched-stage-col">
                {/* Stage Header */}
                <div className="sched-stage-col-head">
                  <div>
                    <div className="sched-stage-title">
                      <span>{stg.name}</span>
                      {stg.location && <span className="sched-stage-loc">({stg.location})</span>}
                    </div>
                  </div>
                  <span className="sched-stage-badge-count">{stageComps.length} scheduled</span>
                </div>

                {/* Stage Body - Competition Cards */}
                <div className="sched-stage-body">
                  {stageComps.length === 0 ? (
                    <div style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                      No competitions scheduled on this stage for {formatDateTab(selectedDate)}.
                    </div>
                  ) : (
                    stageComps.map((c, idx) => {
                      const s = schedMap[c.id] || {}
                      const status = getCompStatus(c.id)
                      const isOngoing = status.class === 'ongoing'
                      const isSwappingThis = swappingIds.includes(c.id)
                      return (
                        <div key={c.id} className={`sched-card ${isSwappingThis ? 'swap-active' : ''} ${isOngoing ? 'ongoing-card' : ''}`}>
                          <div className="sched-card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="sched-seq-num">#{idx + 1}</span>
                              <span className="sched-cat-tag">{c.categories?.name || 'General'}</span>
                            </div>

                            {/* Competition Lifecycle Status Badge */}
                            <span className={`sched-status-badge ${status.class}`}>
                              <span>{status.icon}</span>
                              <span>{status.label}</span>
                            </span>
                          </div>

                          <p className="sched-comp-title">{c.name}</p>

                          <div className="sched-card-footer">
                            {/* Duration Input */}
                            <div className="sched-dur-input-wrap">
                              <input
                                type="number"
                                className="sched-dur-input"
                                value={s.estimated_duration_mins || 30}
                                onChange={e => updateDuration(c.id, e.target.value)}
                              />
                              <span className="sched-dur-unit">mins</span>
                            </div>

                            {/* Action Buttons (Sort & Remove) */}
                            <div className="sched-card-actions">
                              {/* Move Up */}
                              <button
                                className="sched-act-btn"
                                title="Move Up"
                                disabled={swappingIds.length > 0 || idx === 0}
                                style={{ opacity: (swappingIds.length > 0 || idx === 0) ? 0.3 : 1 }}
                                onClick={() => moveSequence(stg.id, c.id, -1)}
                              >
                                <IconUp />
                              </button>

                              {/* Move Down */}
                              <button
                                className="sched-act-btn"
                                title="Move Down"
                                disabled={swappingIds.length > 0 || idx === stageComps.length - 1}
                                style={{ opacity: (swappingIds.length > 0 || idx === stageComps.length - 1) ? 0.3 : 1 }}
                                onClick={() => moveSequence(stg.id, c.id, 1)}
                              >
                                <IconDown />
                              </button>

                              {/* Remove from date */}
                              <button
                                className="sched-act-btn remove"
                                title="Remove from schedule"
                                disabled={swappingIds.length > 0}
                                style={{ opacity: swappingIds.length > 0 ? 0.3 : 1 }}
                                onClick={() => removeFromSchedule(c.id)}
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}

                  {/* Add Competition to Stage Button */}
                  <button
                    className="sched-add-comp-btn"
                    disabled={swappingIds.length > 0}
                    onClick={() => { setPickerStage(stg); setPickerSearch('') }}
                  >
                    <IconPlus />
                    <span>Add Competition to {stg.name}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* 📋 TABLE VIEW */
        <div style={{ padding: '20px 28px' }}>
          <table className="data-table" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '26%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Competition</th>
                <th>Category</th>
                <th>Stage</th>
                <th>Scheduled Date</th>
                <th>Live Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredComps.map(c => {
                const s = schedMap[c.id] || {}
                const status = getCompStatus(c.id)
                return (
                  <tr key={c.id}>
                    <td>
                      <span className="td-name">{c.name}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.categories?.name || '—'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.stages?.name || 'Unassigned'}</span>
                    </td>
                    <td>
                      <DatePicker
                        value={s.scheduled_date || ''}
                        onChange={val => {
                          if (val) assignCompToStage(c, c.stage_id || stages[0]?.id)
                          else removeFromSchedule(c.id)
                        }}
                        placeholder="Select Date"
                        style={{ maxWidth: 130 }}
                      />
                    </td>
                    <td>
                      <span className={`sched-status-badge ${status.class}`}>
                        <span>{status.icon}</span>
                        <span>{status.label}</span>
                      </span>
                    </td>
                    <td>
                      {s.scheduled_date && (
                        <button
                          className="sched-act-btn remove"
                          onClick={() => removeFromSchedule(c.id)}
                          title="Remove from Schedule"
                        >
                          <IconTrash />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add Competition Picker Modal ── */}
      {pickerStage && (
        <div className="sched-picker-overlay" onClick={() => setPickerStage(null)}>
          <div className="sched-picker-modal" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sched-picker-head">
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Add Competition to {pickerStage.name}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                  Date: {formatDateTab(selectedDate)}
                </p>
              </div>
              <button
                onClick={() => setPickerStage(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Search Bar with Keyboard Navigation */}
            <div className="sched-picker-search">
              <input
                ref={pickerInputRef}
                className="dash-search-input"
                style={{ width: '100%', fontSize: 12 }}
                value={pickerSearch}
                onChange={e => {
                  setPickerSearch(e.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={handlePickerKeyDown}
                placeholder="Search competition by name or category..."
                autoFocus
              />
            </div>

            {/* Modal Items List */}
            <div className="sched-picker-body">
              {matchedComps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: 12 }}>
                  No matching competitions found.
                </div>
              ) : (
                matchedComps.map((c, idx) => {
                  const isSaving = savingId === c.id
                  const s = schedMap[c.id]
                  const isAlreadyScheduled = Boolean(s?.scheduled_date)
                  const assignedStageName = c.stages?.name || 'Another Stage'
                  const isActive = activeIndex === idx

                  return (
                    <div
                      key={c.id}
                      className={`sched-picker-item ${isAlreadyScheduled ? 'locked' : 'available'} ${isActive ? 'active-item' : ''}`}
                      onClick={() => {
                        if (!isAlreadyScheduled) {
                          assignCompToStage(c, pickerStage.id)
                        }
                      }}
                    >
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</p>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                          {c.categories?.name && <span className="sched-cat-tag">{c.categories.name}</span>}
                          {isAlreadyScheduled ? (
                            <span style={{ fontSize: 10, color: '#ff4757', fontWeight: 600 }}>
                              Scheduled on {assignedStageName} ({formatDateTab(s.scheduled_date)})
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, color: '#2ed573', fontWeight: 600 }}>Available</span>
                          )}
                        </div>
                      </div>

                      {isAlreadyScheduled ? (
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--text-muted)',
                            padding: '4px 8px',
                            borderRadius: 4,
                            background: 'rgba(255,255,255,0.05)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <IconLock />
                          <span>Remove First</span>
                        </span>
                      ) : (
                        <button
                          className="btn-submit"
                          disabled={isSaving}
                          style={{
                            height: 28,
                            padding: '0 12px',
                            fontSize: 11,
                            margin: 0,
                            width: 'auto',
                            borderColor: isActive ? 'var(--accent)' : undefined,
                            boxShadow: isActive ? '0 0 8px rgba(79, 156, 249, 0.4)' : undefined
                          }}
                        >
                          {isSaving ? <span className="spin" /> : '+ Assign'}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
