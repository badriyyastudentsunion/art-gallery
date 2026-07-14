// src/pages/admin/sections/PointSettingsSection.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import '../sections.css'

export default function PointSettingsSection() {
  const [grades, setGrades] = useState([])
  const [placements, setPlacements] = useState([])
  const [settings, setSettings] = useState({ results_password: '', team_leader_access: 'true' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: g }, { data: p }, { data: s }] = await Promise.all([
      supabase.from('point_settings').select('*').order('max_percent', { ascending: false }),
      supabase.from('placement_points').select('*').order('competition_category').order('position'),
      supabase.from('app_settings').select('*'),
    ])
    setGrades(g || [])
    setPlacements(p || [])
    const map = {}
    ;(s || []).forEach(r => { map[r.key] = r.value })
    setSettings(prev => ({ ...prev, ...map }))
    setLoading(false)
  }

  async function saveGrades() {
    setSaving(true)
    for (const g of grades) {
      await supabase.from('point_settings').update({
        min_percent: parseInt(g.min_percent),
        max_percent: parseInt(g.max_percent),
        points: parseInt(g.points),
      }).eq('id', g.id)
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  async function savePlacements() {
    setSaving(true)
    for (const p of placements) {
      await supabase.from('placement_points').update({ points: parseInt(p.points) }).eq('id', p.id)
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  async function saveAppSettings() {
    setSaving(true)
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  function updateGrade(id, field, val) {
    setGrades(prev => prev.map(g => g.id === id ? { ...g, [field]: val } : g))
  }

  function updatePlacement(id, val) {
    setPlacements(prev => prev.map(p => p.id === id ? { ...p, points: val } : p))
  }

  const placementCategories = [
    { key: 'individual', label: 'Individual' },
    { key: 'group_2', label: 'Group (2 members)' },
    { key: 'group_3', label: 'Group (3 members)' },
    { key: 'group_45', label: 'Group (4–5 members)' },
  ]
  const posLabel = { 1: '🥇 1st', 2: '🥈 2nd', 3: '🥉 3rd' }

  if (loading) return (
    <div className="section-root" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} />
    </div>
  )

  return (
    <div className="section-root" style={{ flexDirection: 'column', overflowY: 'auto', gap: 0 }}>
      <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-subtle)' }}>
        <span className="list-title" style={{ fontSize: 15 }}>Point Settings</span>
      </div>

      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 720 }}>

        {/* ── Grade Points ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Grade-Based Points</p>
            <button className="btn-submit" style={{ width: 'auto', padding: '7px 16px', fontSize: 11 }}
              disabled={saving} onClick={saveGrades}>
              {saving ? <span className="spin" /> : '✓'} Save Grades
            </button>
          </div>
          <table className="data-table">
            <thead><tr><th>Grade</th><th>Min %</th><th>Max %</th><th>Points</th></tr></thead>
            <tbody>
              {grades.map(g => (
                <tr key={g.id}>
                  <td><span className="td-badge">{g.grade}</span></td>
                  <td>
                    <input className="field-inp" type="number" min="0" max="100" value={g.min_percent}
                      onChange={e => updateGrade(g.id, 'min_percent', e.target.value)}
                      style={{ width: 70, padding: '5px 8px' }} />
                  </td>
                  <td>
                    <input className="field-inp" type="number" min="0" max="100" value={g.max_percent}
                      onChange={e => updateGrade(g.id, 'max_percent', e.target.value)}
                      style={{ width: 70, padding: '5px 8px' }} />
                  </td>
                  <td>
                    <input className="field-inp" type="number" min="0" value={g.points}
                      onChange={e => updateGrade(g.id, 'points', e.target.value)}
                      style={{ width: 70, padding: '5px 8px' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── Placement Points ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Placement Points (1st / 2nd / 3rd)</p>
            <button className="btn-submit" style={{ width: 'auto', padding: '7px 16px', fontSize: 11 }}
              disabled={saving} onClick={savePlacements}>
              {saving ? <span className="spin" /> : '✓'} Save Placements
            </button>
          </div>
          <table className="data-table">
            <thead><tr><th>Competition Type</th><th>🥇 1st</th><th>🥈 2nd</th><th>🥉 3rd</th></tr></thead>
            <tbody>
              {placementCategories.map(({ key, label }) => {
                const rows = placements.filter(p => p.competition_category === key).sort((a, b) => a.position - b.position)
                return (
                  <tr key={key}>
                    <td className="td-name" style={{ fontSize: 12 }}>{label}</td>
                    {[1, 2, 3].map(pos => {
                      const row = rows.find(r => r.position === pos)
                      return (
                        <td key={pos}>
                          {row ? (
                            <input className="field-inp" type="number" min="0" value={row.points}
                              onChange={e => updatePlacement(row.id, e.target.value)}
                              style={{ width: 60, padding: '5px 8px' }} />
                          ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {/* ── App Settings ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>App Settings</p>
            <button className="btn-submit" style={{ width: 'auto', padding: '7px 16px', fontSize: 11 }}
              disabled={saving} onClick={saveAppSettings}>
              {saving ? <span className="spin" /> : '✓'} Save Settings
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label className="field-lbl">Results Page Password</label>
              <input className="field-inp" type="text" autoComplete="off"
                value={settings.results_password}
                onChange={e => setSettings(s => ({ ...s, results_password: e.target.value }))} />
            </div>
            <div className="field">
              <label className="field-lbl">Team Leader Access</label>
              <div className="radio-group">
                {[['true', 'Enabled'], ['false', 'Disabled']].map(([val, lbl]) => (
                  <label key={val}
                    className={`radio-opt ${settings.team_leader_access === val ? 'active' : ''}`}
                    onClick={() => setSettings(s => ({ ...s, team_leader_access: val }))}>
                    <span className={`radio-dot ${settings.team_leader_access === val ? 'active' : ''}`} />
                    {lbl}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {saved && <p className="form-success" style={{ fontSize: 13 }}>✓ Saved successfully!</p>}
      </div>
    </div>
  )
}
