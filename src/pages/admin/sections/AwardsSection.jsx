// src/pages/admin/sections/AwardsSection.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { jsPDF } from 'jspdf'
import '../sections.css'

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const IconAward = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36, color: 'var(--accent-light)' }}>
    <circle cx="12" cy="8" r="7"/>
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
  </svg>
)
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

export default function AwardsSection() {
  const [competitions, setCompetitions] = useState([])
  const [selectedComp, setSelectedComp] = useState(null)
  const [winners, setWinners] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCat, setSelectedCat] = useState('all')
  const [search, setSearch] = useState('')
  const [loadingComps, setLoadingComps] = useState(true)
  const [loadingWinners, setLoadingWinners] = useState(false)
  const [stats, setStats] = useState({ total: 0, delivered: 0, pending: 0 })

  useEffect(() => {
    fetchCompetitions()
    
    // Realtime listener for competition_results changes to update winner ticks instantly
    const ch = supabase.channel('rt-awards-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_results' }, () => {
        fetchCompetitions(false)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  // Auto-refresh winners if the active competition results change in background
  useEffect(() => {
    if (selectedComp) {
      loadWinners(selectedComp.id)
    }
  }, [competitions])

  async function fetchCompetitions(showLoader = true) {
    if (showLoader) setLoadingComps(true)
    
    // Fetch all published, individual competitions
    const { data: resultsData } = await supabase
      .from('competition_results')
      .select('id, position, prize_given, prize_given_to_leader, competition_id, competitions(id, name, is_group, category_id, categories(id, name))')
      .eq('published', true)

    if (resultsData) {
      // Filter results: only individual events and position 1 or 2
      const filteredResults = resultsData.filter(r => 
        r.competitions && 
        !r.competitions.is_group && 
        (r.position === 1 || r.position === 2)
      )

      // Calculate stats
      let tot = filteredResults.length
      let del = filteredResults.filter(r => r.prize_given).length
      setStats({ total: tot, delivered: del, pending: tot - del })

      // Extract unique competitions
      const compMap = {}
      filteredResults.forEach(r => {
        const c = r.competitions
        if (!compMap[c.id]) {
          compMap[c.id] = {
            id: c.id,
            name: c.name,
            category_id: c.category_id,
            category_name: c.categories?.name || 'Uncategorized',
            prizes_count: 0,
            prizes_delivered: 0
          }
        }
        compMap[c.id].prizes_count += 1
        if (r.prize_given) {
          compMap[c.id].prizes_delivered += 1
        }
      })

      const compsList = Object.values(compMap).sort((a, b) => a.name.localeCompare(b.name))
      setCompetitions(compsList)

      // Extract unique categories
      const uniqueCats = {}
      compsList.forEach(c => {
        if (c.category_id) {
          uniqueCats[c.category_id] = c.category_name
        }
      })
      setCategories(Object.entries(uniqueCats).map(([id, name]) => ({ id, name })))
    }
    
    if (showLoader) setLoadingComps(false)
  }

  async function loadWinners(compId) {
    setLoadingWinners(true)
    const { data } = await supabase
      .from('competition_results')
      .select('id, position, prize_given, prize_given_to_leader, prize_given_at, participant_id, participants(name, chess_number, teams(name))')
      .eq('competition_id', compId)
      .in('position', [1, 2])
      .eq('published', true)

    if (data) {
      const sorted = data.sort((a, b) => a.position - b.position)
      setWinners(sorted)
    }
    setLoadingWinners(false)
  }

  const handleCompSelect = (comp) => {
    setSelectedComp(comp)
    loadWinners(comp.id)
  }

  const togglePrize = async (resultId, field, value) => {
    try {
      const updates = { [field]: value }
      if (field === 'prize_given') {
        updates.prize_given_at = value ? new Date().toISOString() : null
        if (!value) {
          updates.prize_given_to_leader = false // Reset leader if unchecked
        }
      }
      const { error } = await supabase
        .from('competition_results')
        .update(updates)
        .eq('id', resultId)

      if (error) throw error
      
      // Update local state smoothly
      setWinners(prev => prev.map(w => {
        if (w.id === resultId) {
          const next = { ...w, ...updates }
          return next
        }
        return w
      }))
    } catch (e) {
      console.error(e)
      alert('Failed to update prize status')
    }
  }

  const downloadPDFReport = async () => {
    const doc = new jsPDF()
    
    // Header styling
    doc.setFillColor(13, 17, 23)
    doc.rect(0, 0, 220, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('INSPICO ART FESTIVAL', 15, 18)
    
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(180, 180, 180)
    doc.text('PRIZE DISTRIBUTION TRACKING LOG (INDIVIDUAL EVENTS)', 15, 25)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 31)

    // Stats Grid
    doc.setFillColor(30, 41, 59)
    doc.roundedRect(15, 48, 180, 20, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('TOTAL AWARDS', 25, 55)
    doc.text('DISTRIBUTED', 85, 55)
    doc.text('PENDING', 145, 55)

    doc.setFontSize(14)
    doc.setTextColor(247, 201, 72) // yellow
    doc.text(`${stats.total}`, 25, 63)
    doc.setTextColor(52, 211, 153) // green
    doc.text(`${stats.delivered}`, 85, 63)
    doc.setTextColor(239, 68, 68) // red
    doc.text(`${stats.pending}`, 145, 63)

    // Fetch all result data for report
    const { data: reportData } = await supabase
      .from('competition_results')
      .select('position, prize_given, prize_given_to_leader, competitions(name, is_group), participants(name, chess_number, teams(name))')
      .eq('published', true)
      .in('position', [1, 2])
      .order('position')

    if (!reportData) {
      doc.save('prize-distribution-report.pdf')
      return
    }

    // Filter individual
    const list = reportData.filter(r => r.competitions && !r.competitions.is_group)

    let y = 80
    // Table Header
    doc.setFillColor(45, 55, 72)
    doc.rect(15, y, 180, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('COMPETITION', 18, y + 5)
    doc.text('POS', 85, y + 5)
    doc.text('WINNER (CHEST)', 98, y + 5)
    doc.text('TEAM', 140, y + 5)
    doc.text('STATUS', 170, y + 5)
    
    y += 8
    doc.setFont('Helvetica', 'normal')
    doc.setTextColor(0, 0, 0)

    list.forEach((item, idx) => {
      // Check page overflow
      if (y > 270) {
        doc.addPage()
        y = 20
        // Repeat Header
        doc.setFillColor(45, 55, 72)
        doc.rect(15, y, 180, 8, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont('Helvetica', 'bold')
        doc.text('COMPETITION', 18, y + 5)
        doc.text('POS', 85, y + 5)
        doc.text('WINNER (CHEST)', 98, y + 5)
        doc.text('TEAM', 140, y + 5)
        doc.text('STATUS', 170, y + 5)
        y += 8
        doc.setFont('Helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
      }

      // Draw light gray separator line
      doc.setDrawColor(220, 220, 220)
      doc.line(15, y + 7, 195, y + 7)

      // Print texts
      const compName = item.competitions?.name || ''
      const pos = item.position === 1 ? '1st' : '2nd'
      const winnerName = `${item.participants?.name || '—'} (${item.participants?.chess_number || '—'})`
      const teamName = item.participants?.teams?.name || '—'
      
      let statusStr = 'Pending'
      if (item.prize_given) {
        statusStr = item.prize_given_to_leader ? 'Leader' : 'Delivered'
      }

      doc.setFontSize(8)
      doc.text(compName.length > 35 ? compName.substring(0, 33) + '..' : compName, 18, y + 4.5)
      doc.text(pos, 85, y + 4.5)
      doc.text(winnerName.length > 22 ? winnerName.substring(0, 20) + '..' : winnerName, 98, y + 4.5)
      doc.text(teamName, 140, y + 4.5)

      if (statusStr === 'Delivered') {
        doc.setTextColor(16, 185, 129) // green
      } else if (statusStr === 'Leader') {
        doc.setTextColor(79, 156, 249) // blue
      } else {
        doc.setTextColor(239, 68, 68) // red
      }
      doc.text(statusStr, 170, y + 4.5)
      doc.setTextColor(0, 0, 0)

      y += 7.5
    })

    doc.save('prize-distribution-report.pdf')
  }

  const filtered = competitions.filter(c => {
    const matchCat = selectedCat === 'all' || c.category_id === selectedCat
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="section-root">
      <div className="section-list" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Main List Header */}
        <div className="list-header">
          <span className="list-title">Award Corner & Prize Tracking</span>
          <button
            className="btn-submit"
            onClick={downloadPDFReport}
            style={{ padding: '7px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <IconDownload />
            <span>Report PDF</span>
          </button>
        </div>

        {/* Top Stat Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          width: '100%'
        }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>Total Placements (1st & 2nd)</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{stats.total}</span>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>Distributed Prizes</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-light)' }}>{stats.delivered}</span>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>Pending Handover</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>{stats.pending}</span>
          </div>
        </div>

        {/* Two-Column Workspace */}
        <div style={{ display: 'flex', gap: 20, width: '100%', alignItems: 'flex-start', minHeight: 460 }}>
          
          {/* Left Column: Competitions List */}
          <div style={{ width: '38%', minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Published Competitions</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{filtered.length} items</span>
            </div>

            {/* Filter controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ position: 'relative' }}>
                <input
                  className="dash-search-input"
                  placeholder="Search competitions..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', paddingLeft: 30, paddingRight: 10, height: 32, fontSize: 12, boxSizing: 'border-box' }}
                />
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  <IconSearch />
                </span>
              </div>

              <select
                value={selectedCat}
                onChange={e => setSelectedCat(e.target.value)}
                style={{
                  width: '100%',
                  height: 32,
                  fontSize: 12,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 6,
                  color: 'var(--text-secondary)',
                  padding: '0 10px',
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <option value="all" style={{ background: '#161b22', color: '#fff' }}>All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id} style={{ background: '#161b22', color: '#fff' }}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* List scroll container */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.015)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              overflowY: 'auto',
              maxHeight: 480,
              minHeight: 240
            }}>
              {loadingComps ? (
                <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
              ) : filtered.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}><p>No published competitions found.</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filtered.map(c => {
                    const isActive = selectedComp?.id === c.id
                    const isDone = c.prizes_delivered === c.prizes_count
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleCompSelect(c)}
                        style={{
                          padding: '12px 14px',
                          borderBottom: '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          background: isActive ? 'rgba(79, 156, 249, 0.1)' : 'transparent',
                          borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 12.5, fontWeight: isActive ? 700 : 600, color: isActive ? '#fff' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.name}
                          </p>
                          <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                            {c.category_name}
                          </p>
                        </div>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 12,
                          background: isDone ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: isDone ? '#34d399' : '#f87171',
                          border: isDone ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                          whiteSpace: 'nowrap'
                        }}>
                          {c.prizes_delivered}/{c.prizes_count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Winners Layout */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selectedComp ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedComp.name}</span>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{selectedComp.category_name} · 1st & 2nd Placements</p>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{winners.length} Winners</span>
                </div>

                {loadingWinners ? (
                  <div className="empty-state" style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 40 }}><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
                ) : winners.length === 0 ? (
                  <div className="empty-state" style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 40 }}>
                    <p>No 1st or 2nd place results recorded for this competition.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {winners.map(w => {
                      const deliveredStr = w.prize_given
                        ? (w.prize_given_to_leader ? `Leader (${w.participants?.teams?.name || 'Team'})` : 'Participant')
                        : 'Pending'
                      
                      return (
                        <div
                          key={w.id}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 10,
                            padding: '14px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            position: 'relative'
                          }}
                        >
                          {/* Placement Circle */}
                          <div style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: w.position === 1 ? 'rgba(247, 201, 72, 0.12)' : 'rgba(192, 192, 192, 0.12)',
                            border: w.position === 1 ? '1px solid rgba(247, 201, 72, 0.35)' : '1px solid rgba(192, 192, 192, 0.35)',
                            color: w.position === 1 ? '#f7c948' : '#e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <span style={{ fontSize: 15, fontWeight: 800 }}>{w.position}</span>
                            <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', marginTop: -2 }}>
                              {w.position === 1 ? 'st' : 'nd'}
                            </span>
                          </div>

                          {/* Middle Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{w.participants?.name}</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--accent-light)', fontWeight: 600 }}>
                                Chest: {w.participants?.chess_number}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                · {w.participants?.teams?.name}
                              </span>
                            </div>
                            
                            {/* Live delivery status badge */}
                            <div style={{ marginTop: 8 }}>
                              <span style={{
                                fontSize: 9.5,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '2px 7px',
                                borderRadius: 4,
                                background: w.prize_given
                                  ? (w.prize_given_to_leader ? 'rgba(79, 156, 249, 0.12)' : 'rgba(16, 185, 129, 0.12)')
                                  : 'rgba(239, 68, 68, 0.12)',
                                color: w.prize_given
                                  ? (w.prize_given_to_leader ? '#4f9cf9' : '#34d399')
                                  : '#f87171',
                                border: w.prize_given
                                  ? (w.prize_given_to_leader ? '1px solid rgba(79, 156, 249, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)')
                                  : '1px solid rgba(239, 68, 68, 0.25)'
                              }}>
                                Status: {deliveredStr}
                              </span>
                            </div>
                          </div>

                          {/* Handout switches */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', borderLeft: '1px solid var(--border-subtle)', paddingLeft: 16 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 11.5, color: '#fff', userSelect: 'none' }}>
                              <input
                                type="checkbox"
                                checked={Boolean(w.prize_given)}
                                onChange={(e) => togglePrize(w.id, 'prize_given', e.target.checked)}
                                style={{ width: 14, height: 14, cursor: 'pointer' }}
                              />
                              <span>Prize Delivered</span>
                            </label>

                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              cursor: w.prize_given ? 'pointer' : 'not-allowed',
                              fontSize: 11.5,
                              color: w.prize_given ? '#fff' : 'var(--text-muted)',
                              opacity: w.prize_given ? 1 : 0.45,
                              userSelect: 'none'
                            }}>
                              <input
                                type="checkbox"
                                disabled={!w.prize_given}
                                checked={Boolean(w.prize_given_to_leader)}
                                onChange={(e) => togglePrize(w.id, 'prize_given_to_leader', e.target.checked)}
                                style={{ width: 14, height: 14, cursor: w.prize_given ? 'pointer' : 'not-allowed' }}
                              />
                              <span>To Team Leader</span>
                            </label>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <div style={{
                background: 'rgba(255, 255, 255, 0.015)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                flex: 1,
                minHeight: 320,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 40,
                textAlign: 'center',
                gap: 12
              }}>
                <IconAward />
                <div>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>No Competition Selected</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)', maxWidth: 280 }}>Select a published competition from the left list to view winners and distribute awards.</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
