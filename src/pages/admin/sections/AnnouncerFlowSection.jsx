import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  const [revealedMilestone, setRevealedMilestone] = useState(0)
  const [officialNumberMap, setOfficialNumberMap] = useState({})
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [sortReadyByTeam, setSortReadyByTeam] = useState('')
  const [searchReady, setSearchReady] = useState('')
  const [confirmModal, setConfirmModal] = useState(null)
  const [milestonePosters, setMilestonePosters] = useState({})
  const [uploadingMilestone, setUploadingMilestone] = useState(null)
  const [previewPoster, setPreviewPoster] = useState(null)
  const isSelfSavingRef = useRef(false)
  const trayItemsRef = useRef([])

  useEffect(() => {
    trayItemsRef.current = trayItems
  }, [trayItems])

  useEffect(() => {
    fetchInitialData(true)

    // Realtime subscriptions for live stage announcements and settings
    const rand = Math.random().toString(36).substring(2, 7)
    let judgeDebounceTimer = null

    const ch = supabase.channel(`rt-announcer-flow-${rand}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_media' }, async () => {
        try {
          const { data: milestoneMedia } = await supabase
            .from('gallery_media')
            .select('id, type, caption, thumb_url, hd_url, milestone, created_at')
            .eq('type', 'poster')
            .not('milestone', 'is', null)

          const posterMap = {}
          ;(milestoneMedia || []).forEach(p => {
            posterMap[p.milestone] = p
          })
          setMilestonePosters(posterMap)
        } catch (e) {
          console.error("Error refreshing milestone posters:", e)
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_results' }, async () => {
        try {
          const { data: pubResults } = await supabase
            .from('competition_results')
            .select('competition_id, published, published_at')
            .eq('published', true)

          const publishedMap = {}
          const uniquePubComps = []
          const publishedCompsMap = {}
          ;(pubResults || []).forEach(r => {
            publishedMap[r.competition_id] = true
            if (!publishedCompsMap[r.competition_id]) {
              publishedCompsMap[r.competition_id] = { id: r.competition_id, published_at: r.published_at }
              uniquePubComps.push(publishedCompsMap[r.competition_id])
            }
          })
          uniquePubComps.sort((a, b) => {
            if (!a.published_at) return 1
            if (!b.published_at) return -1
            return new Date(a.published_at) - new Date(b.published_at)
          })
          const numMap = {}
          uniquePubComps.forEach((c, idx) => { numMap[c.id] = idx + 1 })
          setOfficialNumberMap(numMap)

          setAllComps(prev => prev.map(c => ({
            ...c,
            published: !!publishedMap[c.id],
            officialNumber: numMap[c.id] || null
          })))

          setTrayItems(prev => prev.map(item => {
            if (item.isDivider) return item
            return {
              ...item,
              published: !!publishedMap[item.id],
              isPublished: !!publishedMap[item.id],
              officialNumber: numMap[item.id] || null
            }
          }))
        } catch (err) {
          console.error("Error refreshing competition results:", err)
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, (payload) => {
        const k = payload.new?.key
        const v = payload.new?.value
        if (k === 'leaderboard_revealed_milestone') {
          setRevealedMilestone(parseInt(v || '0', 10))
        } else if (k === 'leaderboard_suspense_active') {
          setSuspenseActive(v === 'true')
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'judge_results' }, () => {
        clearTimeout(judgeDebounceTimer)
        judgeDebounceTimer = setTimeout(() => fetchInitialData(false), 2000)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_reports' }, () => {
        clearTimeout(judgeDebounceTimer)
        judgeDebounceTimer = setTimeout(() => fetchInitialData(false), 2000)
      })
      .subscribe()

    return () => {
      clearTimeout(judgeDebounceTimer)
      supabase.removeChannel(ch)
    }
  }, [])

  async function fetchInitialData(isInitial = false) {
    if (isInitial && allComps.length === 0) setFetching(true)
    try {
      // 1. Fetch Teams
      const { data: teamsData } = await supabase.from('teams').select('id, name').order('name')
      setTeams(teamsData || [])

      // 2. Fetch App Settings
      const { data: settings } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['leaderboard_suspense_active', 'announcer_sequence', 'leaderboard_revealed_milestone', 'leaderboard_reveal_milestones'])
      
      const activeSetting = settings?.find(s => s.key === 'leaderboard_suspense_active')
      const seqSetting = settings?.find(s => s.key === 'announcer_sequence')
      const revealedSetting = settings?.find(s => s.key === 'leaderboard_revealed_milestone')

      setSuspenseActive(activeSetting ? activeSetting.value === 'true' : true)
      setRevealedMilestone(parseInt(revealedSetting?.value || '0', 10))

      // 3. Fetch Competitions, Judge Results, Reports, Placements, Grades, Results, Milestone Posters
      const [
        { data: comps },
        { data: judgeRes },
        { data: reports },
        { data: placements },
        { data: grades },
        { data: pubResults },
        { data: milestoneMedia }
      ] = await Promise.all([
        supabase.from('competitions').select('*, categories(name)').order('name'),
        supabase.from('judge_results').select('competition_id, judge_id, code_letter, points_raw, grade'),
        supabase.from('competition_reports').select('competition_id, code_letter, participant_id, participants(id, name, team_id)'),
        supabase.from('placement_points').select('*'),
        supabase.from('point_settings').select('*'),
        supabase.from('competition_results').select('competition_id, participant_id, placement_points, grade_points, published, participants(team_id)'),
        supabase.from('gallery_media').select('id, type, caption, thumb_url, hd_url, milestone, created_at').eq('type', 'poster').not('milestone', 'is', null)
      ])

      const posterMap = {}
      ;(milestoneMedia || []).forEach(p => {
        if (p.milestone) posterMap[p.milestone] = p
      })
      setMilestonePosters(posterMap)

      const judgedSet = new Set((judgeRes || []).map(r => r.competition_id))
      const publishedMap = {}
      const publishedCompsMap = {}
      const uniquePubComps = []
      ;(pubResults || []).forEach(r => {
        if (r.published) {
          publishedMap[r.competition_id] = true
          if (!publishedCompsMap[r.competition_id]) {
            publishedCompsMap[r.competition_id] = {
              id: r.competition_id,
              published_at: r.published_at
            }
            uniquePubComps.push(publishedCompsMap[r.competition_id])
          }
        }
      })
      uniquePubComps.sort((a, b) => {
        if (!a.published_at) return 1
        if (!b.published_at) return -1
        return new Date(a.published_at) - new Date(b.published_at)
      })
      const numMap = {}
      uniquePubComps.forEach((c, idx) => {
        numMap[c.id] = idx + 1
      })
      setOfficialNumberMap(numMap)

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
        published_at: publishedCompsMap[c.id]?.published_at || null,
        officialNumber: numMap[c.id] || null,
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

      // 1. Published competitions sorted strictly by official announcement time / Result Number
      const publishedComps = enhancedComps
        .filter(c => c.published)
        .sort((a, b) => (a.officialNumber || 9999) - (b.officialNumber || 9999))

      // 2. Extract dividers and pending competitions from saved rawSequence
      const rawDividers = []
      const pendingSequenceComps = []
      const seqCompIds = new Set()

      if (rawSequence && rawSequence.length > 0) {
        let compCounter = 0
        rawSequence.forEach((item, idx) => {
          const isDivider = (typeof item === 'object' && item.isDivider) || (typeof item === 'string' && item.startsWith('__divider'))
          if (isDivider) {
            rawDividers.push({
              id: typeof item === 'object' && item.id ? item.id : `divider-${idx}-${Date.now()}`,
              isDivider: true,
              title: typeof item === 'object' && item.title ? item.title : 'Points Standing Status',
              milestone: compCounter
            })
          } else {
            compCounter++
            const compId = typeof item === 'string' ? item : item.id
            const found = enhancedComps.find(c => c.id === compId)
            if (found && !found.published && !seqCompIds.has(compId)) {
              pendingSequenceComps.push(found)
              seqCompIds.add(compId)
            }
          }
        })
      }

      // Ensure standard milestone 10 divider is present
      if (!rawDividers.some(d => d.milestone === 10)) {
        rawDividers.push({
          id: 'divider-10',
          isDivider: true,
          title: 'Points Standing Status',
          milestone: 10
        })
      }

      // 3. Assemble initialTray: Published Comps (#1..#N) + Dividers + Pending Comps
      const initialTray = []
      let pCount = 0

      // Add zero-milestone dividers if any
      rawDividers.filter(d => d.milestone === 0).forEach(div => initialTray.push(div))

      publishedComps.forEach(c => {
        pCount++
        initialTray.push({ ...c, isDivider: false, isPublished: true })
        seqCompIds.add(c.id)

        // Insert dividers belonging after this published count
        rawDividers.filter(d => d.milestone === pCount).forEach(div => {
          initialTray.push(div)
        })
      })

      // Add upcoming pending competitions and trailing dividers
      pendingSequenceComps.forEach(c => {
        pCount++
        initialTray.push({ ...c, isDivider: false, isPublished: false })
        rawDividers.filter(d => d.milestone === pCount).forEach(div => {
          initialTray.push(div)
        })
      })

      const currentReady = enhancedComps.filter(c => c.isJudged && !seqCompIds.has(c.id))

      if (isInitial) {
        setTrayItems(initialTray)
        setReadyComps(currentReady)
      } else {
        // Keep active tray state intact, only update simulatedPoints & published flags in-place
        setTrayItems(prev => {
          return prev.map(item => {
            if (item.isDivider) return item
            const found = enhancedComps.find(c => c.id === item.id)
            if (!found) return item
            return {
              ...item,
              ...found,
              isPublished: !!found.published
            }
          })
        })

        setReadyComps(prev => {
          const activeTrayIds = new Set((trayItemsRef.current || []).filter(i => !i.isDivider).map(i => i.id))
          return enhancedComps.filter(c => c.isJudged && !activeTrayIds.has(c.id))
        })
      }

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

  // ── Calculate cumulative standings and completion status at every step of the tray ──
  const trayWithStandings = useMemo(() => {
    let runningPoints = { ...baselinePoints }
    let compCount = 0
    let publishedCount = 0
    let pendingCount = 0
    const totalPublished = Object.keys(officialNumberMap).length

    const teamMap = {}
    teams.forEach(t => { teamMap[t.id] = t.name })

    return trayItems.map((item, index) => {
      if (item.isDivider) {
        const standings = Object.entries(runningPoints)
          .map(([id, pts]) => ({ id, name: teamMap[id] || '—', points: pts }))
          .sort((a, b) => b.points - a.points)

        const milestone = compCount
        const isRevealed = revealedMilestone >= milestone && milestone > 0
        const isReady = publishedCount >= milestone && !isRevealed && milestone > 0
        const isLocked = publishedCount < milestone || milestone === 0

        return {
          ...item,
          compCountAtDivider: milestone,
          publishedCountBeforeDivider: publishedCount,
          isRevealed,
          isReady,
          isLocked,
          standings
        }
      } else {
        compCount++
        const isPub = item.isPublished || item.published
        let displayNumber = 0
        if (isPub) {
          publishedCount++
          displayNumber = officialNumberMap[item.id] || compCount
        } else {
          pendingCount++
          displayNumber = totalPublished + pendingCount
        }
        ;(item.simulatedPoints || []).forEach(p => {
          runningPoints[p.teamId] = (runningPoints[p.teamId] || 0) + p.points
        })
        return {
          ...item,
          runningCompIndex: compCount,
          displayNumber
        }
      }
    })
  }, [trayItems, baselinePoints, teams, revealedMilestone, officialNumberMap])

  // Force reveal status divider to public
  async function handleForceRevealDivider(dividerMilestone) {
    if (!dividerMilestone) return
    try {
      await supabase.from('app_settings').upsert({
        key: 'leaderboard_revealed_milestone',
        value: String(dividerMilestone)
      })
      setRevealedMilestone(dividerMilestone)
    } catch (err) {
      console.error(err)
    }
  }

  // Revert status divider to hide or step back
  async function handleRevertDivider(dividerMilestone) {
    const nextVal = Math.max(0, dividerMilestone - 1)
    try {
      await supabase.from('app_settings').upsert({
        key: 'leaderboard_revealed_milestone',
        value: String(nextVal)
      })
      setRevealedMilestone(nextVal)
    } catch (err) {
      console.error(err)
    }
  }

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
        isSelfSavingRef.current = true
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
      } finally {
        setTimeout(() => {
          isSelfSavingRef.current = false
        }, 1200)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [trayItems, suspenseActive, fetching])

  // Add competition to Tray
  function addToTray(comp) {
    setReadyComps(prev => prev.filter(c => c.id !== comp.id))
    setTrayItems(prev => [...prev, { ...comp, isDivider: false }])
  }

  // Add all ready competitions to Tray with Confirmation Popup
  function addAllReadyToTray() {
    if (sortedReadyComps.length === 0) return
    setConfirmModal({
      title: 'Add All to Tray',
      message: `Are you sure you want to add all ${sortedReadyComps.length} judged competitions to the announcement tray at once?`,
      confirmText: `Add All (${sortedReadyComps.length})`,
      onConfirm: () => {
        const idsToAdd = new Set(sortedReadyComps.map(c => c.id))
        setReadyComps(prev => prev.filter(c => !idsToAdd.has(c.id)))
        setTrayItems(prev => [...prev, ...sortedReadyComps.map(c => ({ ...c, isDivider: false }))])
      }
    })
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

  // Move a divider directly after a specific competition count
  function moveDividerToCompCount(dividerIdx, targetCompCount) {
    setTrayItems(prev => {
      const itemToMove = prev[dividerIdx]
      if (!itemToMove || !itemToMove.isDivider) return prev

      const withoutDivider = prev.filter((_, i) => i !== dividerIdx)
      let compCount = 0
      let insertIdx = withoutDivider.length

      for (let i = 0; i < withoutDivider.length; i++) {
        if (!withoutDivider[i].isDivider) {
          compCount++
          if (compCount === targetCompCount) {
            insertIdx = i + 1
            break
          }
        }
      }

      if (targetCompCount === 0) insertIdx = 0

      const next = [...withoutDivider]
      next.splice(insertIdx, 0, itemToMove)
      return next
    })
  }

  // Sort Tray by Result Number (published competitions ordered #1..#N, followed by dividers and pending queue)
  function sortTrayByResultNumber() {
    setTrayItems(prev => {
      const pubItems = prev.filter(item => !item.isDivider && (item.isPublished || item.published))
        .sort((a, b) => (officialNumberMap[a.id] || 9999) - (officialNumberMap[b.id] || 9999))
      
      const otherItems = prev.filter(item => item.isDivider || !(item.isPublished || item.published))
      return [...pubItems, ...otherItems]
    })
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

  // ── Milestone Poster Image Compressor & Uploader ──
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          // Full / HD resolution canvas
          const fullCanvas = document.createElement('canvas')
          fullCanvas.width = img.width
          fullCanvas.height = img.height
          const ctxFull = fullCanvas.getContext('2d')
          ctxFull.drawImage(img, 0, 0)
          const fullUrl = fullCanvas.toDataURL('image/jpeg', 0.92)

          // Thumbnail canvas (max 800px)
          const thumbCanvas = document.createElement('canvas')
          const maxDim = 800
          let tw = img.width
          let th = img.height
          if (tw > th) {
            if (tw > maxDim) {
              th = Math.round((th * maxDim) / tw)
              tw = maxDim
            }
          } else {
            if (th > maxDim) {
              tw = Math.round((tw * maxDim) / th)
              th = maxDim
            }
          }
          thumbCanvas.width = tw
          thumbCanvas.height = th
          const ctxThumb = thumbCanvas.getContext('2d')
          ctxThumb.imageSmoothingEnabled = true
          ctxThumb.imageSmoothingQuality = 'high'
          ctxThumb.drawImage(img, 0, 0, tw, th)
          const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.85)

          resolve({ fullUrl, thumbUrl })
        }
        img.onerror = reject
        img.src = e.target.result
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const dataURLtoBlob = (url) => {
    const [header, data] = url.split(',')
    const mime = header.match(/:(.*?);/)[1]
    const binary = atob(data)
    const array = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i)
    }
    return new Blob([array], { type: mime })
  }

  async function handleUploadMilestonePoster(milestone, file) {
    if (!file || !milestone) return
    setUploadingMilestone(milestone)
    try {
      const { fullUrl, thumbUrl } = await compressImage(file)
      const fid = `status-milestone-${milestone}-${Date.now()}`

      const blobHd = dataURLtoBlob(fullUrl)
      const fpHd = `hd/${fid}.jpg`
      const resHd = await supabase.storage.from('event-media').upload(fpHd, blobHd, { contentType: 'image/jpeg', upsert: true })
      const hdUrl = resHd.error ? fullUrl : supabase.storage.from('event-media').getPublicUrl(fpHd).data.publicUrl

      const blobTh = dataURLtoBlob(thumbUrl)
      const fpTh = `thumbs/${fid}.jpg`
      const resTh = await supabase.storage.from('event-media').upload(fpTh, blobTh, { contentType: 'image/jpeg', upsert: true })
      const thUrl = resTh.error ? thumbUrl : supabase.storage.from('event-media').getPublicUrl(fpTh).data.publicUrl

      // Delete previous poster for this milestone
      await supabase.from('gallery_media').delete().eq('type', 'poster').eq('milestone', milestone)

      // Insert new milestone poster row
      const { error } = await supabase.from('gallery_media').insert([{
        id: fid,
        type: 'poster',
        caption: `Points Standing Status (after Result #${milestone})`,
        milestone: milestone,
        thumb_url: thUrl,
        hd_url: hdUrl,
        uploader_name: 'Admin'
      }])

      if (error) throw error

      setMilestonePosters(prev => ({
        ...prev,
        [milestone]: {
          id: fid,
          type: 'poster',
          caption: `Points Standing Status (after Result #${milestone})`,
          milestone: milestone,
          thumb_url: thUrl,
          hd_url: hdUrl
        }
      }))

      setSuccess(`✓ Status poster for milestone #${milestone} uploaded!`)
      setTimeout(() => setSuccess(''), 3500)
    } catch (err) {
      console.error("Error uploading milestone poster:", err)
      alert("Failed to upload poster: " + (err.message || err))
    } finally {
      setUploadingMilestone(null)
    }
  }

  async function handleDeleteMilestonePoster(milestone, posterId) {
    if (!window.confirm(`Are you sure you want to delete the status poster for milestone #${milestone}?`)) return
    try {
      if (posterId) {
        await supabase.from('gallery_media').delete().eq('id', posterId)
      } else {
        await supabase.from('gallery_media').delete().eq('type', 'poster').eq('milestone', milestone)
      }
      setMilestonePosters(prev => {
        const copy = { ...prev }
        delete copy[milestone]
        return copy
      })
      setSuccess(`Status poster for milestone #${milestone} removed.`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error("Error deleting milestone poster:", err)
    }
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
                  const isRevealed = item.isRevealed
                  const isReady = item.isReady
                  const isLocked = item.isLocked

                  return (
                    <div key={item.id} style={{
                      background: isRevealed
                        ? 'linear-gradient(135deg, rgba(46, 213, 115, 0.12) 0%, rgba(13, 17, 23, 0.85) 100%)'
                        : isReady
                        ? 'linear-gradient(135deg, rgba(247, 201, 72, 0.14) 0%, rgba(13, 17, 23, 0.85) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(13, 17, 23, 0.85) 100%)',
                      border: isRevealed
                        ? '1.5px solid #2ed573'
                        : isReady
                        ? '1.5px dashed #f7c948'
                        : '1px dashed rgba(255, 255, 255, 0.18)',
                      borderRadius: 10,
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      boxShadow: isRevealed ? '0 0 15px rgba(46, 213, 115, 0.1)' : isReady ? '0 0 15px rgba(247, 201, 72, 0.1)' : 'none'
                    }}>
                      {/* Top Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {isRevealed ? (
                            <span style={{
                              fontSize: 10, fontWeight: 800, color: '#0e0b07',
                              background: '#2ed573', padding: '2.5px 9px', borderRadius: 12,
                              textTransform: 'uppercase', letterSpacing: 0.5, display: 'inline-flex', alignItems: 'center', gap: 4
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0e0b07' }} />
                              ✓ REVEALED TO PUBLIC
                            </span>
                          ) : isReady ? (
                            <span style={{
                              fontSize: 10, fontWeight: 800, color: '#0e0b07',
                              background: '#f7c948', padding: '2.5px 9px', borderRadius: 12,
                              textTransform: 'uppercase', letterSpacing: 0.5, display: 'inline-flex', alignItems: 'center', gap: 4
                            }}>
                              ⚡ READY TO ANNOUNCE
                            </span>
                          ) : (
                            <span style={{
                              fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
                              background: 'rgba(255,255,255,0.08)', padding: '2.5px 8px', borderRadius: 12,
                              textTransform: 'uppercase', letterSpacing: 0.5
                            }}>
                              ⏳ QUEUED ({item.publishedCountBeforeDivider}/{item.compCountAtDivider})
                            </span>
                          )}

                          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                            After {item.compCountAtDivider} Results
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {/* Admin Quick Action Button */}
                          {isReady && (
                            <button
                              type="button"
                              onClick={() => handleForceRevealDivider(item.compCountAtDivider)}
                              style={{
                                background: '#f7c948',
                                color: '#0e0b07',
                                border: 'none',
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              📢 Release Now
                            </button>
                          )}
                          {isRevealed && (
                            <button
                              type="button"
                              onClick={() => handleRevertDivider(item.compCountAtDivider)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 10.5,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title="Revert status to previous milestone"
                            >
                              ↺ Revert
                            </button>
                          )}

                          {/* Quick Jump Position Selector */}
                          <select
                            value={item.compCountAtDivider}
                            onChange={e => moveDividerToCompCount(idx, parseInt(e.target.value, 10))}
                            title="Quickly jump divider position to after a specific competition"
                            style={{
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(255, 255, 255, 0.18)',
                              color: '#fff',
                              fontSize: 11,
                              padding: '2px 6px',
                              borderRadius: 6,
                              cursor: 'pointer'
                            }}
                          >
                            {Array.from({ length: trayCompsCount + 1 }).map((_, cIdx) => (
                              <option key={cIdx} value={cIdx} style={{ background: '#1c2128', color: '#fff' }}>
                                {cIdx === 0 ? 'At Start (0)' : `After #${cIdx}`}
                              </option>
                            ))}
                          </select>

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

                      {/* Mini progress bar if locked */}
                      {isLocked && item.compCountAtDivider > 0 && (
                        <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, (item.publishedCountBeforeDivider / item.compCountAtDivider) * 100)}%`,
                            height: '100%',
                            background: '#60a5fa',
                            borderRadius: 2
                          }} />
                        </div>
                      )}

                      {/* Standings preview strip */}
                      <div style={{
                        display: 'flex',
                        gap: 6,
                        flexWrap: 'wrap',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '7px 12px',
                        borderRadius: 6
                      }}>
                        {(item.standings || []).map((s, sIdx) => (
                          <span key={s.id} style={{
                            fontSize: 11.5,
                            color: sIdx === 0 ? '#f7c948' : 'var(--text-secondary)',
                            fontWeight: sIdx === 0 ? 800 : 500
                          }}>
                            {sIdx + 1}. {s.name} ({s.points} pts)
                            {sIdx < item.standings.length - 1 && <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: 6 }}>|</span>}
                          </span>
                        ))}
                      </div>

                      {/* ── Status Poster Attachment Widget ── */}
                      {item.compCountAtDivider > 0 && (
                        <div>
                          {milestonePosters[item.compCountAtDivider] ? (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              background: 'rgba(0, 0, 0, 0.45)',
                              border: '1px solid rgba(46, 213, 115, 0.3)',
                              borderRadius: 8,
                              padding: '8px 12px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <img
                                  src={milestonePosters[item.compCountAtDivider].thumb_url}
                                  alt="Milestone Poster"
                                  style={{
                                    width: 38,
                                    height: 50,
                                    objectFit: 'cover',
                                    borderRadius: 4,
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => setPreviewPoster(milestonePosters[item.compCountAtDivider])}
                                  title="Click to view poster full-screen"
                                />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{
                                      fontSize: 9.5,
                                      fontWeight: 800,
                                      color: '#2ed573',
                                      background: 'rgba(46, 213, 115, 0.15)',
                                      padding: '1.5px 6px',
                                      borderRadius: 4,
                                      textTransform: 'uppercase',
                                      letterSpacing: 0.5
                                    }}>
                                      ✓ Poster Attached
                                    </span>
                                  </div>
                                  <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {milestonePosters[item.compCountAtDivider].caption}
                                  </p>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => setPreviewPoster(milestonePosters[item.compCountAtDivider])}
                                  style={{
                                    background: 'rgba(79, 156, 249, 0.15)',
                                    border: '1px solid rgba(79, 156, 249, 0.35)',
                                    color: 'var(--accent-light, #4f9cf9)',
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    padding: '4px 8px',
                                    borderRadius: 5,
                                    cursor: 'pointer'
                                  }}
                                >
                                  View
                                </button>
                                <label style={{
                                  background: 'rgba(255,255,255,0.08)',
                                  border: '1px solid rgba(255,255,255,0.18)',
                                  color: '#fff',
                                  fontSize: 10.5,
                                  fontWeight: 600,
                                  padding: '4px 8px',
                                  borderRadius: 5,
                                  cursor: 'pointer'
                                }}>
                                  Replace
                                  <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        handleUploadMilestonePoster(item.compCountAtDivider, e.target.files[0])
                                      }
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMilestonePoster(item.compCountAtDivider, milestonePosters[item.compCountAtDivider]?.id)}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    color: '#ef4444',
                                    fontSize: 10.5,
                                    fontWeight: 600,
                                    padding: '4px 8px',
                                    borderRadius: 5,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px dashed rgba(255, 255, 255, 0.12)',
                              borderRadius: 8,
                              padding: '7px 12px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13 }}>🖼️</span>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  No status poster attached for after #{item.compCountAtDivider}
                                </span>
                              </div>
                              <label style={{
                                background: 'rgba(247, 201, 72, 0.12)',
                                border: '1px solid rgba(247, 201, 72, 0.3)',
                                color: '#f7c948',
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '4px 10px',
                                borderRadius: 6,
                                cursor: uploadingMilestone === item.compCountAtDivider ? 'wait' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5
                              }}>
                                {uploadingMilestone === item.compCountAtDivider ? 'Uploading...' : '+ Upload Poster'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={uploadingMilestone === item.compCountAtDivider}
                                  style={{ display: 'none' }}
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handleUploadMilestonePoster(item.compCountAtDivider, e.target.files[0])
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      )}
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
                      #{String(item.displayNumber || item.runningCompIndex).padStart(2, '0')}
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
                background: '#161b22',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 12,
                color: '#ffffff',
                outline: 'none',
                maxWidth: 140,
                cursor: 'pointer'
              }}
            >
              <option value="" style={{ background: '#161b22', color: '#ffffff' }}>Sort: Name</option>
              {teams.map(t => (
                <option key={t.id} value={t.id} style={{ background: '#161b22', color: '#ffffff' }}>{t.name} Pts</option>
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

      {/* ── Confirmation Modal ── */}
      {confirmModal && createPortal(
        <div className="dash-modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="dash-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px 0', color: 'var(--accent-light, #4f9cf9)' }}>
              {confirmModal.title || 'Confirm Action'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn-cancel-edit" 
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}
                onClick={() => setConfirmModal(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                style={{ padding: '8px 18px', background: 'var(--accent-light, #4f9cf9)', color: '#0e0b07', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                onClick={() => {
                  confirmModal.onConfirm?.()
                  setConfirmModal(null)
                }}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Status Poster Preview Modal ── */}
      {previewPoster && createPortal(
        <div
          className="dash-modal-overlay"
          style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)', zIndex: 99999 }}
          onClick={() => setPreviewPoster(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 10 }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
                {previewPoster.caption || 'Status Poster Preview'}
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <a
                  href={previewPoster.hd_url || previewPoster.thumb_url}
                  download={`status-poster-${previewPoster.milestone || 'milestone'}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: 'var(--accent-light, #4f9cf9)',
                    color: '#0e0b07',
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  Download HD
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPoster(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    cursor: 'pointer',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <img
              src={previewPoster.hd_url || previewPoster.thumb_url}
              alt="Status Poster Full Preview"
              style={{
                maxWidth: '85vw',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                border: '1px solid rgba(255,255,255,0.15)'
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
