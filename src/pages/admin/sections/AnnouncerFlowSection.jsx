// src/pages/admin/sections/AnnouncerFlowSection.jsx
import { useState, useEffect } from 'react'
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
  const [teams, setTeams] = useState([])
  const [allComps, setAllComps] = useState([])
  const [readyComps, setReadyComps] = useState([]) // judged, but not published yet
  const [sequence, setSequence] = useState([]) // arranged queue of comp objects
  const [baselinePoints, setBaselinePoints] = useState({}) // teamId -> points (pre-sequence)
  
  const [suspenseActive, setSuspenseActive] = useState(false)
  const [threshold, setThreshold] = useState(10)
  
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [simSteps, setSimSteps] = useState([])
  
  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (teams.length > 0 && allComps.length > 0) {
      calculateSimulation()
    }
  }, [sequence, baselinePoints, teams])

  async function fetchInitialData() {
    setFetching(true)
    try {
      // 1. Fetch Teams
      const { data: teamsData } = await supabase.from('teams').select('id, name')
      setTeams(teamsData || [])

      // 2. Fetch App Settings
      const { data: settings } = await supabase.from('app_settings').select('*')
      const activeSetting = settings?.find(s => s.key === 'leaderboard_suspense_active')
      const threshSetting = settings?.find(s => s.key === 'leaderboard_reveal_threshold')
      const seqSetting = settings?.find(s => s.key === 'announcer_sequence')

      setSuspenseActive(activeSetting?.value === 'true')
      setThreshold(parseInt(threshSetting?.value || '10'))

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
        supabase.from('judge_results').select('competition_id, code_letter, points_raw, grade'),
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

      // Group judge results for points calculation
      const compPointsMap = {}
      const allJudgedComps = (comps || []).filter(c => judgedSet.has(c.id))

      allJudgedComps.forEach(comp => {
        const cJudges = (judgeRes || []).filter(r => r.competition_id === comp.id)
        const cReports = (reports || []).filter(r => r.competition_id === comp.id)

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

        // Dense Rank Positions
        let currentPos = 1
        const gs2 = comp.group_size || 1
        const catKey = gs2 === 1 ? 'individual' : gs2 === 2 ? 'group_2' : gs2 === 3 ? 'group_3' : 'group_45'

        list.forEach((r, idx) => {
          if (idx > 0 && r.avg_points < list[idx - 1].avg_points) {
            currentPos += 1
          }
          r.position = currentPos

          const gsObj = grades?.find(g => g.grade === r.grade)
          r.grade_points = gsObj?.points || 0

          const ppObj = placements?.find(p => p.competition_category === catKey && p.position === r.position)
          r.placement_points = r.position <= 3 ? (ppObj?.points || 0) : 0
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

    } catch (err) {
      console.error("Error fetching initial data:", err)
    } finally {
      setFetching(false)
    }
  }

  function calculateSimulation() {
    const steps = []
    const runningPoints = { ...baselinePoints }

    // Initial State (Step 0)
    const getStandings = (pointsObj) => {
      return Object.entries(pointsObj)
        .map(([id, pts]) => {
          const t = teams.find(x => x.id === id)
          return { id, name: t?.name || '—', points: pts }
        })
        .sort((a, b) => b.points - a.points)
    }

    let prevLeaderId = null

    sequence.forEach((comp, idx) => {
      // Apply simulated points from this competition
      comp.simulatedPoints.forEach(p => {
        runningPoints[p.teamId] = (runningPoints[p.teamId] || 0) + p.points
      })

      const standings = getStandings(runningPoints)
      const leaderId = standings[0]?.id || null
      let overtake = false

      if (idx > 0 && leaderId && prevLeaderId && leaderId !== prevLeaderId) {
        overtake = true
      }
      prevLeaderId = leaderId

      // calculate margin to 2nd place
      const margin = standings.length > 1 ? standings[0].points - standings[1].points : 0

      steps.push({
        compName: comp.name,
        compId: comp.id,
        standings,
        overtake,
        margin
      })
    })

    setSimSteps(steps)
  }

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

  async function handleSave() {
    setLoading(true)
    setSuccess('')
    try {
      const seqIds = sequence.map(c => c.id)

      await Promise.all([
        supabase.from('app_settings').upsert({ key: 'leaderboard_suspense_active', value: suspenseActive ? 'true' : 'false' }),
        supabase.from('app_settings').upsert({ key: 'leaderboard_reveal_threshold', value: threshold.toString() }),
        supabase.from('app_settings').upsert({ key: 'announcer_sequence', value: JSON.stringify(seqIds) })
      ])

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

  return (
    <div style={{ padding: '36px 40px', overflowY: 'auto', height: '100%' }}>
      <div className="list-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="list-title">Announcer Flow Manager</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Sequence ready competitions and simulate suspense outcomes.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {success && <span style={{ color: '#2ed573', fontSize: 13, display: 'flex', alignItems: 'center', fontWeight: 600 }}>✓ {success}</span>}
          <button className="btn-submit" onClick={handleSave} disabled={loading} style={{ background: 'var(--accent-light)', color: '#0e0b07', padding: '0 20px', height: 36, fontSize: 13, fontWeight: 700 }}>
            {loading ? <div className="spin" style={{ width: 14, height: 14 }} /> : 'Save Sequence'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginTop: 20 }}>
        
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Leaderboard Reveal Threshold:</span>
                  <span style={{ fontSize: 15, color: 'var(--accent-light)', fontWeight: 800 }}>{threshold} Announcements</span>
                </div>
                <input
                  type="range" min="1" max={Math.max(sequence.length, 10)}
                  value={threshold} onChange={e => setThreshold(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-light)', marginTop: 8 }}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>The leaderboard will reveal only after the Announcer publishes at least {threshold} results.</p>
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
                {sequence.map((c, idx) => (
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
                ))}
              </div>
            )}
          </div>

          {/* Pending Competitions */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 18 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px 0' }}>Judged Competitions (Ready to Sequence)</h3>
            
            {readyComps.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0, textAlign: 'center', padding: '16px 0' }}>
                No pending judged competitions found.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '350px', overflowY: 'auto' }}>
                {readyComps.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{c.name}</p>
                      <p style={{ margin: '1px 0 0 0', fontSize: 10, color: 'var(--text-muted)' }}>{c.categories?.name}</p>
                    </div>
                    <button className="btn-cancel-edit" onClick={() => addToSequence(c)} style={{ height: 26, fontSize: 11, background: 'rgba(79,156,249,0.08)', color: 'var(--accent-light)', border: '1px solid rgba(79,156,249,0.15)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <IconPlus /> Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── RIGHT COLUMN: POINT TALLY SIMULATOR ── */}
        <div style={{ flex: '1 1 350px', minWidth: 320, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <IconTrophy />
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Tally Suspense Simulator</h3>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
              Preview how team scores will change step-by-step as each announcement is made. A high-drama order keeps margins close and features frequent lead changes.
            </p>

            {sequence.length === 0 ? (
              <div style={{ padding: '30px 20px', border: '1px solid var(--border-subtle)', borderRadius: 8, textAlign: 'center', background: 'rgba(255,255,255,0.005)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>Add competitions to the sequence queue to generate a simulated timeline.</p>
              </div>
            ) : (
              <div className="sim-timeline" style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', paddingLeft: 12 }}>
                
                {/* Simulated baseline state */}
                <div style={{ position: 'relative', paddingBottom: 10, borderBottom: '1px dashed rgba(255,255,255,0.08)' }}>
                  <div style={{ position: 'absolute', left: -16, top: 2, width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)' }} />
                  <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-muted)', fontWeight: 700 }}>Baseline Standings</span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    {Object.entries(baselinePoints)
                      .map(([id, pts]) => ({ name: teams.find(t => t.id === id)?.name || '—', points: pts }))
                      .sort((a, b) => b.points - a.points)
                      .slice(0, 3)
                      .map((t, i) => (
                        <span key={i} style={{ fontSize: 11, background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: 4, color: 'var(--text-secondary)' }}>
                          {t.name}: <strong>{t.points}</strong>
                        </span>
                      ))}
                  </div>
                </div>

                {/* Simulation Steps */}
                {simSteps.map((step, idx) => (
                  <div key={idx} style={{ position: 'relative', paddingLeft: 6 }}>
                    {/* Vertical connecting line */}
                    {idx < simSteps.length - 1 && (
                      <div style={{ position: 'absolute', left: -13, top: 12, width: 2, bottom: -22, background: 'rgba(255,255,255,0.06)' }} />
                    )}
                    {/* Timeline bullet */}
                    <div style={{
                      position: 'absolute', left: -17, top: 4, width: 10, height: 10, borderRadius: '50%',
                      background: step.overtake ? '#ff4757' : 'rgba(79, 156, 249, 0.4)',
                      border: `2px solid ${step.overtake ? '#ff475750' : 'rgba(79, 156, 249, 0.2)'}`
                    }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>
                          Announcement #{idx + 1}
                        </span>
                        <p style={{ margin: '1px 0 4px 0', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {step.compName}
                        </p>
                      </div>
                      {step.overtake && (
                        <span style={{ fontSize: 9, background: 'rgba(255, 71, 87, 0.15)', color: '#ff4757', border: '1px solid rgba(255, 71, 87, 0.3)', padding: '1px 6px', borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>
                          ⚡ Lead Change!
                        </span>
                      )}
                    </div>

                    {/* Step Standing preview */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      {step.standings.slice(0, 3).map((t, rank) => {
                        const isLeader = rank === 0
                        return (
                          <span key={rank} style={{
                            fontSize: 11,
                            background: isLeader ? 'rgba(79, 156, 249, 0.08)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isLeader ? 'rgba(79,156,249,0.2)' : 'transparent'}`,
                            padding: '2px 8px', borderRadius: 4,
                            color: isLeader ? 'var(--accent-light)' : 'var(--text-secondary)'
                          }}>
                            #{rank+1} {t.name}: <strong>{t.points}</strong>
                          </span>
                        )
                      })}
                    </div>

                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                      Margin to #2: <strong style={{ color: step.margin <= 5 ? '#ff9f43' : 'var(--text-secondary)' }}>{step.margin} pts</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
