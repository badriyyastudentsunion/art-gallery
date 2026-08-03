// src/pages/admin/sections/CompetitionsSection.jsx
import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../lib/supabase'
import '../sections.css'
import './competitions.css'
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
const IconTrophy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
  </svg>
)
const IconChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)
const IconRules = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

function Checkbox({ checked, onChange, label }) {
  return (
    <label className="field-check" onClick={onChange} style={{ userSelect: 'none' }}>
      <div className={`check-box ${checked ? 'checked' : ''}`} />
      <span className={`check-label ${checked ? 'checked' : ''}`}>{label}</span>
    </label>
  )
}

// ── Inline multi-select dropdown ──
function MultiSelectDropdown({ label, allItems, selectedIds, onToggle, onClear, disabled, hasData, dataColor = '#2ed573' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedCount = selectedIds.length
  const selectedNames = allItems
    .filter(item => selectedIds.includes(item.id))
    .map(item => item.name)
    .join(', ')

  return (
    <div className="ci-dropdown" ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'stretch', width: '100%' }}>
      <button
        type="button"
        className={`ci-dropdown-btn ${selectedCount > 0 ? 'ci-dropdown-btn--filled' : ''}`}
        style={{
          flex: 1,
          minWidth: 0,
          borderTopRightRadius: hasData ? 0 : 6,
          borderBottomRightRadius: hasData ? 0 : 6,
          paddingRight: 6,
          zIndex: 2
        }}
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        disabled={disabled}
      >
        <span key={selectedCount > 0 ? selectedNames : 'none'} className="text-slide-up" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedCount > 0 ? selectedNames : label}
        </span>
        <IconChevron />
      </button>
      {hasData && (
        <div
          title="Data entered"
          style={{
            background: dataColor,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 6px',
            borderTopRightRadius: 6,
            borderBottomRightRadius: 6,
            marginLeft: '-1px',
            flexShrink: 0,
            zIndex: 1
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      )}
      {open && (
        <div className="ci-dropdown-menu" onClick={e => e.stopPropagation()}>
          {onClear && (
            <button
              type="button"
              className="ci-dropdown-item"
              onClick={() => { onClear(); setOpen(false) }}
              disabled={disabled || selectedCount === 0}
            >
              <span className="ci-dropdown-check">{selectedCount === 0 ? '✓' : ''}</span>
              <span style={{ color: 'var(--text-muted)' }}>— None —</span>
            </button>
          )}
          {allItems.length === 0 ? (
            <p className="ci-dropdown-empty">No {label.toLowerCase()}s yet</p>
          ) : (
            allItems.map(item => {
              const isSelected = selectedIds.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`ci-dropdown-item ${isSelected ? 'ci-dropdown-item--selected' : ''}`}
                  onClick={() => { onToggle(item.id, isSelected); setOpen(false) }}
                  disabled={disabled}
                >
                  <span className="ci-dropdown-check">{isSelected ? '✓' : ''}</span>
                  <span>{item.name}</span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ── Inline single-select dropdown ──
function SingleSelectDropdown({ label, allItems, selectedId, onSelect, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = allItems.find(i => i.id === selectedId)

  return (
    <div className="ci-dropdown" ref={ref} style={{ width: '100%' }}>
      <button
        type="button"
        className={`ci-dropdown-btn ${selected ? 'ci-dropdown-btn--filled' : ''}`}
        style={{ width: '100%', minWidth: 0 }}
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        disabled={disabled}
      >
        <span key={selected ? selected.id : 'none'} className="text-slide-up">
          {selected ? selected.name : label}
        </span>
        <IconChevron />
      </button>
      {open && (
        <div className="ci-dropdown-menu" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            className="ci-dropdown-item"
            onClick={() => { onSelect(null); setOpen(false) }}
            disabled={disabled}
          >
            <span className="ci-dropdown-check">{!selectedId ? '✓' : ''}</span>
            <span style={{ color: 'var(--text-muted)' }}>— None —</span>
          </button>
          {allItems.map(item => (
            <button
              key={item.id}
              type="button"
              className={`ci-dropdown-item ${selectedId === item.id ? 'ci-dropdown-item--selected' : ''}`}
              onClick={() => { onSelect(item.id); setOpen(false) }}
              disabled={disabled}
            >
              <span className="ci-dropdown-check">{selectedId === item.id ? '✓' : ''}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
function FormSingleSelect({ label, allItems, selectedId, onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = allItems.find(i => i.id === selectedId)

  return (
    <div className="form-dropdown" ref={ref}>
      <button
        type="button"
        className="form-dropdown-btn"
        onClick={() => setOpen(v => !v)}
      >
        <span>{selected ? selected.name : label}</span>
        <IconChevron />
      </button>
      {open && (
        <div className="form-dropdown-menu">
          <button
            type="button"
            className="form-dropdown-item"
            onClick={() => { onSelect(''); setOpen(false) }}
          >
            {label}
          </button>
          {allItems.map(item => (
            <button
              key={item.id}
              type="button"
              className={`form-dropdown-item ${selectedId === item.id ? 'form-dropdown-item--selected' : ''}`}
              onClick={() => { onSelect(item.id); setOpen(false) }}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CompetitionsSection({ navigateTo }) {
  const [competitions, setCompetitions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_competitions') || '[]') } catch { return [] }
  })
  const [categories, setCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_categories') || '[]') } catch { return [] }
  })
  const [allStages, setAllStages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_all_stages') || '[]') } catch { return [] }
  })
  const [allInvig, setAllInvig] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_all_invig') || '[]') } catch { return [] }
  })
  const [allJudges, setAllJudges] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_all_judges') || '[]') } catch { return [] }
  })
  const [allAnnouncers, setAllAnnouncers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_all_announcers') || '[]') } catch { return [] }
  })
  // map: competition_id → { invig: [id,...], judges: [id,...] }
  const [assignMap, setAssignMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_assign_map') || '{}') } catch { return {} }
  })
  const [participantCounts, setParticipantCounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_participant_counts') || '{}') } catch { return {} }
  })
  const [statusMap, setStatusMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_status_map') || '{}') } catch { return {} }
  })
  const [dataStatusMap, setDataStatusMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_data_status_map') || '{}') } catch { return {} }
  })
  const [teamColors, setTeamColors] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_team_colors') || '{}') } catch { return {} }
  })

  const [fetching, setFetching] = useState(() => !competitions.length)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(null)
  const [search, setSearch] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null)
  
  const listRef = useRef(null)
  const scrollPosRef = useRef(0)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [competitionType, setCompetitionType] = useState('off-stage') // 'stage' | 'off-stage'
  const [groupSize, setGroupSize] = useState('1')
  const [rulesMap, setRulesMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cache_competition_rules') || '{}') } catch { return {} }
  })
  const [ruleDesc, setRuleDesc] = useState('')
  const [ruleDuration, setRuleDuration] = useState('')
  const [ruleCriteria, setRuleCriteria] = useState([{ label: '', mark: '' }])
  const [viewingRules, setViewingRules] = useState(null)

  function addCriteriaRow() {
    setRuleCriteria(prev => [...prev, { label: '', mark: '' }])
  }

  function updateCriteriaRow(index, field, val) {
    setRuleCriteria(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: val }
      return copy
    })
  }

  function removeCriteriaRow(index) {
    setRuleCriteria(prev => prev.filter((_, i) => i !== index))
  }

  const [mode, setMode] = useState('add')
  const fetchTimeout = useRef(null)

  // Participants drill-down
  const [selected, setSelected] = useState(null)
  const [assigned, setAssigned] = useState([])
  const [detailData, setDetailData] = useState({ reportMap: {}, rankMap: {}, reportsCount: 0, scoresCount: 0 })
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [removing, setRemoving] = useState(false)

  const COMP_COLS = [
    { key: 'name', label: 'name' },
    { key: 'category_name', label: 'category_name' },
    { key: 'max_participants', label: 'max_participants' },
    { key: 'is_stage', label: 'is_stage' },
    { key: 'is_group', label: 'is_group' },
    { key: 'rules_description', label: 'rules_description' },
    { key: 'rules_duration', label: 'rules_duration' },
    { key: 'mark_criteria', label: 'mark_criteria' },
  ]

  const COMP_SAMPLE = [
    {
      name: 'Elocution',
      category_name: 'Junior',
      max_participants: '2',
      is_stage: 'true',
      is_group: 'false',
      rules_description: 'Topic given 10 mins prior to competition.',
      rules_duration: '5 mins',
      mark_criteria: 'Subject: 20, Diction: 20, Presentation: 10'
    },
    {
      name: 'Pencil Drawing',
      category_name: 'Senior',
      max_participants: '1',
      is_stage: 'false',
      is_group: 'false',
      rules_description: 'Bring own drawing paper and pencils.',
      rules_duration: '60 mins',
      mark_criteria: 'Shading: 25, Proportion: 25'
    }
  ]

  function handleExportCSV() {
    const headers = [
      'name',
      'category_name',
      'max_participants',
      'is_stage',
      'is_group',
      'rules_description',
      'rules_duration',
      'mark_criteria'
    ]
    const rows = competitions.map(c => [
      c.name || '',
      c.categories?.name || '',
      c.is_group ? c.group_size : (c.max_participants || 1),
      c.is_stage ? 'true' : 'false',
      c.is_group ? 'true' : 'false',
      c.rules_description || '',
      c.rules_duration || '',
      c.mark_criteria || ''
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
    a.download = 'competitions_backup.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleBulkImport(rows) {
    const { data: cats } = await supabase.from('categories').select('id, name')
    const catMap = Object.fromEntries((cats || []).map(c => [c.name.toLowerCase(), c.id]))
    let imported = 0; const errors = []

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r.name?.trim()) { errors.push({ row: i + 2, msg: 'name required' }); continue }

      const isGroup = r.is_group?.toLowerCase() === 'true' || r.is_group === '1'
      const parsedMax = parseInt(r.max_participants) || 1
      const groupSize = isGroup ? (parseInt(r.group_size) || (parsedMax > 1 ? parsedMax : 4)) : 1
      const maxParts = isGroup ? 1 : parsedMax

      // Rules directly from CSV columns
      const desc = (r.rules_description || '').trim()
      const dur = (r.rules_duration || '').trim()
      const critRaw = (r.mark_criteria || '').trim()

      const { error } = await supabase.from('competitions').insert([{
        name: r.name.trim(),
        category_id: r.category_name?.trim() ? (catMap[r.category_name.trim().toLowerCase()] || null) : null,
        max_participants: maxParts,
        group_size: groupSize,
        is_stage: r.is_stage?.toLowerCase() === 'true' || r.is_stage === '1',
        is_group: isGroup,
        rules_description: desc,
        rules_duration: dur,
        mark_criteria: critRaw,
      }])

      if (error) {
        errors.push({ row: i + 2, msg: error.message })
      } else {
        imported++
      }
    }

    return { imported, errors }
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (viewingRules) {
          setViewingRules(null)
        } else if (deleteConfirm) {
          setDeleteConfirm(null)
        } else if (bulkMode) {
          setBulkMode(false)
          setSelectedIds([])
        } else if (panelOpen) {
          setPanelOpen(false)
          setEditing(null)
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [viewingRules, deleteConfirm, bulkMode, panelOpen])

  useEffect(() => {
    fetchAll()
    
    function debouncedFetch() {
      if (fetchTimeout.current) clearTimeout(fetchTimeout.current)
      fetchTimeout.current = setTimeout(() => {
        fetchAll()
      }, 1500)
    }

    const channel = supabase
      .channel('realtime:competitions_full')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, () => { debouncedFetch(); setSelectedIds([]) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_participants' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_invigilators' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_judges' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_reports' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'judge_results' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_schedule' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_results' }, debouncedFetch)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
      if (fetchTimeout.current) clearTimeout(fetchTimeout.current)
    }
  }, [])

  async function fetchAll() {
    const [
      { data: comps },
      { data: cats },
      { data: stages },
      { data: invigs },
      { data: judges },
      { data: announcers },
      { data: ciRows },
      { data: cjRows },
      { data: cpRows },
      { data: resRows },
      { data: schedRows },
      { data: reportsRows },
      { data: judgeResRows },
      { data: colRes },
    ] = await Promise.all([
      supabase.from('competitions').select('*, categories(name), stages(name), announcers(name)').order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('stages').select('id, name').order('name'),
      supabase.from('invigilators').select('id, name').order('name'),
      supabase.from('judges').select('id, name').order('name'),
      supabase.from('announcers').select('id, name').order('name'),
      supabase.from('competition_invigilators').select('competition_id, invigilator_id'),
      supabase.from('competition_judges').select('competition_id, judge_id'),
      supabase.from('competition_participants').select('competition_id'),
      supabase.from('competition_results').select('competition_id, published'),
      supabase.from('competition_schedule').select('competition_id, status'),
      supabase.from('competition_reports').select('competition_id'),
      supabase.from('judge_results').select('competition_id'),
      supabase.from('app_settings').select('*').eq('key', 'team_colors')
    ])

    if (colRes && colRes.length > 0 && colRes[0].value) {
      try {
        const parsed = JSON.parse(colRes[0].value)
        if (parsed && typeof parsed === 'object') {
          setTeamColors(parsed)
          localStorage.setItem('cache_team_colors', colRes[0].value)
        }
      } catch {}
    }

    if (comps) {
      setCompetitions(comps)
      localStorage.setItem('cache_competitions', JSON.stringify(comps))
      // Build rulesMap directly from competition table columns
      const builtMap = {}
      comps.forEach(c => {
        if (c.rules_description || c.rules_duration || c.mark_criteria) {
          // Parse mark_criteria string → criteria array
          const criteriaArr = []
          if (c.mark_criteria) {
            c.mark_criteria.split(',').forEach(item => {
              const parts = item.split(/[:=]/)
              if (parts.length >= 2) {
                criteriaArr.push({ label: parts[0].trim(), mark: parts.slice(1).join(':').trim() })
              } else if (parts[0].trim()) {
                criteriaArr.push({ label: parts[0].trim(), mark: '' })
              }
            })
          }
          builtMap[c.id] = {
            description: c.rules_description || '',
            duration: c.rules_duration || '',
            criteria: criteriaArr.length > 0 ? criteriaArr : [{ label: '', mark: '' }]
          }
        }
      })
      setRulesMap(builtMap)
      localStorage.setItem('cache_competition_rules', JSON.stringify(builtMap))
    }
    setCategories(cats || [])
    if (cats) localStorage.setItem('cache_categories', JSON.stringify(cats))

    setAllStages(stages || [])
    if (stages) localStorage.setItem('cache_all_stages', JSON.stringify(stages))

    setAllInvig(invigs || [])
    if (invigs) localStorage.setItem('cache_all_invig', JSON.stringify(invigs))

    setAllJudges(judges || [])
    if (judges) localStorage.setItem('cache_all_judges', JSON.stringify(judges))

    setAllAnnouncers(announcers || [])
    if (announcers) localStorage.setItem('cache_all_announcers', JSON.stringify(announcers))

    // Build assignment map
    const map = {}
    ;(comps || []).forEach(c => { map[c.id] = { invig: [], judges: [] } })
    ;(ciRows || []).forEach(r => { if (map[r.competition_id]) map[r.competition_id].invig.push(r.invigilator_id) })
    ;(cjRows || []).forEach(r => { if (map[r.competition_id]) map[r.competition_id].judges.push(r.judge_id) })
    setAssignMap(map)
    localStorage.setItem('cache_assign_map', JSON.stringify(map))

    // Build participant counts map
    const counts = {}
    ;(comps || []).forEach(c => { counts[c.id] = 0 })
    ;(cpRows || []).forEach(r => {
      if (counts[r.competition_id] !== undefined) {
        counts[r.competition_id]++
      }
    })
    setParticipantCounts(counts)
    localStorage.setItem('cache_participant_counts', JSON.stringify(counts))

    // Build data status map for check-ins and scores
    const dMap = {}
    ;(comps || []).forEach(c => {
      const hasReports = (reportsRows || []).some(r => r.competition_id === c.id)
      const hasJudgeRes = (judgeResRows || []).some(r => r.competition_id === c.id)
      const isEnded = (schedRows || []).some(s => s.competition_id === c.id && s.status === 'completed')
      dMap[c.id] = { hasReports, hasJudgeRes, isEnded }
    })
    setDataStatusMap(dMap)
    localStorage.setItem('cache_data_status_map', JSON.stringify(dMap))

    // Build status map
    const sMap = {}
    ;(comps || []).forEach(c => {
      const res = (resRows || []).find(r => r.competition_id === c.id)
      const ds = dMap[c.id] || {}
      
      if (res) {
        sMap[c.id] = res.published ? 'Published' : 'Completed'
      } else if (ds.hasJudgeRes) {
        sMap[c.id] = 'Completed'
      } else if (ds.hasReports) {
        sMap[c.id] = 'Ongoing'
      } else {
        const hasSched = (schedRows || []).some(s => s.competition_id === c.id)
        sMap[c.id] = hasSched ? 'Scheduled' : 'Upcoming'
      }
    })
    setStatusMap(sMap)
    localStorage.setItem('cache_status_map', JSON.stringify(sMap))

    setFetching(false)
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return
    setDeleteConfirm({
      message: `Are you sure you want to delete ${selectedIds.length} competition(s)? This cannot be undone.`,
      onConfirm: async () => {
        setLoading(true)
        const { error } = await supabase.from('competitions').delete().in('id', selectedIds)
        setLoading(false)
        if (error) {
          alert(`Error deleting competitions: ${error.message}`)
        } else {
          setSelectedIds([])
          setBulkMode(false)
          fetchAll()
        }
      }
    })
  }

  // ── Inline assignment handlers ──

  async function handleStageChange(compId, stageId) {
    cancelEdit()
    setCompetitions(prev => prev.map(c => c.id === compId ? { ...c, stage_id: stageId } : c))
    supabase.from('competitions').update({ stage_id: stageId }).eq('id', compId).then()
  }

  async function handleAnnouncerChange(compId, announcerId) {
    cancelEdit()
    setCompetitions(prev => prev.map(c => c.id === compId ? { ...c, announcer_id: announcerId } : c))
    await Promise.all([
      supabase.from('competitions').update({ announcer_id: announcerId }).eq('id', compId),
      supabase.from('competition_results').update({ published: false }).eq('competition_id', compId)
    ])
  }

  async function handleToggleInvig(compId, invigId, isAssigned) {
    cancelEdit()
    if (isAssigned) {
      setAssignMap(prev => {
        const current = prev[compId]?.invig || []
        return { ...prev, [compId]: { ...prev[compId], invig: current.filter(id => id !== invigId) } }
      })
      supabase.from('competition_invigilators').delete().eq('competition_id', compId).eq('invigilator_id', invigId).then()
    } else {
      setAssignMap(prev => {
        return { ...prev, [compId]: { ...prev[compId], invig: [invigId] } }
      })
      await supabase.from('competition_invigilators').delete().eq('competition_id', compId)
      supabase.from('competition_invigilators').insert([{ competition_id: compId, invigilator_id: invigId }]).then()
    }
  }

  async function handleToggleJudge(compId, judgeId, isAssigned) {
    cancelEdit()
    if (isAssigned) {
      setAssignMap(prev => {
        const current = prev[compId]?.judges || []
        return { ...prev, [compId]: { ...prev[compId], judges: current.filter(id => id !== judgeId) } }
      })
      supabase.from('competition_judges').delete().eq('competition_id', compId).eq('judge_id', judgeId).then()
    } else {
      setAssignMap(prev => {
        return { ...prev, [compId]: { ...prev[compId], judges: [judgeId] } }
      })
      await supabase.from('competition_judges').delete().eq('competition_id', compId)
      supabase.from('competition_judges').insert([{ competition_id: compId, judge_id: judgeId }]).then()
    }
  }

  async function handleClearInvig(compId) {
    setAssignMap(prev => ({ ...prev, [compId]: { ...prev[compId], invig: [] } }))
    supabase.from('competition_invigilators').delete().eq('competition_id', compId).then()
  }

  async function handleClearJudge(compId) {
    setAssignMap(prev => ({ ...prev, [compId]: { ...prev[compId], judges: [] } }))
    supabase.from('competition_judges').delete().eq('competition_id', compId).then()
  }

  // ── Participants detail ──

  async function openParticipants(comp, e) {
    e?.stopPropagation()
    cancelEdit()
    scrollPosRef.current = listRef.current?.scrollTop || 0
    setSelected(comp); setEditing(null); setLoadingDetail(true)
    
    const [partRes, reportRes, judgeRes, gradeRes, placeRes] = await Promise.all([
      supabase
        .from('competition_participants')
        .select('participant_id, participants(id, name, chess_number, team_id, teams(id, name))')
        .eq('competition_id', comp.id),
      supabase
        .from('competition_reports')
        .select('code_letter, participant_id, chess_number')
        .eq('competition_id', comp.id),
      supabase
        .from('judge_results')
        .select('code_letter, points_raw, grade')
        .eq('competition_id', comp.id),
      supabase.from('point_settings').select('*'),
      supabase.from('placement_points').select('*')
    ])

    const parts = (partRes.data || []).map(r => r.participants).filter(Boolean)
    const reports = reportRes.data || []
    const scores = judgeRes.data || []
    const gradeSettings = gradeRes.data || []
    const placementPoints = placeRes.data || []

    const reportMap = {}
    reports.forEach(r => {
      if (r.participant_id) reportMap[r.participant_id] = r
    })

    const codeScoreMap = {}
    scores.forEach(s => {
      if (!codeScoreMap[s.code_letter]) codeScoreMap[s.code_letter] = { points: [], grade: s.grade }
      codeScoreMap[s.code_letter].points.push(s.points_raw)
    })

    const rankedCodes = Object.entries(codeScoreMap).map(([code, d]) => {
      const avg = d.points.reduce((a, b) => a + b, 0) / d.points.length
      const roundedAvg = Math.round(avg * 10) / 10
      const matchedGrade = gradeSettings.find(g => roundedAvg >= g.min_percent && roundedAvg <= g.max_percent)
      const gradeStr = matchedGrade?.grade || d.grade || '—'
      const gradePts = matchedGrade?.points || 0
      return { code, avg: roundedAvg, grade: gradeStr, gradePts }
    }).sort((a, b) => b.avg - a.avg)

    const rankMap = {}
    let totalTeamPtsSum = 0
    const catType = comp.is_group ? 'group' : 'single'

    rankedCodes.forEach((item, index) => {
      const rank = index + 1
      const matchedPlacement = placementPoints.find(p => p.position === rank && (p.competition_category === catType || !p.competition_category))
      const placePts = matchedPlacement ? (matchedPlacement.points || 0) : 0
      const teamPts = item.gradePts + placePts
      totalTeamPtsSum += teamPts

      rankMap[item.code] = {
        rank,
        avg: item.avg,
        grade: item.grade,
        gradePts: item.gradePts,
        placePts,
        teamPts
      }
    })

    // Sort participants by score (highest rank/score first)
    const sortedParts = [...parts].sort((a, b) => {
      const codeA = reportMap[a.id]?.code_letter
      const codeB = reportMap[b.id]?.code_letter
      const resA = codeA ? rankMap[codeA] : null
      const resB = codeB ? rankMap[codeB] : null

      if (resA && resB) return resB.avg - resA.avg
      if (resA) return -1
      if (resB) return 1
      return a.name.localeCompare(b.name)
    })

    setAssigned(sortedParts)
    setDetailData({
      reportMap,
      rankMap,
      reportsCount: reports.length,
      scoresCount: scores.length,
      totalTeamPoints: totalTeamPtsSum
    })
    setLoadingDetail(false)
  }

  async function removeParticipant(participantId) {
    if (!selected) return
    setRemoving(true)
    await supabase.from('competition_participants').delete()
      .eq('competition_id', selected.id)
      .eq('participant_id', participantId)
    setAssigned(prev => prev.filter(p => p.id !== participantId))
    setParticipantCounts(prev => ({ ...prev, [selected.id]: Math.max(0, (prev[selected.id] || 1) - 1) }))
    setRemoving(false)
  }

  useLayoutEffect(() => {
    if (!selected && listRef.current && scrollPosRef.current) {
      listRef.current.scrollTop = scrollPosRef.current
    }
  }, [selected])

  function handleBack() {
    setSelected(null)
  }

  // ── Edit / Submit ──

  function startEdit(comp, e) {
    e?.stopPropagation()
    setSelected(null)
    setEditing(comp)
    setName(comp.name)
    setCategoryId(comp.category_id || '')
    setMaxParticipants(String(comp.max_participants || 1))
    setCompetitionType(comp.competition_type || (comp.is_stage ? 'stage' : 'off-stage'))
    const rawSize = String(comp.group_size || 1)
    setGroupSize(rawSize === '45' ? '4' : rawSize)

    // Read rules directly from competition table columns
    setRuleDesc(comp.rules_description || '')
    setRuleDuration(comp.rules_duration || '')
    if (comp.mark_criteria) {
      const criteriaArr = []
      comp.mark_criteria.split(',').forEach(item => {
        const parts = item.split(/[:=]/)
        if (parts.length >= 2) {
          criteriaArr.push({ label: parts[0].trim(), mark: parts.slice(1).join(':').trim() })
        } else if (parts[0].trim()) {
          criteriaArr.push({ label: parts[0].trim(), mark: '' })
        }
      })
      setRuleCriteria(criteriaArr.length > 0 ? criteriaArr : [{ label: '', mark: '' }])
    } else {
      setRuleCriteria([{ label: '', mark: '' }])
    }
    setError(''); setSuccess('')
    setPanelOpen(true)
  }

  function cancelEdit() {
    setEditing(null)
    setName(''); setCategoryId(''); setMaxParticipants(''); setCompetitionType('off-stage'); setGroupSize('1')
    setRuleDesc(''); setRuleDuration(''); setRuleCriteria([{ label: '', mark: '' }])
    setError(''); setSuccess('')
    setPanelOpen(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Competition name is required.'); return }
    if (!categoryId) { setError('Category selection is required.'); return }
    
    const gs = parseInt(groupSize) || 1
    const isGroupComp = gs > 1
    
    if (!isGroupComp && !maxParticipants) {
      setError('Maximum participants selection is required.'); return
    }
    
    setLoading(true); setError(''); setSuccess('')
    const payload = {
      name: name.trim(),
      category_id: categoryId || null,
      max_participants: isGroupComp ? 1 : (parseInt(maxParticipants) || 1),
      competition_type: competitionType,
      is_stage: competitionType === 'stage',
      group_size: gs,
      is_group: isGroupComp,
    }

    let targetCompId = editing ? editing.id : null

    if (editing) {
      const { error } = await supabase.from('competitions').update(payload).eq('id', editing.id)
      if (error) { setLoading(false); setError(error.message); return }
    } else {
      const { data, error } = await supabase.from('competitions').insert([payload]).select()
      if (error) { setLoading(false); setError(error.message); return }
      if (data?.[0]?.id) targetCompId = data[0].id
    }

    const cleanCriteria = ruleCriteria.filter(c => c.label.trim() || c.mark.trim())
    const critStr = cleanCriteria.map(c => `${c.label}: ${c.mark}`).join(', ')

    // Save rules directly to competitions table columns
    if (targetCompId) {
      await supabase.from('competitions').update({
        rules_description: ruleDesc.trim(),
        rules_duration: ruleDuration.trim(),
        mark_criteria: critStr,
      }).eq('id', targetCompId)
    }

    setLoading(false)
    if (editing) {
      setSuccess('Competition updated!'); cancelEdit()
    } else {
      setSuccess('Competition added!')
      setName(''); setCategoryId(''); setMaxParticipants(''); setCompetitionType('off-stage'); setGroupSize('1')
      setRuleDesc(''); setRuleDuration(''); setRuleCriteria([])
    }
    fetchAll()
    setTimeout(() => setSuccess(''), 2500)
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    const comp = competitions.find(c => c.id === id)
    const nameStr = comp ? ` "${comp.name}"` : ""
    setDeleteConfirm({
      message: `Are you sure you want to delete competition${nameStr}? This will permanently delete the competition and all related schedules, registrations, and results.`,
      onConfirm: async () => {
        if (editing?.id === id) cancelEdit()
        
        // Manual cascade to avoid foreign key constraint errors
        await supabase.from('judges_competitions').delete().eq('competition_id', id)
        await supabase.from('invigilators_competitions').delete().eq('competition_id', id)
        await supabase.from('competition_results').delete().eq('competition_id', id)
        await supabase.from('competition_schedule').delete().eq('competition_id', id)
        await supabase.from('registrations').delete().eq('competition_id', id)
        
        const { error } = await supabase.from('competitions').delete().eq('id', id)
        if (error) {
          alert('Failed to delete competition: ' + error.message)
        }
      }
    })
  }

  function handleResetInvigilator(id, compName) {
    setDeleteConfirm({
      message: `⚠️ Clear Invigilator check-ins for "${compName}"? This will reset all check-ins, code letters, and entered Judge scores. Participants will remain registered.`,
      onConfirm: async () => {
        setLoading(true)
        await supabase.from('judge_results').delete().eq('competition_id', id)
        await supabase.from('competition_results').delete().eq('competition_id', id)
        await supabase.from('competition_reports').delete().eq('competition_id', id)
        await supabase.from('competition_schedule').delete().eq('competition_id', id)
        await fetchAll()
        if (selected && selected.id === id) {
          await openParticipants(selected)
        }
        setLoading(false)
        setSuccess('Invigilator & judge data reset successfully.')
        setTimeout(() => setSuccess(''), 3000)
      }
    })
  }

  function handleResetJudges(id, compName) {
    setDeleteConfirm({
      message: `⚠️ Clear Judge scores for "${compName}"? This will permanently delete all entered scores and rankings.`,
      onConfirm: async () => {
        setLoading(true)
        await supabase.from('judge_results').delete().eq('competition_id', id)
        await supabase.from('competition_results').delete().eq('competition_id', id)
        await fetchAll()
        if (selected && selected.id === id) {
          await openParticipants(selected)
        }
        setLoading(false)
        setSuccess('Judge scores reset successfully.')
        setTimeout(() => setSuccess(''), 3000)
      }
    })
  }

  const displayedCompetitions = competitions
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.categories?.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const catA = a.categories?.name || ''
      const catB = b.categories?.name || ''
      const catComp = catA.localeCompare(catB, undefined, { numeric: true, sensitivity: 'base' })
      if (catComp !== 0) return catComp
      return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
    })

  return (
    <>
      <div className={`section-root${panelOpen ? ' panel-open' : ''}`}>
      <div className="section-list" ref={listRef}>

        {selected ? (
          /* ── Participants Detail ── */
          <>
            <div className="list-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
              <button className="td-link-plain" style={{ fontSize: 11, letterSpacing: 0.5, display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }} onClick={handleBack}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, display: 'block', flexShrink: 0 }}>
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Back to Competitions</span>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="list-title">{selected.name}</span>
                  {(() => {
                    const rawSt = statusMap[selected.id] || 'Pending'
                    const ds = dataStatusMap[selected.id] || { hasReports: false, hasJudgeRes: false, isEnded: false }

                    let st = rawSt
                    if (rawSt === 'Published') st = 'Published'
                    else if (rawSt === 'Completed' || ds.hasJudgeRes) st = 'Completed'
                    else if (ds.isEnded) st = 'Ended'
                    else if (rawSt === 'Ongoing' || ds.hasReports) st = 'Ongoing'
                    else if (rawSt === 'Scheduled') st = 'Scheduled'
                    else st = 'Pending'

                    const styleMap = {
                      Published: { color: '#4f9cf9', bg: 'rgba(79, 156, 249, 0.15)' },
                      Completed: { color: '#2ed573', bg: 'rgba(46, 213, 115, 0.15)' },
                      Ended: { color: '#ff5252', bg: 'rgba(255, 82, 82, 0.15)' },
                      Ongoing: { color: '#f59f00', bg: 'rgba(245, 159, 0, 0.15)' },
                      Scheduled: { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
                      Pending: { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.05)' }
                    }

                    const { color, bg } = styleMap[st] || styleMap.Pending

                    return (
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: bg, color: color, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        {st}
                      </span>
                    )
                  })()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {dataStatusMap[selected.id]?.hasReports && (
                    <button 
                      onClick={() => handleResetInvigilator(selected.id, selected.name)}
                      className="btn-cancel-edit" 
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(237, 33, 36, 0.08)',
                        borderColor: 'rgba(237, 33, 36, 0.3)',
                        color: '#ff6b6b',
                        padding: '4px 10px',
                        height: 28,
                        fontSize: 11,
                        fontWeight: 600
                      }}
                      title="Clear invigilator check-ins & judge scores"
                    >
                      <span>↻ Reset Check-ins</span>
                    </button>
                  )}
                  {dataStatusMap[selected.id]?.hasJudgeRes && (
                    <button 
                      onClick={() => handleResetJudges(selected.id, selected.name)}
                      className="btn-cancel-edit" 
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(245, 159, 0, 0.08)',
                        borderColor: 'rgba(245, 159, 0, 0.3)',
                        color: '#ff9f43',
                        padding: '4px 10px',
                        height: 28,
                        fontSize: 11,
                        fontWeight: 600
                      }}
                      title="Clear judge scores"
                    >
                      <span>↻ Reset Scores</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '4px 0 14px 0', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
              {selected.categories?.name && (
                <>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Category: <strong style={{ color: 'var(--text-primary)' }}>{selected.categories.name}</strong>
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>•</span>
                </>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Type: <strong style={{ color: 'var(--text-primary)' }}>{selected.is_group ? `Group (${selected.group_size} Members)` : 'Individual'}</strong>
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Max / Team: <strong style={{ color: 'var(--text-primary)' }}>{selected.is_group ? (selected.group_size || 1) : (selected.max_participants || 1)}</strong>
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>•</span>
              <span style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                background: selected.is_stage ? 'rgba(249, 115, 22, 0.12)' : 'rgba(79, 156, 249, 0.12)',
                color: selected.is_stage ? '#fb923c' : '#60a5fa',
                fontWeight: 600,
                letterSpacing: 0.2,
                textTransform: 'uppercase'
              }}>
                {selected.is_stage ? 'Stage' : 'Off-Stage'}
              </span>

              {rulesMap[selected.id] && (
                <button
                  onClick={e => { e.stopPropagation(); setViewingRules(selected); }}
                  className="btn-cancel-edit"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'rgba(237, 33, 36, 0.08)',
                    borderColor: 'rgba(237, 33, 36, 0.25)',
                    color: '#ff6b6b',
                    fontSize: '11px',
                    padding: '3px 10px',
                    marginLeft: 'auto',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="View competition rules"
                >
                  <IconRules />
                  <span>നിയമാവലി</span>
                </button>
              )}
            </div>

            {loadingDetail ? (
              <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
            ) : assigned.length === 0 ? (
              <div className="empty-state">
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No participants assigned — teams assign from their dashboard.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 14px', flex: 1 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Registered</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{assigned.length}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 14px', flex: 1 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Invigilator Check-Ins</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#2ed573' }}>{detailData.reportsCount} / {assigned.length}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 14px', flex: 1 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Judge Scores</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#ff9f43' }}>{detailData.scoresCount > 0 ? 'Submitted' : 'Pending'}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 14px', flex: 1 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Points</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#38ef7d' }}>+{detailData.totalTeamPoints || 0} pts</span>
                  </div>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Team</th>
                      <th style={{ borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: 14 }}>Chess #</th>
                      <th style={{ paddingLeft: 14 }}>Check-In</th>
                      <th style={{ borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: 14 }}>Code</th>
                      <th style={{ paddingLeft: 14 }}>Judge Score</th>
                      <th>Grade</th>
                      <th>Points</th>
                      <th style={{ width: '10%' }}>Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assigned.map(p => {
                      const rep = detailData.reportMap[p.id]
                      const code = rep?.code_letter
                      const res = code ? detailData.rankMap[code] : null
                      const rawSt = statusMap[selected.id] || 'Pending'
                      const ds = dataStatusMap[selected.id] || { hasReports: false, hasJudgeRes: false, isEnded: false }
                      let st = rawSt
                      if (rawSt === 'Published') st = 'Published'
                      else if (rawSt === 'Completed' || ds.hasJudgeRes) st = 'Completed'
                      else if (ds.isEnded) st = 'Ended'
                      else if (rawSt === 'Ongoing' || ds.hasReports) st = 'Ongoing'
                      else if (rawSt === 'Scheduled') st = 'Scheduled'
                      else st = 'Pending'

                      const isCompOver = ['Ended', 'Completed', 'Published'].includes(st)

                      return (
                        <tr key={p.id}>
                          <td className="td-name">{p.name}</td>
                          <td>
                            {p.teams?.name ? (
                              (() => {
                                const tId = p.teams.id || p.team_id
                                const tColor = (tId && teamColors) ? teamColors[tId] : (p.teams?.color || null)
                                return (
                                  <span className="td-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{
                                      width: 7,
                                      height: 7,
                                      borderRadius: '50%',
                                      background: tColor || 'var(--accent)',
                                      flexShrink: 0,
                                      boxShadow: tColor ? `0 0 6px ${tColor}` : 'none'
                                    }} />
                                    <span>{p.teams.name}</span>
                                  </span>
                                )
                              })()
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                            )}
                          </td>
                          <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--text-muted)', borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: 14 }}>
                            {p.chess_number || '—'}
                          </td>
                          <td style={{ paddingLeft: 14 }}>
                            {rep ? (
                              <span style={{ color: '#2ed573', background: 'rgba(46, 213, 115, 0.12)', border: '1px solid rgba(46, 213, 115, 0.3)', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                                ✓ Checked In
                              </span>
                            ) : isCompOver ? (
                              <span style={{ color: '#ff6b6b', opacity: 0.85, fontSize: 11, fontWeight: 500 }}>
                                Absent
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>— Pending</span>
                            )}
                          </td>
                          <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11, fontWeight: 700, color: code ? 'var(--accent-light)' : 'var(--text-muted)', borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: 14 }}>
                            {code ? `Code ${code}` : '—'}
                          </td>
                          <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, fontWeight: 700, color: res ? '#ff9f43' : 'var(--text-muted)', paddingLeft: 14 }}>
                            {res ? `${res.avg} pt` : '—'}
                          </td>
                          <td style={{ fontSize: 11, fontWeight: 700, color: res?.grade && res.grade !== '—' ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                            {res?.grade && res.grade !== '—' ? `${res.grade} Grade` : '—'}
                          </td>
                          <td>
                            {res ? (
                              <span style={{ color: '#38ef7d', background: 'rgba(56, 239, 125, 0.12)', border: '1px solid rgba(56, 239, 125, 0.25)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                                +{res.teamPts} pts
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                            )}
                          </td>
                          <td>
                            {res ? (
                              <span style={{ fontSize: 11, fontWeight: 700, color: res.rank === 1 ? '#ffd700' : res.rank === 2 ? '#c0c0c0' : res.rank === 3 ? '#cd7f32' : 'var(--text-primary)' }}>
                                {res.rank === 1 ? '🥇 1st' : res.rank === 2 ? '🥈 2nd' : res.rank === 3 ? '🥉 3rd' : `${res.rank}th`}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          /* ── Competitions List in a beautiful structured Table with inline dropdowns ── */
          <>
            <div className="list-header" style={{ gap: 10 }}>
                    <span className="list-title">All Competitions</span>
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
                          placeholder="Search competitions…"
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
                      <span className="list-count">{displayedCompetitions.length} total</span>
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
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent-light)', marginLeft: 10, display: 'inline-block', minWidth: 90, textAlign: 'center', whiteSpace: 'nowrap' }}>
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
                            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 10, display: 'inline-block', minWidth: 90, textAlign: 'center', whiteSpace: 'nowrap' }}>
                              Select items...
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            className="btn-cancel-edit"
                            onClick={handleExportCSV}
                            title="Export all competitions to CSV backup"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Export CSV
                          </button>
                          <button
                            className={panelOpen ? "btn-cancel-edit" : "btn-submit"}
                            style={panelOpen ? { borderColor: 'rgba(237, 33, 36, 0.4)', color: '#ff6b6b' } : {}}
                            onClick={() => {
                              if (panelOpen) {
                                cancelEdit()
                              } else {
                                setEditing(null); setMode('add'); setPanelOpen(true)
                              }
                            }}
                          >
                            {panelOpen ? (
                              <>✕ Close</>
                            ) : (
                              <><IconPlus /> Add</>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {fetching ? (
                    <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
                  ) : competitions.length === 0 ? (
                    <div className="empty-state"><IconTrophy /><p>No competitions yet.</p></div>
                  ) : (
                    <table className={`data-table ${bulkMode ? 'bulk-mode-active' : ''}`}>
                      <thead>
                        <tr>
                          {bulkMode && (
                            <th className="th-checkbox">
                              <input
                                type="checkbox"
                                className="bulk-checkbox"
                                checked={selectedIds.length === displayedCompetitions.length && selectedIds.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedIds(displayedCompetitions.map(c => c.id))
                                  else setSelectedIds([])
                                }}
                              />
                            </th>
                          )}
                          <th style={{ width: '45%' }}>Competition</th>
                          <th style={{ width: '11%' }}>Stage</th>
                          <th style={{ width: '12%' }}>Invigilator</th>
                          <th style={{ width: '12%' }}>Judge</th>
                          <th style={{ width: '12%' }}>Announcer</th>
                          <th style={{ width: '8%' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedCompetitions.map((c, index) => {
                          const isSaving = saving === c.id
                          const myInvig = assignMap[c.id]?.invig || []
                          const myJudges = assignMap[c.id]?.judges || []
                          const isSelected = selectedIds.includes(c.id)
                          const filteredCompetitions = displayedCompetitions
                    return (
                      <tr 
                        key={c.id} 
                        style={{ cursor: bulkMode ? 'pointer' : 'default' }}
                        className={`${editing?.id === c.id ? 'row-editing' : ''} ${isSelected ? 'row-selected' : ''}`}
                        onClick={(e) => {
                          cancelEdit()
                          if (!bulkMode) return
                          e.stopPropagation()
                          
                          if (e.shiftKey && window.getSelection) {
                            window.getSelection().removeAllRanges()
                          }

                          const checked = !isSelected
                          if (e.shiftKey && lastSelectedIndex !== null) {
                            const start = Math.min(index, lastSelectedIndex)
                            const end = Math.max(index, lastSelectedIndex)
                            const rangeIds = filteredCompetitions.slice(start, end + 1).map(item => item.id)
                            if (checked) {
                              setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])))
                            } else {
                              setSelectedIds(prev => prev.filter(id => !rangeIds.includes(id)))
                            }
                          } else {
                            if (checked) setSelectedIds(prev => [...prev, c.id])
                            else setSelectedIds(prev => prev.filter(id => id !== c.id))
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
                        <td 
                          onClick={(e) => { if (!bulkMode) openParticipants(c, e) }}
                          style={{ cursor: !bulkMode ? 'pointer' : 'default' }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="td-name">{c.name}</span>
                              {(() => {
                                const rawSt = statusMap[c.id] || 'Pending'
                                const ds = dataStatusMap[c.id] || { hasReports: false, hasJudgeRes: false, isEnded: false }

                                let st = rawSt
                                if (rawSt === 'Published') st = 'Published'
                                else if (rawSt === 'Completed' || ds.hasJudgeRes) st = 'Completed'
                                else if (ds.isEnded) st = 'Ended'
                                else if (rawSt === 'Ongoing' || ds.hasReports) st = 'Ongoing'
                                else if (rawSt === 'Scheduled') st = 'Scheduled'
                                else st = 'Pending'

                                const styleMap = {
                                  Published: { color: '#4f9cf9', bg: 'rgba(79, 156, 249, 0.15)' },
                                  Completed: { color: '#2ed573', bg: 'rgba(46, 213, 115, 0.15)' },
                                  Ended: { color: '#ff5252', bg: 'rgba(255, 82, 82, 0.15)' },
                                  Ongoing: { color: '#f59f00', bg: 'rgba(245, 159, 0, 0.15)' },
                                  Scheduled: { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
                                  Pending: { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.05)' }
                                }

                                const { color, bg } = styleMap[st] || styleMap.Pending

                                return (
                                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: bg, color: color, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                    {st}
                                  </span>
                                )
                              })()}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {c.categories?.name && (
                                <>
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                                    {c.categories.name}
                                  </span>
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>•</span>
                                </>
                              )}
                              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
                                {c.is_group ? `Group (${c.group_size})` : 'Individual'}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>•</span>
                              <span style={{
                                fontSize: 10,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: c.is_stage ? 'rgba(249, 115, 22, 0.12)' : 'rgba(79, 156, 249, 0.12)',
                                color: c.is_stage ? '#fb923c' : '#60a5fa',
                                fontWeight: 600,
                                letterSpacing: 0.2,
                                textTransform: 'uppercase'
                              }}>
                                {c.is_stage ? 'Stage' : 'Off-Stage'}
                              </span>
                              {(() => {
                                const pCount = participantCounts[c.id] || 0
                                const hasParts = pCount > 0
                                const maxTeam = c.is_group ? (c.group_size || 1) : (c.max_participants || 1)

                                return (
                                  <>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>•</span>
                                    <button
                                      onClick={e => openParticipants(c, e)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: hasParts ? 'var(--accent-dim)' : 'rgba(255,255,255,0.04)',
                                        border: hasParts ? '1px solid var(--border-subtle)' : '1px solid rgba(255,255,255,0.08)',
                                        color: hasParts ? 'var(--accent-light)' : 'var(--text-muted)',
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        fontFamily: 'inherit',
                                        transition: 'all 0.15s'
                                      }}
                                      className="ci-participants-badge"
                                      title="View participants"
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                      </svg>
                                      <span style={{ fontWeight: 700 }}>{pCount}</span>
                                    </button>
                                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
                                      (Max: {maxTeam}/Team)
                                    </span>
                                  </>
                                )
                              })()}
                            </div>
                          </div>
                        </td>
                        <td>
                          <SingleSelectDropdown
                            label="Stage"
                            allItems={allStages}
                            selectedId={c.stage_id}
                            onSelect={id => handleStageChange(c.id, id)}
                          />
                        </td>
                        <td>
                          <MultiSelectDropdown
                            label="Invigilator"
                            allItems={allInvig}
                            selectedIds={myInvig}
                            onToggle={(id, isA) => handleToggleInvig(c.id, id, isA)}
                            onClear={() => handleClearInvig(c.id)}
                            hasData={dataStatusMap[c.id]?.hasReports}
                            dataColor="#2ed573"
                          />
                        </td>
                        <td>
                          <MultiSelectDropdown
                            label="Judge"
                            allItems={allJudges}
                            selectedIds={myJudges}
                            onToggle={(id, isA) => handleToggleJudge(c.id, id, isA)}
                            onClear={() => handleClearJudge(c.id)}
                            hasData={dataStatusMap[c.id]?.hasJudgeRes}
                            dataColor="#ff9f43"
                          />
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          {/* Announcer: single click assign/unassign */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {allAnnouncers.length === 0
                              ? <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                              : allAnnouncers.map(ann => {
                                  const isAssigned = c.announcer_id === ann.id
                                  return (
                                    <button key={ann.id} type="button"
                                      onClick={() => handleAnnouncerChange(c.id, isAssigned ? null : ann.id)}
                                      disabled={isSaving}
                                      style={{
                                        fontSize: 11, padding: '4px 10px', borderRadius: 6,
                                        border: `1px solid ${isAssigned ? 'rgba(79, 156, 249, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                                        background: isAssigned ? 'var(--accent-dim)' : 'rgba(255, 255, 255, 0.02)',
                                        color: isAssigned ? 'var(--accent)' : 'var(--text-muted)',
                                        cursor: 'pointer', fontFamily: 'inherit',
                                        transition: 'all 0.15s',
                                        fontWeight: isAssigned ? 600 : 500,
                                      }}
                                    >
                                      <span key={isAssigned ? 'y' : 'n'} className="text-slide-up">
                                        {ann.name}
                                      </span>
                                    </button>
                                  )
                                })
                            }
                          </div>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                            {isSaving && <div className="spin" style={{ width: 12, height: 12, borderTopColor: 'var(--accent-light)' }} />}
                            {rulesMap[c.id] && (
                              <button className="btn-icon" style={{ color: '#ff6b6b' }} title="View Rules" onClick={e => { e.stopPropagation(); cancelEdit(); setViewingRules(c); }}>
                                <IconRules />
                              </button>
                            )}
                            <button className="btn-icon" title="Edit" onClick={e => { e.stopPropagation(); startEdit(c, e) }}><IconEdit /></button>
                            <button className="btn-delete" title="Delete" onClick={e => { e.stopPropagation(); cancelEdit(); handleDelete(c.id, e) }}><IconTrash /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      <div className="section-form-panel">
        {!editing && (
          <div className="bulk-mode-tabs">
            <button className={`bulk-tab ${mode === 'add' ? 'active' : ''}`} type="button" onClick={() => setMode('add')}>Add</button>
            <button className={`bulk-tab ${mode === 'import' ? 'active' : ''}`} type="button" onClick={() => setMode('import')}>Import CSV</button>
            <button className="btn-icon" style={{ marginLeft: 'auto', padding: '8px' }} onClick={() => { cancelEdit(); setPanelOpen(false) }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        {editing && (
          <div className="form-panel-header">
            <p className="form-panel-title">Edit Competition</p>
            <button className="btn-icon" style={{ padding: '8px' }} onClick={cancelEdit} title="Cancel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        {(mode === 'add' || editing) && (
          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="form-fields">
              <div className="field">
                <label className="field-lbl">Competition Name</label>
                <input className="field-inp" value={name}
                  onChange={e => { setName(e.target.value); setError('') }} />
              </div>
              <div className="field">
                <label className="field-lbl">Category</label>
                <FormSingleSelect
                  label="Select Category"
                  allItems={categories}
                  selectedId={categoryId}
                  onSelect={setCategoryId}
                />
              </div>
              {groupSize === '1' && (
                <div className="field">
                  <label className="field-lbl">Maximum Participants</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[1, 2, 3, 4].map(num => (
                      <button
                        key={num}
                        type="button"
                        className={`radio-opt ${parseInt(maxParticipants) === num ? 'active' : ''}`}
                        style={{ flex: 1, justifyContent: 'center', height: 38 }}
                        onClick={() => setMaxParticipants(String(num))}
                      >
                        <span className={`radio-dot ${parseInt(maxParticipants) === num ? 'active' : ''}`} />
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="field">
                <label className="field-lbl">Competition Type</label>
                <div className="radio-group">
                  {[['off-stage', 'Off-Stage'], ['stage', 'Stage']].map(([val, lbl]) => (
                    <label key={val} className={`radio-opt ${competitionType === val ? 'active' : ''}`}
                      onClick={() => setCompetitionType(val)}>
                      <span className={`radio-dot ${competitionType === val ? 'active' : ''}`} />
                      {lbl}
                    </label>
                  ))}
                </div>
              </div>
              <div className="field">
                <label className="field-lbl">Group Size</label>
                <div className="radio-group">
                  {[['1','Individual'],['2','2 Members'],['3','3 Members'],['4','4 Members'],['5','5 Members']].map(([val, lbl]) => (
                    <label key={val} className={`radio-opt ${groupSize === val ? 'active' : ''}`}
                      onClick={() => setGroupSize(val)}>
                      <span className={`radio-dot ${groupSize === val ? 'active' : ''}`} />
                      {lbl}
                    </label>
                  ))}
                </div>
              </div>
              <div className="field" style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: 14, marginTop: 10 }}>
                <label className="field-lbl" style={{ color: 'var(--accent-light)', fontWeight: 700 }}>
                  📜 നിയമാവലി <span style={{ opacity: 0.5, fontWeight: 400 }}>(Optional)</span>
                </label>
                
                {/* 1. Description */}
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>വിവരണം</span>
                  <textarea
                    className="field-inp"
                    style={{ minHeight: 65, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, fontSize: 12, padding: '8px 10px' }}
                    placeholder="ഉദാ: പ്രവാചകന്മാർ, സ്വഹാബിവര്യർ എന്നിവരെ മദ്ഹ് ചെയ്തുള്ള ഗാനങ്ങൾ..."
                    value={ruleDesc}
                    onChange={e => setRuleDesc(e.target.value)}
                  />
                </div>

                {/* 2. Duration */}
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>സമയം</span>
                  <input
                    className="field-inp"
                    style={{ fontSize: 12, padding: '6px 10px' }}
                    placeholder="ഉദാ: 5 മിനുട്ട്"
                    value={ruleDuration}
                    onChange={e => setRuleDuration(e.target.value)}
                  />
                </div>

                {/* 3. Evaluation Breakdown / Dynamic Criteria */}
                {(() => {
                  const totalMarksSum = ruleCriteria.reduce((sum, item) => sum + (parseFloat(item.mark) || 0), 0)
                  return (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      padding: 10,
                      marginTop: 4
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>മാർക്ക് വിഭജനം</span>
                          {totalMarksSum > 0 && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              background: 'rgba(81, 207, 102, 0.15)',
                              border: '1px solid rgba(81, 207, 102, 0.3)',
                              color: '#51cf66',
                              padding: '1px 6px',
                              borderRadius: 8
                            }}>
                              Total: {totalMarksSum}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={addCriteriaRow}
                          style={{
                            background: 'var(--accent-dim)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--accent-light)',
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 5,
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          + Add Section
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {ruleCriteria.map((c, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, width: 14, textAlign: 'center' }}>
                              {idx + 1}.
                            </span>
                            <input
                              className="field-inp"
                              style={{ flex: 2, fontSize: 12, padding: '6px 8px', borderRadius: 5 }}
                              placeholder="വിഷയം (ഉദാ: സാഹിത്യം)"
                              value={c.label}
                              onChange={e => updateCriteriaRow(idx, 'label', e.target.value)}
                            />
                            <input
                              className="field-inp"
                              style={{ flex: 1, fontSize: 12, padding: '6px 8px', borderRadius: 5, maxWidth: 90 }}
                              placeholder="മാർക്ക്"
                              type="number"
                              value={c.mark}
                              onChange={e => updateCriteriaRow(idx, 'mark', e.target.value)}
                            />
                            {(ruleCriteria.length > 1 || c.label || c.mark) && (
                              <button
                                type="button"
                                onClick={() => removeCriteriaRow(idx)}
                                style={{
                                  background: 'rgba(255, 107, 107, 0.08)',
                                  border: '1px solid rgba(255, 107, 107, 0.2)',
                                  color: '#ff6b6b',
                                  borderRadius: 5,
                                  width: 28,
                                  height: 28,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  flexShrink: 0
                                }}
                                title="Remove"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
              {error && <p className="form-error">⚠ {error}</p>}
              {success && <p className="form-success">✓ {success}</p>}
              <button className="btn-submit" type="submit" disabled={loading}>
                {loading ? <span className="spin" /> : editing ? <IconCheck /> : <IconPlus />}
                {loading ? 'Saving...' : editing ? 'Save Changes' : 'Add Competition'}
              </button>
            </div>
          </form>
        )}
        {mode === 'import' && !editing && (
          <BulkImporter
            columns={COMP_COLS}
            sampleRows={COMP_SAMPLE}
            onImport={handleBulkImport}
            filename="competitions_template.csv"
          />
        )}
      </div>
    </div>

      {deleteConfirm && createPortal(
        <div className="dash-modal-overlay" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div className="dash-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#e07c7c' }}>
              Confirm Action
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 20 }}>
              {deleteConfirm.message}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn-cancel-edit" 
                disabled={deleting}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 6, cursor: deleting ? 'not-allowed' : 'pointer', fontSize: 12, opacity: deleting ? 0.5 : 1 }}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-delete" 
                disabled={deleting}
                style={{ padding: '8px 16px', background: '#e07c7c', color: '#0e0b07', border: 'none', borderRadius: 6, cursor: deleting ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 80, justifyContent: 'center' }}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await deleteConfirm.onConfirm();
                  } catch (err) {
                    console.error("Action error:", err);
                  } finally {
                    setDeleting(false);
                    setDeleteConfirm(null);
                  }
                }}
              >
                {deleting ? (
                  <>
                    <span className="spin" style={{ width: 12, height: 12, borderTopColor: '#0e0b07' }} />
                    <span>Processing...</span>
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {viewingRules && createPortal(
        <div className="dash-modal-overlay" onClick={() => setViewingRules(null)}>
          <div className="dash-modal" style={{ maxWidth: 560, padding: 24, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--accent-light)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>മത്സര നിയമാവലി</span>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>
                  📜 {viewingRules.name}
                </h3>
              </div>
              <button className="btn-cancel-edit" onClick={() => setViewingRules(null)}>✕ Close</button>
            </div>

            {(() => {
              const rObj = rulesMap[viewingRules.id]
              if (!rObj) return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>നിയമാവലികൾ ഒന്നും നൽകിയിട്ടില്ല.</p>
              
              const isLegacyStr = typeof rObj === 'string'
              const desc = isLegacyStr ? rObj : rObj.description
              const duration = isLegacyStr ? '' : rObj.duration
              const criteria = (isLegacyStr || !Array.isArray(rObj.criteria)) ? [] : rObj.criteria

              const totalMarks = criteria.reduce((sum, item) => sum + (parseFloat(item.mark) || 0), 0)

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
                  {/* Header info badges */}
                  {(duration || totalMarks > 0) && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {duration && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent-dim)', border: '1px solid var(--border-subtle)', color: 'var(--accent-light)', padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                          <span>⏱️ സമയം:</span> <span>{duration}</span>
                        </div>
                      )}
                      {totalMarks > 0 && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(46, 213, 115, 0.12)', border: '1px solid rgba(46, 213, 115, 0.3)', color: '#2ed573', padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                          <span>🎯 ആകെ മാർക്ക്:</span> <span>{totalMarks}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  {desc && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: '4px solid var(--accent)',
                      borderRadius: 8,
                      padding: '14px 16px',
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      lineHeight: 1.7,
                      whiteSpace: 'pre-line'
                    }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>വിശദീകരണം / Topic</p>
                      {desc}
                    </div>
                  )}

                  {/* Evaluation Criteria Table */}
                  {criteria.length > 0 && (
                    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 14px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                        മാർക്ക് വിഭജനം (Evaluation Criteria)
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)', fontSize: 11, textAlign: 'left' }}>
                            <th style={{ padding: '8px 14px' }}>വിഷയം / Section</th>
                            <th style={{ padding: '8px 14px', width: 110, textAlign: 'right' }}>മാർക്ക്</th>
                          </tr>
                        </thead>
                        <tbody>
                          {criteria.map((item, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '10px 14px', color: 'var(--text-primary)', fontWeight: 500 }}>{item.label || '—'}</td>
                              <td style={{ padding: '10px 14px', color: 'var(--accent-light)', fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
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
        </div>,
        document.body
      )}
    </>
  )
}
