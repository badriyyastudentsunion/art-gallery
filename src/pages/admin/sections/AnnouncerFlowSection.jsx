import { useState, useEffect, useMemo, useRef } from 'react'
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
const IconSparkles = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
)
const IconChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
)

export default function AnnouncerFlowSection() {
  const [teams, setTeams] = useState([])
  const [allComps, setAllComps] = useState([])
  const [readyComps, setReadyComps] = useState([])
  const [trayItems, setTrayItems] = useState([]) // Array of competitions and divider objects
  const [baselinePoints, setBaselinePoints] = useState({})
  
  const [suspenseActive, setSuspenseActive] = useState(true)
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [sortReadyByTeam, setSortReadyByTeam] = useState('')
  const [searchReady, setSearchReady] = useState('')

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    try {
      // 1. Fetch Teams
      const { data: teamsData } = await supabase.from('teams').select('id, name').order('name')
      setTeams(teamsData || [])

      // 2. Fetch App Settings
      const { data: settings } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['leaderboard_suspense_active', 'announcer_sequence'])
      
      const activeSetting = settings?.find(s => s.key === 'leaderboard_suspense_active')
      const seqSetting = settings?.find(s => s.key === 'announcer_sequence')

      setSuspenseActive(activeSetting ? activeSetting.value === 'true' : true)

      // 3. Fetch Competitions, Judge Results, Reports, Placements, Grades, Results
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

      // Fast Indexing using Hash Maps
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

      // Calculate simulated points for judged competitions
      const compPointsMap = {}
      const allJudgedComps = (comps || []).filter(c => judgedSet.has(c.id))

      allJudgedComps.forEach(comp => {
        const cJudges = judgeResByComp[comp.id] || []
        const cReports = reportsByComp[comp.id] || []

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

        const teamPoints = {}
        list.forEach(r => {
          const tid = r.participant?.team_id
          if (tid) {
            teamPoints[tid] = (teamPoints[tid] || 0) + (r.placement_points + r.grade_points)
          }
        })

        compPointsMap[comp.id] = Object.entries(teamPoints).map(([teamId, pts]) => ({ teamId, points: pts }))
      })

      const enhancedComps = (comps || []).map(c => ({
        ...c,
        published: !!publishedMap[c.id],
        isJudged: judgedSet.has(c.id),
        simulatedPoints: compPointsMap[c.id] || []
      }))

      setAllComps(enhancedComps)

      // 4. Parse saved sequence & include already published competitions
      let rawSequence = []
      try {
        if (seqSetting?.value) {
          rawSequence = JSON.parse(seqSetting.value)
        }
      } catch (err) {
        console.error("Error parsing announcer sequence setting:", err)
      }

      // Published competitions sorted by announcement/published time
      const publishedComps = enhancedComps
        .filter(c => c.published)
        .sort((a, b) => new Date(a.published_at || 0) - new Date(b.published_at || 0))

      const seqCompIds = new Set()
      const initialTray = []

      // Place already published competitions at the top
      publishedComps.forEach(c => {
        initialTray.push({ ...c, isDivider: false, isPublished: true })
        seqCompIds.add(c.id)
      })

      // Add remaining sequence items
      rawSequence.forEach((item, idx) => {
        if (typeof item === 'string' && item.startsWith('__divider')) {
          initialTray.push({
            id: `divider-${idx}-${Date.now()}`,
            isDivider: true,
            title: 'Points Standing Status'
          })
        } else if (typeof item === 'object' && item.isDivider) {
          initialTray.push({
            id: item.id || `divider-${idx}-${Date.now()}`,
            isDivider: true,
            title: item.title || 'Points Standing Status'
          })
        } else {
          const compId = typeof item === 'string' ? item : item.id
          if (!seqCompIds.has(compId)) {
            const found = enhancedComps.find(c => c.id === compId)
            if (found) {
              initialTray.push({ ...found, isDivider: false })
              seqCompIds.add(compId)
            }
          }
        }
      })

      const currentReady = enhancedComps.filter(c => c.isJudged && !seqCompIds.has(c.id))

      setTrayItems(initialTray)
      setReadyComps(currentReady)

      // 5. Baseline points (starts from 0 since all comps are calculated through the sequence)
      const basePoints = {}
      ;(teamsData || []).forEach(t => { basePoints[t.id] = 0 })
      setBaselinePoints(basePoints)

    } catch (err) {
      console.error("Error fetching initial data:", err)
    } finally {
      setFetching(false)
    }
  }

  // ── Calculate cumulative standings at every step of the tray ──
  const trayWithStandings = useMemo(() => {
    let runningPoints = { ...baselinePoints }
    let compCount = 0

    const teamMap = {}
    teams.forEach(t => { teamMap[t.id] = t.name })

    return trayItems.map((item, index) => {
      if (item.isDivider) {
        const standings = Object.entries(runningPoints)
          .map(([id, pts]) => ({ id, name: teamMap[id] || '—', points: pts }))
          .sort((a, b) => b.points - a.points)

        return {
          ...item,
          compCountAtDivider: compCount,
          standings
        }
      } else {
        compCount++
        ;(item.simulatedPoints || []).forEach(p => {
          runningPoints[p.teamId] = (runningPoints[p.teamId] || 0) + p.points
        })
        return {
          ...item,
          runningCompIndex: compCount
        }
      }
    })
  }, [trayItems, baselinePoints, teams])

  // Ready competitions filtered and sorted
  const sortedReadyComps = useMemo(() => {
    let list = [...readyComps]
    if (searchReady.trim()) {
      const q = searchReady.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.categories?.name?.toLowerCase().includes(q))
    }
    if (sortReadyByTeam) {
      list.sort((a, b) => {
        const ptsA = a.simulatedPoints?.find(p => p.teamId === sortReadyByTeam)?.points || 0
        const ptsB = b.simulatedPoints?.find(p => p.teamId === sortReadyByTeam)?.points || 0
        return ptsB - ptsA
      })
    }
    return list
  }, [readyComps, searchReady, sortReadyByTeam])

  const [saveStatus, setSaveStatus] = useState('saved') // 'saving' | 'saved' | 'error'
  const isInitialMount = useRef(true)

  // ── Auto-save with debounce ──
  useEffect(() => {
    if (fetching) return
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      try {
        const encodedSequence = trayItems.map(item => {
          if (item.isDivider) {
            return { id: item.id, isDivider: true, title: item.title }
          }
          return item.id
        })

        let compCount = 0
        const milestones = []
        trayItems.forEach(item => {
          if (item.isDivider) {
            if (compCount > 0 && !milestones.includes(compCount)) {
              milestones.push(compCount)
            }
          } else {
            compCount++
          }
        })

        const updates = [
          { key: 'announcer_sequence', value: JSON.stringify(encodedSequence) },
          { key: 'leaderboard_reveal_milestones', value: JSON.stringify(milestones) },
          { key: 'leaderboard_suspense_active', value: suspenseActive ? 'true' : 'false' }
        ]

        await supabase.from('app_settings').upsert(updates, { onConflict: 'key' })
        setSaveStatus('saved')
      } catch (err) {
        console.error("Auto-save failed:", err)
        setSaveStatus('error')
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [trayItems, suspenseActive, fetching])

  // Add competition to Tray
  function addToTray(comp) {
    setReadyComps(prev => prev.filter(c => c.id !== comp.id))
    setTrayItems(prev => [...prev, { ...comp, isDivider: false }])
  }

  // Add all ready competitions to Tray
  function addAllReadyToTray() {
    if (sortedReadyComps.length === 0) return
    const idsToAdd = new Set(sortedReadyComps.map(c => c.id))
    setReadyComps(prev => prev.filter(c => !idsToAdd.has(c.id)))
    setTrayItems(prev => [...prev, ...sortedReadyComps.map(c => ({ ...c, isDivider: false }))])
  }

  // Remove item from Tray with confirmation for published results
  function removeFromTray(item, index) {
    if (item.isDivider) {
      setTrayItems(prev => prev.filter((_, i) => i !== index))
    } else {
      if (item.published || item.isPublished) {
        const confirmed = window.confirm(`⚠️ Notice: "${item.name}" is already published to the public.\n\nAre you sure you want to remove it from the announcer sequence?`)
        if (!confirmed) return
      }
      setTrayItems(prev => prev.filter((_, i) => i !== index))
      setReadyComps(prev => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)))
    }
  }

  // Insert a Status Divider at a specific position (or at the end)
  function insertStatusDivider(atIndex = null) {
    const newDivider = {
      id: `divider-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isDivider: true,
      title: 'Points Standing Status'
    }

    setTrayItems(prev => {
      const next = [...prev]
      if (atIndex === null || atIndex >= next.length) {
        next.push(newDivider)
      } else {
        next.splice(atIndex, 0, newDivider)
      }
      return next
    })
  }

  // Shift item up/down in Tray
  function moveInTray(index, direction) {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === trayItems.length - 1) return

    const newTray = [...trayItems]
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    const temp = newTray[index]
    newTray[index] = newTray[targetIdx]
    newTray[targetIdx] = temp
    setTrayItems(newTray)
  }

  // Clear Tray with confirmation
  function clearTray() {
    const confirmed = window.confirm("⚠️ Are you sure you want to clear the tray? (Published results will remain published to the public).")
    if (!confirmed) return

    const compsInTray = trayItems.filter(i => !i.isDivider)
    setReadyComps(prev => {
      const combined = [...prev, ...compsInTray]
      return combined.sort((a, b) => a.name.localeCompare(b.name))
    })
    setTrayItems([])
  }

  if (fetching) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
        <div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 26, height: 26 }} />
      </div>
    )
  }

  const trayCompsCount = trayItems.filter(i => !i.isDivider).length
  const trayDividersCount = trayItems.filter(i => i.isDivider).length
  const publishedCompsCount = allComps.filter(c => c.published).length

  return (
    <div style={{ padding: '24px 32px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      
      {/* ── Top Header & Actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 className="list-title" style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
            Announcer Tray & Flow Manager
          </h1>
        </div>

        {/* ── Auto-save Status Indicator ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saveStatus === 'saving' && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent-light)',
              background: 'rgba(79, 156, 249, 0.08)',
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid rgba(79, 156, 249, 0.2)'
            }}>
              <div className="spin" style={{ width: 12, height: 12, borderTopColor: 'var(--accent-light)' }} />
              Auto-saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 700,
              color: '#2ed573',
              background: 'rgba(46, 213, 115, 0.08)',
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid rgba(46, 213, 115, 0.2)'
            }}>
              ✓ Auto-saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 700,
              color: '#ef4444',
              background: 'rgba(239, 68, 68, 0.08)',
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              ⚠️ Save failed
            </span>
          )}
        </div>
      </div>

      {/* ── Metric Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Ready to Queue', val: readyComps.length, color: 'var(--accent-light)' },
          { label: 'In Tray (Comps)', val: trayCompsCount, color: '#60a5fa' },
          { label: 'Status Dividers', val: trayDividersCount, color: '#f7c948' },
          { label: 'Published Results', val: publishedCompsCount, color: '#2ed573' }
        ].map((stat, idx) => (
          <div key={idx} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
              {stat.label}
            </span>
            <span style={{ fontSize: 22, fontWeight: 800, color: stat.color, marginTop: 4 }}>
              {stat.val}
            </span>
          </div>
        ))}
      </div>

      {/* ── Suspense Toggle Bar ── */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: '14px 18px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: suspenseActive ? 'rgba(247, 201, 72, 0.12)' : 'rgba(255,255,255,0.05)',
            color: suspenseActive ? '#f7c948' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <IconChart />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>
              Public Leaderboard Suspense
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
              Public standings stay withheld until the Announcer triggers the Status Dividers.
            </p>
          </div>
        </div>

        <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={suspenseActive}
            onChange={e => setSuspenseActive(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: suspenseActive ? 'var(--accent-light)' : 'rgba(255,255,255,0.12)',
            transition: '0.2s', borderRadius: 24
          }}>
            <span style={{
              position: 'absolute', height: 18, width: 18, left: suspenseActive ? 23 : 3, bottom: 3,
              backgroundColor: suspenseActive ? '#0e0b07' : '#fff', transition: '0.2s', borderRadius: '50%'
            }} />
          </span>
        </label>
      </div>

      {/* ── Main Two-Column Workflow: Tray Builder & Ready Comps ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(300px, 1fr)', gap: 24, alignItems: 'start' }}>
        
        {/* ── LEFT: ANNOUNCEMENT TRAY (QUEUE) ── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 20 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#fff' }}>
                Announcement Tray ({trayCompsCount} Comps)
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                Items will be announced in this exact sequence.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => insertStatusDivider(null)}
                style={{
                  background: 'rgba(247, 201, 72, 0.12)',
                  border: '1px solid rgba(247, 201, 72, 0.3)',
                  color: '#f7c948',
                  height: 30,
                  fontSize: 11,
                  padding: '0 10px',
                  borderRadius: 6,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer'
                }}
              >
                <IconPlus /> Add Status Divider
              </button>

              {trayItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearTray}
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    height: 30,
                    fontSize: 11,
                    padding: '0 8px',
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {trayWithStandings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', border: '2px dashed rgba(255,255,255,0.06)', borderRadius: 10 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0, fontWeight: 600 }}>
                Your Announcement Tray is empty.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '6px 0 0 0' }}>
                Add judged competitions from the right panel, or insert status dividers.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {trayWithStandings.map((item, idx) => {
                
                // ── CASE A: STATUS DIVIDER CARD ──
                if (item.isDivider) {
                  return (
                    <div key={item.id} style={{
                      background: 'linear-gradient(135deg, rgba(247, 201, 72, 0.08) 0%, rgba(79, 156, 249, 0.05) 100%)',
                      border: '1.5px dashed rgba(247, 201, 72, 0.4)',
                      borderRadius: 10,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 800, color: '#0e0b07',
                            background: '#f7c948', padding: '2px 8px', borderRadius: 12,
                            textTransform: 'uppercase', letterSpacing: 0.5
                          }}>
                            STATUS DIVIDER
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
                            Standings after {item.compCountAtDivider} Competitions
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn-icon"
                            onClick={() => moveInTray(idx, 'up')}
                            disabled={idx === 0}
                            style={{ padding: 4 }}
                            title="Move Up"
                          >
                            <IconArrowUp />
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => moveInTray(idx, 'down')}
                            disabled={idx === trayItems.length - 1}
                            style={{ padding: 4 }}
                            title="Move Down"
                          >
                            <IconArrowDown />
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => removeFromTray(item, idx)}
                            style={{ color: '#ef4444', padding: 4, marginLeft: 4 }}
                            title="Remove Divider"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </div>

                      {/* Standings preview strip */}
                      <div style={{
                        display: 'flex',
                        gap: 6,
                        flexWrap: 'wrap',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '6px 10px',
                        borderRadius: 6
                      }}>
                        {(item.standings || []).map((s, sIdx) => (
                          <span key={s.id} style={{
                            fontSize: 11,
                            color: sIdx === 0 ? '#f7c948' : 'var(--text-secondary)',
                            fontWeight: sIdx === 0 ? 800 : 500
                          }}>
                            {sIdx + 1}. {s.name} ({s.points} pts)
                            {sIdx < item.standings.length - 1 && <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: 6 }}>|</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                }

                // ── CASE B: REGULAR COMPETITION CARD ──
                const isPublished = item.isPublished || item.published
                return (
                  <div key={item.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: isPublished ? 'rgba(46, 213, 115, 0.03)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isPublished ? 'rgba(46, 213, 115, 0.25)' : 'var(--border-subtle)'}`,
                    borderRadius: 10,
                    padding: '10px 14px',
                    transition: 'all 0.15s ease'
                  }}>
                    <span style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: isPublished ? '#2ed573' : 'var(--accent-light)',
                      fontFamily: 'inherit',
                      minWidth: 32,
                      textAlign: 'center',
                      flexShrink: 0,
                      letterSpacing: '-0.5px'
                    }}>
                      #{String(item.runningCompIndex).padStart(2, '0')}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </p>
                        {isPublished && (
                          <span style={{ fontSize: 9.5, fontWeight: 700, color: '#2ed573', background: 'rgba(46, 213, 115, 0.1)', padding: '1px 5px', borderRadius: 4 }}>
                            Published
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '2px 0 0 0', fontSize: 10.5, color: 'var(--text-muted)' }}>
                        {item.categories?.name || 'General'} · {item.competition_type === 'stage' ? 'Stage' : 'Off-Stage'}
                      </p>
                    </div>

                    {/* Team Points badges for this competition */}
                    {item.simulatedPoints && item.simulatedPoints.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '40%' }}>
                        {item.simulatedPoints.map(p => {
                          const tName = teams.find(t => t.id === p.teamId)?.name || '—'
                          return (
                            <span key={p.teamId} style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: 'rgba(255,255,255,0.85)',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              padding: '1px 5px',
                              borderRadius: 4,
                              whiteSpace: 'nowrap'
                            }}>
                              {tName}: +{p.points}
                            </span>
                          )
                        })}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      {isPublished ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: '#2ed573',
                          background: 'rgba(46, 213, 115, 0.08)',
                          border: '1px solid rgba(46, 213, 115, 0.2)',
                          padding: '3px 8px',
                          borderRadius: 6
                        }}>
                          🔒 Completed
                        </span>
                      ) : (
                        <>
                          <button
                            className="btn-icon"
                            onClick={() => moveInTray(idx, 'up')}
                            disabled={idx <= trayItems.findIndex(i => !i.isPublished && !i.published)}
                            style={{ padding: 4 }}
                            title="Move Up"
                          >
                            <IconArrowUp />
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => moveInTray(idx, 'down')}
                            disabled={idx === trayItems.length - 1}
                            style={{ padding: 4 }}
                            title="Move Down"
                          >
                            <IconArrowDown />
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => removeFromTray(item, idx)}
                            style={{ color: '#ef4444', padding: 4, marginLeft: 3 }}
                            title="Remove from Tray"
                          >
                            <IconTrash />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: JUDGED COMPETITIONS (SOURCE POOL) ── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 20 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#fff' }}>
                Judged Items ({readyComps.length} Ready)
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                Click "+" to add competitions to the announcement tray.
              </p>
            </div>

            {sortedReadyComps.length > 0 && (
              <button
                type="button"
                onClick={addAllReadyToTray}
                style={{
                  background: 'rgba(79, 156, 249, 0.1)',
                  border: '1px solid rgba(79, 156, 249, 0.25)',
                  color: 'var(--accent-light)',
                  height: 28,
                  fontSize: 11,
                  padding: '0 10px',
                  borderRadius: 6,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                + Add All ({sortedReadyComps.length})
              </button>
            )}
          </div>

          {/* Search & Team Filter Bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              type="text"
              placeholder="Search ready competitions..."
              value={searchReady}
              onChange={e => setSearchReady(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 12,
                color: '#fff',
                outline: 'none'
              }}
            />

            <select
              value={sortReadyByTeam}
              onChange={e => setSortReadyByTeam(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 11,
                color: '#fff',
                outline: 'none',
                maxWidth: 130
              }}
            >
              <option value="">Sort: Name</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name} Pts</option>
              ))}
            </select>
          </div>

          {sortedReadyComps.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0, textAlign: 'center', padding: '36px 0' }}>
              {readyComps.length === 0 ? 'No more judged competitions waiting.' : 'No competitions match your search.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '600px', overflowY: 'auto' }}>
              {sortedReadyComps.map(c => {
                return (
                  <div key={c.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    padding: '8px 12px'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.name}
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: 10, color: 'var(--text-muted)' }}>
                        {c.categories?.name || 'General'}
                      </p>
                    </div>

                    {c.simulatedPoints && c.simulatedPoints.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '40%' }}>
                        {c.simulatedPoints.map(p => {
                          const tName = teams.find(t => t.id === p.teamId)?.name || '—'
                          return (
                            <span key={p.teamId} style={{
                              fontSize: 9.5,
                              color: 'var(--text-muted)',
                              background: 'rgba(255,255,255,0.03)',
                              padding: '1px 4px',
                              borderRadius: 4
                            }}>
                              {tName}: +{p.points}
                            </span>
                          )
                        })}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => addToTray(c)}
                      style={{
                        background: 'rgba(79, 156, 249, 0.12)',
                        border: '1px solid rgba(79, 156, 249, 0.3)',
                        color: 'var(--accent-light)',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        flexShrink: 0
                      }}
                    >
                      <IconPlus /> Add
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
