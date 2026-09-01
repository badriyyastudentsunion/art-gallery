// src/pages/admin/sections/ResultsSection.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { jsPDF } from 'jspdf'
import '../sections.css'

export default function ResultsSection() {
  const [unlocked, setUnlocked] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [gradeSettings, setGradeSettings] = useState([])

  const [competitions, setCompetitions] = useState([])
  const [categories, setCategories] = useState([])
  const [awards, setAwards] = useState({ kala: [], sarga: [] }) // Kalaprathipa / Sargaprathipa
  const [fetching, setFetching] = useState(true)

  const [selected, setSelected] = useState(null)
  const [resultDetail, setResultDetail] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [activeTab, setActiveTab] = useState('competitions')
  const [standings, setStandings] = useState([])
  const [standingsSearch, setStandingsSearch] = useState('')
  const [selectedParticipant, setSelectedParticipant] = useState(null)
  const [absentees, setAbsentees] = useState([])
  const [teams, setTeams] = useState([])
  const [absSearch, setAbsSearch] = useState('')
  const [absTeamFilter, setAbsTeamFilter] = useState('')
  const [allJudgedDetails, setAllJudgedDetails] = useState({})
  const [compJudgesMap, setCompJudgesMap] = useState({})

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setSelectedParticipant(null)
      }
    }
    if (selectedParticipant) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedParticipant])

  useEffect(() => {
    if (unlocked) {
      fetchCompetitions()
      const ch = supabase.channel('results-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'judge_results' }, fetchCompetitions)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_results' }, fetchCompetitions)
        .subscribe()
      return () => supabase.removeChannel(ch)
    }
  }, [unlocked])

  async function tryUnlock(e) {
    e.preventDefault()
    setVerifying(true)
    setPwError('')
    try {
      const { data, error } = await supabase.rpc('verify_section_password', { p_password: pwInput })
      if (error) throw error
      if (data === true) {
        setUnlocked(true)
        setPwError('')
      } else {
        setPwError('Incorrect password.')
      }
    } catch (err) {
      setPwError('Verification failed. Try again.')
    } finally {
      setVerifying(false)
    }
  }

  async function fetchCompetitions() {
    setFetching(true)
    const [
      { data: comps },
      { data: cats },
      { data: gs },
      { data: jResults },
      { data: reports },
      { data: regParticipants },
      { data: tList },
      { data: cJudgesList }
    ] = await Promise.all([
      supabase.from('competitions').select('*, categories(id, name, is_general)').order('name'),
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('point_settings').select('*').order('max_percent', { ascending: false }),
      supabase.from('judge_results').select('competition_id, code_letter, points_raw, grade'),
      supabase.from('competition_reports').select('competition_id, code_letter, participant_id, participants(id, name, chess_number, team_id, teams(name))'),
      supabase.from('competition_participants').select('competition_id, participant_id, participants(name, teams(name)), competitions(name, categories(name))'),
      supabase.from('teams').select('id, name').order('name'),
      supabase.from('competition_judges').select('competition_id, judges(name)')
    ])

    const gradeSettings = gs || []
    setGradeSettings(gradeSettings)
    setCategories(cats || [])
    setTeams(tList || [])

    // Group judge results and reports by competition_id
    const compJudges = {}
    ;(jResults || []).forEach(r => {
      if (!compJudges[r.competition_id]) compJudges[r.competition_id] = {}
      if (!compJudges[r.competition_id][r.code_letter]) {
        compJudges[r.competition_id][r.code_letter] = []
      }
      compJudges[r.competition_id][r.code_letter].push(r.points_raw)
    })

    const compReports = {}
    ;(reports || []).forEach(r => {
      if (!compReports[r.competition_id]) compReports[r.competition_id] = {}
      compReports[r.competition_id][r.code_letter] = r.participants
    })

    // Identify judged competitions (any competition that has at least one judge_result)
    const judgedSet = new Set((jResults || []).map(r => r.competition_id))
    const judgedComps = (comps || []).filter(c => judgedSet.has(c.id))
    setCompetitions(judgedComps)

    // Compute live standings for Kalaprathipa and Sargaprathipa from ALL judged competitions
    const participantPoints = {} // name -> { name, team, stagePts, offStagePts, pts }
    const detailsMap = {}

    judgedComps.forEach(comp => {
      const type = comp.competition_type === 'stage' ? 'stage' : 'offStage'

      // Aggregate scores for this competition
      const rawScores = compJudges[comp.id] || {}
      const nameMap = compReports[comp.id] || {}

      const aggregated = Object.entries(rawScores).map(([code, ptsArray]) => {
        const avg = ptsArray.reduce((sum, val) => sum + val, 0) / ptsArray.length
        const rounded = Math.round(avg * 10) / 10
        const matchedGrade = gradeSettings.find(g => rounded >= g.min_percent && rounded <= g.max_percent)
        const gradePoints = matchedGrade ? matchedGrade.points : 0
        return {
          code_letter: code,
          avg_points: rounded,
          grade_points: gradePoints,
          grade: matchedGrade?.grade || '—',
          participant: nameMap[code]
        }
      }).sort((a, b) => b.avg_points - a.avg_points)

      // Assign position (rank) with tie support
      let currentPos = 1
      aggregated.forEach((r, i) => {
        if (i > 0) {
          const prev = aggregated[i - 1]
          if (r.grade !== prev.grade || r.avg_points !== prev.avg_points) {
            currentPos += 1
          }
        }
        r.position = currentPos

        // Assignment of placement points
        let placementPoints = 0
        if (comp.is_group) {
          const size = comp.group_size || 1
          if (size <= 2) {
            placementPoints = r.position === 1 ? 7 : (r.position === 2 ? 5 : (r.position === 3 ? 3 : 0))
          } else if (size === 3) {
            placementPoints = r.position === 1 ? 10 : (r.position === 2 ? 7 : (r.position === 3 ? 4 : 0))
          } else {
            placementPoints = r.position === 1 ? 15 : (r.position === 2 ? 10 : (r.position === 3 ? 5 : 0))
          }
        } else {
          placementPoints = r.position === 1 ? 5 : (r.position === 2 ? 3 : (r.position === 3 ? 1 : 0))
        }

        r.placement_points = placementPoints
        r.total_points = placementPoints + r.grade_points

        // Only add points to Kalaprathipa / Sargaprathipa leaderboard if it's an Individual event
        if (!comp.is_group && r.participant) {
          const key = r.participant.name
          if (!participantPoints[key]) {
            participantPoints[key] = {
              id: r.participant.id,
              chess_number: r.participant.chess_number,
              name: r.participant.name,
              team: r.participant.teams?.name || '—',
              stagePts: 0,
              offStagePts: 0,
              pts: 0,
              competitions: []
            }
          }
          if (type === 'stage') {
            participantPoints[key].stagePts += r.total_points
          } else {
            participantPoints[key].offStagePts += r.total_points
          }
          participantPoints[key].pts += r.total_points

          participantPoints[key].competitions.push({
            competition_id: comp.id,
            competition_name: comp.name,
            category_name: comp.categories?.name || 'General',
            competition_type: comp.competition_type || (comp.is_stage ? 'stage' : 'off-stage'),
            is_stage: comp.competition_type === 'stage' || !!comp.is_stage,
            position: r.position,
            grade: r.grade,
            avg_points: r.avg_points,
            placement_points: r.placement_points,
            grade_points: r.grade_points,
            total_points: r.total_points
          })
        }
      })

      detailsMap[comp.id] = aggregated
    })

    setAllJudgedDetails(detailsMap)

    // Map judge names by competition_id
    const cJudgesMap = {}
    ;(cJudgesList || []).forEach(cj => {
      if (cj.judges?.name) {
        if (!cJudgesMap[cj.competition_id]) cJudgesMap[cj.competition_id] = []
        cJudgesMap[cj.competition_id].push(cj.judges.name)
      }
    })
    setCompJudgesMap(cJudgesMap)

    const sortedStandings = Object.values(participantPoints).sort((a, b) => b.pts - a.pts)
    setStandings(sortedStandings)

    const getTopStage = () => {
      const sorted = [...sortedStandings].sort((a, b) => b.stagePts - a.stagePts)
      if (sorted.length === 0 || sorted[0].stagePts === 0) return []
      const max = sorted[0].stagePts
      return sorted.filter(p => p.stagePts === max).map(p => ({ name: p.name, team: p.team, pts: p.stagePts }))
    }

    const getTopOffStage = () => {
      const sorted = [...sortedStandings].sort((a, b) => b.offStagePts - a.offStagePts)
      if (sorted.length === 0 || sorted[0].offStagePts === 0) return []
      const max = sorted[0].offStagePts
      return sorted.filter(p => p.offStagePts === max).map(p => ({ name: p.name, team: p.team, pts: p.offStagePts }))
    }

    setAwards({
      kala: getTopStage(),
      sarga: getTopOffStage()
    })

    // Compute list of registered participants who did not participate (absentees)
    const conductedCompIds = new Set((reports || []).map(r => r.competition_id))
    const conductedSet = new Set()
    ;(reports || []).forEach(r => {
      if (r.participant_id) {
        conductedSet.add(`${r.competition_id}:${r.participant_id}`)
      }
    })

    const absList = []
    ;(regParticipants || []).forEach(rp => {
      if (!rp.participants) return
      if (conductedCompIds.has(rp.competition_id)) {
        const key = `${rp.competition_id}:${rp.participant_id}`
        if (!conductedSet.has(key)) {
          absList.push({
            participantId: rp.participant_id,
            participantName: rp.participants.name,
            teamName: rp.participants.teams?.name || '—',
            competitionId: rp.competition_id,
            competitionName: rp.competitions?.name || '—',
            categoryName: rp.competitions?.categories?.name || '—'
          })
        }
      }
    })
    setAbsentees(absList)

    setFetching(false)
  }

  async function openResult(comp) {
    setSelected(comp)
    setLoadingDetail(true)

    // Judge results for this competition
    const { data: jResults } = await supabase
      .from('judge_results')
      .select('judge_id, code_letter, points_raw, grade')
      .eq('competition_id', comp.id)

    // Invigilator reports (code → participant)
    const { data: reports } = await supabase
      .from('competition_reports')
      .select('code_letter, participant_id, participants(id, name, teams(name))')
      .eq('competition_id', comp.id)

    // Aggregate by code_letter (multiple judges → average)
    const codeMap = {}
    ;(jResults || []).forEach(r => {
      if (!codeMap[r.code_letter]) codeMap[r.code_letter] = { points: [], grade: r.grade }
      codeMap[r.code_letter].points.push(r.points_raw)
    })

    const partMap = {}
    ;(reports || []).forEach(r => { partMap[r.code_letter] = r.participants })

    const aggregated = Object.entries(codeMap).map(([code, data]) => {
      const avg = data.points.reduce((a, b) => a + b, 0) / data.points.length
      const rounded = Math.round(avg * 10) / 10
      // Recalculate grade from avg
      const gs = gradeSettings.find(g => rounded >= g.min_percent && rounded <= g.max_percent)
      return {
        code_letter: code,
        avg_points: rounded,
        grade: gs?.grade || data.grade || '—',
        participant: partMap[code],
      }
    }).sort((a, b) => b.avg_points - a.avg_points)

    // Assign positions with tie support based on Grade
    let currentPos = 1
    aggregated.forEach((r, i) => {
      if (i > 0) {
        const prev = aggregated[i - 1]
        if (r.grade !== prev.grade || r.avg_points !== prev.avg_points) {
          currentPos += 1
        }
      }
      r.position = currentPos
    })

    setResultDetail(aggregated)
    setLoadingDetail(false)
  }

  // Kalaprathipa (stage, non-general) and Sargaprathipa (off-stage, non-general)
  function computeAwards(comps, results) {
    // We need per-team total from published results for stage/off-stage
    // For simplicity, show 1st place winners per comp type
    const stage    = comps.filter(c => c.competition_type === 'stage'     && !c.categories?.is_general)
    const offStage = comps.filter(c => c.competition_type === 'off-stage'  && !c.categories?.is_general)
    return { stage, offStage }
  }

  // Filtered competition list
  const filtered = competitions.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const matchCat    = !catFilter || c.category_id === catFilter
    return matchSearch && matchCat
  })

  // Filtered standings list
  const filteredStandings = standings.filter(p => {
    return !standingsSearch || 
      p.name.toLowerCase().includes(standingsSearch.toLowerCase()) || 
      p.team.toLowerCase().includes(standingsSearch.toLowerCase())
  })

  // Export standings to PDF
  const downloadPDF = (list) => {
    const doc = new jsPDF()
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("INSPICO - Participant Standings Report", 14, 20)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 26)
    
    // Draw table header
    doc.setFillColor(30, 41, 59)
    doc.rect(14, 32, 182, 8, "F")
    
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.text("Rank", 16, 37.5)
    doc.text("Participant Name", 32, 37.5)
    doc.text("Team", 100, 37.5)
    doc.text("Stage Pts", 135, 37.5)
    doc.text("Off-Stage Pts", 160, 37.5)
    doc.text("Total", 185, 37.5)
    
    doc.setFont("helvetica", "normal")
    doc.setTextColor(0, 0, 0)
    
    let y = 46
    const pageHeight = doc.internal.pageSize.height
    
    list.forEach((p, idx) => {
      // Check page overflow
      if (y > pageHeight - 15) {
        doc.addPage()
        doc.setFillColor(30, 41, 59)
        doc.rect(14, 15, 182, 8, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFont("helvetica", "bold")
        doc.text("Rank", 16, 20.5)
        doc.text("Participant Name", 32, 20.5)
        doc.text("Team", 100, 20.5)
        doc.text("Stage Pts", 135, 20.5)
        doc.text("Off-Stage Pts", 160, 20.5)
        doc.text("Total", 185, 20.5)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(0, 0, 0)
        y = 29
      }
      
      if (idx % 2 === 1) {
        doc.setFillColor(245, 247, 250)
        doc.rect(14, y - 4, 182, 7, "F")
      }
      
      doc.text(`#${idx + 1}`, 16, y.toFixed(1))
      doc.text(p.name.substring(0, 30), 32, y.toFixed(1))
      doc.text(p.team.substring(0, 18), 100, y.toFixed(1))
      doc.text(`${p.stagePts}`, 135, y.toFixed(1))
      doc.text(`${p.offStagePts}`, 160, y.toFixed(1))
      doc.setFont("helvetica", "bold")
      doc.text(`${p.pts}`, 185, y.toFixed(1))
      doc.setFont("helvetica", "normal")
      
      doc.setDrawColor(230, 230, 230)
      doc.line(14, y + 3, 196, y + 3)
      
      y += 8
    })
    
    doc.save(`Inspico_Participant_Standings_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Filtered absentees list
  const filteredAbs = absentees.filter(p => {
    const matchSearch = !absSearch || 
      p.participantName.toLowerCase().includes(absSearch.toLowerCase()) || 
      p.competitionName.toLowerCase().includes(absSearch.toLowerCase())
    const matchTeam = !absTeamFilter || p.teamName === absTeamFilter
    return matchSearch && matchTeam
  })

  // Export absentees to PDF
  const downloadAbsenteesPDF = (list) => {
    const doc = new jsPDF()
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("INSPICO - Absentees / Non-Participants Report", 14, 20)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 26)
    
    // Draw table header
    doc.setFillColor(185, 28, 28)
    doc.rect(14, 32, 182, 8, "F")
    
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.text("No", 16, 37.5)
    doc.text("Participant Name", 25, 37.5)
    doc.text("Team", 85, 37.5)
    doc.text("Competition", 125, 37.5)
    doc.text("Category", 165, 37.5)
    
    doc.setFont("helvetica", "normal")
    doc.setTextColor(0, 0, 0)
    
    let y = 46
    const pageHeight = doc.internal.pageSize.height
    
    list.forEach((p, idx) => {
      // Check page overflow
      if (y > pageHeight - 15) {
        doc.addPage()
        doc.setFillColor(185, 28, 28)
        doc.rect(14, 15, 182, 8, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFont("helvetica", "bold")
        doc.text("No", 16, 20.5)
        doc.text("Participant Name", 25, 20.5)
        doc.text("Team", 85, 20.5)
        doc.text("Competition", 125, 20.5)
        doc.text("Category", 165, 20.5)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(0, 0, 0)
        y = 29
      }
      
      if (idx % 2 === 1) {
        doc.setFillColor(254, 242, 242)
        doc.rect(14, y - 4, 182, 7, "F")
      }
      
      doc.text(`${idx + 1}`, 16, y.toFixed(1))
      doc.text(p.participantName.substring(0, 26), 25, y.toFixed(1))
      doc.text(p.teamName.substring(0, 18), 85, y.toFixed(1))
      doc.text(p.competitionName.substring(0, 18), 125, y.toFixed(1))
      doc.text(p.categoryName.substring(0, 14), 165, y.toFixed(1))
      
      doc.setDrawColor(230, 230, 230)
      doc.line(14, y + 3, 196, y + 3)
      
      y += 8
    })
    
    doc.save(`Inspico_Absentees_Report_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Export all judged competition results with detailed points to a single PDF
  const downloadAllJudgedResultsPDF = () => {
    const doc = new jsPDF()
    let isFirstPage = true
    const pageHeight = doc.internal.pageSize.height
    
    // Sort judged competitions by category name, then competition name
    const sortedComps = [...competitions].sort((a, b) => {
      const catA = a.categories?.name || ''
      const catB = b.categories?.name || ''
      if (catA !== catB) return catA.localeCompare(catB)
      return a.name.localeCompare(b.name)
    })
    
    sortedComps.forEach((comp, cIdx) => {
      const list = allJudgedDetails[comp.id] || []
      if (list.length === 0) return
      
      if (!isFirstPage) {
        doc.addPage()
      }
      isFirstPage = false
      
      // Page Title Header
      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.setTextColor(30, 41, 59)
      doc.text(`${cIdx + 1}. ${comp.name}`, 14, 20)
      
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.setTextColor(100, 116, 139)
      const jNames = compJudgesMap[comp.id] || []
      const judgesStr = jNames.length > 0 ? jNames.join(', ') : '—'
      doc.text(`Category: ${comp.categories?.name || '—'}  |  Type: ${comp.competition_type.toUpperCase()}  |  Judges: ${judgesStr}`, 14, 26)
      
      // Draw table header
      doc.setFillColor(79, 156, 249)
      doc.rect(14, 32, 182, 8, "F")
      
      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
      doc.text("Pos", 16, 37.5)
      doc.text("Participant Name", 30, 37.5)
      doc.text("Team", 95, 37.5)
      doc.text("Score", 135, 37.5)
      doc.text("Grade", 155, 37.5)
      doc.text("Points", 175, 37.5)
      
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0)
      
      let y = 46
      
      list.forEach((r, idx) => {
        // Check page overflow
        if (y > pageHeight - 20) {
          doc.addPage()
          // Table header again
          doc.setFillColor(79, 156, 249)
          doc.rect(14, 15, 182, 8, "F")
          doc.setTextColor(255, 255, 255)
          doc.setFont("helvetica", "bold")
          doc.text("Pos", 16, 20.5)
          doc.text("Participant Name", 30, 20.5)
          doc.text("Team", 95, 20.5)
          doc.text("Score", 135, 20.5)
          doc.text("Grade", 155, 20.5)
          doc.text("Points", 175, 20.5)
          doc.setFont("helvetica", "normal")
          doc.setTextColor(0, 0, 0)
          y = 29
        }
        
        if (idx % 2 === 1) {
          doc.setFillColor(245, 247, 250)
          doc.rect(14, y - 4, 182, 7, "F")
        }
        
        const posText = r.position <= 3 ? ['1st', '2nd', '3rd'][r.position - 1] : `${r.position}`
        doc.text(posText, 16, y.toFixed(1))
        
        const pName = r.participant?.name || `Code ${r.code_letter}`
        doc.text(pName.substring(0, 28), 30, y.toFixed(1))
        
        const tName = r.participant?.teams?.name || '—'
        doc.text(tName.substring(0, 18), 95, y.toFixed(1))
        
        doc.text(`${r.avg_points}`, 135, y.toFixed(1))
        doc.text(`${r.grade}`, 155, y.toFixed(1))
        
        doc.setFont("helvetica", "bold")
        doc.text(`${r.total_points}`, 175, y.toFixed(1))
        doc.setFont("helvetica", "normal")
        
        doc.setDrawColor(230, 230, 230)
        doc.line(14, y + 3, 196, y + 3)
        
        y += 8
      })

      // Calculate team points summary for this specific competition
      const teamPointsMap = {}
      list.forEach(r => {
        const tName = r.participant?.teams?.name || '—'
        if (tName !== '—') {
          if (!teamPointsMap[tName]) teamPointsMap[tName] = 0
          teamPointsMap[tName] += r.total_points || 0
        }
      })
      const teamSummaryList = Object.entries(teamPointsMap)
        .sort((a, b) => b[1] - a[1])
        .map(([tName, pts]) => `${tName}: ${pts} pts`)
        .join('  |  ')

      y += 4
      if (y > pageHeight - 20) {
        doc.addPage()
        y = 20
      }
      
      doc.setFillColor(241, 245, 249)
      doc.rect(14, y - 4, 182, 7, "F")
      
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(71, 85, 105)
      doc.text("Team Points Summary: ", 16, (y - 0.5).toFixed(1))
      
      doc.setFont("helvetica", "normal")
      doc.text(teamSummaryList || "No team points", 56, (y - 0.5).toFixed(1))
    })
    
    doc.save(`Inspico_All_Judged_Results_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  if (!unlocked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 140px)', width: '100%', padding: '24px' }}>
        <form onSubmit={tryUnlock} style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 300, textAlign: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32, margin: '0 auto 14px', display: 'block' }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.3px' }}>Results Locked</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>Enter master password to access result entry and reports</p>
          <div className="field" style={{ textAlign: 'left', marginTop: 12 }}>
            <label className="field-lbl">Password</label>
            <input className="field-inp" type="password" autoComplete="off" placeholder="••••••••"
              value={pwInput} onChange={e => { setPwInput(e.target.value); setPwError('') }} />
          </div>
          {pwError && <p className="form-error">⚠ {pwError}</p>}
          <button className="btn-submit" type="submit" style={{ marginTop: 8, height: 38, fontSize: 13, fontWeight: 600 }}>Unlock Results</button>
        </form>
      </div>
    )
  }

  return (
    <div className="dash-root">
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
        {selected && (
          <button onClick={() => { setSelected(null); setResultDetail([]) }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-light)', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>←</button>
        )}
        <span className="list-title" style={{ fontSize: 15 }}>
          {selected ? selected.name : 'Results'}
        </span>
        {!selected && (
          <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
            <button 
              onClick={() => setActiveTab('competitions')} 
              style={{
                background: activeTab === 'competitions' ? 'rgba(79, 156, 249, 0.15)' : 'none',
                border: '1px solid var(--border-subtle)',
                color: activeTab === 'competitions' ? 'var(--accent-light)' : 'var(--text-muted)',
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 600
              }}
            >
              Competitions
            </button>
            <button 
              onClick={() => setActiveTab('standings')} 
              style={{
                background: activeTab === 'standings' ? 'rgba(79, 156, 249, 0.15)' : 'none',
                border: '1px solid var(--border-subtle)',
                color: activeTab === 'standings' ? 'var(--accent-light)' : 'var(--text-muted)',
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 600
              }}
            >
              Participant Standings
            </button>
            <button 
              onClick={() => setActiveTab('absentees')} 
              style={{
                background: activeTab === 'absentees' ? 'rgba(79, 156, 249, 0.15)' : 'none',
                border: '1px solid var(--border-subtle)',
                color: activeTab === 'absentees' ? 'var(--accent-light)' : 'var(--text-muted)',
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 600
              }}
            >
              Absentees
            </button>
          </div>
        )}
        {!selected && (
          <button onClick={() => setUnlocked(false)}
            style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: 11, padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}>
            🔒 Lock
          </button>
        )}
      </div>

      {!selected ? (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {activeTab === 'competitions' ? (
            <>
              {/* Filters */}
              <div style={{ padding: '16px 28px', display: 'flex', gap: 10, borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                       style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--text-muted)' }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input className="dash-search-input" style={{ paddingLeft: 30, paddingRight: search ? 30 : 10 }}
                    value={search} onChange={e => setSearch(e.target.value)} placeholder="Search competitions…" />
                  {search && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                         onClick={() => setSearch('')}
                         style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
                         onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
                         onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                </div>
                <select className="field-select" style={{ width: 180, padding: '6px 10px', fontSize: 12 }}
                  value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <button 
                  onClick={downloadAllJudgedResultsPDF}
                  style={{
                    marginLeft: 'auto',
                    background: 'linear-gradient(135deg, #f7c948 0%, #dca11d 100%)',
                    color: '#0e0b07',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: 'inherit',
                    boxShadow: '0 4px 12px rgba(247, 201, 72, 0.15)'
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export All Results PDF
                </button>
              </div>

          {/* ── Kalaprathipa / Sargaprathipa ── */}
          <div style={{ display: 'flex', gap: 14, padding: '16px 28px 0 28px', flexWrap: 'wrap' }}>
            {[
              { label: '🏆 Kalaprathipa', subtitle: 'Top Stage Performer (Individual)', list: awards.kala, color: 'var(--accent-light)', bg: 'rgba(79, 156, 249, 0.05)', border: 'rgba(79, 156, 249, 0.15)', emptyText: 'No stage results published yet' },
              { label: '🏅 Sargaprathipa', subtitle: 'Top Off-Stage Performer (Individual)', list: awards.sarga, color: '#7baede', bg: 'rgba(100, 150, 220, 0.05)', border: 'rgba(100, 150, 220, 0.15)', emptyText: 'No off-stage results published yet' },
            ].map(award => (
              <div key={award.label} style={{ flex: 1, minWidth: 200, padding: '14px 16px', background: award.bg, border: `1px solid ${award.border}`, borderRadius: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: award.color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{award.label}</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10 }}>{award.subtitle}</p>
                {award.list.length > 0 ? (
                  <>
                    {award.list.map((w, i) => {
                      const matched = standings.find(s => s.name === w.name)
                      return (
                        <div 
                          key={i} 
                          style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: matched ? 'pointer' : 'default' }}
                          onClick={() => matched && setSelectedParticipant(matched)}
                          title={matched ? "Click to view competition points breakdown" : ""}
                        >
                          <span style={{ fontWeight: 700, fontSize: 13, color: '#fff', textDecoration: matched ? 'underline' : 'none', textUnderlineOffset: 3 }}>{w.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.team} · <strong style={{ color: award.color }}>{w.pts} pts</strong></span>
                        </div>
                      )
                    })}
                    {award.list.length > 1 && (
                      <p style={{ fontSize: 9.5, color: '#f7c948', marginTop: 6, fontWeight: 600 }}>⚠ {award.list.length}-way tie detected</p>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>{award.emptyText}</p>
                )}
              </div>
            ))}
          </div>

          {fetching ? (
            <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No judged competitions yet.</p>
            </div>
          ) : (
            <div style={{ padding: '0 28px 24px 28px' }}>
              <table className="data-table" style={{ margin: '0' }}>
                <thead><tr>
                  <th style={{ top: 0 }}>Competition</th>
                  <th style={{ top: 0 }}>Category</th>
                  <th style={{ top: 0 }}>Type</th>
                  <th style={{ top: 0 }}>Status</th>
                </tr></thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="row-clickable" onClick={() => openResult(c)}>
                      <td className="td-name">{c.name}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.categories?.name || '—'}</td>
                      <td>
                        <span className="td-badge" style={{
                          fontSize: 9,
                          background: c.competition_type === 'stage' ? 'rgba(79, 156, 249,0.1)' : 'rgba(100,150,220,0.1)',
                          borderColor: c.competition_type === 'stage' ? 'rgba(79, 156, 249,0.3)' : 'rgba(100,150,220,0.3)',
                          color: c.competition_type === 'stage' ? 'var(--accent-light)' : '#7baede',
                        }}>
                          {c.competition_type === 'stage' ? 'STAGE' : 'OFF-STAGE'}
                        </span>
                      </td>
                      <td><span style={{ fontSize: 10, color: '#7bc47b' }}>✓ Judged</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </>
          ) : activeTab === 'standings' ? (
            /* ── Standings Tab ── */
            <div style={{ padding: '0 28px 24px 28px' }}>
              <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                       style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--text-muted)' }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input 
                    className="dash-search-input" 
                    value={standingsSearch} 
                    onChange={e => setStandingsSearch(e.target.value)} 
                    placeholder="Search participants…" 
                    style={{ paddingLeft: 30, width: 220 }}
                  />
                </div>
                <button 
                  onClick={() => downloadPDF(filteredStandings)}
                  style={{
                    background: 'linear-gradient(135deg, #f7c948 0%, #dca11d 100%)',
                    color: '#0e0b07',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: 'inherit',
                    boxShadow: '0 4px 12px rgba(247, 201, 72, 0.15)'
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export PDF Standings
                </button>
              </div>

              <table className="data-table" style={{ margin: '0' }}>
                <thead>
                  <tr>
                    <th style={{ top: 0 }}>Rank</th>
                    <th style={{ top: 0 }}>Participant</th>
                    <th style={{ top: 0 }}>Team</th>
                    <th style={{ top: 0 }}>Stage Pts</th>
                    <th style={{ top: 0 }}>Off-Stage Pts</th>
                    <th style={{ top: 0 }}>Total Pts</th>
                    <th style={{ top: 0, width: 100, textAlign: 'center' }}>Breakdown</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStandings.map((p, idx) => (
                    <tr 
                      key={p.name}
                      onClick={() => setSelectedParticipant(p)}
                      className="row-clickable"
                      style={{ cursor: 'pointer' }}
                      title="Click to view competition points breakdown"
                    >
                      <td style={{ fontWeight: 700, color: 'var(--accent-light)' }}>#{idx + 1}</td>
                      <td className="td-name">
                        <span style={{ fontWeight: 600, color: '#fff' }}>{p.name}</span>
                        {p.chess_number && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)' }}>#{p.chess_number}</span>
                        )}
                      </td>
                      <td>
                        <span className="td-badge">{p.team}</span>
                      </td>
                      <td>{p.stagePts}</td>
                      <td>{p.offStagePts}</td>
                      <td style={{ fontWeight: 800, color: '#f7c948' }}>{p.pts}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="td-badge-link"
                          style={{
                            fontSize: 10,
                            padding: '3px 8px',
                            background: 'rgba(79, 156, 249, 0.08)',
                            borderColor: 'rgba(79, 156, 249, 0.25)',
                            color: 'var(--accent-light)',
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedParticipant(p)
                          }}
                        >
                          View ({p.competitions?.length || 0})
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredStandings.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No standings data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── Absentees Tab ── */
            <div style={{ padding: '0 28px 24px 28px' }}>
              <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                         style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--text-muted)' }}>
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input 
                      className="dash-search-input" 
                      value={absSearch} 
                      onChange={e => setAbsSearch(e.target.value)} 
                      placeholder="Search participant / event…" 
                      style={{ paddingLeft: 30, width: 220 }}
                    />
                  </div>
                  <select 
                    className="field-select" 
                    style={{ width: 180, padding: '6px 10px', fontSize: 12 }}
                    value={absTeamFilter} 
                    onChange={e => setAbsTeamFilter(e.target.value)}
                  >
                    <option value="">All Teams</option>
                    {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Count: <strong style={{ color: 'var(--accent-light)' }}>{filteredAbs.length}</strong> absentees
                  </span>
                  <button 
                    onClick={() => downloadAbsenteesPDF(filteredAbs)}
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '8px 16px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontFamily: 'inherit',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export PDF Report
                  </button>
                </div>
              </div>

              <table className="data-table" style={{ margin: '0' }}>
                <thead>
                  <tr>
                    <th style={{ top: 0 }}>No</th>
                    <th style={{ top: 0 }}>Participant</th>
                    <th style={{ top: 0 }}>Team</th>
                    <th style={{ top: 0 }}>Competition</th>
                    <th style={{ top: 0 }}>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAbs.map((p, idx) => (
                    <tr key={`${p.participantId}:${p.competitionId}`}>
                      <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{idx + 1}</td>
                      <td className="td-name" style={{ color: '#ff8a8a !important' }}>{p.participantName}</td>
                      <td>
                        <span className="td-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ff7373' }}>
                          {p.teamName}
                        </span>
                      </td>
                      <td>{p.competitionName}</td>
                      <td>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.categoryName}</span>
                      </td>
                    </tr>
                  ))}
                  {filteredAbs.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No absentees found matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ── Result Detail ── */
        <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px' }}>
          {loadingDetail ? (
            <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} /></div>
          ) : resultDetail.length === 0 ? (
            <div className="empty-state"><p style={{ color: 'var(--text-muted)' }}>No results found.</p></div>
          ) : (
            <>
              <table className="data-table" style={{ marginBottom: 24 }}>
                <thead>
                  <tr>
                    <th style={{ top: 0 }}>Pos</th>
                    <th style={{ top: 0 }}>Participant</th>
                    <th style={{ top: 0 }}>Team</th>
                    <th style={{ top: 0 }}>Avg Points</th>
                    <th style={{ top: 0 }}>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {resultDetail.map((r, i) => (
                    <tr key={r.code_letter} style={{ background: r.position <= 3 ? 'rgba(79, 156, 249,0.04)' : undefined }}>
                      <td>
                        <span style={{ fontSize: r.position <= 3 ? 18 : 13 }}>
                          {r.position <= 3 ? ['🥇','🥈','🥉'][r.position - 1] : r.position}
                        </span>
                      </td>
                      <td className="td-name">{r.participant?.name || `Code ${r.code_letter}`}</td>
                      <td>
                        {r.participant?.teams?.name
                          ? <span className="td-badge">{r.participant.teams.name}</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.avg_points}</td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '2px 8px', background: 'rgba(79, 156, 249,0.1)', border: '1px solid rgba(79, 156, 249,0.25)', color: 'var(--accent-light)', fontSize: 12, fontWeight: 700, borderRadius: 3 }}>
                          {r.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* ── Tied positions note ── */}
              {(() => {
                const ties = {}
                resultDetail.forEach(r => {
                  if (r.position <= 3) {
                    if (!ties[r.position]) ties[r.position] = []
                    ties[r.position].push(r)
                  }
                })
                const tiedGroups = Object.entries(ties).filter(([, list]) => list.length > 1)
                if (!tiedGroups.length) return null
                return (
                  <div style={{ padding: '14px 16px', background: 'rgba(79, 156, 249,0.06)', border: '1px solid rgba(79, 156, 249,0.2)', borderRadius: 6, marginTop: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-light)', marginBottom: 8 }}>⚠ TIE DETECTED</p>
                    {tiedGroups.map(([pos, list]) => (
                      <p key={pos} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{['🥇','🥈','🥉'][pos - 1]} Position {pos}</strong>: {list.map(r => `${r.participant?.name || r.code_letter} (${r.avg_points} pts)`).join(' · ')}
                      </p>
                    ))}
                  </div>
                )
              })()}
            </>
          )}
        </div>
      )}

      {/* ── Participant Competition Points Breakdown Modal ── */}
      {selectedParticipant && (
        <div 
          className="modal-backdrop" 
          onClick={() => setSelectedParticipant(null)} 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{
              background: '#0d1117',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
              borderRadius: 16,
              width: '100%',
              maxWidth: 660,
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, rgba(247, 201, 72, 0.15) 0%, rgba(247, 201, 72, 0.05) 100%)', border: '1px solid rgba(247, 201, 72, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f7c948', fontWeight: 800, fontSize: 15 }}>
                  #{filteredStandings.findIndex(x => x.name === selectedParticipant.name) + 1}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>{selectedParticipant.name}</h3>
                    {selectedParticipant.chess_number && (
                      <span style={{ fontSize: 11, padding: '2px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: 4, color: 'var(--text-muted)' }}>
                        #{selectedParticipant.chess_number}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--accent-light)' }}>
                    {selectedParticipant.team}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedParticipant(null)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Stats summary bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '14px 22px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 12px' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Stage Points</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-light)', marginTop: 2 }}>{selectedParticipant.stagePts}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 12px' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Off-Stage Points</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#a78bfa', marginTop: 2 }}>{selectedParticipant.offStagePts}</div>
              </div>
              <div style={{ background: 'rgba(247, 201, 72, 0.05)', border: '1px solid rgba(247, 201, 72, 0.2)', borderRadius: 8, padding: '8px 12px' }}>
                <span style={{ fontSize: 10, color: '#f7c948', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Points</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#f7c948', marginTop: 2 }}>{selectedParticipant.pts}</div>
              </div>
            </div>

            {/* Competitions list */}
            <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Participated Competitions ({selectedParticipant.competitions?.length || 0})
              </div>

              {(!selectedParticipant.competitions || selectedParticipant.competitions.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  No individual competition score records available.
                </div>
              ) : (
                selectedParticipant.competitions.map((comp, cIdx) => (
                  <div 
                    key={comp.competition_id || cIdx}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                      borderRadius: 10,
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 14
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 13.5, color: '#fff' }}>{comp.competition_name}</span>
                        <span style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: comp.is_stage ? 'rgba(79, 156, 249, 0.12)' : 'rgba(167, 139, 250, 0.12)',
                          color: comp.is_stage ? 'var(--accent-light)' : '#c4b5fd',
                          border: `1px solid ${comp.is_stage ? 'rgba(79, 156, 249, 0.25)' : 'rgba(167, 139, 250, 0.25)'}`
                        }}>
                          {comp.is_stage ? 'Stage' : 'Off-Stage'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span>{comp.category_name}</span>
                        <span>•</span>
                        <span>Score: <strong style={{ color: 'var(--text-primary)' }}>{comp.avg_points}%</strong></span>
                        <span>•</span>
                        <span>Grade: <strong style={{ color: 'var(--accent-light)' }}>{comp.grade}</strong> ({comp.grade_points} pts)</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, textAlign: 'right' }}>
                      <div>
                        <div style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: comp.position === 1 ? '#f7c948' : comp.position === 2 ? '#cbd5e1' : comp.position === 3 ? '#fb923c' : 'var(--text-muted)'
                        }}>
                          {comp.position === 1 ? '1st Place (+5)' : comp.position === 2 ? '2nd Place (+3)' : comp.position === 3 ? '3rd Place (+1)' : `Rank #${comp.position}`}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#f7c948', marginTop: 2 }}>
                          +{comp.total_points} <span style={{ fontSize: 9.5, fontWeight: 500, color: 'var(--text-muted)' }}>pts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
