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

  // Competitions tab filters
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [compTeamFilter, setCompTeamFilter] = useState('')
  const [compTypeFilter, setCompTypeFilter] = useState('')
  const [activeTab, setActiveTab] = useState('competitions')

  // Standings tab filters
  const [standings, setStandings] = useState([])
  const [standingsSearch, setStandingsSearch] = useState('')
  const [standingsCatFilter, setStandingsCatFilter] = useState('')
  const [standingsTeamFilter, setStandingsTeamFilter] = useState('')
  const [standingsTypeFilter, setStandingsTypeFilter] = useState('')
  const [selectedParticipant, setSelectedParticipant] = useState(null)
  const [modalMode, setModalMode] = useState(null) // null | 'vocal' | 'pen'

  // Absentees tab filters
  const [absentees, setAbsentees] = useState([])
  const [teams, setTeams] = useState([])
  const [absSearch, setAbsSearch] = useState('')
  const [absCatFilter, setAbsCatFilter] = useState('')
  const [absTeamFilter, setAbsTeamFilter] = useState('')
  const [absTypeFilter, setAbsTypeFilter] = useState('')
  const [allJudgedDetails, setAllJudgedDetails] = useState({})
  const [compJudgesMap, setCompJudgesMap] = useState({})

  const openParticipantModal = (participant, mode = null) => {
    setSelectedParticipant(participant)
    setModalMode(mode)
  }

  const closeParticipantModal = () => {
    setSelectedParticipant(null)
    setModalMode(null)
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        closeParticipantModal()
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
      supabase.from('competition_reports').select('competition_id, code_letter, participant_id, participants(id, name, chess_number, team_id, category_id, categories(id, name), teams(name))'),
      supabase.from('competition_participants').select('competition_id, participant_id, participants(name, teams(name)), competitions(name, competition_type, categories(id, name))'),
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

        // Only add points to Participant Standings / Kalaprathipa / Sargaprathipa if it's an Individual event (NO group events)
        const isGeneralComp = comp.categories?.is_general === true || 
                              comp.categories?.is_general === 'true' || 
                              comp.categories?.name?.trim().toLowerCase() === 'general'
        const isGroupComp = !!comp.is_group

        if (!isGroupComp && r.participant) {
          const key = r.participant.name
          if (!participantPoints[key]) {
            participantPoints[key] = {
              id: r.participant.id,
              chess_number: r.participant.chess_number,
              name: r.participant.name,
              team: r.participant.teams?.name || '—',
              categoryId: r.participant.category_id || r.participant.categories?.id || comp.category_id || '',
              categoryName: r.participant.categories?.name || comp.categories?.name || '',
              indStagePts: 0,
              indOffStagePts: 0,
              mixStagePts: 0,
              mixOffStagePts: 0,
              stagePts: 0,
              offStagePts: 0,
              pts: 0,
              competitions: []
            }
          }

          if (isGeneralComp) {
            if (type === 'stage') {
              participantPoints[key].mixStagePts += r.total_points
              participantPoints[key].stagePts += r.total_points
            } else {
              participantPoints[key].mixOffStagePts += r.total_points
              participantPoints[key].offStagePts += r.total_points
            }
          } else {
            if (type === 'stage') {
              participantPoints[key].indStagePts += r.total_points
              participantPoints[key].stagePts += r.total_points
            } else {
              participantPoints[key].indOffStagePts += r.total_points
              participantPoints[key].offStagePts += r.total_points
            }
          }
          participantPoints[key].pts += r.total_points

          participantPoints[key].competitions.push({
            competition_id: comp.id,
            competition_name: comp.name,
            category_id: comp.category_id || comp.categories?.id || '',
            category_name: comp.categories?.name || (isGeneralComp ? 'General' : 'Category'),
            is_general: isGeneralComp,
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
      // Vocal of the Fest evaluates individual stage points (excluding general and group)
      const sorted = [...sortedStandings].sort((a, b) => b.indStagePts - a.indStagePts)
      if (sorted.length === 0 || sorted[0].indStagePts === 0) return []
      const max = sorted[0].indStagePts
      return sorted.filter(p => p.indStagePts === max).map(p => ({ ...p, pts: p.indStagePts }))
    }

    const getTopOffStage = () => {
      // Pen of the Fest evaluates individual off-stage points (excluding general and group)
      const sorted = [...sortedStandings].sort((a, b) => b.indOffStagePts - a.indOffStagePts)
      if (sorted.length === 0 || sorted[0].indOffStagePts === 0) return []
      const max = sorted[0].indOffStagePts
      return sorted.filter(p => p.indOffStagePts === max).map(p => ({ ...p, pts: p.indOffStagePts }))
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
            categoryId: rp.competitions?.categories?.id || '',
            categoryName: rp.competitions?.categories?.name || '—',
            competitionType: rp.competitions?.competition_type || 'off-stage'
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

  // Kalaprathipa (stage, non-general, non-group) and Sargaprathipa (off-stage, non-general, non-group)
  function computeAwards(comps, results) {
    const stage    = comps.filter(c => c.competition_type === 'stage'     && !c.categories?.is_general && !c.is_group)
    const offStage = comps.filter(c => c.competition_type === 'off-stage'  && !c.categories?.is_general && !c.is_group)
    return { stage, offStage }
  }

  // Filtered competition list (Search, Category, Team, Type)
  const filtered = competitions.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !catFilter || c.category_id === catFilter
    const matchType = !compTypeFilter || c.competition_type === compTypeFilter
    const matchTeam = !compTeamFilter || (allJudgedDetails[c.id] || []).some(
      r => r.participant?.teams?.name === compTeamFilter || r.participant?.team_id === compTeamFilter
    )
    return matchSearch && matchCat && matchType && matchTeam
  })

  // Filtered standings list (Search, Category, Team, Type)
  const filteredStandings = standings.filter(p => {
    const matchSearch = !standingsSearch || 
      p.name.toLowerCase().includes(standingsSearch.toLowerCase()) || 
      p.team.toLowerCase().includes(standingsSearch.toLowerCase()) ||
      (p.chess_number && p.chess_number.toLowerCase().includes(standingsSearch.toLowerCase()))

    const matchTeam = !standingsTeamFilter || p.team === standingsTeamFilter

    const matchCat = !standingsCatFilter || 
      p.categoryId === standingsCatFilter ||
      p.categoryName === standingsCatFilter ||
      (p.competitions || []).some(c => c.category_id === standingsCatFilter || c.category_name === standingsCatFilter)

    const matchType = !standingsTypeFilter 
      ? true 
      : standingsTypeFilter === 'stage'
        ? ((p.indStagePts || 0) > 0 || (p.mixStagePts || 0) > 0 || (p.competitions || []).some(c => c.is_stage))
        : ((p.indOffStagePts || 0) > 0 || (p.mixOffStagePts || 0) > 0 || (p.competitions || []).some(c => !c.is_stage))

    return matchSearch && matchTeam && matchCat && matchType
  })

  // Filtered absentees list (Search, Category, Team, Type)
  const filteredAbs = absentees.filter(a => {
    const matchSearch = !absSearch ||
      a.participantName.toLowerCase().includes(absSearch.toLowerCase()) ||
      a.competitionName.toLowerCase().includes(absSearch.toLowerCase()) ||
      a.teamName.toLowerCase().includes(absSearch.toLowerCase())

    const matchTeam = !absTeamFilter || a.teamName === absTeamFilter
    const matchCat = !absCatFilter || a.categoryId === absCatFilter || a.categoryName === absCatFilter
    const matchType = !absTypeFilter || a.competitionType === absTypeFilter

    return matchSearch && matchTeam && matchCat && matchType
  })

  // Helper to render branded Inspico header bar and interactive footer across all pages
  const renderInspicoFooter = (doc) => {
    const totalPages = doc.internal.getNumberOfPages()
    const pageHeight = doc.internal.pageSize.height
    const pageWidth = doc.internal.pageSize.width
    const webUrl = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://inspico.art'
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)

      // Top slim accent bar on every page
      doc.setFillColor(79, 156, 249) // brand blue accent
      doc.rect(0, 0, pageWidth, 2.5, "F")

      // Bottom footer layout
      const footerY = pageHeight - 11

      // Subtle separator line
      doc.setDrawColor(226, 232, 240) // #e2e8f0
      doc.setLineWidth(0.3)
      doc.line(14, footerY - 4, 196, footerY - 4)

      // Left: Logo Icon Emblem & Title
      doc.setFillColor(30, 41, 59)
      doc.circle(17, footerY - 0.2, 2.4, "F")
      doc.setFillColor(79, 156, 249)
      doc.circle(17, footerY - 0.2, 1.2, "F")

      doc.setFont("helvetica", "bold")
      doc.setFontSize(8.5)
      doc.setTextColor(30, 41, 59)
      doc.text("INSPICO '26", 21.5, footerY + 0.6)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      doc.text(`· Official Results System · ${dateStr}`, 47, footerY + 0.6)

      // Center-Right: Interactive "See More / Web" button
      const btnX = 132
      const btnY = footerY - 3
      const btnW = 38
      const btnH = 5.8

      doc.setFillColor(241, 245, 249) // light slate pill background
      doc.roundedRect(btnX, btnY, btnW, btnH, 1.5, 1.5, "F")
      doc.setDrawColor(203, 213, 225)
      doc.setLineWidth(0.25)
      doc.roundedRect(btnX, btnY, btnW, btnH, 1.5, 1.5, "S")

      doc.setFont("helvetica", "bold")
      doc.setFontSize(7)
      doc.setTextColor(37, 99, 235) // royal blue
      doc.text("See More Online ↗", btnX + 4.5, footerY + 0.7)

      // Clickable PDF link
      doc.link(btnX, btnY, btnW, btnH, { url: webUrl })

      // Far Right: Page Numbering
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text(`Page ${i} of ${totalPages}`, 196, footerY + 0.7, { align: 'right' })
    }
  }

  // Export standings to PDF (strictly filtered rows)
  const downloadPDF = (list) => {
    if (list.length === 0) {
      alert("No standings data found matching current filters.")
      return
    }
    const doc = new jsPDF()
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("INSPICO - Participant Standings Report", 14, 20)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    let metaText = `Generated on: ${new Date().toLocaleString()} · Total: ${list.length} participants`
    const activeFilters = []
    if (standingsCatFilter) {
      const cObj = categories.find(c => c.id === standingsCatFilter)
      activeFilters.push(`Category: ${cObj?.name || standingsCatFilter}`)
    }
    if (standingsTeamFilter) activeFilters.push(`Team: ${standingsTeamFilter}`)
    if (standingsTypeFilter) activeFilters.push(`Type: ${standingsTypeFilter === 'stage' ? 'STAGE' : 'OFF-STAGE'}`)
    if (standingsSearch) activeFilters.push(`Search: "${standingsSearch}"`)
    if (activeFilters.length > 0) {
      metaText += `  |  Filter: ${activeFilters.join(' · ')}`
    }
    doc.text(metaText, 14, 26)
    
    // Draw table header
    doc.setFillColor(30, 41, 59)
    doc.rect(14, 32, 182, 8, "F")
    
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.text("Rank", 16, 37.5)
    doc.text("Participant Name", 28, 37.5)
    doc.text("Team", 82, 37.5)
    doc.text("Ind. Stg", 112, 37.5)
    doc.text("Ind. Off", 132, 37.5)
    doc.text("Mix Stg", 152, 37.5)
    doc.text("Mix Off", 172, 37.5)
    doc.text("Total", 190, 37.5)
    
    doc.setFont("helvetica", "normal")
    doc.setTextColor(0, 0, 0)
    
    let y = 46
    const pageHeight = doc.internal.pageSize.height
    
    list.forEach((p, idx) => {
      // Check page overflow
      if (y > pageHeight - 22) {
        doc.addPage()
        doc.setFillColor(30, 41, 59)
        doc.rect(14, 15, 182, 8, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFont("helvetica", "bold")
        doc.text("Rank", 16, 20.5)
        doc.text("Participant Name", 28, 20.5)
        doc.text("Team", 82, 20.5)
        doc.text("Ind. Stg", 112, 20.5)
        doc.text("Ind. Off", 132, 20.5)
        doc.text("Mix Stg", 152, 20.5)
        doc.text("Mix Off", 172, 20.5)
        doc.text("Total", 190, 20.5)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(0, 0, 0)
        y = 29
      }
      
      if (idx % 2 === 1) {
        doc.setFillColor(245, 247, 250)
        doc.rect(14, y - 4, 182, 7, "F")
      }
      
      doc.text(`#${idx + 1}`, 16, y.toFixed(1))
      doc.text(p.name.substring(0, 24), 28, y.toFixed(1))
      doc.text(p.team.substring(0, 14), 82, y.toFixed(1))
      doc.text(`${p.indStagePts || 0}`, 112, y.toFixed(1))
      doc.text(`${p.indOffStagePts || 0}`, 132, y.toFixed(1))
      doc.text(`${p.mixStagePts || 0}`, 152, y.toFixed(1))
      doc.text(`${p.mixOffStagePts || 0}`, 172, y.toFixed(1))
      doc.setFont("helvetica", "bold")
      doc.text(`${p.pts}`, 190, y.toFixed(1))
      doc.setFont("helvetica", "normal")
      
      doc.setDrawColor(230, 230, 230)
      doc.line(14, y + 3, 196, y + 3)
      
      y += 8
    })
    
    renderInspicoFooter(doc)
    doc.save(`Inspico_Participant_Standings_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Export absentees to PDF (strictly filtered rows)
  const downloadAbsenteesPDF = (list) => {
    if (list.length === 0) {
      alert("No absentees found matching current filters.")
      return
    }
    const doc = new jsPDF()
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("INSPICO - Absentees / Non-Participants Report", 14, 20)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    let metaText = `Generated on: ${new Date().toLocaleString()} · Total: ${list.length} absentees`
    const activeFilters = []
    if (absCatFilter) {
      const cObj = categories.find(c => c.id === absCatFilter)
      activeFilters.push(`Category: ${cObj?.name || absCatFilter}`)
    }
    if (absTeamFilter) activeFilters.push(`Team: ${absTeamFilter}`)
    if (absTypeFilter) activeFilters.push(`Type: ${absTypeFilter === 'stage' ? 'STAGE' : 'OFF-STAGE'}`)
    if (absSearch) activeFilters.push(`Search: "${absSearch}"`)
    if (activeFilters.length > 0) {
      metaText += `  |  Filter: ${activeFilters.join(' · ')}`
    }
    doc.text(metaText, 14, 26)
    
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
      if (y > pageHeight - 22) {
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
    
    renderInspicoFooter(doc)
    doc.save(`Inspico_Absentees_Report_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Export judged competition results with detailed points to a single PDF (strictly filtered competitions)
  const downloadAllJudgedResultsPDF = (compsToExport = filtered) => {
    if (compsToExport.length === 0) {
      alert("No competitions found matching current filters.")
      return
    }
    const doc = new jsPDF()
    let isFirstPage = true
    const pageHeight = doc.internal.pageSize.height
    
    // Sort judged competitions by category name, then competition name
    const sortedComps = [...compsToExport].sort((a, b) => {
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
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      const jNames = compJudgesMap[comp.id] || []
      const judgesStr = jNames.length > 0 ? jNames.join(', ') : '—'
      doc.text(`Category: ${comp.categories?.name || '—'}  |  Type: ${(comp.competition_type || 'off-stage').toUpperCase()}  |  Judges: ${judgesStr}`, 14, 26)
      
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
        if (y > pageHeight - 24) {
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
      if (y > pageHeight - 24) {
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
    
    renderInspicoFooter(doc)
    doc.save(`Inspico_Results_${new Date().toISOString().split('T')[0]}.pdf`)
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
          {pwError && (
            <p className="form-error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {pwError}
            </p>
          )}
          <button className="btn-submit" type="submit" style={{ marginTop: 8, height: 38, fontSize: 13, fontWeight: 600 }}>Unlock Results</button>
        </form>
      </div>
    )
  }

  return (
    <div className="dash-root">
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
        {selected && (
          <button 
            onClick={() => { setSelected(null); setResultDetail([]) }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
            title="Back to list"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
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
            style={{ 
              marginLeft: 'auto', 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid var(--border-subtle)', 
              color: 'var(--text-muted)', 
              fontSize: 11, 
              fontWeight: 600,
              padding: '5px 10px', 
              borderRadius: 6, 
              cursor: 'pointer', 
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Lock
          </button>
        )}
      </div>

      {!selected ? (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {activeTab === 'competitions' ? (
            <>
              {/* Filters for Competitions */}
              <div style={{ padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                         style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--text-muted)' }}>
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input className="dash-search-input" style={{ paddingLeft: 30, paddingRight: search ? 30 : 10, width: 210 }}
                      value={search} onChange={e => setSearch(e.target.value)} placeholder="Search competitions…" />
                    {search && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                           onClick={() => setSearch('')}
                           style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </div>

                  <select className="field-select" style={{ width: 150, padding: '6px 10px', fontSize: 12 }}
                    value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>

                  <select className="field-select" style={{ width: 150, padding: '6px 10px', fontSize: 12 }}
                    value={compTeamFilter} onChange={e => setCompTeamFilter(e.target.value)}>
                    <option value="">All Teams</option>
                    {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>

                  <select className="field-select" style={{ width: 130, padding: '6px 10px', fontSize: 12 }}
                    value={compTypeFilter} onChange={e => setCompTypeFilter(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="stage">Stage</option>
                    <option value="off-stage">Off-Stage</option>
                  </select>

                  {(search || catFilter || compTeamFilter || compTypeFilter) && (
                    <button
                      type="button"
                      onClick={() => { setSearch(''); setCatFilter(''); setCompTeamFilter(''); setCompTypeFilter('') }}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', borderRadius: 6, padding: '6px 10px', fontSize: 11, cursor: 'pointer' }}
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Count: <strong style={{ color: 'var(--accent-light)' }}>{filtered.length}</strong> of {competitions.length}
                  </span>
                  <button 
                    onClick={() => downloadAllJudgedResultsPDF(filtered)}
                    style={{
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
                    Export Results PDF ({filtered.length})
                  </button>
                </div>
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
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#7bc47b', fontWeight: 600 }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Judged
                        </span>
                      </td>
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
              {/* ── Vocal of the Fest / Pen of the Fest Cards at Top ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, padding: '16px 0 6px 0' }}>
                {[
                  {
                    id: 'vocal',
                    title: 'Vocal of the Fest',
                    subtitle: 'Top Stage Performer (Individual)',
                    list: awards.kala,
                    color: 'var(--accent-light, #60a5fa)',
                    accentBg: 'rgba(79, 156, 249, 0.1)',
                    border: 'rgba(79, 156, 249, 0.25)',
                    glow: 'rgba(79, 156, 249, 0.12)',
                    emptyText: 'No individual stage results yet',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="23"/>
                        <line x1="8" y1="23" x2="16" y2="23"/>
                      </svg>
                    )
                  },
                  {
                    id: 'pen',
                    title: 'Pen of the Fest',
                    subtitle: 'Top Off-Stage Performer (Individual)',
                    list: awards.sarga,
                    color: '#c084fc',
                    accentBg: 'rgba(192, 132, 252, 0.1)',
                    border: 'rgba(192, 132, 252, 0.25)',
                    glow: 'rgba(192, 132, 252, 0.12)',
                    emptyText: 'No individual off-stage results yet',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                      </svg>
                    )
                  }
                ].map(award => (
                  <div 
                    key={award.id} 
                    style={{ 
                      padding: '16px 18px', 
                      background: 'rgba(255, 255, 255, 0.025)', 
                      border: `1px solid ${award.border}`, 
                      borderRadius: 12,
                      boxShadow: `0 4px 20px ${award.glow}`,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Header with Pro Vector Icon */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: award.accentBg,
                          border: `1px solid ${award.border}`,
                          color: award.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {award.icon}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: award.color, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                            {award.title}
                          </h4>
                          <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>
                            {award.subtitle}
                          </p>
                        </div>
                      </div>
                      {award.list.length > 1 && (
                        <span style={{ 
                          fontSize: 9.5, 
                          fontWeight: 700, 
                          color: '#f7c948', 
                          background: 'rgba(247, 201, 72, 0.1)', 
                          border: '1px solid rgba(247, 201, 72, 0.25)', 
                          padding: '2px 7px', 
                          borderRadius: 4,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}>
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                          Tie
                        </span>
                      )}
                    </div>

                    {/* Winners list with Highlighted Names */}
                    {award.list.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {award.list.map((w, i) => {
                          const matched = standings.find(s => s.name === w.name) || w
                          return (
                            <div 
                              key={i} 
                              style={{ 
                                padding: '12px 14px',
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.015) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: 10,
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)'
                                e.currentTarget.style.borderColor = award.border
                                e.currentTarget.style.boxShadow = `0 4px 16px ${award.glow}`
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.015) 100%)'
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                                e.currentTarget.style.boxShadow = 'none'
                              }}
                              onClick={() => openParticipantModal(matched, award.id)}
                              title={`Click to view ${award.title} breakdown`}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                {/* Winner Pro Trophy Vector Badge */}
                                <div style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 7,
                                  background: award.accentBg,
                                  border: `1px solid ${award.border}`,
                                  color: award.color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                  </svg>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {/* Prominently Highlighted Winner Name */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ 
                                      fontWeight: 800, 
                                      fontSize: 15.5, 
                                      color: '#ffffff', 
                                      letterSpacing: '0.3px',
                                      textShadow: '0 1px 4px rgba(0,0,0,0.6)'
                                    }}>
                                      {w.name}
                                    </span>
                                    {matched?.chess_number && (
                                      <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                                        #{matched.chess_number}
                                      </span>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
                                      {w.team}
                                    </span>
                                    <span style={{ fontSize: 10, color: award.color, opacity: 0.85, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                      • View breakdown
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}>
                                        <polyline points="9 18 15 12 9 6" />
                                      </svg>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ 
                                background: award.accentBg, 
                                border: `1px solid ${award.border}`, 
                                padding: '5px 12px', 
                                borderRadius: 8,
                                textAlign: 'right',
                                flexShrink: 0
                              }}>
                                <span style={{ fontSize: 15, fontWeight: 800, color: award.color }}>
                                  {w.pts}
                                </span>
                                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 3 }}>
                                  pts
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0', fontStyle: 'italic' }}>
                        {award.emptyText}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Filters for Standings */}
              <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
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
                      style={{ paddingLeft: 30, width: 210 }}
                    />
                  </div>

                  <select className="field-select" style={{ width: 150, padding: '6px 10px', fontSize: 12 }}
                    value={standingsCatFilter} onChange={e => setStandingsCatFilter(e.target.value)}>
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>

                  <select className="field-select" style={{ width: 150, padding: '6px 10px', fontSize: 12 }}
                    value={standingsTeamFilter} onChange={e => setStandingsTeamFilter(e.target.value)}>
                    <option value="">All Teams</option>
                    {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>

                  <select className="field-select" style={{ width: 130, padding: '6px 10px', fontSize: 12 }}
                    value={standingsTypeFilter} onChange={e => setStandingsTypeFilter(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="stage">Stage</option>
                    <option value="off-stage">Off-Stage</option>
                  </select>

                  {(standingsSearch || standingsCatFilter || standingsTeamFilter || standingsTypeFilter) && (
                    <button
                      type="button"
                      onClick={() => { setStandingsSearch(''); setStandingsCatFilter(''); setStandingsTeamFilter(''); setStandingsTypeFilter('') }}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', borderRadius: 6, padding: '6px 10px', fontSize: 11, cursor: 'pointer' }}
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Count: <strong style={{ color: '#f7c948' }}>{filteredStandings.length}</strong> of {standings.length}
                  </span>
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
                    Export PDF Standings ({filteredStandings.length})
                  </button>
                </div>
              </div>

              <table className="data-table" style={{ margin: '0' }}>
                <thead>
                  <tr>
                    <th style={{ top: 0 }}>Rank</th>
                    <th style={{ top: 0 }}>Participant</th>
                    <th style={{ top: 0 }}>Team</th>
                    <th style={{ top: 0 }} title="Individual Stage Points (non-general - Vocal of the Fest)">Ind. Stage</th>
                    <th style={{ top: 0 }} title="Individual Off-Stage Points (non-general - Pen of the Fest)">Ind. Off-Stage</th>
                    <th style={{ top: 0 }} title="Mix Zone (General) Stage Points">Mix Stage</th>
                    <th style={{ top: 0 }} title="Mix Zone (General) Off-Stage Points">Mix Off-Stage</th>
                    <th style={{ top: 0 }}>Total Pts</th>
                    <th style={{ top: 0, width: 80, textAlign: 'center' }}>Breakdown</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStandings.map((p, idx) => (
                    <tr 
                      key={p.name}
                      onClick={() => openParticipantModal(p, null)}
                      className="row-clickable"
                      style={{ cursor: 'pointer' }}
                      title="Click to view full competition points breakdown"
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
                      <td style={{ fontWeight: 600, color: 'var(--accent-light)' }}>{p.indStagePts || 0}</td>
                      <td style={{ fontWeight: 600, color: '#a78bfa' }}>{p.indOffStagePts || 0}</td>
                      <td style={{ color: '#38bdf8' }}>{p.mixStagePts || 0}</td>
                      <td style={{ color: '#818cf8' }}>{p.mixOffStagePts || 0}</td>
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
                            openParticipantModal(p, null)
                          }}
                        >
                          View ({p.competitions?.length || 0})
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredStandings.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
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
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
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
                      style={{ paddingLeft: 30, width: 210 }}
                    />
                  </div>

                  <select 
                    className="field-select" 
                    style={{ width: 150, padding: '6px 10px', fontSize: 12 }}
                    value={absCatFilter} 
                    onChange={e => setAbsCatFilter(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>

                  <select 
                    className="field-select" 
                    style={{ width: 150, padding: '6px 10px', fontSize: 12 }}
                    value={absTeamFilter} 
                    onChange={e => setAbsTeamFilter(e.target.value)}
                  >
                    <option value="">All Teams</option>
                    {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>

                  <select 
                    className="field-select" 
                    style={{ width: 130, padding: '6px 10px', fontSize: 12 }}
                    value={absTypeFilter} 
                    onChange={e => setAbsTypeFilter(e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="stage">Stage</option>
                    <option value="off-stage">Off-Stage</option>
                  </select>

                  {(absSearch || absCatFilter || absTeamFilter || absTypeFilter) && (
                    <button
                      type="button"
                      onClick={() => { setAbsSearch(''); setAbsCatFilter(''); setAbsTeamFilter(''); setAbsTypeFilter('') }}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', borderRadius: 6, padding: '6px 10px', fontSize: 11, cursor: 'pointer' }}
                    >
                      Reset
                    </button>
                  )}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Count: <strong style={{ color: 'var(--accent-light)' }}>{filteredAbs.length}</strong> of {absentees.length}
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
                    Export PDF Report ({filteredAbs.length})
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
                        {r.position <= 3 ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            fontWeight: 800,
                            fontSize: 11,
                            background: r.position === 1 ? 'rgba(247, 201, 72, 0.15)' : r.position === 2 ? 'rgba(203, 213, 225, 0.15)' : 'rgba(251, 146, 60, 0.15)',
                            border: `1px solid ${r.position === 1 ? 'rgba(247, 201, 72, 0.4)' : r.position === 2 ? 'rgba(203, 213, 225, 0.4)' : 'rgba(251, 146, 60, 0.4)'}`,
                            color: r.position === 1 ? '#f7c948' : r.position === 2 ? '#cbd5e1' : '#fb923c'
                          }} title={`Rank ${r.position}`}>
                            {r.position}
                          </span>
                        ) : (
                          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.position}</span>
                        )}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 13, height: 13, color: 'var(--accent-light)' }}>
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Tie Detected</span>
                    </div>
                    {tiedGroups.map(([pos, list]) => (
                      <p key={pos} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Rank #{pos}</strong>: {list.map(r => `${r.participant?.name || r.code_letter} (${r.avg_points} pts)`).join(' · ')}
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
          onClick={closeParticipantModal} 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(7px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          {(() => {
            const isVocal = modalMode === 'vocal'
            const isPen = modalMode === 'pen'
            const isAward = isVocal || isPen

            const themeColor = isVocal ? 'var(--accent-light, #4f9cf9)' : isPen ? '#c084fc' : 'var(--accent-light)'
            const themeBg = isVocal ? 'rgba(79, 156, 249, 0.12)' : isPen ? 'rgba(192, 132, 252, 0.12)' : 'rgba(255, 255, 255, 0.03)'
            const themeBorder = isVocal ? 'rgba(79, 156, 249, 0.35)' : isPen ? 'rgba(192, 132, 252, 0.35)' : 'var(--border-subtle, rgba(255,255,255,0.1))'
            const modalShadow = isVocal 
              ? '0 25px 60px -12px rgba(0,0,0,0.85), 0 0 35px rgba(79, 156, 249, 0.15)' 
              : isPen 
                ? '0 25px 60px -12px rgba(0,0,0,0.85), 0 0 35px rgba(192, 132, 252, 0.15)' 
                : '0 25px 50px -12px rgba(0,0,0,0.7)'

            // Filter competitions based on context:
            // - Vocal of the Fest: Stage competitions only (individual stage events that earned points)
            // - Pen of the Fest: Off-stage competitions only (individual off-stage events that earned points)
            // - Normal / bottom table: All individual competitions grouped into 4 sections
            const allComps = selectedParticipant.competitions || []
            const displayedComps = isVocal 
              ? allComps.filter(c => !c.is_general && c.is_stage)
              : isPen 
                ? allComps.filter(c => !c.is_general && !c.is_stage)
                : allComps

            return (
              <div 
                onClick={e => e.stopPropagation()} 
                style={{
                  background: '#0d1117',
                  border: `1px solid ${themeBorder}`,
                  borderRadius: 16,
                  width: '100%',
                  maxWidth: isAward ? 620 : 660,
                  maxHeight: '88vh',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  boxShadow: modalShadow,
                  transition: 'all 0.25s ease'
                }}
              >
                {/* Modal Header */}
                <div style={{ 
                  padding: '18px 22px', 
                  borderBottom: `1px solid ${themeBorder}`, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  background: isVocal 
                    ? 'linear-gradient(135deg, rgba(79, 156, 249, 0.15) 0%, rgba(13, 17, 23, 0.95) 100%)' 
                    : isPen 
                      ? 'linear-gradient(135deg, rgba(192, 132, 252, 0.15) 0%, rgba(13, 17, 23, 0.95) 100%)' 
                      : 'rgba(255,255,255,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {isAward ? (
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: themeBg,
                        border: `1px solid ${themeBorder}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: themeColor,
                        flexShrink: 0
                      }}>
                        {isVocal ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            <line x1="12" y1="19" x2="12" y2="23"/>
                            <line x1="8" y1="23" x2="16" y2="23"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                          </svg>
                        )}
                      </div>
                    ) : (
                      <div style={{ 
                        width: 42, 
                        height: 42, 
                        borderRadius: 10, 
                        background: 'linear-gradient(135deg, rgba(247, 201, 72, 0.15) 0%, rgba(247, 201, 72, 0.05) 100%)', 
                        border: '1px solid rgba(247, 201, 72, 0.3)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: '#f7c948', 
                        fontWeight: 800, 
                        fontSize: 15 
                      }}>
                        #{filteredStandings.findIndex(x => x.name === selectedParticipant.name) + 1}
                      </div>
                    )}
                    
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '0.2px' }}>
                          {selectedParticipant.name}
                        </h3>
                        {selectedParticipant.chess_number && (
                          <span style={{ fontSize: 11, padding: '2px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: 4, color: 'var(--text-muted)' }}>
                            #{selectedParticipant.chess_number}
                          </span>
                        )}
                        {isVocal && (
                          <span style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 5,
                            background: 'rgba(79, 156, 249, 0.18)',
                            color: 'var(--accent-light)',
                            border: '1px solid rgba(79, 156, 249, 0.35)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}>
                              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            </svg>
                            Vocal of the Fest
                          </span>
                        )}
                        {isPen && (
                          <span style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 5,
                            background: 'rgba(192, 132, 252, 0.18)',
                            color: '#c084fc',
                            border: '1px solid rgba(192, 132, 252, 0.35)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}>
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                            </svg>
                            Pen of the Fest
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: isAward ? themeColor : 'var(--accent-light)', fontWeight: 500 }}>
                        {selectedParticipant.team} {isVocal ? '· Individual Stage Events Only' : isPen ? '· Individual Off-Stage Events Only' : ''}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={closeParticipantModal}
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
                {isAward ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '14px 22px', background: 'rgba(0,0,0,0.25)', borderBottom: `1px solid ${themeBorder}` }}>
                    <div style={{ background: themeBg, border: `1px solid ${themeBorder}`, borderRadius: 8, padding: '10px 12px' }}>
                      <span style={{ fontSize: 10, color: themeColor, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
                        {isVocal ? 'Vocal Score (Stage)' : 'Pen Score (Off-Stage)'}
                      </span>
                      <div style={{ fontSize: 18, fontWeight: 900, color: themeColor, marginTop: 3 }}>
                        {isVocal ? (selectedParticipant.indStagePts || 0) : (selectedParticipant.indOffStagePts || 0)} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>pts</span>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
                        {isVocal ? 'Stage Events' : 'Off-Stage Events'}
                      </span>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 3 }}>
                        {displayedComps.length}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(247, 201, 72, 0.05)', border: '1px solid rgba(247, 201, 72, 0.2)', borderRadius: 8, padding: '10px 12px' }}>
                      <span style={{ fontSize: 10, color: '#f7c948', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
                        Total Fest Score
                      </span>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#f7c948', marginTop: 3 }}>
                        {selectedParticipant.pts} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>pts</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, padding: '14px 22px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 10px' }}>
                      <span style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Ind. Stage</span>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent-light)', marginTop: 2 }}>{selectedParticipant.indStagePts || 0}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 10px' }}>
                      <span style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Ind. Off-Stage</span>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#a78bfa', marginTop: 2 }}>{selectedParticipant.indOffStagePts || 0}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 10px' }}>
                      <span style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Mix Stage</span>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>{selectedParticipant.mixStagePts || 0}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 10px' }}>
                      <span style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Mix Off-Stage</span>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#818cf8', marginTop: 2 }}>{selectedParticipant.mixOffStagePts || 0}</div>
                    </div>
                    <div style={{ background: 'rgba(247, 201, 72, 0.05)', border: '1px solid rgba(247, 201, 72, 0.2)', borderRadius: 8, padding: '8px 10px' }}>
                      <span style={{ fontSize: 9.5, color: '#f7c948', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Pts</span>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#f7c948', marginTop: 2 }}>{selectedParticipant.pts}</div>
                    </div>
                  </div>
                )}

                {/* Competitions list */}
                <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {isVocal 
                      ? `Stage Competitions Evaluated (${displayedComps.length})` 
                      : isPen 
                        ? `Off-Stage Competitions Evaluated (${displayedComps.length})` 
                        : `Participated Competitions (${selectedParticipant.competitions?.length || 0})`}
                  </div>

                  {displayedComps.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                      {isVocal 
                        ? 'No individual stage competition score records available.' 
                        : isPen 
                          ? 'No individual off-stage competition score records available.' 
                          : 'No individual competition score records available.'}
                    </div>
                  ) : isAward ? (
                    /* ── Focused Single Award List (Stage only or Off-Stage only) ── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[...displayedComps]
                        .sort((a, b) => (b.total_points || 0) - (a.total_points || 0) || (a.position || 999) - (b.position || 999))
                        .map((comp, cIdx) => (
                          <div 
                            key={comp.competition_id || cIdx}
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: `1px solid ${themeBorder}`,
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
                                <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{comp.competition_name}</span>
                                <span style={{
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: themeBg,
                                  color: themeColor,
                                  border: `1px solid ${themeBorder}`
                                }}>
                                  {comp.is_stage ? 'Stage' : 'Off-Stage'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                <span>{comp.category_name}</span>
                                <span>•</span>
                                <span>Score: <strong style={{ color: 'var(--text-primary)' }}>{comp.avg_points}%</strong></span>
                                <span>•</span>
                                <span>Grade: <strong style={{ color: themeColor }}>{comp.grade}</strong> ({comp.grade_points} pts)</span>
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
                                <div style={{ fontSize: 15, fontWeight: 800, color: themeColor, marginTop: 2 }}>
                                  +{comp.total_points} <span style={{ fontSize: 9.5, fontWeight: 500, color: 'var(--text-muted)' }}>pts</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    /* ── Normal Standings Full 4-Section List ── */
                    (() => {
                      const sections = [
                        {
                          id: 'ind-stage',
                          title: 'Individual Stage',
                          color: 'var(--accent-light)',
                          bg: 'rgba(79, 156, 249, 0.08)',
                          border: 'rgba(79, 156, 249, 0.25)',
                          items: (selectedParticipant.competitions || []).filter(c => !c.is_general && c.is_stage)
                        },
                        {
                          id: 'ind-offstage',
                          title: 'Individual Off-Stage',
                          color: '#a78bfa',
                          bg: 'rgba(167, 139, 250, 0.08)',
                          border: 'rgba(167, 139, 250, 0.25)',
                          items: (selectedParticipant.competitions || []).filter(c => !c.is_general && !c.is_stage)
                        },
                        {
                          id: 'mix-stage',
                          title: 'Mix Zone Stage',
                          color: '#38bdf8',
                          bg: 'rgba(56, 189, 248, 0.08)',
                          border: 'rgba(56, 189, 248, 0.25)',
                          items: (selectedParticipant.competitions || []).filter(c => c.is_general && c.is_stage)
                        },
                        {
                          id: 'mix-offstage',
                          title: 'Mix Zone Off-Stage',
                          color: '#818cf8',
                          bg: 'rgba(129, 140, 248, 0.08)',
                          border: 'rgba(129, 140, 248, 0.25)',
                          items: (selectedParticipant.competitions || []).filter(c => c.is_general && !c.is_stage)
                        }
                      ]

                      return sections.map(sec => {
                        if (sec.items.length === 0) return null
                        const sortedItems = [...sec.items].sort((a, b) => (b.total_points || 0) - (a.total_points || 0) || (a.position || 999) - (b.position || 999))
                        const secPts = sortedItems.reduce((acc, x) => acc + (x.total_points || 0), 0)

                        return (
                          <div key={sec.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4, marginBottom: 8 }}>
                            {/* Section Divider Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: 2 }}>
                              <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: 0.6,
                                padding: '3px 8px',
                                borderRadius: 5,
                                background: sec.bg,
                                color: sec.color,
                                border: `1px solid ${sec.border}`
                              }}>
                                {sec.title}
                              </span>
                              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle, rgba(255,255,255,0.08))' }} />
                              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                                {sortedItems.length} {sortedItems.length === 1 ? 'event' : 'events'} · <strong style={{ color: '#fff' }}>{secPts} pts</strong>
                              </span>
                            </div>

                            {/* Competition Cards in Section */}
                            {sortedItems.map((comp, cIdx) => (
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
                                    {comp.is_general && (
                                      <span style={{
                                        fontSize: 9.5,
                                        fontWeight: 700,
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        background: 'rgba(245, 158, 11, 0.12)',
                                        color: '#f59e0b',
                                        border: '1px solid rgba(245, 158, 11, 0.25)'
                                      }}>
                                        Mix Zone
                                      </span>
                                    )}
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
                            ))}
                          </div>
                        )
                      })
                    })()
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
