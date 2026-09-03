// src/pages/team/TeamDashboard.jsx
import { useState, useEffect, useRef, useMemo } from 'react'
import { jsPDF } from 'jspdf'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PublicSchedule from '../../components/PublicSchedule'
import HeaderInstallButton from '../../components/HeaderInstallButton'
import './TeamDashboard.css'

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconTrophy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 1 0-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
  </svg>
)
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, color: 'var(--text-muted)' }}>
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)
const IconInfo = ({ style }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0, ...style }}>
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
)

function initials(name) {
  return name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'
}

export default function TeamDashboard() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState('participants')
  const [participants, setParticipants] = useState([])
  const [competitions, setCompetitions] = useState([])
  const [assignments, setAssignments] = useState([])
  const [attendance, setAttendance] = useState([])
  const inFlightUpdatesRef = useRef({})

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [drawerSearch, setDrawerSearch] = useState('')
  const [toast, setToast] = useState(null)

  // Drawer Touch Gesture state
  const [startY, setStartY] = useState(null)
  const [currentY, setCurrentY] = useState(0)
  const [dragging, setDragging] = useState(false)

  // Permissions state
  const [canAssign, setCanAssign] = useState(true)
  const [limitStage, setLimitStage] = useState(null)
  const [limitOffstage, setLimitOffstage] = useState(null)

  // Registration time windows & category lock overrides
  const [regStartTime, setRegStartTime] = useState(null)
  const [regEndTime, setRegEndTime] = useState(null)
  const [globalLockedCats, setGlobalLockedCats] = useState([])
  const [teamCategoryPerms, setTeamCategoryPerms] = useState({})
  const [nowTick, setNowTick] = useState(Date.now())

  // Drawer & dialog states
  const [activeParticipant, setActiveParticipant] = useState(null)
  const [activeCompetition, setActiveCompetition] = useState(null)
  const [viewingRules, setViewingRules] = useState(null)
  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const drawerItems = useMemo(() => {
    if (activeParticipant) {
      const filtered = (competitions || []).filter(c => 
        String(c.category_id) === String(activeParticipant.category_id) || 
        c.categories?.is_general === true || 
        c.categories?.is_general === 'true'
      );
      return [...filtered].sort((a, b) => {
        const aActive = assignments.some(x => x.participant_id === activeParticipant.id && x.competition_id === a.id);
        const bActive = assignments.some(x => x.participant_id === activeParticipant.id && x.competition_id === b.id);
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;

        const catA = a.categories?.name || 'Z-General';
        const catB = b.categories?.name || 'Z-General';
        if (catA !== catB) return catA.localeCompare(catB);

        const aIsStage = a.is_stage ? 1 : 0;
        const bIsStage = b.is_stage ? 1 : 0;
        if (aIsStage !== bIsStage) return aIsStage - bIsStage;

        return (a.name || '').localeCompare(b.name || '');
      });
    }

    if (activeCompetition) {
      const isCompGeneral = activeCompetition.categories?.is_general === true || activeCompetition.categories?.is_general === 'true';
      const filtered = (participants || []).filter(p => isCompGeneral || String(p.category_id) === String(activeCompetition.category_id));
      return [...filtered].sort((a, b) => {
        const aActive = assignments.some(x => x.participant_id === a.id && x.competition_id === activeCompetition.id);
        const bActive = assignments.some(x => x.participant_id === b.id && x.competition_id === activeCompetition.id);
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
    }

    return [];
  }, [activeParticipant, activeCompetition, competitions, participants, assignments]);
  // Handle hardware/browser back swipe to close drawers instead of exiting app
  useEffect(() => {
    const handlePopState = (e) => {
      if (activeParticipant || activeCompetition) {
        setActiveParticipant(null);
        setActiveCompetition(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeParticipant, activeCompetition]);

  useEffect(() => {
    fetchAll()

    // Realtime changes listener
    const ch = supabase
      .channel('team-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, fetchAll)
      .subscribe()

    const timer = setInterval(() => {
      setNowTick(Date.now())
    }, 5000)

    return () => {
      supabase.removeChannel(ch)
      clearInterval(timer)
    }
  }, [user?.teamId])

  // Touch handlers for drag-to-close drawer
  const handleTouchStart = (e) => {
    const headerOrHandle = e.target.closest('.drawer-drag-handle, .drawer-header');
    const scrollTarget = e.currentTarget.querySelector('.drawer-body');
    const isAtTop = !scrollTarget || scrollTarget.scrollTop <= 0;

    // Allow drag if touching header/handle OR body is at top scroll position
    if (headerOrHandle || isAtTop) {
      setStartY(e.touches[0].clientY);
      setDragging(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!dragging || startY === null) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const closeDrawer = () => {
    setActiveParticipant(null)
    setActiveCompetition(null)
    setDrawerSearch('')
    setCurrentY(0)
    setStartY(null)
  }

  const handleTouchEnd = () => {
    if (!dragging) return;
    setDragging(false);

    if (currentY > 100) {
      // Animate smoothly to bottom before closing
      setCurrentY(window.innerHeight || 800);
      setTimeout(() => {
        closeDrawer();
      }, 250);
    } else {
      // Snap back smoothly
      setCurrentY(0);
      setStartY(null);
    }
  };

  // Prevent background scrolling when a drawer or modal is open
  useEffect(() => {
    if (activeParticipant || activeCompetition || showSignoutConfirm) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [activeParticipant, activeCompetition, showSignoutConfirm])

  // Adjust drawer backdrop layout
  useEffect(() => {
    // Standard cleanup
    return () => {
      const backdrop = document.querySelector('.drawer-backdrop');
      if (backdrop) {
        backdrop.style.height = '';
        backdrop.style.top = '';
      }
    };
  }, [activeParticipant, activeCompetition]);

  // Toast auto-dismiss timer
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!user?.teamId) return
    fetchAll()

    // Realtime changes listener with unique channel identifier
    const channelId = `team-dash-${user.teamId}-${Math.random().toString(36).substring(2, 7)}`
    const ch = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_schedule' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_results' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, fetchAll)
      .subscribe()

    // 3-second fallback polling interval to guarantee permission sync across network conditions
    const pollTimer = setInterval(() => {
      fetchAll()
    }, 3000)

    // Re-fetch immediately when user switches back to tab
    const handleFocus = () => fetchAll()
    window.addEventListener('focus', handleFocus)

    return () => {
      supabase.removeChannel(ch)
      clearInterval(pollTimer)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user?.teamId])

  async function fetchAll() {
    if (!user?.teamId) return
    
    // 1. Fetch team settings, permissions, and dynamic event limits
    const [{ data: teamData }, { data: settingsData }] = await Promise.all([
      supabase.from('teams').select('can_assign').eq('id', user.teamId).single(),
      supabase.from('app_settings').select('key, value').in('key', ['global_assign', 'max_stage_events', 'max_offstage_events', 'registration_start_time', 'registration_end_time', 'locked_categories_global', 'team_category_permissions'])
    ])

    const teamAllowed = teamData ? teamData.can_assign !== false : true
    const globalAssignSetting = settingsData?.find(s => s.key === 'global_assign')
    const globalAllowed = globalAssignSetting ? (globalAssignSetting.value === true || globalAssignSetting.value === 'true') : true
    setCanAssign(teamAllowed && globalAllowed)

    const stageLim = settingsData?.find(s => s.key === 'max_stage_events')
    const offstageLim = settingsData?.find(s => s.key === 'max_offstage_events')
    if (stageLim) setLimitStage(parseInt(stageLim.value, 10))
    if (offstageLim) setLimitOffstage(parseInt(offstageLim.value, 10))

    const startValSetting = settingsData?.find(s => s.key === 'registration_start_time')
    const endValSetting = settingsData?.find(s => s.key === 'registration_end_time')
    const lockedSetting = settingsData?.find(s => s.key === 'locked_categories_global')
    const teamPermsSetting = settingsData?.find(s => s.key === 'team_category_permissions')

    setRegStartTime(startValSetting?.value || null)
    setRegEndTime(endValSetting?.value || null)

    if (lockedSetting?.value) {
      try { setGlobalLockedCats(JSON.parse(lockedSetting.value)) } catch { setGlobalLockedCats([]) }
    } else {
      setGlobalLockedCats([])
    }

    if (teamPermsSetting?.value) {
      try { setTeamCategoryPerms(JSON.parse(teamPermsSetting.value)) } catch { setTeamCategoryPerms({}) }
    } else {
      setTeamCategoryPerms({})
    }

    // 2. Fetch team participants
    const { data: parts } = await supabase
      .from('participants')
      .select('id, name, chess_number, category_id, categories(name)')
      .eq('team_id', user.teamId)

    const sortedParts = (parts || []).sort((a, b) => {
      const numA = parseInt(a.chess_number, 10)
      const numB = parseInt(b.chess_number, 10)
      if (isNaN(numA) && isNaN(numB)) return (a.name || '').localeCompare(b.name || '')
      if (isNaN(numA)) return 1
      if (isNaN(numB)) return -1
      return numA - numB
    })

    const pList = sortedParts
    const pIds = pList.map(p => p.id)

    const { data: comps, error: compsError } = await supabase
      .from('competitions')
      .select('id, name, category_id, max_participants, is_stage, is_group, group_size, categories(name, is_general), rules_description, rules_duration, mark_criteria')
      .order('name')
      
    if (compsError) {
      console.error('Error fetching competitions:', compsError)
    }

    // 4. Fetch assignments for this team's participants
    let assigns = []
    if (pIds.length > 0) {
      const { data: cp } = await supabase
        .from('competition_participants')
        .select('id, competition_id, participant_id')
        .in('participant_id', pIds)
      assigns = cp || []
    }

    // Filter competitions list to categories matching registered participants, plus all General categories
  const teamCategoryIds = new Set(pList.map(p => String(p.category_id)).filter(Boolean))
  const filteredComps = (comps || [])
    .filter(c => 
      teamCategoryIds.has(String(c.category_id)) || 
      c.categories?.is_general === true || 
      c.categories?.is_general === 'true'
    )
    .sort((a, b) => {
      const catA = a.categories?.name || 'Z-General'
      const catB = b.categories?.name || 'Z-General'
      if (catA !== catB) return catA.localeCompare(catB)
      
      const aIsStage = a.is_stage ? 1 : 0
      const bIsStage = b.is_stage ? 1 : 0
      if (aIsStage !== bIsStage) return aIsStage - bIsStage
      
      return (a.name || '').localeCompare(b.name || '')
    })

    // 5. Fetch competition statuses with correct table names
    const { data: resRows } = await supabase.from('competition_results').select('competition_id, published')
    const { data: schedRows } = await supabase.from('competition_schedule').select('competition_id, status')
    const { data: judgeRows } = await supabase.from('judge_results').select('competition_id')
    const { data: repRows } = await supabase.from('competition_reports').select('competition_id, participant_id')

    filteredComps.forEach(c => {
      const resList = (resRows || []).filter(r => r.competition_id === c.id)
      const hasPublishedResult = resList.some(r => r.published === true)
      const hasResults = resList.length > 0
      const hasJudge = (judgeRows || []).some(r => r.competition_id === c.id)
      const hasRep = (repRows || []).some(r => r.competition_id === c.id)
      const sched = (schedRows || []).find(s => s.competition_id === c.id)

      if (hasPublishedResult) {
        c.status = 'Published'
      } else if (hasResults || hasJudge || (sched && sched.status === 'completed')) {
        c.status = 'Completed'
      } else if (sched && sched.status === 'ongoing') {
        c.status = 'Ongoing'
      } else if (sched) {
        c.status = 'Scheduled'
      } else if (hasRep) {
        c.status = 'Ongoing'
      } else {
        c.status = 'Pending'
      }
    })

  setParticipants(pList)
  setCompetitions(filteredComps)
  setAttendance(repRows || [])
  const inFlight = inFlightUpdatesRef.current
  let merged = assigns.filter(a => {
    const key = `${a.participant_id}_${a.competition_id}`
    if (inFlight[key] === false) {
      return false
    }
    return true
  })

  Object.keys(inFlight).forEach(key => {
    if (inFlight[key] === true) {
      const [pId, cId] = key.split('_')
      const alreadyExists = merged.some(a => String(a.participant_id) === pId && String(a.competition_id) === cId)
      if (!alreadyExists) {
        merged.push({ id: `temp-${key}`, participant_id: pId, competition_id: cId })
      }
    }
  })

  setAssignments(merged)
  setLoading(false)
}

  async function toggleAssignment(participantId, competitionId) {
    const participant = participants.find(p => p.id === participantId)
    const comp = competitions.find(c => c.id === competitionId)
    if (!participant || !comp || !isAssignmentAllowed(participant, comp)) {
      showToast('Registration is locked for this category or outside the allowed window.')
      return
    }

    const key = `${participantId}_${competitionId}`
    const existing = assignments.find(
      a => a.participant_id === participantId && a.competition_id === competitionId
    )
    const isAdding = !existing

    // Capture currently focused input to prevent mobile keyboard from dismissing
    const activeInput = document.activeElement
    const wasInputFocused = activeInput && activeInput.tagName === 'INPUT'

    // Set optimistic state immediately in inFlightUpdatesRef
    inFlightUpdatesRef.current[key] = isAdding

    // Update UI state optimistically
    if (isAdding) {
      // Check limits
      const comp = competitions.find(c => c.id === competitionId)
      const currentAssignedCount = participants.filter(p => isAssigned(p.id, competitionId)).length
      if (comp && currentAssignedCount >= comp.max_participants) {
        if (comp.is_group) {
          showToast(`Group event. You can only assign 1 representative from your team.`);
        } else {
          showToast(`Cannot assign. Maximum participants limit reached for this competition (Limit: ${comp.max_participants}).`);
        }
        delete inFlightUpdatesRef.current[key]
        return
      }

      // Check student's individual event limit if NOT a general category
      const isGeneral = comp?.categories?.is_general === true || comp?.categories?.is_general === 'true'
      if (!isGeneral) {
        const studentAssigns = assignments.filter(a => a.participant_id === participantId)
        let stageCount = 0
        let offstageCount = 0

        studentAssigns.forEach(a => {
          const c = competitions.find(comp => comp.id === a.competition_id)
          const isCGeneral = c?.categories?.is_general === true || c?.categories?.is_general === 'true'
          if (!isCGeneral) {
            if (c?.is_stage) stageCount++
            else offstageCount++
          }
        })

        if (comp?.is_stage) {
          if (limitStage !== null && stageCount >= limitStage) {
            showToast(`Limit reached. Student cannot participate in more than ${limitStage} stage competitions.`);
            delete inFlightUpdatesRef.current[key]
            return
          }
        } else {
          if (limitOffstage !== null && offstageCount >= limitOffstage) {
            showToast(`Limit reached. Student cannot participate in more than ${limitOffstage} off-stage competitions.`);
            delete inFlightUpdatesRef.current[key]
            return
          }
        }
      }

      // Optimistic insert
      const tempId = `temp-${key}`
      setAssignments(prev => [...prev, { id: tempId, participant_id: participantId, competition_id: competitionId }])
    } else {
      // Optimistic delete
      setAssignments(prev => prev.filter(a => !(a.participant_id === participantId && a.competition_id === competitionId)))
    }

    try {
      if (isAdding) {
        // Double check existence in database to prevent unique constraint violation
        const { data: existingRow } = await supabase
          .from('competition_participants')
          .select('id')
          .eq('participant_id', participantId)
          .eq('competition_id', competitionId)
          .maybeSingle()

        if (!existingRow) {
          const { data, error } = await supabase
            .from('competition_participants')
            .insert([{ participant_id: participantId, competition_id: competitionId }])
            .select()

          if (error) throw error
          if (data && data[0]) {
            // Update the temporary assignment with the real one
            setAssignments(prev => prev.map(a => 
              (a.participant_id === participantId && a.competition_id === competitionId) ? data[0] : a
            ))
          }
        }
      } else {
        const { error } = await supabase
          .from('competition_participants')
          .delete()
          .eq('participant_id', participantId)
          .eq('competition_id', competitionId)

        if (error) throw error
      }
    } catch (err) {
      console.error("Sync error:", err)
      showToast(`Failed to sync assignment: ${err.message}`)
      // Revert optimistic update
      if (isAdding) {
        setAssignments(prev => prev.filter(a => !(a.participant_id === participantId && a.competition_id === competitionId)))
      } else {
        await fetchAll()
      }
    } finally {
      // Remove from in-flight tracker after a brief settling delay to prevent race conditions with Supabase DB lag
      setTimeout(() => {
        delete inFlightUpdatesRef.current[key]
      }, 1000)
    }

    // Keep input focused so mobile keyboard doesn't close
    if (wasInputFocused) {
      setTimeout(() => {
        activeInput.focus()
      }, 50)
    }
  }

  function isAssigned(participantId, competitionId) {
    return assignments.some(
      a => a.participant_id === participantId && a.competition_id === competitionId
    )
  }

  function isTimeWindowAllowed() {
    const now = new Date()
    if (regStartTime) {
      const start = new Date(regStartTime)
      if (now < start) return false
    }
    if (regEndTime) {
      const end = new Date(regEndTime)
      if (now > end) return false
    }
    return true
  }

  function getEffectiveCanAssign(categoryId) {
    if (!categoryId) {
      return canAssign && isTimeWindowAllowed()
    }
    // 1. Check team-specific override first
    const teamPerms = teamCategoryPerms[user?.teamId]
    if (teamPerms && teamPerms[categoryId]) {
      if (teamPerms[categoryId] === 'unlocked') return true
      if (teamPerms[categoryId] === 'locked') return false
    }

    // 2. No override, check global
    if (!canAssign) return false
    if (!isTimeWindowAllowed()) return false
    if (globalLockedCats.includes(categoryId)) return false

    return true
  }

  function isAssignmentAllowed(participant, competition) {
    if (!participant || !competition) return false

    const isGeneral = competition.categories?.is_general === true || competition.categories?.is_general === 'true'

    if (isGeneral) {
      return getEffectiveCanAssign(competition.category_id) || getEffectiveCanAssign(participant.category_id)
    } else {
      return getEffectiveCanAssign(competition.category_id) && getEffectiveCanAssign(participant.category_id)
    }
  }

  const renderStatusBadge = (rawSt) => {
    let st = rawSt || 'Pending'
    if (st === 'Published' || st === 'Judged') st = 'Completed' // Hide "Judged" as requested

    const styleMap = {
      Completed: { color: '#2ed573', bg: 'rgba(46, 213, 115, 0.15)' },
      Ended: { color: '#ff5252', bg: 'rgba(255, 82, 82, 0.15)' },
      Ongoing: { color: '#f59f00', bg: 'rgba(245, 159, 0, 0.15)' },
      Scheduled: { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
      Pending: { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.05)' }
    }

    const { color, bg } = styleMap[st] || styleMap.Pending

    return (
      <span style={{ display: 'inline-flex', fontSize: 10, padding: '3px 8px', borderRadius: 4, background: bg, color: color, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {st}
      </span>
    )
  }

  const formatDateTime = (str) => {
    if (!str) return ''
    return new Date(str).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const handleDownloadParticipantsPDF = () => {
    try {
      const doc = new jsPDF()
      const teamTitle = user?.username || 'Team'

      let y = 26
      let currentPage = 1

      const drawHeader = (pageNumber) => {
        doc.setFillColor(15, 23, 42)
        doc.rect(0, 0, 210, 12, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(`${teamTitle.toUpperCase()} - TEAM PARTICIPANTS ROSTER`, 14, 8.5)

        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}  |  Page ${pageNumber}`, 196, 8.5, { align: 'right' })
      }

      const drawSubHeader = () => {
        doc.setFillColor(248, 250, 252)
        doc.setDrawColor(226, 232, 240)
        doc.rect(14, 14, 182, 5, 'F')

        doc.setTextColor(30, 41, 59)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        doc.text(`Total Participants: ${participants.length}   |   Total Event Registrations: ${assignments.length}`, 17, 17.5)

        doc.setFillColor(30, 41, 59)
        doc.rect(14, 20, 182, 5, 'F')
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text('#', 16, 23.5)
        doc.text('PARTICIPANT NAME', 24, 23.5)
        doc.text('CHESS #', 84, 23.5)
        doc.text('CATEGORY', 106, 23.5)
        doc.text('ASSIGNED COMPETITIONS', 138, 23.5)
      }

      drawHeader(1)
      drawSubHeader()

      y = 26

      participants.forEach((p, idx) => {
        const pAssigns = assignments.filter(a => a.participant_id === p.id)
        const regularCompNames = []
        const generalCompNames = []
        let genCatName = ''

        pAssigns.forEach(a => {
          const c = competitions.find(comp => comp.id === a.competition_id)
          if (!c) return
          const isGen = c.categories?.is_general === true || c.categories?.is_general === 'true'
          const isGroup = c.is_group === true || c.is_group === 'true'
          const itemLabel = `• ${c.name}${isGroup ? ' (Group)' : ''}`

          if (isGen) {
            if (!genCatName && c.categories?.name) {
              genCatName = c.categories.name
            }
            generalCompNames.push(itemLabel)
          } else {
            regularCompNames.push(itemLabel)
          }
        })

        const finalGenHeader = genCatName ? `--- ${genCatName} ---` : '--- General ---'

        let compText = ''
        if (regularCompNames.length > 0 && generalCompNames.length > 0) {
          compText = regularCompNames.join('\n') + `\n${finalGenHeader}\n` + generalCompNames.join('\n')
        } else if (regularCompNames.length > 0) {
          compText = regularCompNames.join('\n')
        } else if (generalCompNames.length > 0) {
          compText = `${finalGenHeader}\n` + generalCompNames.join('\n')
        } else {
          compText = 'None'
        }

        const compLines = doc.splitTextToSize(compText, 56)
        const rowHeight = Math.max(6.5, compLines.length * 3.4 + 3.0)

        if (y + rowHeight > 288) {
          doc.addPage()
          currentPage++
          drawHeader(currentPage)
          drawSubHeader()
          y = 26
        }

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252)
          doc.rect(14, y, 182, rowHeight, 'F')
        }

        doc.setTextColor(30, 41, 59)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        doc.text(String(idx + 1), 16, y + 3.5)

        const safeName = p.name ? (p.name.length > 28 ? p.name.substring(0, 26) + '...' : p.name) : ''
        doc.text(safeName, 24, y + 3.5)
        doc.setFont('helvetica', 'normal')
        doc.text(p.chess_number ? `#${p.chess_number}` : '—', 84, y + 3.5)
        doc.text(p.categories?.name || '—', 106, y + 3.5)

        doc.text(compLines, 138, y + 3.5)

        y += rowHeight

        // Horizontal Line Separator
        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.15)
        doc.line(14, y, 196, y)
        y += 0.4
      })

      if (y + 14 > 288) {
        doc.addPage()
        currentPage++
        drawHeader(currentPage)
        y = 16
      } else {
        y += 4
      }

      doc.setDrawColor(203, 213, 225)
      doc.setLineWidth(0.3)
      doc.line(14, y, 196, y)
      y += 6

      doc.setFontSize(7.5)
      doc.setTextColor(100, 116, 139)
      doc.text('Team Leader Signature: _______________________', 14, y)
      doc.text('Official Verification: _______________________', 120, y)

      doc.save(`${teamTitle.replace(/\s+/g, '_')}_Participants_Roster.pdf`)
    } catch (err) {
      console.error('Failed to generate Participants PDF:', err)
    }
  }

  const handleDownloadCompetitionsPDF = () => {
    try {
      const doc = new jsPDF()
      const teamTitle = user?.username || 'Team'

      let y = 26
      let currentPage = 1

      const drawHeader = (pageNumber) => {
        doc.setFillColor(15, 23, 42)
        doc.rect(0, 0, 210, 12, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(`${teamTitle.toUpperCase()} - COMPETITIONS REPORT`, 14, 8.5)

        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}  |  Page ${pageNumber}`, 196, 8.5, { align: 'right' })
      }

      const registeredCount = competitions.filter(c => assignments.some(a => a.competition_id === c.id)).length

      const drawSubHeader = () => {
        doc.setFillColor(248, 250, 252)
        doc.setDrawColor(226, 232, 240)
        doc.rect(14, 14, 182, 5, 'F')

        doc.setTextColor(30, 41, 59)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        doc.text(`Total Competitions: ${competitions.length}   |   Registered: ${registeredCount}   |   Total Registrations: ${assignments.length}`, 17, 17.5)

        doc.setFillColor(30, 41, 59)
        doc.rect(14, 20, 182, 5, 'F')
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text('#', 16, 23.5)
        doc.text('COMPETITION NAME', 24, 23.5)
        doc.text('CATEGORY', 88, 23.5)
        doc.text('TYPE', 125, 23.5)
        doc.text('ASSIGNED PARTICIPANTS', 148, 23.5)
      }

      drawHeader(1)
      drawSubHeader()

      y = 26

      if (competitions.length === 0) {
        doc.setTextColor(100, 116, 139)
        doc.setFont('helvetica', 'italic')
        doc.text('No competitions available.', 16, y + 4)
        y += 8
      } else {
        competitions.forEach((comp, idx) => {
          const compAssigns = assignments.filter(a => a.competition_id === comp.id)
          const partNamesArr = compAssigns.map(a => {
            const p = participants.find(part => part.id === a.participant_id)
            return p ? `${p.name}${p.chess_number ? ` (#${p.chess_number})` : ''}` : null
          }).filter(Boolean)

          const partText = partNamesArr.length > 0 ? partNamesArr.map(n => `• ${n}`).join('\n') : '— None —'
          const partLines = doc.splitTextToSize(partText, 46)
          const rowHeight = Math.max(6.5, partLines.length * 3.4 + 3.0)

          if (y + rowHeight > 288) {
            doc.addPage()
            currentPage++
            drawHeader(currentPage)
            drawSubHeader()
            y = 26
          }

          if (idx % 2 === 1) {
            doc.setFillColor(248, 250, 252)
            doc.rect(14, y, 182, rowHeight, 'F')
          }

          doc.setTextColor(30, 41, 59)
          doc.setFontSize(7.5)
          doc.setFont('helvetica', 'bold')
          doc.text(String(idx + 1), 16, y + 3.5)

          const isGroup = comp.is_group === true || comp.is_group === 'true'
          const rawName = `${comp.name}${isGroup ? ' (Group)' : ''}`
          const safeCompName = rawName.length > 32 ? rawName.substring(0, 30) + '...' : rawName
          doc.text(safeCompName, 24, y + 3.5)
          doc.setFont('helvetica', 'normal')
          doc.text(comp.categories?.name || '—', 88, y + 3.5)
          doc.text(comp.is_stage ? 'Stage' : 'Offstage', 125, y + 3.5)

          if (partNamesArr.length === 0) {
            doc.setTextColor(148, 163, 184)
            doc.setFont('helvetica', 'italic')
          }
          doc.text(partLines, 148, y + 3.5)

          y += rowHeight

          // Horizontal Line Separator
          doc.setDrawColor(226, 232, 240)
          doc.setLineWidth(0.15)
          doc.line(14, y, 196, y)
          y += 0.4
        })
      }

      if (y + 14 > 288) {
        doc.addPage()
        currentPage++
        drawHeader(currentPage)
        y = 16
      } else {
        y += 4
      }

      doc.setDrawColor(203, 213, 225)
      doc.setLineWidth(0.3)
      doc.line(14, y, 196, y)
      y += 6

      doc.setFontSize(7.5)
      doc.setTextColor(100, 116, 139)
      doc.text('Team Leader Signature: _______________________', 14, y)
      doc.text('Official Verification: _______________________', 120, y)

      doc.save(`${teamTitle.replace(/\s+/g, '_')}_Competitions_Report.pdf`)
    } catch (err) {
      console.error('Failed to generate Competitions PDF:', err)
    }
  }

  return (
    <div className="team-dashboard">
      {/* Top Bar */}
      <div className="team-topbar">
        <div className="team-topbar-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/inspico-logo.svg" alt="Inspico Logo" style={{ height: 20, width: 20, filter: 'brightness(0) invert(1)', flexShrink: 0 }} />
            <img src="/inspico.svg" alt="Inspico" style={{ height: 15, maxWidth: 90 }} />
          </div>
          <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />
          <span className="team-topbar-name">{user?.username}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HeaderInstallButton />
          <button className="team-logout-btn" onClick={() => setShowSignoutConfirm(true)}>Sign Out</button>
        </div>
      </div>

      {/* Warning banner if assignment permissions are locked */}
      {(() => {
        if (!canAssign) {
          return (
            <div className="lock-banner">
              <span style={{ fontSize: 13 }}>🔒</span>
              <span className="lock-banner-text">Registration is locked by the administrator.</span>
            </div>
          )
        }
        const now = new Date()
        if (regStartTime) {
          const start = new Date(regStartTime)
          if (now < start) {
            return (
              <div className="lock-banner" style={{ background: 'rgba(249, 115, 22, 0.15)', borderColor: 'rgba(249, 115, 22, 0.3)', color: '#f97316' }}>
                <span style={{ fontSize: 13 }}>🕒</span>
                <span className="lock-banner-text">Registration is not open yet. Will open on {formatDateTime(regStartTime)}.</span>
              </div>
            )
          }
        }
        if (regEndTime) {
          const end = new Date(regEndTime)
          if (now > end) {
            return (
              <div className="lock-banner" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                <span style={{ fontSize: 13 }}>🔒</span>
                <span className="lock-banner-text">Registration deadline has passed ({formatDateTime(regEndTime)}).</span>
              </div>
            )
          }
        }
        return null
      })()}

      {/* Tabs */}
      <div className="team-tabs">
        <button className={`team-tab ${tab === 'participants' ? 'active' : ''}`} onClick={() => setTab('participants')}>
          Participants {participants.length > 0 && `(${participants.length})`}
        </button>
        <button className={`team-tab ${tab === 'competitions' ? 'active' : ''}`} onClick={() => setTab('competitions')}>
          Competitions {competitions.length > 0 && `(${competitions.length})`}
        </button>
        <button className={`team-tab ${tab === 'schedule' ? 'active' : ''}`} onClick={() => setTab('schedule')}>
          Schedule
        </button>
      </div>

      {/* Content */}
      <div className="team-content">
        {loading ? (
          <div className="team-loading">
            <div className="spin" style={{ width: 24, height: 24, borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-light)', borderRadius: '50%', borderWidth: 2, borderStyle: 'solid', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : tab === 'schedule' ? (
          <PublicSchedule />
        ) : tab === 'participants' ? (
          <>
            <div className="team-section-header">
              <span className="team-section-title">Team Members</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  style={{
                    background: 'rgba(79, 156, 249, 0.1)',
                    border: '1px solid rgba(79, 156, 249, 0.3)',
                    color: 'var(--accent)',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onClick={handleDownloadParticipantsPDF}
                  title="Download Official Participants List PDF"
                >
                  <IconDownload /> Export Participants PDF
                </button>
                <span className="team-section-count">{participants.length} total</span>
              </div>
            </div>
            {participants.length > 0 && (
              <div className="team-search-sticky-container">
                <div className="team-search-wrap">
                  <IconSearch />
                  <input
                    className="team-search-input"
                    type="text"
                    placeholder="Search participants by name, category, or chess #..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }} onClick={() => setSearch('')}>✕</button>
                  )}
                </div>
              </div>
            )}
            {participants.length === 0 ? (
              <div className="team-empty">
                <IconUser />
                <p>No participants registered<br />for your team yet.</p>
              </div>
            ) : (
              <div className="team-card-list">
                {participants
                  .filter(p =>
                    !search ||
                    p.name.toLowerCase().includes(search.toLowerCase()) ||
                    (p.chess_number && p.chess_number.toString().includes(search)) ||
                    (p.categories?.name && p.categories.name.toLowerCase().includes(search.toLowerCase()))
                  )
                    .map(p => {
                      const userAssigns = assignments.filter(a => a.participant_id === p.id)
                      let stageCount = 0
                      let offstageCount = 0
                      let generalCount = 0
                      let generalCatName = ''

                      userAssigns.forEach(a => {
                        const comp = competitions.find(c => c.id === a.competition_id)
                        if (!comp) return
                        const isGen = comp.categories?.is_general === true || comp.categories?.is_general === 'true'
                        if (isGen) {
                          generalCount++
                          if (!generalCatName && comp.categories?.name) {
                            generalCatName = comp.categories.name
                          }
                        } else if (comp.is_stage) {
                          stageCount++
                        } else {
                          offstageCount++
                        }
                      })

                      return (
                        <div key={p.id} className="team-card" onClick={() => setActiveParticipant(p)}>
                          <div className="team-card-body">
                            <div className="team-card-name">
                              {p.name}
                              {p.chess_number && (
                                <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 400, marginLeft: 6 }}>
                                  #{p.chess_number}
                                </span>
                              )}
                            </div>
                            <div className="team-card-meta">
                              {p.categories?.name && (
                                <span className="team-card-badge">{p.categories.name}</span>
                              )}
                              {offstageCount > 0 && (
                                <span className="team-card-badge dim">{offstageCount} Off-stage</span>
                              )}
                              {stageCount > 0 && (
                                <span className="team-card-badge dim">{stageCount} Stage</span>
                              )}
                              {generalCount > 0 && (
                                <span className="team-card-badge general">
                                  {generalCount} {generalCatName || 'General'}
                                </span>
                              )}
                              {userAssigns.length === 0 && (
                                <span className="team-card-badge dim">0 Assigned</span>
                              )}
                            </div>
                          </div>
                          <span className="team-card-chess" style={{ color: 'var(--accent-light)', fontSize: 10 }}>
                            {canAssign ? 'Tap to Assign' : 'View Detail'}
                          </span>
                        </div>
                      )
                    })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="team-section-header">
              <span className="team-section-title">All Competitions</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  style={{
                    background: 'rgba(79, 156, 249, 0.1)',
                    border: '1px solid rgba(79, 156, 249, 0.3)',
                    color: 'var(--accent)',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onClick={handleDownloadCompetitionsPDF}
                  title="Download Official Competitions Report PDF"
                >
                  <IconDownload /> Export Competitions PDF
                </button>
                <span className="team-section-count">{competitions.length} total</span>
              </div>
            </div>
            {competitions.length > 0 && (
              <div className="team-search-sticky-container">
                <div className="team-search-wrap">
                  <IconSearch />
                  <input
                    className="team-search-input"
                    type="text"
                    placeholder="Search competitions by name or category..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }} onClick={() => setSearch('')}>✕</button>
                  )}
                </div>
              </div>
            )}
            {competitions.length === 0 ? (
              <div className="team-empty">
                <IconTrophy />
                <p>No competitions matching your categories.</p>
              </div>
            ) : (
              <div style={{ padding: '0 0 20px' }}>
                {competitions
                  .filter(c =>
                    !search ||
                    c.name.toLowerCase().includes(search.toLowerCase()) ||
                    (c.categories?.name && c.categories.name.toLowerCase().includes(search.toLowerCase()))
                  )
                  .map(comp => {
                    const assignedTeamParts = participants.filter(p => isAssigned(p.id, comp.id))
                    const isLocked = !getEffectiveCanAssign(comp.category_id)
                    return (
                      <div key={comp.id} className="comp-card" onClick={() => setActiveCompetition(comp)}>
                        <div className="comp-card-name" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span>{comp.name}</span>
                          {(comp.rules_description || comp.rules_duration || comp.mark_criteria) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setViewingRules(comp); }}
                              style={{
                                background: 'rgba(184, 25, 60, 0.12)',
                                border: '1px solid rgba(184, 25, 60, 0.3)',
                                color: '#e07c7c',
                                fontSize: '10px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontFamily: 'inherit',
                                flexShrink: 0
                              }}
                            >
                              📜 നിയമാവലി
                            </button>
                          )}
                        </div>
                        <div className="comp-card-meta">
                          {comp.categories?.name && (
                            <span className={`team-card-badge ${comp.categories.is_general === true || comp.categories.is_general === 'true' ? 'general' : ''}`}>
                              {comp.categories.name}
                            </span>
                          )}
                          <span className="team-card-badge dim">{comp.is_stage ? 'Stage' : 'Off-stage'}</span>
                          {comp.is_group && <span className="team-card-badge dim">Group</span>}
                          {isLocked && (
                            <span className="team-card-badge dim" style={{ color: '#ff4757', border: '1px solid rgba(255, 71, 87, 0.3)', background: 'rgba(255, 71, 87, 0.08)' }}>
                              🔒 Locked
                            </span>
                          )}
                          {renderStatusBadge(comp.status)}
                          <span className="team-card-badge dim" style={{ marginLeft: 'auto' }}>
                            {comp.is_group ? `Group Size: ${comp.group_size}` : `Max: ${comp.max_participants}`}
                          </span>
                        </div>
                        
                        <div className="comp-card-participants">
                          <p className="comp-card-parts-label">
                            Your Team Assigned ({assignedTeamParts.length})
                          </p>
                          {assignedTeamParts.length === 0 ? (
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>None assigned. Tap to view.</p>
                          ) : (
                            assignedTeamParts.map(p => (
                              <div key={p.id} className="comp-part-row">
                                <span className="comp-part-name">{p.name}</span>
                                <span className="comp-part-chess">{p.chess_number || '#—'}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Drawer: Participant Detail (Assign to Competitions) ── */}
      {activeParticipant && (
        <div 
          className="drawer-backdrop" 
          onClick={closeDrawer}
          style={{
            opacity: currentY > 0 ? Math.max(0, 1 - currentY / 350) : '',
            transition: dragging ? 'none' : 'opacity 0.25s ease-out'
          }}
        >
          <div 
            className="drawer-container" 
            onClick={e => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ 
              transform: currentY > 0 ? `translateY(${currentY}px)` : '',
              transition: dragging ? 'none' : 'transform 0.3s ease-out'
            }}
          >
            {/* Drag Handle */}
            <div className="drawer-drag-handle" />

            <div className="drawer-header">
              <div className="drawer-header-info">
                <span className="drawer-subtitle">Participant Category: {activeParticipant.categories?.name || 'None'}</span>
                <span className="drawer-title">{activeParticipant.name}</span>
              </div>
              <button className="drawer-close" onClick={closeDrawer}>✕</button>
            </div>
            <div className="drawer-body">
              <p className="team-section-title" style={{ marginBottom: 12 }}>
                {canAssign ? 'Assign Competitions' : 'Assigned Competitions'}
              </p>
              
              {!getEffectiveCanAssign(activeParticipant.category_id) && (
                <div style={{ margin: '0 0 16px 0', padding: '10px 12px', background: 'rgba(255, 71, 87, 0.08)', border: '1px solid rgba(255, 71, 87, 0.2)', color: '#ff4757', borderRadius: 8, fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14, lineHeight: 1 }}>🔒</span>
                  <span style={{ lineHeight: 1.4 }}>Modifications are locked for this category. You can only view existing assignments.</span>
                </div>
              )}
              
              {/* Drawer Search Input */}
              <div className="drawer-search-sticky-container">
                <div className="team-search-wrap" style={{ margin: 0 }}>
                  <IconSearch />
                  <input
                    className="team-search-input"
                    type="text"
                    placeholder="Search competitions..."
                    value={drawerSearch}
                    onChange={e => setDrawerSearch(e.target.value)}
                  />
                  {drawerSearch && (
                    <button 
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }} 
                      onMouseDown={e => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        setDrawerSearch('');
                        const container = e.currentTarget.closest('.team-search-wrap');
                        const input = container?.querySelector('input');
                        if (input) input.focus();
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {drawerItems.length === 0 ? (
                <div className="team-empty" style={{ padding: '20px 0' }}>
                  <IconTrophy />
                  <p>No competitions found for this category.</p>
                </div>
              ) : (
                drawerItems
                  .filter(c => 
                    !drawerSearch || 
                    c.name.toLowerCase().includes(drawerSearch.toLowerCase()) ||
                    (c.categories?.name && c.categories.name.toLowerCase().includes(drawerSearch.toLowerCase()))
                  )
                  .filter(comp => {
                    const active = isAssigned(activeParticipant.id, comp.id)
                    const canAssignThisComp = isAssignmentAllowed(activeParticipant, comp)
                    if (!canAssignThisComp && !active) return false
                    return true
                  })
                  .map(comp => {
                    const active = isAssigned(activeParticipant.id, comp.id)
                    const canAssignThisComp = isAssignmentAllowed(activeParticipant, comp)
                    return (
                      <div key={comp.id} className="drawer-item-row">
                        <div className="drawer-item-info">
                          <span className="drawer-item-title">{comp.name}</span>
                          <div className="drawer-item-meta">
                            {comp.categories?.name && (
                              <span className={`team-card-badge ${comp.categories.is_general === true || comp.categories.is_general === 'true' ? 'general' : ''}`}>
                                {comp.categories.name}
                              </span>
                            )}
                            <span className="team-card-badge dim">{comp.is_stage ? 'Stage' : 'Off-stage'}</span>
                            {comp.is_group && <span className="team-card-badge dim">Group</span>}
                            <span className="team-card-badge dim">
                              {comp.is_group ? `Group Size: ${comp.group_size}` : `Max: ${comp.max_participants}`}
                            </span>
                          </div>
                          {comp.is_group && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--accent-light)', marginTop: 4, fontStyle: 'italic' }}>
                              <IconInfo style={{ width: 11, height: 11 }} />
                              <span>Group Event (Assign only 1 member from team)</span>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          {!canAssignThisComp ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {comp.status !== 'Pending' && comp.status !== 'Scheduled' && (
                                attendance.some(a => a.participant_id === activeParticipant.id && a.competition_id === comp.id)
                                  ? <span style={{ fontSize: 10, color: '#2ed573', fontWeight: 700, padding: '2px 4px', background: 'rgba(46, 213, 115, 0.1)', borderRadius: 4 }}>✅ ATTENDED</span>
                                  : <span style={{ fontSize: 10, color: '#ff4757', fontWeight: 700, padding: '2px 4px', background: 'rgba(255, 71, 87, 0.1)', borderRadius: 4 }}>❌ ABSENT</span>
                              )}
                              {renderStatusBadge(comp.status)}
                            </div>
                          ) : (
                            <button
                              className={`btn-toggle-assign ${active ? 'active' : ''}`}
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => toggleAssignment(activeParticipant.id, comp.id)}
                            >
                              {active ? 'Assigned' : 'Assign'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Drawer: Competition Detail (Assign Participants) ── */}
      {activeCompetition && (
        <div 
          className="drawer-backdrop" 
          onClick={closeDrawer}
          style={{
            opacity: currentY > 0 ? Math.max(0, 1 - currentY / 350) : '',
            transition: dragging ? 'none' : 'opacity 0.25s ease-out'
          }}
        >
          <div 
            className="drawer-container" 
            onClick={e => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ 
              transform: currentY > 0 ? `translateY(${currentY}px)` : '',
              transition: dragging ? 'none' : 'transform 0.3s ease-out'
            }}
          >
            {/* Drag Handle */}
            <div className="drawer-drag-handle" />

            <div className="drawer-header">
              <div className="drawer-header-info">
                <span className="drawer-subtitle">Competition Category: {activeCompetition.categories?.name || 'None'}</span>
                <span className="drawer-title">{activeCompetition.name}</span>
              </div>
              <button className="drawer-close" onClick={closeDrawer}>✕</button>
            </div>
            <div className="drawer-body">
              <p className="team-section-title" style={{ marginBottom: 12 }}>
                {canAssign ? 'Assign Eligible Members' : 'Assigned Team Members'}
              </p>

              {!getEffectiveCanAssign(activeCompetition.category_id) && (
                <div style={{ margin: '0 0 16px 0', padding: '10px 12px', background: 'rgba(255, 71, 87, 0.08)', border: '1px solid rgba(255, 71, 87, 0.2)', color: '#ff4757', borderRadius: 8, fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14, lineHeight: 1 }}>🔒</span>
                  <span style={{ lineHeight: 1.4 }}>Modifications are locked for this competition. You can only view existing assignments.</span>
                </div>
              )}

              {activeCompetition.is_group && (
                <div style={{ 
                  background: 'rgba(79, 156, 249, 0.08)', 
                  border: '1px solid rgba(79, 156, 249, 0.2)', 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  fontSize: '11px', 
                  color: 'var(--accent-light)', 
                  marginBottom: '14px', 
                  lineHeight: '1.4',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <IconInfo style={{ width: 14, height: 14, color: 'var(--accent-light)' }} />
                  <span>Group Event (Size: {activeCompetition.group_size}). Assign exactly 1 representative/leader from your team.</span>
                </div>
              )}

              {/* Drawer Search Input */}
              <div className="drawer-search-sticky-container">
                <div className="team-search-wrap" style={{ margin: 0 }}>
                  <IconSearch />
                  <input
                    className="team-search-input"
                    type="text"
                    placeholder="Search eligible members..."
                    value={drawerSearch}
                    onChange={e => setDrawerSearch(e.target.value)}
                  />
                  {drawerSearch && (
                    <button 
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }} 
                      onMouseDown={e => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        setDrawerSearch('');
                        const container = e.currentTarget.closest('.team-search-wrap');
                        const input = container?.querySelector('input');
                        if (input) input.focus();
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {(() => {
                const eligibleParts = drawerItems
                  .filter(p => 
                    !drawerSearch ||
                    p.name.toLowerCase().includes(drawerSearch.toLowerCase()) ||
                    (p.chess_number && p.chess_number.toString().includes(drawerSearch)) ||
                    (p.categories?.name && p.categories.name.toLowerCase().includes(drawerSearch.toLowerCase()))
                  )
                  .filter(p => {
                    const active = isAssigned(p.id, activeCompetition.id)
                    const canAssignThis = isAssignmentAllowed(p, activeCompetition)
                    if (!canAssignThis && !active) return false
                    return true
                  })

                if (drawerItems.length === 0) {
                  return (
                    <div className="team-empty" style={{ padding: '20px 0' }}>
                      <IconUser />
                      <p>No team participants registered in this category.</p>
                    </div>
                  )
                }
                if (eligibleParts.length === 0) {
                  return (
                    <div className="team-empty" style={{ padding: '20px 0' }}>
                      <IconSearch />
                      <p>No matching members found.</p>
                    </div>
                  )
                }
                return eligibleParts.map(p => {
                  const active = isAssigned(p.id, activeCompetition.id)
                  const canAssignThis = isAssignmentAllowed(p, activeCompetition)
                  return (
                    <div key={p.id} className="drawer-item-row">
                      <div className="drawer-item-info">
                        <span className="drawer-item-title">{p.name}</span>
                        <div className="drawer-item-meta">
                          {p.categories?.name && <span className="team-card-badge dim">{p.categories.name}</span>}
                          {p.chess_number && <span className="team-card-badge dim">#{p.chess_number}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        {!canAssignThis ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {activeCompetition.status !== 'Pending' && activeCompetition.status !== 'Scheduled' && (
                              attendance.some(a => a.participant_id === p.id && a.competition_id === activeCompetition.id)
                                ? <span style={{ fontSize: 10, color: '#2ed573', fontWeight: 700, padding: '2px 4px', background: 'rgba(46, 213, 115, 0.1)', borderRadius: 4 }}>✅ ATTENDED</span>
                                : <span style={{ fontSize: 10, color: '#ff4757', fontWeight: 700, padding: '2px 4px', background: 'rgba(255, 71, 87, 0.1)', borderRadius: 4 }}>❌ ABSENT</span>
                            )}
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Assigned</span>
                          </div>
                        ) : (
                          <button
                            className={`btn-toggle-assign ${active ? 'active' : ''}`}
                            onClick={() => toggleAssignment(p.id, activeCompetition.id)}
                          >
                            {active ? 'Assigned' : 'Assign'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Sign Out Confirmation Overlay Dialog ── */}
      {showSignoutConfirm && (
        <div className="confirm-backdrop" onClick={() => setShowSignoutConfirm(false)}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <p className="confirm-title">Confirm Sign Out</p>
            <p className="confirm-desc">Are you sure you want to log out of your team dashboard?</p>
            <div className="confirm-actions">
              <button className="btn-confirm-no" onClick={() => setShowSignoutConfirm(false)}>Cancel</button>
              <button className="btn-confirm-yes" onClick={logout}>Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rules View Modal Popup ── */}
      {viewingRules && (
        <div className="confirm-backdrop" onClick={() => setViewingRules(null)}>
          <div className="confirm-box" style={{ maxWidth: 520, width: '92%', padding: 20, textAlign: 'left' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--accent-light)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>മത്സര നിയമാവലി</span>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>
                  📜 {viewingRules.name}
                </h3>
              </div>
              <button className="btn-cancel-edit" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setViewingRules(null)}>✕ Close</button>
            </div>

            {(() => {
              const desc = viewingRules.rules_description
              const duration = viewingRules.rules_duration
              const criteria = []
              if (viewingRules.mark_criteria) {
                viewingRules.mark_criteria.split(',').forEach(item => {
                  const parts = item.split(/[:=]/)
                  if (parts.length >= 2) {
                    criteria.push({ label: parts[0].trim(), mark: parts.slice(1).join(':').trim() })
                  } else if (parts[0].trim()) {
                    criteria.push({ label: parts[0].trim(), mark: '' })
                  }
                })
              }
              const totalMarks = criteria.reduce((sum, item) => sum + (parseFloat(item.mark) || 0), 0)

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
                  {(duration || totalMarks > 0) && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {duration && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent-dim)', border: '1px solid var(--border-subtle)', color: 'var(--accent-light)', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                          <span>⏱️ സമയം:</span> <span>{duration}</span>
                        </div>
                      )}
                      {totalMarks > 0 && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(46, 213, 115, 0.12)', border: '1px solid rgba(46, 213, 115, 0.3)', color: '#2ed573', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                          <span>🎯 ആകെ മാർക്ക്:</span> <span>{totalMarks}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {desc && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: '4px solid var(--accent)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-line'
                    }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>വിശദീകരണം / Topic</p>
                      {desc}
                    </div>
                  )}

                  {criteria.length > 0 && (
                    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                        മാർക്ക് വിഭജനം (Evaluation Criteria)
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)', fontSize: 11, textAlign: 'left' }}>
                            <th style={{ padding: '6px 12px' }}>വിഷയം / Section</th>
                            <th style={{ padding: '6px 12px', width: 100, textAlign: 'right' }}>മാർക്ക്</th>
                          </tr>
                        </thead>
                        <tbody>
                          {criteria.map((item, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '8px 12px', color: 'var(--text-primary)', fontWeight: 500 }}>{item.label || '—'}</td>
                              <td style={{ padding: '8px 12px', color: 'var(--accent-light)', fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                {item.mark ? `${item.mark} മാർക്ക്` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close-btn" onClick={() => setToast(null)}>✕</button>
        </div>
      )}
    </div>
  )
}
