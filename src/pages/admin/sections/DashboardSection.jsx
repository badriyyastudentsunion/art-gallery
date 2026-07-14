// src/pages/admin/sections/DashboardSection.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import '../sections.css'

// ── Icons ──
const StatIcon = ({ type }) => {
  const icons = {
    total:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>,
    invigDone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
    invigPend: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    judgeDone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z"/></svg>,
    judgePend: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    announced: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>,
    notAnnounced: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  }
  return icons[type] || null
}

export default function DashboardSection() {
  const [stats, setStats] = useState(null)
  const [teamPoints, setTeamPoints] = useState([])
  const [loading, setLoading] = useState(true)

  // Drill-down modal
  const [modal, setModal] = useState(null) // { title, items: [{name, info}] }

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    const [
      { data: comps },
      { data: reports },
      { data: judgeResults },
      { data: pubResults },
      { data: ciRows },
      { data: cjRows },
    ] = await Promise.all([
      supabase.from('competitions').select('id, name, categories(name), announcer_id, stage_id').order('name'),
      supabase.from('competition_reports').select('competition_id').order('competition_id'),
      supabase.from('judge_results').select('competition_id').order('competition_id'),
      supabase.from('competition_results').select('competition_id, published, participant_id, placement_points, grade_points, participants(name, team_id, teams(name))').eq('published', true),
      supabase.from('competition_invigilators').select('competition_id, invigilator_id'),
      supabase.from('competition_judges').select('competition_id, judge_id'),
    ])

    const all = comps || []
    const reportedSet   = new Set((reports || []).map(r => r.competition_id))
    const judgedSet     = new Set((judgeResults || []).map(r => r.competition_id))
    const publishedSet  = new Set((pubResults || []).filter(r => r.published).map(r => r.competition_id))
    const hasInvigSet   = new Set((ciRows || []).map(r => r.competition_id))
    const hasJudgeSet   = new Set((cjRows || []).map(r => r.competition_id))
    const hasAnncSet    = new Set(all.filter(c => c.announcer_id).map(c => c.id))

    // Invig assigned but not completed (invig assigned AND NOT reported)
    const invigAssigned     = all.filter(c => hasInvigSet.has(c.id))
    const invigCompleted    = invigAssigned.filter(c => reportedSet.has(c.id))
    const invigNotCompleted = invigAssigned.filter(c => !reportedSet.has(c.id))

    // Judge assigned but not completed
    const judgeAssigned     = all.filter(c => hasJudgeSet.has(c.id))
    const judgeCompleted    = judgeAssigned.filter(c => judgedSet.has(c.id))
    const judgeNotCompleted = judgeAssigned.filter(c => !judgedSet.has(c.id))

    // Announced vs not
    const announced    = all.filter(c => publishedSet.has(c.id))
    const notAnnounced = all.filter(c => hasAnncSet.has(c.id) && !publishedSet.has(c.id))

    setStats({
      total: all,
      invigCompleted, invigNotCompleted,
      judgeCompleted, judgeNotCompleted,
      announced, notAnnounced,
    })

    // Team points (from published results)
    const teamMap = {}
    ;(pubResults || []).forEach(r => {
      const team = r.participants?.teams
      if (!team) return
      const key = team.name
      if (!teamMap[key]) teamMap[key] = { name: key, pts: 0 }
      teamMap[key].pts += (r.placement_points || 0) + (r.grade_points || 0)
    })
    setTeamPoints(Object.values(teamMap).sort((a, b) => b.pts - a.pts))
    setLoading(false)
  }

  function openModal(title, items) {
    setModal({ title, items })
  }

  const CARDS = stats ? [
    {
      key: 'total', label: 'Total Competitions', value: stats.total.length, color: 'var(--accent-light)',
      items: stats.total.map(c => ({ name: c.name, info: c.categories?.name || '—' }))
    },
    {
      key: 'invigDone', label: 'Invig. Completed', value: stats.invigCompleted.length, color: '#7bc47b',
      items: stats.invigCompleted.map(c => ({ name: c.name, info: c.categories?.name || '—' }))
    },
    {
      key: 'invigPend', label: 'Invig. Pending', value: stats.invigNotCompleted.length, color: '#e07c7c',
      items: stats.invigNotCompleted.map(c => ({ name: c.name, info: c.categories?.name || '—' }))
    },
    {
      key: 'judgeDone', label: 'Judgement Done', value: stats.judgeCompleted.length, color: '#7bc47b',
      items: stats.judgeCompleted.map(c => ({ name: c.name, info: c.categories?.name || '—' }))
    },
    {
      key: 'judgePend', label: 'Judgement Pending', value: stats.judgeNotCompleted.length, color: '#e07c7c',
      items: stats.judgeNotCompleted.map(c => ({ name: c.name, info: c.categories?.name || '—' }))
    },
    {
      key: 'announced', label: 'Announced', value: stats.announced.length, color: '#7bc47b',
      items: stats.announced.map(c => ({ name: c.name, info: c.categories?.name || '—' }))
    },
    {
      key: 'notAnnounced', label: 'Not Announced', value: stats.notAnnounced.length, color: '#e0c07c',
      items: stats.notAnnounced.map(c => ({ name: c.name, info: c.categories?.name || '—' }))
    },
  ] : []

  return (
    <div className="dash-root">
      {/* ── Header ── */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border-subtle)' }}>
        <span className="list-title" style={{ fontSize: 15 }}>Dashboard</span>
      </div>

      {loading ? (
        <div className="empty-state" style={{ padding: 60 }}>
          <div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} />
        </div>
      ) : (
        <div style={{ overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* ── Stat Cards ── */}
          <div className="dash-cards">
            {CARDS.map(card => (
              <button key={card.key} className="dash-card" onClick={() => card.items.length && openModal(card.label, card.items)}>
                <div className="dash-card-icon" style={{ color: card.color }}>
                  <StatIcon type={card.key} />
                </div>
                <div className="dash-card-value" style={{ color: card.color }}>{card.value}</div>
                <div className="dash-card-label">{card.label}</div>
                {card.items.length > 0 && (
                  <div className="dash-card-hint">Click to view list →</div>
                )}
              </button>
            ))}
          </div>

          {/* ── Team Points ── */}
          <section>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
              Team Points (Published Results)
            </p>
            {teamPoints.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No published results yet.</p>
            ) : (
              <table className="data-table">
                <thead><tr><th>#</th><th>Team</th><th>Points</th></tr></thead>
                <tbody>
                  {teamPoints.map((t, i) => (
                    <tr key={t.name}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11, width: 28 }}>{i + 1}</td>
                      <td className="td-name">{t.name}</td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent-light)' }}>{t.pts}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      {/* ── Drill-down Modal ── */}
      {modal && (
        <div className="dash-modal-overlay" onClick={() => setModal(null)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{modal.title}</span>
              <button onClick={() => setModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '60vh' }}>
              {modal.items.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No items.</p>
              ) : (
                <table className="data-table">
                  <thead><tr><th>#</th><th>Competition</th><th>Category</th></tr></thead>
                  <tbody>
                    {modal.items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 11, width: 28 }}>{i + 1}</td>
                        <td className="td-name">{item.name}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.info}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
