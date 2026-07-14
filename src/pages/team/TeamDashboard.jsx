// src/pages/team/TeamDashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import './TeamDashboard.css'

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconTrophy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
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
  const [loading, setLoading] = useState(true)

  // Permissions state
  const [canAssign, setCanAssign] = useState(true)

  // Drawer & dialog states
  const [activeParticipant, setActiveParticipant] = useState(null)
  const [activeCompetition, setActiveCompetition] = useState(null)
  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Handle hardware/browser back swipe to close drawers instead of exiting app
  useEffect(() => {
    const handlePopState = (e) => {
      if (activeParticipant || activeCompetition) {
        setActiveParticipant(null);
        setActiveCompetition(null);
      }
    };
    if (activeParticipant || activeCompetition) {
      window.history.pushState({ type: 'team-detail' }, '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeParticipant, activeCompetition]);

  useEffect(() => {
    if (!user?.teamId) return
    fetchAll()

    // Realtime changes listener
    const ch = supabase
      .channel('team-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_participants' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `id=eq.${user.teamId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchAll)
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [user?.teamId])

  async function fetchAll() {
    if (!user?.teamId) return
    
    // 1. Fetch team settings & permissions
    const [{ data: teamData }, { data: settingData }] = await Promise.all([
      supabase.from('teams').select('can_assign').eq('id', user.teamId).single(),
      supabase.from('settings').select('value').eq('key', 'global_assign').single()
    ])

    const teamAllowed = teamData ? teamData.can_assign !== false : true
    const globalAllowed = settingData ? (settingData.value === true || settingData.value === 'true') : true
    setCanAssign(teamAllowed && globalAllowed)

    // 2. Fetch team participants
    const { data: parts } = await supabase
      .from('participants')
      .select('id, name, chess_number, category_id, categories(name)')
      .eq('team_id', user.teamId)
      .order('name')

    const pList = parts || []
    const pIds = pList.map(p => p.id)

    // 3. Fetch all competitions
    const { data: comps } = await supabase
      .from('competitions')
      .select('id, name, category_id, max_participants, is_stage, is_group, categories(name)')
      .order('name')

    // 4. Fetch assignments for this team's participants
    let assigns = []
    if (pIds.length > 0) {
      const { data: cp } = await supabase
        .from('competition_participants')
        .select('id, competition_id, participant_id')
        .in('participant_id', pIds)
      assigns = cp || []
    }

    // Filter competitions list to categories matching registered participants
    const teamCategoryIds = new Set(pList.map(p => p.category_id).filter(Boolean))
    const filteredComps = (comps || []).filter(c => teamCategoryIds.has(c.category_id))

    setParticipants(pList)
    setCompetitions(filteredComps)
    setAssignments(assigns)
    setLoading(false)
  }

  async function toggleAssignment(participantId, competitionId) {
    if (!canAssign || actionLoading) return
    setActionLoading(true)

    const existing = assignments.find(
      a => a.participant_id === participantId && a.competition_id === competitionId
    )

    if (existing) {
      await supabase.from('competition_participants').delete().eq('id', existing.id)
    } else {
      await supabase.from('competition_participants').insert([{ participant_id: participantId, competition_id: competitionId }])
    }

    await fetchAll()
    setActionLoading(false)
  }

  function isAssigned(participantId, competitionId) {
    return assignments.some(
      a => a.participant_id === participantId && a.competition_id === competitionId
    )
  }

  return (
    <div className="team-dashboard">
      {/* Top Bar */}
      <div className="team-topbar">
        <div className="team-topbar-brand">
          <span className="team-topbar-label">ART GALLERY</span>
          <span className="team-topbar-name">{user?.username}</span>
        </div>
        <button className="team-logout-btn" onClick={() => setShowSignoutConfirm(true)}>Sign Out</button>
      </div>

      {/* Warning banner if assignment permissions are locked */}
      {!canAssign && (
        <div className="lock-banner">
          <span style={{ fontSize: 13 }}>🔒</span>
          <span className="lock-banner-text">Registration is locked by the administrator.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="team-tabs">
        <button className={`team-tab ${tab === 'participants' ? 'active' : ''}`} onClick={() => setTab('participants')}>
          Participants {participants.length > 0 && `(${participants.length})`}
        </button>
        <button className={`team-tab ${tab === 'competitions' ? 'active' : ''}`} onClick={() => setTab('competitions')}>
          Competitions {competitions.length > 0 && `(${competitions.length})`}
        </button>
      </div>

      {/* Content */}
      <div className="team-content">
        {loading ? (
          <div className="team-loading">
            <div className="spin" style={{ width: 24, height: 24, borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-light)', borderRadius: '50%', borderWidth: 2, borderStyle: 'solid', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : tab === 'participants' ? (
          <>
            <div className="team-section-header">
              <span className="team-section-title">Team Members</span>
              <span className="team-section-count">{participants.length} total</span>
            </div>
            {participants.length === 0 ? (
              <div className="team-empty">
                <IconUser />
                <p>No participants registered<br />for your team yet.</p>
              </div>
            ) : (
              <div className="team-card-list">
                {participants.map(p => {
                  const assignedCount = assignments.filter(a => a.participant_id === p.id).length
                  return (
                    <div key={p.id} className="team-card" onClick={() => setActiveParticipant(p)}>
                      <div className="team-card-avatar">{initials(p.name)}</div>
                      <div className="team-card-body">
                        <div className="team-card-name">{p.name}</div>
                        <div className="team-card-meta">
                          {p.categories?.name && (
                            <span className="team-card-badge">{p.categories.name}</span>
                          )}
                          <span className="team-card-badge dim">
                            {assignedCount} {assignedCount === 1 ? 'competition' : 'competitions'}
                          </span>
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
              <span className="team-section-count">{competitions.length} total</span>
            </div>
            {competitions.length === 0 ? (
              <div className="team-empty">
                <IconTrophy />
                <p>No competitions matching your categories.</p>
              </div>
            ) : (
              <div style={{ padding: '0 0 20px' }}>
                {competitions.map(comp => {
                  const assignedTeamParts = participants.filter(p => isAssigned(p.id, comp.id))
                  return (
                    <div key={comp.id} className="comp-card" onClick={() => setActiveCompetition(comp)}>
                      <div className="comp-card-name">{comp.name}</div>
                      <div className="comp-card-meta">
                        {comp.categories?.name && (
                          <span className="team-card-badge">{comp.categories.name}</span>
                        )}
                        {comp.is_stage && <span className="team-card-badge dim">Stage</span>}
                        {comp.is_group && <span className="team-card-badge dim">Group</span>}
                        <span className="team-card-badge dim" style={{ marginLeft: 'auto' }}>
                          Max {comp.max_participants}
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
        <div className="drawer-backdrop" onClick={() => window.history.back()}>
          <div className="drawer-container" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-header-info">
                <span className="drawer-subtitle">Participant Category: {activeParticipant.categories?.name || 'None'}</span>
                <span className="drawer-title">{activeParticipant.name}</span>
              </div>
              <button className="drawer-close" onClick={() => window.history.back()}>✕</button>
            </div>
            <div className="drawer-body">
              <p className="team-section-title" style={{ marginBottom: 12 }}>
                {canAssign ? 'Assign Competitions' : 'Assigned Competitions'}
              </p>
              {competitions.filter(c => c.category_id === activeParticipant.category_id).length === 0 ? (
                <div className="team-empty" style={{ padding: '20px 0' }}>
                  <IconTrophy />
                  <p>No competitions found for this category.</p>
                </div>
              ) : (
                competitions
                  .filter(c => c.category_id === activeParticipant.category_id)
                  .map(comp => {
                    const active = isAssigned(activeParticipant.id, comp.id)
                    return (
                      <div key={comp.id} className="drawer-item-row">
                        <div className="drawer-item-info">
                          <span className="drawer-item-title">{comp.name}</span>
                          <div className="drawer-item-meta">
                            {comp.is_stage && <span className="team-card-badge dim">Stage</span>}
                            {comp.is_group && <span className="team-card-badge dim">Group</span>}
                            <span className="team-card-badge dim">Max {comp.max_participants}</span>
                          </div>
                        </div>
                        <button
                          className={`btn-toggle-assign ${active ? 'active' : ''}`}
                          onClick={() => toggleAssignment(activeParticipant.id, comp.id)}
                          disabled={actionLoading || !canAssign}
                        >
                          {active ? 'Assigned' : 'Assign'}
                        </button>
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
        <div className="drawer-backdrop" onClick={() => window.history.back()}>
          <div className="drawer-container" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-header-info">
                <span className="drawer-subtitle">Competition Category: {activeCompetition.categories?.name || 'None'}</span>
                <span className="drawer-title">{activeCompetition.name}</span>
              </div>
              <button className="drawer-close" onClick={() => window.history.back()}>✕</button>
            </div>
            <div className="drawer-body">
              <p className="team-section-title" style={{ marginBottom: 12 }}>
                {canAssign ? 'Assign Eligible Members' : 'Assigned Team Members'}
              </p>
              {participants.filter(p => p.category_id === activeCompetition.category_id).length === 0 ? (
                <div className="team-empty" style={{ padding: '20px 0' }}>
                  <IconUser />
                  <p>No team participants registered in this category.</p>
                </div>
              ) : (
                participants
                  .filter(p => p.category_id === activeCompetition.category_id)
                  .map(p => {
                    const active = isAssigned(p.id, activeCompetition.id)
                    return (
                      <div key={p.id} className="drawer-item-row">
                        <div className="drawer-item-info">
                          <span className="drawer-item-title">{p.name}</span>
                          {p.chess_number && (
                            <div className="drawer-item-meta">
                              <span className="team-card-badge dim">#{p.chess_number}</span>
                            </div>
                          )}
                        </div>
                        <button
                          className={`btn-toggle-assign ${active ? 'active' : ''}`}
                          onClick={() => toggleAssignment(p.id, activeCompetition.id)}
                          disabled={actionLoading || !canAssign}
                        >
                          {active ? 'Assigned' : 'Assign'}
                        </button>
                      </div>
                    )
                  })
              )}
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
    </div>
  )
}
