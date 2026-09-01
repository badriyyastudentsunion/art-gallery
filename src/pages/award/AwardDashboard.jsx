// src/pages/award/AwardDashboard.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { jsPDF } from 'jspdf'
import './award.css'

// Icons
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const IconAward = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32, color: 'var(--accent-light)' }}>
    <circle cx="12" cy="8" r="7"/>
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
  </svg>
)
const IconLogOut = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

export default function AwardDashboard() {
  const { user, logout } = useAuth()
  
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
    
    // Subscribe to realtime changes in results table
    const ch = supabase.channel('rt-award-distributor-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_results' }, () => {
        fetchCompetitions(false)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  useEffect(() => {
    if (selectedComp) {
      loadWinners(selectedComp.id)
    }
  }, [competitions])

  async function fetchCompetitions(showLoader = true) {
    if (showLoader) setLoadingComps(true)
    const { data: resultsData } = await supabase
      .from('competition_results')
      .select('id, position, prize_given, prize_given_to_leader, competition_id, competitions(id, name, is_group, category_id, categories(id, name))')
      .eq('published', true)

    if (resultsData) {
      // Filter individual, placements 1 or 2
      const filteredResults = resultsData.filter(r => 
        r.competitions && 
        !r.competitions.is_group && 
        (r.position === 1 || r.position === 2)
      )

      let tot = filteredResults.length
      let del = filteredResults.filter(r => r.prize_given).length
      setStats({ total: tot, delivered: del, pending: tot - del })

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
      setWinners(data.sort((a, b) => a.position - b.position))
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
          updates.prize_given_to_leader = false
        }
      }
      const { error } = await supabase
        .from('competition_results')
        .update(updates)
        .eq('id', resultId)

      if (error) throw error

      setWinners(prev => prev.map(w => {
        if (w.id === resultId) {
          return { ...w, ...updates }
        }
        return w
      }))
    } catch (e) {
      console.error(e)
      alert('Failed to update prize distribution status')
    }
  }

  const downloadPDFReport = async () => {
    const doc = new jsPDF()
    doc.setFillColor(13, 17, 23)
    doc.rect(0, 0, 220, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('INSPICO ART FESTIVAL', 15, 18)
    
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(180, 180, 180)
    doc.text('PRIZE DISTRIBUTION LOG (INDIVIDUAL PLACEMENTS)', 15, 25)
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
    doc.setTextColor(247, 201, 72)
    doc.text(`${stats.total}`, 25, 63)
    doc.setTextColor(52, 211, 153)
    doc.text(`${stats.delivered}`, 85, 63)
    doc.setTextColor(239, 68, 68)
    doc.text(`${stats.pending}`, 145, 63)

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
      if (y > 270) {
        doc.addPage()
        y = 20
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

      doc.setDrawColor(220, 220, 220)
      doc.line(15, y + 7, 195, y + 7)

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
        doc.setTextColor(16, 185, 129)
      } else if (statusStr === 'Leader') {
        doc.setTextColor(79, 156, 249)
      } else {
        doc.setTextColor(239, 68, 68)
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
    <div className="awd-root">
      {/* Topbar */}
      <header className="awd-topbar">
        <div className="awd-logo-area">
          <img src="/inspico-logo.svg" alt="Inspico Logo" style={{ height: 22, width: 22, filter: 'brightness(0) invert(1)', flexShrink: 0 }} />
          <img src="/inspico.svg" alt="Inspico" style={{ height: 16, maxWidth: 90 }} />
          <div className="awd-divider" />
          <span className="awd-section-tag">Award Corner</span>
        </div>
        <div className="awd-topbar-right">
          {user?.name && user.name.toLowerCase() !== 'award' && user.name.toLowerCase() !== 'admin' && (
            <span className="awd-user-name">{user.name}</span>
          )}
          <button className="awd-logout-btn" onClick={logout} title="Sign Out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main layout */}
      <main className="awd-main">
        {/* Banner stats grid */}
        <div className="awd-stats-grid">
          <div className="awd-stat-card">
            <span className="awd-stat-lbl">TOTAL PLACEMENTS</span>
            <span className="awd-stat-val">{stats.total}</span>
          </div>
          <div className="awd-stat-card border-green">
            <span className="awd-stat-lbl">DISTRIBUTED</span>
            <span className="awd-stat-val text-green">{stats.delivered}</span>
          </div>
          <div className="awd-stat-card border-red">
            <span className="awd-stat-lbl">PENDING</span>
            <span className="awd-stat-val text-red">{stats.pending}</span>
          </div>
        </div>

        {/* Content columns */}
        <div className={`awd-split ${selectedComp ? 'awd-has-selection' : ''}`}>
          {/* Left panel */}
          <div className="awd-panel-left">
            <div className="awd-panel-head">
              <h2>Published Events</h2>
              <button className="awd-pill-btn" onClick={downloadPDFReport}>
                <IconDownload /> Download PDF Log
              </button>
            </div>

            {/* Filter controls */}
            <div className="awd-filters">
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  className="awd-input"
                  placeholder="Search event..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: 30 }}
                />
                <span className="awd-search-icon"><IconSearch /></span>
              </div>
              <select
                className="awd-select"
                value={selectedCat}
                onChange={e => setSelectedCat(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* List */}
            <div className="awd-list-container">
              {loadingComps ? (
                <div className="awd-loading-center"><div className="awd-spin" /></div>
              ) : filtered.length === 0 ? (
                <div className="awd-empty-state"><p>No published competitions found</p></div>
              ) : (
                <div className="awd-list">
                  {filtered.map(c => {
                    const isActive = selectedComp?.id === c.id
                    const isDone = c.prizes_delivered === c.prizes_count
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleCompSelect(c)}
                        className={`awd-list-item ${isActive ? 'active' : ''}`}
                      >
                        <div style={{ minWidth: 0 }}>
                          <p className="awd-item-title">{c.name}</p>
                          <p className="awd-item-sub">{c.category_name}</p>
                        </div>
                        <span className={`awd-badge ${isDone ? 'success' : 'pending'}`}>
                          {c.prizes_delivered}/{c.prizes_count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right panel */}
          <div className="awd-panel-right">
            {selectedComp ? (
              <>
                <div className="awd-detail-head">
                  <button 
                    type="button" 
                    className="awd-mobile-back-btn" 
                    onClick={() => setSelectedComp(null)}
                  >
                    ← Back to Events
                  </button>
                  <h2>{selectedComp.name} Placements</h2>
                  <p>{selectedComp.category_name} · Position 1st & 2nd winners only</p>
                </div>

                {loadingWinners ? (
                  <div className="awd-loading-center"><div className="awd-spin" /></div>
                ) : (
                  <div className="awd-winners-list">
                    {winners.map(w => {
                      const deliveredStr = w.prize_given
                        ? (w.prize_given_to_leader ? `Leader of ${w.participants?.teams?.name}` : 'Participant')
                        : 'Pending'
                      
                      return (
                        <div key={w.id} className="awd-winner-card">
                          <div className={`awd-rank-circle rank-${w.position}`}>
                            <span>{w.position}</span>
                            <span className="awd-rank-suffix">{w.position === 1 ? 'st' : 'nd'}</span>
                          </div>

                          <div className="awd-winner-info">
                            <h3>{w.participants?.name}</h3>
                            <div className="awd-winner-meta">
                              <span className="awd-meta-chess">Chest: {w.participants?.chess_number}</span>
                              <span className="awd-meta-dot">•</span>
                              <span className="awd-meta-team">{w.participants?.teams?.name}</span>
                            </div>

                            <div style={{ marginTop: 10 }}>
                              <span className={`awd-status-tag ${w.prize_given ? (w.prize_given_to_leader ? 'leader' : 'delivered') : 'pending'}`}>
                                Status: {deliveredStr}
                              </span>
                            </div>
                          </div>

                          {/* Control switches */}
                          <div className="awd-switches">
                            <label className="awd-switch-lbl">
                              <input
                                type="checkbox"
                                checked={w.prize_given}
                                onChange={(e) => togglePrize(w.id, 'prize_given', e.target.checked)}
                              />
                              <span>Delivered</span>
                            </label>

                            <label className={`awd-switch-lbl ${w.prize_given ? '' : 'disabled'}`}>
                              <input
                                type="checkbox"
                                disabled={!w.prize_given}
                                checked={w.prize_given_to_leader}
                                onChange={(e) => togglePrize(w.id, 'prize_given_to_leader', e.target.checked)}
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
              <div className="awd-no-selection">
                <IconAward />
                <h3>No Event Selected</h3>
                <p>Select a published event from the list on the left to manage prize handovers.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
