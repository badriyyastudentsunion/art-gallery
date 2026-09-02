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
const IcoTrophy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
  </svg>
)
const IcoFlash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)
const IcoRocket = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
    <path d="M4.5 16.5c-1.5 1.26-2 3-2 3s1.74-.5 3-2" />
    <path d="M12 2C6 2 2 6 2 12c0 1.26.26 2.5.76 3.63L8 10h4v4l-5.63 5.24C7.5 19.74 8.74 20 10 20c6 0 10-4 10-10V2H12z" />
    <path d="M9 15l-3-3" />
    <path d="M15 9h.01" />
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
  const [revealMilestones, setRevealMilestones] = useState([])
  const [revealedMilestone, setRevealedMilestone] = useState(0)
  const [sequenceIds, setSequenceIds] = useState([])
  const [rawSequence, setRawSequence] = useState([])
  const [revealedByAdmin, setRevealedByAdmin] = useState(false)

  const [leaderboard, setLeaderboard] = useState([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)

  const selectedRef = useRef(selected)
  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  const anncTabRef = useRef(anncTab)
  useEffect(() => {
    anncTabRef.current = anncTab
  }, [anncTab])

  useEffect(() => {
    fetchCompetitions(competitions.length === 0)

    const channelName = `annc-rt-${announcerId || 'all'}`
    const refreshAll = () => {
      fetchCompetitions(false)
      if (selectedRef.current) {
        openCompetition(selectedRef.current, false)
      }
      if (anncTabRef.current === 'leaderboard') {
        fetchLeaderboardData()
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

  useEffect(() => {
    if (anncTab === 'leaderboard') {
      fetchLeaderboardData()
    }
  }, [anncTab])

  async function fetchLeaderboardData() {
    setLoadingLeaderboard(true)
    try {
      const [
        { data: teamsData },
        { data: settings }
      ] = await Promise.all([
        supabase.from('teams').select('id, name').order('name'),
        supabase.from('app_settings').select('key, value').in('key', ['team_colors', 'leaderboard_suspense_active', 'leaderboard_reveal_milestones', 'leaderboard_revealed_milestone', 'announcer_sequence'])
      ])

      const activeSetting = settings?.find(s => s.key === 'leaderboard_suspense_active')
      const milestonesSetting = settings?.find(s => s.key === 'leaderboard_reveal_milestones')
      const revealedMilestoneSetting = settings?.find(s => s.key === 'leaderboard_revealed_milestone')
      const seqSetting = settings?.find(s => s.key === 'announcer_sequence')

      const suspenseActiveVal = activeSetting?.value === 'true'
      const revealedMilestoneVal = parseInt(revealedMilestoneSetting?.value || '0')
      
      let seqIds = []
      try {
        if (seqSetting?.value) seqIds = JSON.parse(seqSetting.value)
      } catch (e) {}

      const isSuspense = suspenseActiveVal && (seqIds.length > 0)
      const excludeComps = isSuspense ? seqIds.slice(revealedMilestoneVal) : []

      const { data: standingsData } = await supabase.rpc('get_team_standings', { 
        exclude_comps: excludeComps
      })

      const colorSetting = settings?.find(s => s.key === 'team_colors')
      let colorMap = {}
      if (colorSetting?.value) {
        try { colorMap = JSON.parse(colorSetting.value) } catch (e) {}
      }

      const teamMap = {}
      ;(teamsData || []).forEach(t => { 
        teamMap[t.id] = { ...t, color: colorMap[t.id] || null, points: 0 } 
      })
      
      ;(standingsData || []).forEach(r => {
        if (teamMap[r.team_id]) {
          teamMap[r.team_id].points = Number(r.points) || 0
        }
      })

      const sorted = Object.values(teamMap).sort((a, b) => b.points - a.points)
      setLeaderboard(sorted)
    } catch (err) {
      console.error("Error loading leaderboard:", err)
    } finally {
      setLoadingLeaderboard(false)
    }
  }

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
        const revealMilestonesVal = settingsMap['leaderboard_reveal_milestones']
        const revealedMilestoneVal = settingsMap['leaderboard_revealed_milestone']
        
        let milList = []
        try {
          if (revealMilestonesVal) milList = JSON.parse(revealMilestonesVal)
        } catch(e) {}

        let rawSeq = []
        try {
          if (settingsMap['announcer_sequence']) rawSeq = JSON.parse(settingsMap['announcer_sequence'])
        } catch (e) {}

        const seqCompIds = rawSeq
          .map(i => (typeof i === 'string' ? i : i?.id))
          .filter(id => id && !id.startsWith('divider') && !id.startsWith('__divider'))

        setSuspenseActive(active)
        setRevealMilestones(milList)
        setRevealedMilestone(parseInt(revealedMilestoneVal || '0'))
        setSequenceIds(seqCompIds)
        setRawSequence(rawSeq)
        setRevealedByAdmin(settingsMap['leaderboard_revealed_by_admin'] === 'true')

        let mapped = comps.map(c => ({
          ...c,
          hasJudgeResults: !!c.hasJudgeResults,
          published: !!c.published,
          published_at: c.published_at || null,
        }))

        // 1. Assign official announcement numbers to all published competitions (sorted by published_at ASC)
        const publishedSorted = mapped.filter(c => c.published && c.published_at)
          .sort((a, b) => new Date(a.published_at) - new Date(b.published_at))
        
        publishedSorted.forEach((c, idx) => {
          c.announcementNumber = idx + 1
        })
        const publishedCount = publishedSorted.length

        // 2. Assign upcoming announcement numbers to pending competitions in sequence
        const seqSet = new Set(seqCompIds)
        let pendingSeqIdx = 0
        seqCompIds.forEach(id => {
          const item = mapped.find(c => c.id === id)
          if (item && !item.published) {
            item.announcementNumber = publishedCount + pendingSeqIdx + 1
            pendingSeqIdx++
          }
        })

        if (seqCompIds.length > 0) {
          mapped.sort((a, b) => {
            const aInSeq = seqSet.has(a.id)
            const bInSeq = seqSet.has(b.id)
            if (aInSeq && bInSeq) return seqCompIds.indexOf(a.id) - seqCompIds.indexOf(b.id)
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

    // Strict Sequence Enforcement: Cannot announce ahead of the sequence or pending status dividers
    if (!comp.published && comp.isSequenceLocked) {
      return
    }

    setSelected(comp)
    setPublished(comp.published)
    if (isInitial) setLoadingDetail(true)

    try {
      if (comp.isVirtual) {
        const [
          { data: teamsData },
          { data: settings }
        ] = await Promise.all([
          supabase.from('teams').select('id, name').order('name'),
          supabase.from('app_settings').select('key, value').in('key', ['team_colors'])
        ])

        const colorSetting = settings?.find(s => s.key === 'team_colors')
        let colorMap = {}
        if (colorSetting?.value) {
          try { colorMap = JSON.parse(colorSetting.value) } catch (e) {}
        }

        const excludeComps = comp.milestone ? sequenceIds.slice(comp.milestone) : []
        const { data: standingsData } = await supabase.rpc('get_team_standings', { 
          exclude_comps: excludeComps
        })

        const teamMap = {}
        ;(teamsData || []).forEach(t => { 
          teamMap[t.id] = { ...t, color: colorMap[t.id] || null, points: 0 } 
        })
        
        ;(standingsData || []).forEach(r => {
          if (teamMap[r.team_id]) {
            teamMap[r.team_id].points = Number(r.points) || 0
          }
        })

        const sorted = Object.values(teamMap).sort((a, b) => b.points - a.points)
        const mappedResults = sorted.map((t, idx) => {
          const rank = sorted.findIndex(team => team.points === t.points) + 1
          return {
            code_letter: t.name,
            position: rank,
            participant: {
              name: t.name,
              teams: {
                name: t.name,
              }
            },
            placement_points: t.points,
            grade_points: 0,
            grade: null
          }
        })
        setResults(mappedResults)
      } else {
        const { data } = await supabase.rpc('get_announcer_competition_detail', { p_comp_id: comp.id })
        setResults(data || [])
      }
    } catch (err) {
      console.error("Error loading announcer detail:", err)
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handlePublish() {
    if (!selected || !results.length) return
    setPublishing(true)

    try {
      if (selected.isVirtual) {
        const mVal = selected.milestone || 0
        await supabase.from('app_settings').upsert({ key: 'leaderboard_revealed_milestone', value: mVal.toString() })
        setRevealedMilestone(mVal)
        setPublished(true)
      } else {
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
        setPublished(true)
      }
      await fetchCompetitions()
    } catch (err) {
      console.error(err)
    } finally {
      setPublishing(false)
    }
  }

  // Build pending and completed queues from rawSequence (including Status Dividers)
  const publishedCompsOnly = competitions.filter(c => c.published && !c.isVirtual)
    .sort((a, b) => {
      if (!a.published_at) return 1
      if (!b.published_at) return -1
      return new Date(a.published_at) - new Date(b.published_at)
    })
    .map((c, idx) => ({ ...c, announcementNumber: idx + 1 }))

  const publishedCount = publishedCompsOnly.length
  const completedComps = [...publishedCompsOnly]
  const pendingComps = []

  // 1. Find the exact first uncompleted/unrevealed item in rawSequence
  let activeSequenceItem = null
  let seqCompCount = 0

  for (const item of rawSequence) {
    const isDivider = (typeof item === 'object' && item.isDivider) || (typeof item === 'string' && item.startsWith('__divider'))
    if (isDivider) {
      const milestone = seqCompCount
      const isRevealed = revealedMilestone >= milestone && milestone > 0
      if (!isRevealed) {
        activeSequenceItem = {
          id: typeof item === 'object' && item.id ? item.id : 'divider',
          isDivider: true,
          milestone
        }
        break
      }
    } else {
      seqCompCount++
      const compId = typeof item === 'string' ? item : item.id
      const comp = competitions.find(c => c.id === compId)
      if (comp && !comp.published) {
        activeSequenceItem = {
          id: compId,
          isDivider: false
        }
        break
      }
    }
  }

  // 2. Build queues with strict sequence lock flags
  let runningPendingIndex = 0
  if (rawSequence.length > 0) {
    let runningSequenceCount = 0
    rawSequence.forEach((item, idx) => {
      const isDivider = (typeof item === 'object' && item.isDivider) || (typeof item === 'string' && item.startsWith('__divider'))
      if (isDivider) {
        const milestoneLimit = runningSequenceCount
        const isRevealed = revealedMilestone >= milestoneLimit && milestoneLimit > 0
        const isReady = publishedCount >= milestoneLimit && !isRevealed && milestoneLimit > 0
        const isLocked = !isReady

        const dividerCard = {
          id: typeof item === 'object' && item.id ? item.id : `divider-${idx}`,
          name: `Points Standing Status`,
          hasJudgeResults: true,
          published: isRevealed,
          isVirtual: true,
          milestone: milestoneLimit,
          isDivider: true,
          isSequenceLocked: isLocked
        }

        if (isRevealed) {
          if (!completedComps.some(c => c.id === dividerCard.id)) {
            const insertIdx = completedComps.findIndex(c => !c.isVirtual && c.announcementNumber === milestoneLimit)
            if (insertIdx !== -1) {
              completedComps.splice(insertIdx + 1, 0, dividerCard)
            } else {
              completedComps.push(dividerCard)
            }
          }
        } else {
          pendingComps.push(dividerCard)
        }
      } else {
        runningSequenceCount++
        const compId = typeof item === 'string' ? item : item.id
        const comp = competitions.find(c => c.id === compId)
        if (comp && !comp.published) {
          runningPendingIndex++
          // A competition is sequence locked if it is NOT the activeSequenceItem (e.g. if a prior divider or comp is pending)
          const isSequenceLocked = activeSequenceItem ? (activeSequenceItem.isDivider || activeSequenceItem.id !== comp.id) : false
          pendingComps.push({
            ...comp,
            announcementNumber: publishedCount + runningPendingIndex,
            isSequenceLocked
          })
        }
      }
    })
  } else {
    competitions.filter(c => !c.published && c.hasJudgeResults).forEach((c, idx) => {
      pendingComps.push({
        ...c,
        announcementNumber: publishedCount + idx + 1,
        isSequenceLocked: false
      })
    })
  }

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
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
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

            <p className="ann-section-label" style={{ margin: '6px 0 0 0' }}>
              {anncTab === 'pending' ? 'Ready for Announcement' : 'Published Results'}
            </p>

            {fetching ? (
              <div className="ann-center"><div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} /></div>
            ) : displayedComps.length === 0 ? (
              <div className="ann-center">
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No {anncTab === 'pending' ? 'pending' : 'completed'} competitions.</p>
              </div>
            ) : (
              <div className="ann-group-box">
                {displayedComps.map(c => {
                  const s = Array.isArray(c.competition_schedule) ? c.competition_schedule[0] : c.competition_schedule
                  const activeUnpublishedId = sequenceIds.find(id => competitions.some(comp => comp.id === id && !comp.published))
                  const isSequenceLocked = c.isVirtual ? c.isSequenceLocked : (!c.published && sequenceIds.length > 0 && sequenceIds.includes(c.id) && activeUnpublishedId && activeUnpublishedId !== c.id)
                  const isLocked = c.isVirtual ? c.isSequenceLocked : (!c.hasJudgeResults || isSequenceLocked)
                  return (
                    <div key={c.id}
                      className={`ann-comp-card ${c.published ? 'done' : ''} ${isLocked ? 'locked' : ''}`}
                      onClick={() => openCompetition(c)}
                      style={{
                        opacity: isLocked ? 0.45 : 1,
                        cursor: isLocked ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <div className={`ann-comp-icon ${c.isVirtual ? 'trophy-icon' : (c.published ? 'done-icon' : '')}`}>
                        {c.isVirtual ? <IcoTrophy /> : (c.published ? <IcoDone /> : (c.competition_type === 'stage' ? <IcoStage /> : <IcoOffStage />))}
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
                          {c.isVirtual ? (
                            <>
                              <span style={{ color: '#f7c948', fontWeight: 600 }}>Standings Status</span>
                              <span>after Result #{c.milestone}</span>
                            </>
                          ) : (
                            <>
                              {c.categories?.name && <span>{c.categories.name}</span>}
                              <span style={{ color: c.competition_type === 'stage' ? 'var(--accent-light)' : '#7baede' }}>
                                {c.competition_type === 'stage' ? 'Stage' : 'Off-Stage'}
                              </span>
                              {s?.scheduled_date && <span>{new Date(s.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span className={`ann-status-badge ${c.published ? 'done' : isLocked ? 'locked' : 'ready'}`}>
                          {c.published ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <IcoDone />
                              <span>Published</span>
                            </span>
                          ) : isLocked ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <IcoLock />
                              <span>Locked in Queue</span>
                            </span>
                          ) : c.isVirtual ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#f7c948' }}>
                              <span>Ready to Reveal</span>
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
            )}
          </div>
        ) : (
          <div className="ann-result-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="ann-info-card" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              background: 'linear-gradient(135deg, rgba(247, 201, 72, 0.08) 0%, rgba(79, 156, 249, 0.05) 100%)',
              border: '1px solid rgba(247, 201, 72, 0.25)',
              borderRadius: 12,
              padding: '14px 18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {selected.announcementNumber && (
                  <span style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: '#0e0b07',
                    background: 'linear-gradient(135deg, #f7c948 0%, #ffb300 100%)',
                    padding: '3px 10px',
                    borderRadius: 16,
                    letterSpacing: 0.6,
                    boxShadow: '0 2px 8px rgba(247, 201, 72, 0.35)'
                  }}>
                    RESULT #{String(selected.announcementNumber).padStart(2, '0')}
                  </span>
                )}
                <h2 style={{ fontWeight: 800, fontSize: 17, margin: 0, color: '#fff' }}>{selected.name}</h2>
                {selected.categories?.name && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 4 }}>
                    {selected.categories.name}
                  </span>
                )}
              </div>

              {published && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#2ed573',
                  background: 'rgba(46, 213, 115, 0.12)',
                  border: '1px solid rgba(46, 213, 115, 0.3)',
                  padding: '6px 14px',
                  borderRadius: 20
                }}>
                  <IcoDone /> Published
                </span>
              )}
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
                            {selected?.isVirtual ? r.participant?.name : (r.participant?.name || `Code ${r.code_letter}`)}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            {r.participant?.teams?.name && !selected?.isVirtual && (
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 4 }}>
                                {r.participant.teams.name}
                              </span>
                            )}
                            {!selected?.isVirtual && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Code {r.code_letter}</span>}
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
