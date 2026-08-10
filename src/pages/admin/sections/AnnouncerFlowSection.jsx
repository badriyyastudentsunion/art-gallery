// src/pages/admin/sections/AnnouncerFlowSection.jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import '../sections.css'

// ── SVG Icons ──
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)
const IconArrowDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
  </svg>
)
const IconArrowUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
  </svg>
)
const IconTrophy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, color: 'var(--accent-light)' }}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
  </svg>
)
const IconSparkles = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
)

export default function AnnouncerFlowSection() {
  const [teams, setTeams] = useState(() => {
    try {
      const c = localStorage.getItem('cache_ann_teams')
      return c ? JSON.parse(c) : []
    } catch { return [] }
  })
  const [allComps, setAllComps] = useState(() => {
    try {
      const c = localStorage.getItem('cache_ann_allComps')
      return c ? JSON.parse(c) : []
    } catch { return [] }
  })
  const [readyComps, setReadyComps] = useState(() => {
    try {
      const c = localStorage.getItem('cache_ann_readyComps')
      return c ? JSON.parse(c) : []
    } catch { return [] }
  })
  const [sequence, setSequence] = useState(() => {
    try {
      const c = localStorage.getItem('cache_ann_sequence')
      return c ? JSON.parse(c) : []
    } catch { return [] }
  })
  const [baselinePoints, setBaselinePoints] = useState(() => {
    try {
      const c = localStorage.getItem('cache_ann_basePoints')
      return c ? JSON.parse(c) : {}
    } catch { return {} }
  })
  
  const [revealedByAdmin, setRevealedByAdmin] = useState(false)
  const [suspenseActive, setSuspenseActive] = useState(false)
  const [revealMilestones, setRevealMilestones] = useState([15, 30])
  const [revealedMilestone, setRevealedMilestone] = useState(0)
  const [milestonesInput, setMilestonesInput] = useState('15, 30')
  const [fetching, setFetching] = useState(() => {
    try {
      const c = localStorage.getItem('cache_ann_sequence')
      return !c
    } catch { return true }
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [expandedMilestones, setExpandedMilestones] = useState({ 0: true })
  const [milestoneTargets, setMilestoneTargets] = useState({})
  const [sortReadyByTeam, setSortReadyByTeam] = useState('')
  
  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    try {
      // 1. Fetch Teams
      const { data: teamsData } = await supabase.from('teams').select('id, name')
      setTeams(teamsData || [])

      // 2. Fetch App Settings
      const { data: settings } = await supabase.from('app_settings').select('key, value').in('key', ['leaderboard_suspense_active', 'leaderboard_reveal_milestones', 'leaderboard_revealed_milestone', 'announcer_sequence'])
      const activeSetting = settings?.find(s => s.key === 'leaderboard_suspense_active')
      const milestonesSetting = settings?.find(s => s.key === 'leaderboard_reveal_milestones')
      const revealedMilestoneSetting = settings?.find(s => s.key === 'leaderboard_revealed_milestone')
      const seqSetting = settings?.find(s => s.key === 'announcer_sequence')

      setSuspenseActive(activeSetting?.value === 'true')
      let milList = [15, 30]
      try {
        if (milestonesSetting?.value) {
          milList = JSON.parse(milestonesSetting.value)
        }
      } catch (e) {}
      setRevealMilestones(milList)
      setMilestonesInput(milList.join(', '))
      setRevealedMilestone(parseInt(revealedMilestoneSetting?.value || '0'))

      // 3. Fetch Competitions and associated data
      const [
        { data: comps },
        { data: judgeRes },
        { data: reports },
        { data: placements },
        { data: grades },
        { data: pubResults }
      ] = await Promise.all([
        supabase.from('competitions').select('*, categories(name)').order('name'),
        supabase.from('judge_results').select('competition_id, judge_id, code_letter, points_raw, grade'),
        supabase.from('competition_reports').select('competition_id, code_letter, participant_id, participants(id, name, team_id)'),
        supabase.from('placement_points').select('*'),
        supabase.from('point_settings').select('*'),
        supabase.from('competition_results').select('competition_id, participant_id, placement_points, grade_points, published, participants(team_id)')
      ])

      const judgedSet = new Set((judgeRes || []).map(r => r.competition_id))
      const publishedMap = {}
      ;(pubResults || []).forEach(r => {
        if (r.published) publishedMap[r.competition_id] = true
      })

      // Fast Indexing using Hash Maps (O(1) lookups)
      const judgeResByComp = {}
      ;(judgeRes || []).forEach(r => {
        if (!judgeResByComp[r.competition_id]) judgeResByComp[r.competition_id] = []
        judgeResByComp[r.competition_id].push(r)
      })

      const reportsByComp = {}
      ;(reports || []).forEach(r => {
        if (!reportsByComp[r.competition_id]) reportsByComp[r.competition_id] = []
        reportsByComp[r.competition_id].push(r)
      })

      const gradePtsMap = {}
      ;(grades || []).forEach(g => { gradePtsMap[g.grade] = g.points || 0 })

      const placePtsMap = {}
      ;(placements || []).forEach(p => {
        placePtsMap[`${p.competition_category}_${p.position}`] = p.points || 0
      })

      // Group judge results for points calculation
      const compPointsMap = {}
      const allJudgedComps = (comps || []).filter(c => judgedSet.has(c.id))

      allJudgedComps.forEach(comp => {
        const cJudges = judgeResByComp[comp.id] || []
        const cReports = reportsByComp[comp.id] || []

        // Average raw scores
        const codeMap = {}
        cJudges.forEach(rj => {
          if (!codeMap[rj.code_letter]) codeMap[rj.code_letter] = { points: [], grades: [] }
          codeMap[rj.code_letter].points.push(rj.points_raw)
          codeMap[rj.code_letter].grades.push(rj.grade)
        })

        const partMap = {}
        cReports.forEach(rr => { partMap[rr.code_letter] = rr.participants })

        const list = Object.entries(codeMap).map(([code, d]) => {
          const avg = d.points.reduce((a, b) => a + b, 0) / d.points.length
          const grade = d.grades[0]
          return {
            code_letter: code,
            avg_points: Math.round(avg * 10) / 10,
            grade,
            participant: partMap[code]
          }
        }).sort((a, b) => b.avg_points - a.avg_points)

        // Position increments only when grade changes
        let currentPos = 1
        const gs2 = comp.group_size || 1
        const catKey = gs2 === 1 ? 'individual' : gs2 === 2 ? 'group_2' : gs2 === 3 ? 'group_3' : 'group_45'

        list.forEach((r, idx) => {
          if (idx > 0) {
            const prev = list[idx - 1]
            if (r.grade !== prev.grade || r.avg_points !== prev.avg_points) {
              currentPos += 1
            }
          }
          r.position = currentPos
          r.grade_points = gradePtsMap[r.grade] || 0
          r.placement_points = r.position <= 3 ? (placePtsMap[`${catKey}_${r.position}`] || 0) : 0
        })

        // Map team points accumulated for this competition
        const teamPoints = {}
        list.forEach(r => {
          const tid = r.participant?.team_id
          if (tid) {
            teamPoints[tid] = (teamPoints[tid] || 0) + (r.placement_points + r.grade_points)
          }
        })

        compPointsMap[comp.id] = Object.entries(teamPoints).map(([teamId, pts]) => ({ teamId, points: pts }))
      })

      // Attach simulated points list to competition objects
      const enhancedComps = (comps || []).map(c => ({
        ...c,
        published: !!publishedMap[c.id],
        isJudged: judgedSet.has(c.id),
        simulatedPoints: compPointsMap[c.id] || []
      }))

      setAllComps(enhancedComps)

      // 4. Parse saved sequence
      let savedIds = []
      try {
        if (seqSetting?.value) {
          savedIds = JSON.parse(seqSetting.value)
        }
      } catch (err) {
        console.error("Error parsing announcer sequence setting:", err)
      }

      const seqSet = new Set(savedIds)
      const currentSequence = savedIds
        .map(id => enhancedComps.find(c => c.id === id))
        .filter(Boolean)

      // Competitions that are judged but NOT in the sequence yet
      const currentReady = enhancedComps.filter(c => c.isJudged && !seqSet.has(c.id))

      setSequence(currentSequence)
      setReadyComps(currentReady)

      // 5. Compute baseline points (total published scores EXCLUDING any that are currently in the announcer sequence)
      const basePoints = {}
      ;(teamsData || []).forEach(t => { basePoints[t.id] = 0 })

      ;(pubResults || []).forEach(r => {
        if (r.published && !seqSet.has(r.competition_id)) {
          const tid = r.participants?.team_id
          if (tid) {
            basePoints[tid] = (basePoints[tid] || 0) + ((r.placement_points || 0) + (r.grade_points || 0))
          }
        }
      })
      setBaselinePoints(basePoints)

      // Store in LocalStorage cache for instant load next time
      try {
        localStorage.setItem('cache_ann_teams', JSON.stringify(teamsData || []))
        localStorage.setItem('cache_ann_allComps', JSON.stringify(enhancedComps))
        localStorage.setItem('cache_ann_readyComps', JSON.stringify(currentReady))
        localStorage.setItem('cache_ann_sequence', JSON.stringify(currentSequence))
        localStorage.setItem('cache_ann_basePoints', JSON.stringify(basePoints))
      } catch (e) {}

    } catch (err) {
      console.error("Error fetching initial data:", err)
    } finally {
      setFetching(false)
    }
  }

  const milestones = useMemo(() => {
    if (sequence.length === 0) return []
    const list = []
    const teamMap = {}
    teams.forEach(t => { teamMap[t.id] = t.name })

    const getStandings = (pointsObj) => {
      return Object.entries(pointsObj)
        .map(([id, pts]) => ({ id, name: teamMap[id] || '—', points: pts }))
        .sort((a, b) => b.points - a.points)
    }

    const sortedMils = [...revealMilestones].sort((a, b) => a - b)
    let prevLimit = 0

    sortedMils.forEach((m, idx) => {
      if (m <= sequence.length) {
        const comps = sequence.slice(prevLimit, m)
        
        let runningPoints = { ...baselinePoints }
        sequence.slice(0, m).forEach(comp => {
          ;(comp.simulatedPoints || []).forEach(p => {
            runningPoints[p.teamId] = (runningPoints[p.teamId] || 0) + p.points
          })
        })

        const standings = getStandings(runningPoints)
        list.push({
          index: idx,
          name: `Milestone ${m}`,
          startIdx: prevLimit,
          endIdx: m,
          comps,
          standings,
          milestoneLimit: m
        })
        prevLimit = m
      }
    })

    if (prevLimit < sequence.length) {
      const comps = sequence.slice(prevLimit, sequence.length)
      let runningPoints = { ...baselinePoints }
      sequence.forEach(comp => {
        ;(comp.simulatedPoints || []).forEach(p => {
          runningPoints[p.teamId] = (runningPoints[p.teamId] || 0) + p.points
        })
      })
      const standings = getStandings(runningPoints)
      list.push({
        index: list.length,
        name: 'Final Standings',
        startIdx: prevLimit,
        endIdx: sequence.length,
        comps,
        standings,
        milestoneLimit: sequence.length
      })
    }

    return list
  }, [sequence, revealMilestones, baselinePoints, teams])

  function optimizeMilestone(startIdx, endIdx, milestoneIndex) {
    const milestoneComps = sequence.slice(startIdx, endIdx)
    const targetTeamId = milestoneTargets[milestoneIndex]

    if (targetTeamId) {
      // Sort to maximize targetTeam's points in this milestone
      milestoneComps.sort((a, b) => {
        const ptsA = a.simulatedPoints?.find(p => p.teamId === targetTeamId)?.points || 0
        const ptsB = b.simulatedPoints?.find(p => p.teamId === targetTeamId)?.points || 0
        return ptsB - ptsA
      })
    } else {
      // Random drama shuffle
      milestoneComps.sort(() => Math.random() - 0.5)
    }

    const nextSeq = [...sequence]
    nextSeq.splice(startIdx, milestoneComps.length, ...milestoneComps)
    setSequence(nextSeq)
  }

  const sortedReadyComps = useMemo(() => {
    let list = [...readyComps]
    if (sortReadyByTeam) {
      list.sort((a, b) => {
        const ptsA = a.simulatedPoints?.find(p => p.teamId === sortReadyByTeam)?.points || 0
        const ptsB = b.simulatedPoints?.find(p => p.teamId === sortReadyByTeam)?.points || 0
        return ptsB - ptsA
      })
    }
    return list
  }, [readyComps, sortReadyByTeam])

  // Move competition to sequence queue
  function addToSequence(comp) {
    setReadyComps(prev => prev.filter(c => c.id !== comp.id))
    setSequence(prev => [...prev, comp])
  }

  // Remove competition from sequence queue
  function removeFromSequence(comp) {
    setSequence(prev => prev.filter(c => c.id !== comp.id))
    setReadyComps(prev => [...prev, comp].sort((a,b) => a.name.localeCompare(b.name)))
  }

  // Shift sequence order up/down
  function moveInSequence(index, direction) {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === sequence.length - 1) return

    const newSeq = [...sequence]
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    const temp = newSeq[index]
    newSeq[index] = newSeq[targetIdx]
    newSeq[targetIdx] = temp
    setSequence(newSeq)
  }

  // Clear entire sequence queue
  function clearSequence() {
    setReadyComps(prev => {
      const combined = [...prev, ...sequence]
      return combined.sort((a,b) => a.name.localeCompare(b.name))
    })
    setSequence([])
  }

  // ── "Auto-Arrange for Maximum Drama" Suspense Algorithm ──
  function autoArrangeForSuspense() {
    if (sequence.length < 2) return

    // Heuristic evaluater
    const evaluate = (order) => {
      let score = 0
      let currentLeader = null
      let leadChanges = 0
      let closeMargins = 0
      const runningPoints = { ...baselinePoints }

      order.forEach(comp => {
        comp.simulatedPoints.forEach(p => {
          runningPoints[p.teamId] = (runningPoints[p.teamId] || 0) + p.points
        })

        const sorted = Object.entries(runningPoints).sort((a,b) => b[1] - a[1])
        if (sorted.length > 0) {
          const leader = sorted[0][0]
          if (currentLeader && leader !== currentLeader) {
            leadChanges++
          }
          currentLeader = leader

          if (sorted.length > 1) {
            const margin = sorted[0][1] - sorted[1][1]
            if (margin <= 5) {
              closeMargins++
            }
          }
        }
      })

      return (leadChanges * 100) + (closeMargins * 20)
    }

    let bestOrder = [...sequence]
    let bestScore = evaluate(bestOrder)

    // Monte Carlo / Shuffle Search (1000 iterations to find optimal suspense)
    for (let i = 0; i < 1000; i++) {
      const candidate = [...sequence].sort(() => Math.random() - 0.5)
      const candScore = evaluate(candidate)
      if (candScore > bestScore) {
        bestScore = candScore
        bestOrder = candidate
      }
    }

    setSequence(bestOrder)
  }

  async function resetRevealedMilestone() {
    setLoading(true)
    try {
      await supabase.from('app_settings').upsert({ key: 'leaderboard_revealed_milestone', value: '0' }, { onConflict: 'key' })
      setRevealedMilestone(0)
      setSuccess('All milestones successfully hidden/reset!')
      setTimeout(() => setSuccess(''), 3500)
    } catch (err) {
      console.error("Error resetting reveal status:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setLoading(true)
    setSuccess('')
    try {
      const seqIds = sequence.map(c => c.id)

      // Parse milestonesInput
      const parsedMilestones = milestonesInput
        .split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n) && n > 0)
        .sort((a, b) => a - b)

      await Promise.all([
        supabase.from('app_settings').upsert({ key: 'leaderboard_suspense_active', value: suspenseActive ? 'true' : 'false' }, { onConflict: 'key' }),
        supabase.from('app_settings').upsert({ key: 'leaderboard_reveal_milestones', value: JSON.stringify(parsedMilestones) }, { onConflict: 'key' }),
        supabase.from('app_settings').upsert({ key: 'announcer_sequence', value: JSON.stringify(seqIds) }, { onConflict: 'key' })
      ])

      setRevealMilestones(parsedMilestones)

      // Recompute baseline points based on new sequence
      const basePoints = {}
      teams.forEach(t => { basePoints[t.id] = 0 })

      const { data: pubResults } = await supabase
        .from('competition_results')
        .select('*, participants(team_id)')
        .eq('published', true)

      const seqSet = new Set(seqIds)
      ;(pubResults || []).forEach(r => {
        if (!seqSet.has(r.competition_id)) {
          const tid = r.participants?.team_id
          if (tid) {
            basePoints[tid] = (basePoints[tid] || 0) + ((r.placement_points || 0) + (r.grade_points || 0))
          }
        }
      })
      setBaselinePoints(basePoints)

      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(''), 2500)
    } catch (err) {
      console.error("Error saving flow settings:", err)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 24, height: 24 }} />
      </div>
    )
  }

  const publishedSeqCount = sequence.filter(c => c.published).length

  return (
    <div style={{ padding: '36px 40px', overflowY: 'auto', height: '100%' }}>
      <div className="list-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="list-title">Announcer Flow Manager</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Sequence ready competitions and configure suspense flow.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {success && <span style={{ color: '#2ed573', fontSize: 13, display: 'flex', alignItems: 'center', fontWeight: 600 }}>{success}</span>}
          <button className="btn-submit" onClick={handleSave} disabled={loading} style={{ background: 'var(--accent-light)', color: '#0e0b07', padding: '0 20px', height: 36, fontSize: 13, fontWeight: 700 }}>
            {loading ? <div className="spin" style={{ width: 14, height: 14 }} /> : 'Save Sequence'}
          </button>
        </div>
      </div>

      {/* Top summary widgets showing how many results are published etc */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Competitions', val: allComps.length, color: 'var(--text-secondary)' },
          { label: 'Judged & Ready', val: readyComps.length, color: 'var(--accent-light)' },
          { label: 'In Queue', val: sequence.length, color: '#7baede' },
          { label: 'Published to Public', val: allComps.filter(c => c.published).length, color: '#2ed573' }
        ].map((item, idx) => (
          <div key={idx} style={{
            flex: '1 1 120px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: '10px 14px',
            minWidth: 120
          }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>{item.label}</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: item.color, marginTop: 4 }}>{item.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginTop: 10 }}>
        
        {/* ── LEFT COLUMN: SEQUENCE BUILDER ── */}
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Suspense Settings */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 18 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px 0' }}>Suspense Mode Configuration</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Enable Leaderboard Suspense</p>
                <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Withholds sequence points from public leaderboard until threshold is met.</p>
              </div>
              <label className="switch-wrap" style={{ position: 'relative', display: 'inline-block', width: 44, height: 22, cursor: 'pointer' }}>
                <input type="checkbox" checked={suspenseActive} onChange={e => setSuspenseActive(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: suspenseActive ? 'var(--accent-light)' : 'rgba(255,255,255,0.1)',
                  transition: '0.2s', borderRadius: 22
                }}>
                  <span style={{
                    position: 'absolute', content: '""', height: 16, width: 16, left: suspenseActive ? 25 : 3, bottom: 3,
                    backgroundColor: suspenseActive ? '#0e0b07' : '#fff', transition: '0.2s', borderRadius: '50%'
                  }} />
                </span>
              </label>
            </div>

            {suspenseActive && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Leaderboard Reveal Milestones:</span>
                  <input
                    type="text"
                    value={milestonesInput}
                    onChange={e => setMilestonesInput(e.target.value)}
                    placeholder="e.g. 15, 30, 45"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 13,
                      padding: '8px 12px',
                      outline: 'none',
                      marginTop: 4
                    }}
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    Specify comma-separated result counts where the leaderboard reveals. (e.g., enter <code>15, 30</code> to reveal after the 15th and 30th announcements).
                  </p>
                </div>

                {/* Milestone status override and display box */}
                {(() => {
                  const nextMilestone = revealMilestones.find(m => m > revealedMilestone) || null
                  const isReady = nextMilestone && publishedSeqCount >= nextMilestone
                  const allDone = revealMilestones.length > 0 && revealedMilestone >= Math.max(...revealMilestones)

                  return (
                    <div style={{
                      marginTop: 16,
                      padding: 14,
                      borderRadius: 8,
                      background: allDone ? 'rgba(46, 213, 115, 0.08)' : (isReady ? 'rgba(247, 201, 72, 0.1)' : 'rgba(255, 255, 255, 0.02)'),
                      border: `1px solid ${allDone ? 'rgba(46, 213, 115, 0.2)' : (isReady ? 'rgba(247, 201, 72, 0.3)' : 'rgba(255, 255, 255, 0.06)')}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: allDone ? '#2ed573' : (isReady ? '#f7c948' : 'var(--text-muted)'),
                            textTransform: 'uppercase',
                            letterSpacing: 0.8
                          }}>
                            {allDone ? 'ALL MILESTONES COMPLETED' : (isReady ? `MILESTONE ${nextMilestone} REACHED` : `SUSPENSE ACTIVE (PROGRESS: ${publishedSeqCount} PUBLISHED)`)}
                          </span>
                          
                          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#fff', fontWeight: 600 }}>
                            {allDone 
                              ? 'All configured leaderboard milestones have been revealed.'
                              : isReady
                              ? `Milestone of ${nextMilestone} results reached! Unlocked for Announcer to reveal.`
                              : nextMilestone
                              ? `Next milestone reveal is at ${nextMilestone} announcements. Current published: ${publishedSeqCount}.`
                              : 'No reveal milestones configured.'
                            }
                          </p>
                          
                          {revealedMilestone > 0 && (
                            <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                              Currently revealed to public up to: <strong>{revealedMilestone} results</strong>.
                            </p>
                          )}
                        </div>

                        {revealedMilestone > 0 && (
                          <button
                            type="button"
                            onClick={resetRevealedMilestone}
                            disabled={loading}
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              padding: '8px 12px',
                              borderRadius: 6,
                              fontWeight: 800,
                              fontSize: 11,
                              cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Hide/Reset All
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })()}

              </div>
            )}
          </div>

          {/* Sequence Queue */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Announcer Sequence Queue</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>The Announcer will be forced to publish in this exact order.</p>
              </div>
              {sequence.length > 0 && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn-cancel-edit" onClick={autoArrangeForSuspense} style={{ background: 'rgba(79,156,249,0.08)', color: 'var(--accent-light)', height: 28, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                    <IconSparkles />
                    <span>Auto-Arrange (Drama)</span>
                  </button>
                  <button className="btn-cancel-edit" onClick={clearSequence} style={{ height: 28, fontSize: 11, background: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.2)', color: '#ef4444' }}>
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {sequence.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed rgba(255,255,255,0.05)', borderRadius: 8 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No competitions added to the queue.</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '2px 0 0 0' }}>Select competitions from the pending list below to build your sequence.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sequence.map((c, idx) => {
                  const scoreBadge = c.simulatedPoints && c.simulatedPoints.length > 0 ? (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '50%' }}>
                      {c.simulatedPoints.map(p => {
                        const tName = teams.find(t => t.id === p.teamId)?.name || '—'
                        const isSorted = p.teamId === sortReadyByTeam
                        return (
                          <span
                            key={p.teamId}
                            style={{
                              fontSize: 10,
                              fontWeight: isSorted ? 800 : 500,
                              color: isSorted ? 'var(--accent-light)' : 'var(--text-secondary)',
                              background: isSorted ? 'rgba(79, 156, 249, 0.12)' : 'rgba(255,255,255,0.03)',
                              border: isSorted ? '1px solid rgba(79, 156, 249, 0.25)' : '1px solid rgba(255,255,255,0.04)',
                              padding: '1px 5px',
                              borderRadius: 4,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {tName}: +{p.points}
                          </span>
                        )
                      })}
                    </div>
                  ) : null

                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 4, background: 'rgba(255,255,255,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)'
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{c.name}</p>
                        <p style={{ margin: '1px 0 0 0', fontSize: 10, color: 'var(--text-muted)' }}>{c.categories?.name} · {c.competition_type === 'stage' ? 'Stage' : 'Off-Stage'}</p>
                      </div>
                      
                      {scoreBadge}

                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-icon" onClick={() => moveInSequence(idx, 'up')} disabled={idx === 0} style={{ padding: 4 }}>
                          <IconArrowUp />
                        </button>
                        <button className="btn-icon" onClick={() => moveInSequence(idx, 'down')} disabled={idx === sequence.length - 1} style={{ padding: 4 }}>
                          <IconArrowDown />
                        </button>
                        <button className="btn-icon" onClick={() => removeFromSequence(c)} style={{ color: '#ef4444', padding: 4, marginLeft: 4 }}>
                          <IconTrash />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pending Competitions */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Judged Competitions (Ready to Sequence)</h3>
              
              {/* Sort selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sort by:</span>
                <select
                  value={sortReadyByTeam}
                  onChange={e => setSortReadyByTeam(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: 11,
                    padding: '2px 6px',
                    outline: 'none',
                    maxWidth: 130
                  }}
                >
                  <option value="">Default (Name)</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} Pts</option>
                  ))}
                </select>
              </div>
            </div>
            
            {sortedReadyComps.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0, textAlign: 'center', padding: '16px 0' }}>
                No pending judged competitions found.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '350px', overflowY: 'auto' }}>
                {sortedReadyComps.map(c => {
                  const scoreBadge = c.simulatedPoints && c.simulatedPoints.length > 0 ? (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '50%' }}>
                      {c.simulatedPoints.map(p => {
                        const tName = teams.find(t => t.id === p.teamId)?.name || '—'
                        const isSorted = p.teamId === sortReadyByTeam
                        return (
                          <span
                            key={p.teamId}
                            style={{
                              fontSize: 10,
                              fontWeight: isSorted ? 800 : 500,
                              color: isSorted ? 'var(--accent-light)' : 'var(--text-secondary)',
                              background: isSorted ? 'rgba(79, 156, 249, 0.12)' : 'rgba(255,255,255,0.03)',
                              border: isSorted ? '1px solid rgba(79, 156, 249, 0.25)' : '1px solid rgba(255,255,255,0.04)',
                              padding: '1px 5px',
                              borderRadius: 4,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {tName}: +{p.points}
                          </span>
                        )
                      })}
                    </div>
                  ) : null

                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 6, gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{c.name}</p>
                        <p style={{ margin: '1px 0 0 0', fontSize: 10, color: 'var(--text-muted)' }}>{c.categories?.name}</p>
                      </div>
                      
                      {scoreBadge}

                      <button className="btn-cancel-edit" onClick={() => addToSequence(c)} style={{ height: 26, fontSize: 11, background: 'rgba(79,156,249,0.08)', color: 'var(--accent-light)', border: '1px solid rgba(79,156,249,0.15)', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <IconPlus /> Add
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

        {/* ── RIGHT COLUMN: MILESTONE STANDINGS PREVIEW ── */}
        <div style={{ flex: '1 1 350px', minWidth: 320, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <IconTrophy />
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Milestone Standings Preview</h3>
            </div>
            
            {sequence.length === 0 ? (
              <div style={{ padding: '30px 20px', border: '1px solid var(--border-subtle)', borderRadius: 8, textAlign: 'center', background: 'rgba(255,255,255,0.005)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>Add competitions to the sequence queue to generate milestone standings.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {milestones.map((m) => {
                  const isExpanded = !!expandedMilestones[m.index]
                  const targetTeamId = milestoneTargets[m.index] || ''
                  
                  return (
                    <div
                      key={m.index}
                      style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.01)',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Milestone Collapsible Header */}
                      <div
                        onClick={() => setExpandedMilestones(prev => ({ ...prev, [m.index]: !prev[m.index] }))}
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent',
                          borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none'
                        }}
                      >
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {m.name}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>
                            ({m.startIdx + 1} - {m.endIdx} of {sequence.length})
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {m.standings.length > 0 && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-light)' }}>
                              #{1} {m.standings[0].name}
                            </span>
                          )}
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.6 }}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>

                      {/* Milestone Body */}
                      {isExpanded && (
                        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {/* Competitions in this Milestone */}
                          <div>
                            <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              Included Competitions
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                              {m.comps.map((comp, cIdx) => (
                                <div key={comp.id} style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                  {m.startIdx + cIdx + 1}. {comp.name}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Standings Preview */}
                          <div>
                            <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              Standings Tally after Milestone
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                              {m.standings.map((t, rankIdx) => {
                                const isTarget = t.id === targetTeamId
                                const isTop = rankIdx === 0
                                return (
                                  <div
                                    key={t.id}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '4px 8px',
                                      borderRadius: 6,
                                      background: isTarget ? 'rgba(247, 201, 72, 0.12)' : isTop ? 'rgba(79, 156, 249, 0.06)' : 'rgba(255,255,255,0.01)',
                                      border: `1px solid ${isTarget ? 'rgba(247, 201, 72, 0.35)' : isTop ? 'rgba(79, 156, 249, 0.15)' : 'transparent'}`
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                                      <span style={{ fontWeight: 800, color: isTarget ? '#f7c948' : isTop ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                                        #{rankIdx + 1}
                                      </span>
                                      <span style={{ fontWeight: 600, color: isTarget ? '#f7c948' : '#fff' }}>{t.name}</span>
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: isTarget ? '#f7c948' : 'var(--text-secondary)' }}>
                                      {t.points.toFixed(1)} <span style={{ fontSize: 8, fontWeight: 600, opacity: 0.6 }}>pts</span>
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Strategy / Action Box */}
                          <div style={{
                            marginTop: 4,
                            paddingTop: 10,
                            borderTop: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 8
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Target:</span>
                              <select
                                value={targetTeamId}
                                onChange={e => setMilestoneTargets(prev => ({ ...prev, [m.index]: e.target.value }))}
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 4,
                                  color: '#fff',
                                  fontSize: 10,
                                  padding: '2px 4px',
                                  outline: 'none',
                                  maxWidth: 120
                                }}
                              >
                                <option value="">None</option>
                                {teams.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => optimizeMilestone(m.startIdx, m.endIdx, m.index)}
                              style={{
                                background: 'rgba(79, 156, 249, 0.08)',
                                border: '1px solid rgba(79, 156, 249, 0.2)',
                                color: 'var(--accent-light)',
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Optimize Batch
                            </button>
                          </div>

                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  )
}
