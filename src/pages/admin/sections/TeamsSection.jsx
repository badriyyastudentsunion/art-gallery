// src/pages/admin/sections/TeamsSection.jsx
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../lib/supabase'
import '../sections.css'
import BulkImporter from '../../../components/BulkImporter'

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)
const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)
const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export default function TeamsSection({ navigateTo }) {
  const [teams, setTeams] = useState(() => {
    try {
      const cached = localStorage.getItem('cache_teams')
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [fetching, setFetching] = useState(() => !teams.length)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mode, setMode] = useState('add') // 'add' | 'import'
  const [editing, setEditing] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)

  // Drill-down
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [teamParticipants, setTeamParticipants] = useState([])
  const [loadingParts, setLoadingParts] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('name') // 'name' | 'created_at' | 'can_assign'
  const [sortOrder, setSortOrder] = useState('asc') // 'asc' | 'desc'
  
  const [globalAssign, setGlobalAssign] = useState(() => {
    return localStorage.getItem('cache_global_assign') === 'true'
  })

  // Permission and locking states
  const [showGlobalRulesModal, setShowGlobalRulesModal] = useState(false)
  const [showTeamRulesModal, setShowTeamRulesModal] = useState(false)
  const [categories, setCategories] = useState([])
  const [regStartTime, setRegStartTime] = useState('')
  const [regEndTime, setRegEndTime] = useState('')
  const [globalLockedCats, setGlobalLockedCats] = useState([])
  const [teamCategoryPerms, setTeamCategoryPerms] = useState({})

  // Temp states for Global Rules modal to prevent background polling resetting values during editing
  const [tempGlobalAssign, setTempGlobalAssign] = useState(false)
  const [tempRegStartTime, setTempRegStartTime] = useState('')
  const [tempRegEndTime, setTempRegEndTime] = useState('')
  const [tempLockedCats, setTempLockedCats] = useState([])

  useEffect(() => {
    if (showGlobalRulesModal) {
      setTempGlobalAssign(globalAssign)
      setTempRegStartTime(regStartTime || '')
      setTempRegEndTime(regEndTime || '')
      setTempLockedCats(globalLockedCats || [])
    }
  }, [showGlobalRulesModal])

  const PRESET_COLORS = ['#ff4757', '#ff7f50', '#2ed573', '#1e90ff', '#a55eea', '#ff6b81', '#00d2d3', '#e056fd']

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [color, setColor] = useState('')
  const [teamColors, setTeamColors] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_team_colors') || '{}') } catch { return {} }
  })

  const TEAMS_COLS = [{ key: 'name', label: 'name' }, { key: 'password', label: 'password' }]
  const TEAMS_SAMPLE = []

  function handleExportCSV() {
    const headers = ['name', 'password']
    const rows = teams.map(t => [
      t.name || '',
      t.password || ''
    ])
    const headerLine = headers.join(',')
    const formattedRows = rows.map(row =>
      row.map(val => {
        const str = String(val ?? '')
        return str.includes(',') || str.includes('\n') || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    )
    const csvContent = [headerLine, ...formattedRows].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'teams_backup.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleBulkImport(rows) {
    let imported = 0; const errors = []
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r.name?.trim() || !r.password?.trim()) { errors.push({ row: i + 2, msg: 'name and password required' }); continue }
      const { error } = await supabase.from('teams').insert([{ name: r.name.trim(), password: r.password.trim() }])
      if (error) errors.push({ row: i + 2, msg: error.message }); else imported++
    }
    return { imported, errors }
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setBulkMode(false)
        setSelectedIds([])
        setPanelOpen(false)
        setEditing(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    fetchTeams()
    fetchSettings()
    const rand = Math.random().toString(36).substring(2, 7)
    const channel = supabase
      .channel(`realtime-teams-${rand}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => { fetchTeams(); setSelectedIds([]); })
      .subscribe()

    const channelSettings = supabase
      .channel(`realtime-settings-${rand}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, fetchSettings)
      .subscribe()

    const poll = setInterval(() => {
      fetchTeams()
      fetchSettings()
    }, 3000)

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(channelSettings)
      clearInterval(poll)
    }
  }, [])

  async function fetchSettings() {
    const [
      { data: globalData },
      { data: colData },
      { data: startData },
      { data: endData },
      { data: lockedData },
      { data: teamPermsData },
      { data: catsData }
    ] = await Promise.all([
      supabase.from('app_settings').select('*').eq('key', 'global_assign').maybeSingle(),
      supabase.from('app_settings').select('*').eq('key', 'team_colors').maybeSingle(),
      supabase.from('app_settings').select('*').eq('key', 'registration_start_time').maybeSingle(),
      supabase.from('app_settings').select('*').eq('key', 'registration_end_time').maybeSingle(),
      supabase.from('app_settings').select('*').eq('key', 'locked_categories_global').maybeSingle(),
      supabase.from('app_settings').select('*').eq('key', 'team_category_permissions').maybeSingle(),
      supabase.from('categories').select('id, name').order('name')
    ])

    if (globalData) {
      const val = globalData.value === true || globalData.value === 'true'
      setGlobalAssign(val)
      localStorage.setItem('cache_global_assign', String(val))
    }
    if (colData?.value) {
      try {
        setTeamColors(JSON.parse(colData.value))
        localStorage.setItem('cache_team_colors', colData.value)
      } catch {}
    }
    if (startData) setRegStartTime(startData.value || '')
    if (endData) setRegEndTime(endData.value || '')
    if (lockedData?.value) {
      try { setGlobalLockedCats(JSON.parse(lockedData.value)) } catch { setGlobalLockedCats([]) }
    }
    if (teamPermsData?.value) {
      try { setTeamCategoryPerms(JSON.parse(teamPermsData.value)) } catch { setTeamCategoryPerms({}) }
    }
    if (catsData) setCategories(catsData)
  }

  async function toggleGlobalAssign(e) {
    e.stopPropagation()
    const newVal = !globalAssign
    setGlobalAssign(newVal)
    localStorage.setItem('cache_global_assign', String(newVal))
    await supabase.from('app_settings').upsert({ key: 'global_assign', value: String(newVal) }, { onConflict: 'key' })
  }

  async function toggleTeamAssign(teamId, currentVal, e) {
    e.stopPropagation()
    const newVal = !currentVal
    await supabase.from('teams').update({ can_assign: newVal }).eq('id', teamId)
    fetchTeams()
  }

  async function fetchTeams(showSpinner = false) {
    if (showSpinner) setFetching(true)
    const { data } = await supabase.from('teams').select('*').order('created_at', { ascending: false })
    if (data) {
      setTeams(data)
      localStorage.setItem('cache_teams', JSON.stringify(data))
    }
    setFetching(false)
  }

  function startEdit(team) {
    setEditing(team)
    setName(team.name)
    setPassword(team.password)
    setColor(teamColors[team.id] || team.color || '')
    setError(''); setSuccess('')
    setPanelOpen(true)
  }

  function cancelEdit() {
    setEditing(null)
    setName(''); setPassword(''); setColor('')
    setError(''); setSuccess('')
    setPanelOpen(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !password.trim()) { setError('All fields required.'); return }
    setLoading(true); setError(''); setSuccess('')

    let targetId = editing ? editing.id : null

    if (editing) {
      const { error } = await supabase.from('teams').update({ name: name.trim(), password: password.trim() }).eq('id', editing.id)
      if (error) { setLoading(false); setError(error.message); return }
    } else {
      const { data, error } = await supabase.from('teams').insert([{ name: name.trim(), password: password.trim() }]).select()
      if (error) { setLoading(false); setError(error.message); return }
      if (data?.[0]?.id) targetId = data[0].id
    }

    if (targetId) {
      const updatedMap = { ...teamColors }
      if (color) updatedMap[targetId] = color
      else delete updatedMap[targetId]
      setTeamColors(updatedMap)
      await supabase.from('app_settings').upsert({ key: 'team_colors', value: JSON.stringify(updatedMap) }, { onConflict: 'key' })
    }

    setLoading(false)
    if (editing) {
      setSuccess('Team updated!'); cancelEdit()
    } else {
      setSuccess('Team added!'); setName(''); setPassword(''); setColor('')
    }
    fetchTeams()
    setTimeout(() => setSuccess(''), 2500)
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    const team = teams.find(t => t.id === id)
    const nameStr = team ? ` "${team.name}"` : ""
    setDeleteConfirm({
      message: `Are you sure you want to delete team${nameStr}? This will permanently remove the team, all its participants, and their registrations.`,
      onConfirm: async () => {
        if (editing?.id === id) cancelEdit()
        if (selectedTeam?.id === id) setSelectedTeam(null)
        await supabase.from('teams').delete().eq('id', id)
      }
    })
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return
    setDeleteConfirm({
      message: `Are you sure you want to delete ${selectedIds.length} team(s)? This will permanently remove the teams, all their participants, and their registrations.`,
      onConfirm: async () => {
        setLoading(true)
        const { error } = await supabase.from('teams').delete().in('id', selectedIds)
        setLoading(false)
        if (error) {
          alert(`Error deleting teams: ${error.message}`)
        } else {
          setSelectedIds([])
          setBulkMode(false)
          fetchTeams()
        }
      }
    })
  }

  async function openTeam(team) {
    if (!team) return
    setSelectedTeam(team)
    setEditing(null)
    setPanelOpen(false)
    setLoadingParts(true)
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('id, name, categories(name), chess_number')
        .eq('team_id', team.id)

      if (error) {
        console.error('Error fetching team participants:', error)
        setTeamParticipants([])
      } else {
        const sorted = (data || []).sort((a, b) => {
          const numA = parseInt(a?.chess_number, 10)
          const numB = parseInt(b?.chess_number, 10)
          if (isNaN(numA) && isNaN(numB)) return (a?.name || '').localeCompare(b?.name || '')
          if (isNaN(numA)) return 1
          if (isNaN(numB)) return -1
          return numA - numB
        })
        setTeamParticipants(sorted)
      }
    } catch (err) {
      console.error(err)
      setTeamParticipants([])
    } finally {
      setLoadingParts(false)
    }
  }

  async function saveGlobalRules() {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await Promise.all([
        supabase.from('app_settings').upsert({ key: 'global_assign', value: tempGlobalAssign }, { onConflict: 'key' }),
        supabase.from('app_settings').upsert({ key: 'registration_start_time', value: tempRegStartTime }, { onConflict: 'key' }),
        supabase.from('app_settings').upsert({ key: 'registration_end_time', value: tempRegEndTime }, { onConflict: 'key' }),
        supabase.from('app_settings').upsert({ key: 'locked_categories_global', value: JSON.stringify(tempLockedCats) }, { onConflict: 'key' })
      ])
      await fetchSettings()
      setSuccess('Global rules saved successfully!')
      setShowGlobalRulesModal(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveTeamRules() {
    if (!selectedTeam) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await Promise.all([
        supabase.from('app_settings').upsert({ key: 'team_category_permissions', value: JSON.stringify(teamCategoryPerms) }, { onConflict: 'key' }),
        supabase.from('teams').update({ can_assign: selectedTeam.can_assign !== false }).eq('id', selectedTeam.id)
      ])
      await fetchSettings()
      await fetchTeams()
      setSuccess(`Permissions updated for ${selectedTeam.name}`)
      setShowTeamRulesModal(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleToggleGlobalLock(catId) {
    setTempLockedCats(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    )
  }

  function handleTeamOverrideChange(teamId, catId, val) {
    setTeamCategoryPerms(prev => {
      const next = { ...prev }
      if (!next[teamId]) {
        next[teamId] = {}
      }
      if (val === 'inherit') {
        delete next[teamId][catId]
        if (Object.keys(next[teamId]).length === 0) {
          delete next[teamId]
        }
      } else {
        next[teamId][catId] = val
      }
      return next
    })
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

  function isCategoryAllowedForTeam(teamId, catId) {
    const teamPerms = teamCategoryPerms[teamId]
    if (teamPerms && teamPerms[catId]) {
      if (teamPerms[catId] === 'unlocked') return true
      if (teamPerms[catId] === 'locked') return false
    }
    return !globalLockedCats.includes(catId)
  }

  function getTeamPermissionSummary(team) {
    if (!globalAssign || team.can_assign === false) {
      return { label: 'Blocked', color: '#ff6b6b', bg: 'rgba(255,107,107,0.1)', border: 'rgba(255,107,107,0.3)' }
    }
    if (!isTimeWindowAllowed()) {
      return { label: 'Time Cutoff', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' }
    }
    if (categories.length > 0) {
      const allowedCount = categories.filter(c => isCategoryAllowedForTeam(team.id, c.id)).length
      if (allowedCount === 0) {
        return { label: 'Categories Locked', color: '#ff6b6b', bg: 'rgba(255,107,107,0.1)', border: 'rgba(255,107,107,0.3)' }
      }
      if (allowedCount < categories.length) {
        return { label: `Partial (${allowedCount}/${categories.length})`, color: '#eab308', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)' }
      }
    }
    return { label: 'Allowed', color: 'var(--accent)', bg: 'var(--accent-dim)', border: 'rgba(79, 156, 249, 0.4)' }
  }

  const applyTimePreset = (type) => {
    const now = new Date()
    const formatDateForInput = (d) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    if (type === 'now_open') {
      setTempRegStartTime(formatDateForInput(now))
      setTempRegEndTime('')
    } else if (type === '2hours') {
      setTempRegStartTime(formatDateForInput(now))
      const end = new Date(now.getTime() + 2 * 60 * 60 * 1000)
      setTempRegEndTime(formatDateForInput(end))
    } else if (type === '6hours') {
      setTempRegStartTime(formatDateForInput(now))
      const end = new Date(now.getTime() + 6 * 60 * 60 * 1000)
      setTempRegEndTime(formatDateForInput(end))
    } else if (type === 'today_end') {
      setTempRegStartTime(formatDateForInput(now))
      const end = new Date(now)
      end.setHours(23, 59, 0, 0)
      setTempRegEndTime(formatDateForInput(end))
    } else if (type === 'clear') {
      setTempRegStartTime('')
      setTempRegEndTime('')
    }
  }

  const getAccessStatusSummary = () => {
    const now = new Date()
    if (regStartTime) {
      const start = new Date(regStartTime)
      if (now < start) {
        return { label: 'Inactive: Access opens in future', badge: 'WILL OPEN', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' }
      }
    }
    if (regEndTime) {
      const end = new Date(regEndTime)
      if (now > end) {
        return { label: 'Cutoff: Access has closed', badge: 'CLOSED', color: '#ff6b6b', bg: 'rgba(255,107,107,0.1)', border: 'rgba(255,107,107,0.3)' }
      }
    }
    if (!regStartTime && !regEndTime) {
      return { label: 'Active: Open without limits', badge: 'UNLIMITED', color: '#2ed573', bg: 'rgba(46,213,115,0.1)', border: 'rgba(46,213,115,0.3)' }
    }
    return { label: 'Active: Access currently open', badge: 'OPEN NOW', color: '#2ed573', bg: 'rgba(46,213,115,0.1)', border: 'rgba(46,213,115,0.3)' }
  }

  return (
    <>
      <div className={`section-root${panelOpen ? ' panel-open' : ''}`}>
      {/* ── Teams list OR team detail ── */}
      <div className="section-list">

        {selectedTeam ? (
          /* ── Team Detail ── */
          <>
            <div className="list-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
              <button
                className="td-link-plain"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, letterSpacing: 0.5 }}
                onClick={() => setSelectedTeam(null)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Back to Teams
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="list-title">{selectedTeam.name}</span>
                  <button
                    className="td-badge-link"
                    style={{
                      fontSize: 9,
                      background: 'rgba(79, 156, 249, 0.08)',
                      borderColor: 'rgba(79, 156, 249, 0.25)',
                      color: 'var(--accent)'
                    }}
                    onClick={() => setShowTeamRulesModal(true)}
                  >
                    <IconLock /> Team Permissions & Rules
                  </button>
                </div>
                <span className="list-count">{teamParticipants.length} participants</span>
              </div>
            </div>

            {loadingParts ? (
              <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
            ) : teamParticipants.length === 0 ? (
              <div className="empty-state">
                <IconUsers />
                <p>No participants in this team yet.</p>
                {navigateTo && (
                  <button className="td-link-plain" style={{ marginTop: 8, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    onClick={() => navigateTo('participants')}>
                    Go to Participants
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (
              <table className="data-table">
                <thead><tr><th>#</th><th>Name</th><th>Category</th><th>Chess #</th></tr></thead>
                <tbody>
                  {teamParticipants.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11, width: 28 }}>{i + 1}</td>
                      <td className="td-name">{p.name}</td>
                      <td>
                        {p.categories?.name
                          ? <button className="td-link-plain" onClick={() => navigateTo?.('categories')}>{p.categories.name}</button>
                          : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--text-muted)' }}>
                        {p.chess_number || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          /* ── Teams List ── */
          <>
            <div className="list-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="list-title">All Teams</span>
                <button
                  className="td-badge-link"
                  style={{
                    fontSize: 9,
                    background: 'rgba(79, 156, 249, 0.08)',
                    borderColor: 'rgba(79, 156, 249, 0.25)',
                    color: 'var(--accent)'
                  }}
                  onClick={() => setShowGlobalRulesModal(true)}
                >
                  <IconClock /> Global Rules & Scheduling
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                <div style={{ position: 'relative' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                       style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: 'var(--text-muted)' }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    className="dash-search-input"
                    style={{ paddingLeft: 30, paddingRight: search ? 30 : 10 }}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search teams…"
                  />
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
                <span className="list-count">{teams.length} total</span>
                <button
                  className={`btn-cancel-edit ${bulkMode ? 'active' : ''}`}
                  onClick={() => {
                    setBulkMode(!bulkMode)
                    if (bulkMode) setSelectedIds([])
                  }}
                  style={{ background: bulkMode ? 'var(--accent-dim)' : '', borderColor: bulkMode ? 'var(--accent)' : '', color: bulkMode ? 'var(--accent-light)' : '' }}
                  title="Toggle Select Mode"
                >
                  {bulkMode ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Cancel Selection
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      Select
                    </>
                  )}
                </button>
                {bulkMode ? (
                  <>
                    {selectedIds.length > 0 ? (
                      <>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent-light)', marginLeft: 10 }}>
                          {selectedIds.length} Selected
                        </span>
                        <button
                          className="btn-cancel-edit"
                          onClick={handleBulkDelete}
                          style={{ background: 'rgba(220, 38, 38, 0.15)', borderColor: 'rgba(220, 38, 38, 0.3)', color: '#ef4444' }}
                        >
                          <IconTrash /> Delete
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 10 }}>
                        Select items...
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      className="btn-cancel-edit"
                      onClick={handleExportCSV}
                      title="Export all teams to CSV backup"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Export CSV
                    </button>
                    <button
                      className="btn-submit"
                      onClick={() => { setEditing(null); setMode('add'); setPanelOpen(true) }}
                    >
                      <IconPlus /> Add
                    </button>
                  </>
                )}
              </div>
            </div>
            {fetching ? (
              <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
            ) : teams.length === 0 ? (
              <div className="empty-state"><IconUsers /><p>No teams yet.</p></div>
            ) : (() => {
              const sortedTeams = teams
                .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()))
                .sort((a, b) => {
                  let res = 0
                  if (sortField === 'name') {
                    res = (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
                  } else if (sortField === 'created_at') {
                    res = new Date(a.created_at || 0) - new Date(b.created_at || 0)
                  } else if (sortField === 'can_assign') {
                    const aVal = a.can_assign !== false ? 1 : 0
                    const bVal = b.can_assign !== false ? 1 : 0
                    res = aVal - bVal
                  }
                  return sortOrder === 'asc' ? res : -res
                })

              const toggleSort = (field) => {
                if (sortField === field) {
                  setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
                } else {
                  setSortField(field)
                  setSortOrder('asc')
                }
              }

              return (
                <table className={`data-table ${bulkMode ? 'bulk-mode-active' : ''}`}>
                  <thead>
                    <tr>
                      {bulkMode && (
                        <th className="th-checkbox">
                          <input
                            type="checkbox"
                            className="bulk-checkbox"
                            checked={selectedIds.length === sortedTeams.length && sortedTeams.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedIds(sortedTeams.map(t => t.id))
                              else setSelectedIds([])
                            }}
                          />
                        </th>
                      )}
                      <th
                        onClick={() => toggleSort('name')}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by Name"
                      >
                        Team Name {sortField === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th
                        onClick={() => toggleSort('can_assign')}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        title="Click to sort by Permission"
                      >
                        Permission {sortField === 'can_assign' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeams.map((t, index) => {
                      const permSummary = getTeamPermissionSummary(t);
                      const isSelected = selectedIds.includes(t.id)
                      return (
                      <tr key={t.id}
                        className={`row-clickable ${editing?.id === t.id ? 'row-editing' : ''} ${isSelected ? 'row-selected' : ''}`}
                        onClick={(e) => {
                          if (!bulkMode) {
                            openTeam(t)
                            return
                          }
                          e.stopPropagation()
                          if (e.shiftKey && window.getSelection) {
                            window.getSelection().removeAllRanges()
                          }
                          const checked = !isSelected
                          if (e.shiftKey && lastSelectedIndex !== null) {
                            const start = Math.min(index, lastSelectedIndex)
                            const end = Math.max(index, lastSelectedIndex)
                            const rangeIds = teams.slice(start, end + 1).map(item => item.id)
                            if (checked) {
                              setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])))
                            } else {
                              setSelectedIds(prev => prev.filter(id => !rangeIds.includes(id)))
                            }
                          } else {
                            if (checked) setSelectedIds(prev => [...prev, t.id])
                            else setSelectedIds(prev => prev.filter(id => id !== t.id))
                          }
                          setLastSelectedIndex(index)
                        }}
                      >
                        {bulkMode && (
                          <td className="td-checkbox">
                            <input
                              type="checkbox"
                              className="bulk-checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                // Handled by tr onClick
                              }}
                            />
                          </td>
                        )}
                        <td className="td-name">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {(t.color || teamColors[t.id]) && (
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.color || teamColors[t.id], flexShrink: 0, boxShadow: `0 0 6px ${t.color || teamColors[t.id]}aa` }} />
                            )}
                            <button
                              className="td-link-plain"
                              style={{ fontWeight: 600, fontSize: 13, textDecoration: 'none', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer' }}
                              onClick={(e) => { e.stopPropagation(); openTeam(t); }}
                            >
                              {t.name}
                            </button>
                          </div>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <button
                            className="td-badge-link"
                            style={{
                              fontSize: 9,
                              background: permSummary.bg,
                              borderColor: permSummary.border,
                              color: permSummary.color
                            }}
                            onClick={(e) => toggleTeamAssign(t.id, t.can_assign !== false, e)}
                            title="Click to toggle team permission override"
                          >
                            {permSummary.label}
                          </button>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn-icon" onClick={() => startEdit(t)} title="Edit"><IconEdit /></button>
                            <button className="btn-delete" onClick={(e) => handleDelete(t.id, e)} title="Delete"><IconTrash /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          })()}
          </>
        )}
      </div>

      {/* Form / Import Panel */}
      <div className="section-form-panel">
        {/* Tab switcher */}
        {!editing && (
          <div className="bulk-mode-tabs">
            <button className={`bulk-tab ${mode === 'add' ? 'active' : ''}`} type="button" onClick={() => setMode('add')}>Add</button>
            <button className={`bulk-tab ${mode === 'import' ? 'active' : ''}`} type="button" onClick={() => setMode('import')}>Import CSV</button>
            <button className="btn-cancel-edit" style={{ marginLeft: 'auto' }} onClick={() => { cancelEdit(); setPanelOpen(false) }}>✕</button>
          </div>
        )}

        {/* Edit header */}
        {editing && (
          <div className="form-panel-header">
            <p className="form-panel-title">Edit Team</p>
            <button className="btn-cancel-edit" onClick={cancelEdit}>✕ Cancel</button>
          </div>
        )}

        {/* Add / Edit Form */}
        {(mode === 'add' || editing) && (
          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="form-fields">
              <div className="field">
                <label className="field-lbl">Team Name</label>
                <input className="field-inp" value={name}
                  onChange={e => { setName(e.target.value); setError('') }} />
              </div>
              <div className="field">
                <label className="field-lbl">Password</label>
                <input className="field-inp" type={editing ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }} />
              </div>
              <div className="field">
                <label className="field-lbl">Team Color <span style={{ opacity: 0.5 }}>(optional)</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{
                        width: 24, height: 24, borderRadius: '50%', background: c, border: color === c ? '2px solid #fff' : '2px solid transparent',
                        boxShadow: color === c ? `0 0 8px ${c}` : 'none', cursor: 'pointer', outline: 'none', padding: 0
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={color || '#4f9cf9'}
                    onChange={e => setColor(e.target.value)}
                    style={{ width: 26, height: 26, padding: 0, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4 }}
                    title="Custom Color"
                  />
                  {color && (
                    <button
                      type="button"
                      onClick={() => setColor('')}
                      style={{ background: 'none', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: 10, padding: '2px 6px', borderRadius: 4, cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              {error && <p className="form-error">⚠ {error}</p>}
              {success && <p className="form-success">✓ {success}</p>}
              <button className="btn-submit" type="submit" disabled={loading}>
                {loading ? <span className="spin" /> : editing ? <IconCheck /> : <IconPlus />}
                {loading ? 'Saving...' : editing ? 'Save Changes' : 'Add Team'}
              </button>
            </div>
          </form>
        )}

        {/* Bulk Import */}
        {mode === 'import' && !editing && (
          <BulkImporter
            columns={TEAMS_COLS}
            sampleRows={TEAMS_SAMPLE}
            onImport={handleBulkImport}
            filename="teams_template.csv"
          />
        )}
      </div>
    </div>

      {deleteConfirm && createPortal(
        <div className="dash-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="dash-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#e07c7c' }}>
              Confirm Delete
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 20 }}>
              {deleteConfirm.message}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn-cancel-edit" 
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-delete" 
                style={{ padding: '8px 16px', background: '#e07c7c', color: '#0e0b07', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                onClick={async () => {
                  await deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* ── Global Rules Modal ── */}
      {showGlobalRulesModal && createPortal(
        <div className="dash-modal-overlay" onClick={() => setShowGlobalRulesModal(false)}>
          <div className="dash-modal" style={{ maxWidth: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconClock /> Global Rules & Scheduling
              </h3>
              <button 
                onClick={() => setShowGlobalRulesModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Access Status Summary Card */}
              {(() => {
                const status = getAccessStatusSummary()
                return (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: status.bg,
                    border: `1px solid ${status.border}`,
                    color: status.color,
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span>{status.label}</span>
                    <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {status.badge}
                    </span>
                  </div>
                )
              })()}

              {/* Section 1: Master Access Control */}
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: 12, borderRadius: 6, border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Master Access Control</span>
                <button
                  type="button"
                  className="td-badge-link"
                  style={{
                    fontSize: 10,
                    padding: '4px 10px',
                    background: tempGlobalAssign ? 'var(--accent-dim)' : 'rgba(255,107,107,0.1)',
                    borderColor: tempGlobalAssign ? 'rgba(79, 156, 249, 0.4)' : 'rgba(255,107,107,0.3)',
                    color: tempGlobalAssign ? 'var(--accent)' : '#ff6b6b',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                  onClick={() => setTempGlobalAssign(prev => !prev)}
                >
                  {tempGlobalAssign ? '🟢 System Open' : '🔴 System Locked'}
                </button>
              </div>

              {/* Section 2: Time Windows */}
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: 12, borderRadius: 6, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Time Window</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button" className="btn-cancel-edit" style={{ padding: '2px 6px', fontSize: 9, background: 'rgba(255,255,255,0.04)' }} onClick={() => applyTimePreset('now_open')}>
                      ⚡ Open Now
                    </button>
                    <button type="button" className="btn-cancel-edit" style={{ padding: '2px 6px', fontSize: 9, background: 'rgba(255,255,255,0.04)' }} onClick={() => applyTimePreset('2hours')}>
                      ⏱️ +2h
                    </button>
                    <button type="button" className="btn-cancel-edit" style={{ padding: '2px 6px', fontSize: 9, background: 'rgba(255,255,255,0.04)' }} onClick={() => applyTimePreset('6hours')}>
                      ⏱️ +6h
                    </button>
                    <button type="button" className="btn-cancel-edit" style={{ padding: '2px 6px', fontSize: 9, background: 'rgba(255,255,255,0.04)' }} onClick={() => applyTimePreset('today_end')}>
                      🌙 Tonight
                    </button>
                    <button type="button" className="btn-cancel-edit" style={{ padding: '2px 6px', fontSize: 9, color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)', background: 'rgba(255,107,107,0.05)' }} onClick={() => applyTimePreset('clear')}>
                      ✕ Clear
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label className="field-lbl" style={{ fontSize: 10 }}>Active From</label>
                    <input 
                      type="datetime-local" 
                      style={{ 
                        background: '#1a1d24', 
                        color: '#ffffff', 
                        border: '1px solid rgba(255, 255, 255, 0.12)', 
                        borderRadius: 6, 
                        padding: '6px 10px', 
                        fontSize: 11, 
                        width: '100%', 
                        colorScheme: 'dark' 
                      }}
                      value={tempRegStartTime} 
                      onChange={e => setTempRegStartTime(e.target.value)} 
                    />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label className="field-lbl" style={{ fontSize: 10 }}>Cutoff Time</label>
                    <input 
                      type="datetime-local" 
                      style={{ 
                        background: '#1a1d24', 
                        color: '#ffffff', 
                        border: '1px solid rgba(255, 255, 255, 0.12)', 
                        borderRadius: 6, 
                        padding: '6px 10px', 
                        fontSize: 11, 
                        width: '100%', 
                        colorScheme: 'dark' 
                      }}
                      value={tempRegEndTime} 
                      onChange={e => setTempRegEndTime(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Category Status */}
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: 12, borderRadius: 6, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Category Locks</span>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <select
                      style={{
                        background: '#1a1d24',
                        color: '#2ed573',
                        border: '1px solid rgba(46, 213, 115, 0.3)',
                        borderRadius: 4,
                        fontSize: 9,
                        padding: '1px 4px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        colorScheme: 'dark'
                      }}
                      onChange={e => {
                        const targetId = e.target.value
                        if (targetId) {
                          setTempLockedCats(categories.filter(c => c.id !== targetId).map(c => c.id))
                        }
                      }}
                      value=""
                    >
                      <option value="">Unlock Only...</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      style={{ fontSize: 9, padding: '2px 6px', background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => setTempLockedCats(categories.map(c => c.id))}
                    >
                      Lock All
                    </button>
                    <button 
                      type="button" 
                      style={{ fontSize: 9, padding: '2px 6px', background: 'rgba(46,213,115,0.1)', color: '#2ed573', border: '1px solid rgba(46,213,115,0.3)', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => setTempLockedCats([])}
                    >
                      Unlock All
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                  {categories.map(cat => {
                    const isLocked = tempLockedCats.includes(cat.id)
                    return (
                      <label 
                        key={cat.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 6, 
                          fontSize: 11, 
                          cursor: 'pointer', 
                          color: isLocked ? '#ff4757' : 'var(--text-primary)',
                          background: 'rgba(255,255,255,0.02)',
                          padding: '6px 10px',
                          borderRadius: 4,
                          border: isLocked ? '1px solid rgba(255, 71, 87, 0.15)' : '1px solid var(--border-subtle)'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isLocked} 
                          onChange={() => handleToggleGlobalLock(cat.id)} 
                        />
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                          {cat.name} 
                          {isLocked && <IconLock style={{ width: 10, height: 10 }} />}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button 
                type="button" 
                className="btn-cancel-edit" 
                style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}
                onClick={() => setShowGlobalRulesModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-submit" 
                style={{ padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                onClick={saveGlobalRules}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Apply Rules'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Team-Specific Rules Modal ── */}
      {showTeamRulesModal && selectedTeam && createPortal(
        <div className="dash-modal-overlay" onClick={() => setShowTeamRulesModal(false)}>
          <div className="dash-modal" style={{ maxWidth: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconLock /> Rules for {selectedTeam.name}
              </h3>
              <button 
                onClick={() => setShowTeamRulesModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* 1. Team Registration Status Toggle */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 10px 0' }}>
                  1. Team Registration Permission
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>Allow Team Registration:</span>
                  <button
                    type="button"
                    className="td-badge-link"
                    style={{
                      fontSize: 11,
                      padding: '4px 12px',
                      background: selectedTeam.can_assign !== false ? 'var(--accent-dim)' : 'rgba(255,107,107,0.1)',
                      borderColor: selectedTeam.can_assign !== false ? 'rgba(79, 156, 249, 0.4)' : 'rgba(255,107,107,0.3)',
                      color: selectedTeam.can_assign !== false ? 'var(--accent)' : '#ff6b6b',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      const newVal = selectedTeam.can_assign === false
                      setSelectedTeam(prev => ({ ...prev, can_assign: newVal }))
                    }}
                  >
                    {selectedTeam.can_assign !== false ? 'Allowed' : 'Blocked'}
                  </button>
                </div>
              </div>

              {/* 2. Category Overrides */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px 0' }}>
                  2. Category Overrides for {selectedTeam.name}
                </p>
                <p style={{ margin: '0 0 10px 0', fontSize: 11, color: 'var(--text-muted)' }}>
                  Set explicit unlock or lock status for specific categories for this team.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  {categories.map(cat => {
                    const currentVal = teamCategoryPerms[selectedTeam.id]?.[cat.id] || 'inherit'
                    const isGlobalLocked = globalLockedCats.includes(cat.id)
                    return (
                      <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                        <span style={{ fontWeight: 500 }}>
                          {cat.name} 
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>
                            (Global: {isGlobalLocked ? 'Locked' : 'Open'})
                          </span>
                        </span>
                        <select
                          value={currentVal}
                          onChange={e => handleTeamOverrideChange(selectedTeam.id, cat.id, e.target.value)}
                          style={{ 
                            width: 130, 
                            height: 28, 
                            padding: '2px 6px', 
                            fontSize: 11, 
                            background: '#1a1d24', 
                            color: currentVal === 'unlocked' ? '#2ed573' : currentVal === 'locked' ? '#ff4757' : '#ffffff', 
                            border: '1px solid rgba(255, 255, 255, 0.2)', 
                            borderRadius: 4, 
                            outline: 'none', 
                            cursor: 'pointer', 
                            colorScheme: 'dark',
                            fontWeight: 600
                          }}
                        >
                          <option value="inherit" style={{ background: '#1a1d24', color: '#ffffff' }}>Inherit Global</option>
                          <option value="unlocked" style={{ background: '#1a1d24', color: '#2ed573' }}>Force Unlock</option>
                          <option value="locked" style={{ background: '#1a1d24', color: '#ff4757' }}>Force Lock</option>
                        </select>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button 
                type="button" 
                className="btn-cancel-edit" 
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                onClick={() => setShowTeamRulesModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-submit" 
                style={{ padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                onClick={saveTeamRules}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Team Rules'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
