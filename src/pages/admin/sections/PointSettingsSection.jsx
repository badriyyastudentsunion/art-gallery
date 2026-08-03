// src/pages/admin/sections/PointSettingsSection.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import '../sections.css'

export default function PointSettingsSection() {
  const [unlocked, setUnlocked] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [dbPassword, setDbPassword] = useState('er')

  const [grades, setGrades] = useState([])
  const [placements, setPlacements] = useState([])
  const [settings, setSettings] = useState({ results_password: '', team_leader_access: 'true', max_stage_events: '3', max_offstage_events: '2' })
  const [initialGrades, setInitialGrades] = useState([])
  const [initialPlacements, setInitialPlacements] = useState([])
  const [initialSettings, setInitialSettings] = useState({})

  const [savingSection, setSavingSection] = useState(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'results_password').single()
      .then(({ data }) => { if (data) setDbPassword(data.value) })
  }, [])

  useEffect(() => {
    if (unlocked) fetchAll()
  }, [unlocked])

  function tryUnlock(e) {
    e.preventDefault()
    if (pwInput === dbPassword) {
      setUnlocked(true)
      setPwError('')
    } else {
      setPwError('Incorrect password.')
    }
  }

  async function fetchAll() {
    const [{ data: g }, { data: p }, { data: s }] = await Promise.all([
      supabase.from('point_settings').select('*').order('max_percent', { ascending: false }),
      supabase.from('placement_points').select('*').order('competition_category').order('position'),
      supabase.from('app_settings').select('*'),
    ])
    const fetchedG = g || []
    const fetchedP = p || []
    const map = {}
    ;(s || []).forEach(r => { map[r.key] = r.value })
    const mergedSettings = { results_password: '', team_leader_access: 'true', max_stage_events: '3', max_offstage_events: '2', ...map }

    setGrades(fetchedG)
    setInitialGrades(JSON.parse(JSON.stringify(fetchedG)))

    setPlacements(fetchedP)
    setInitialPlacements(JSON.parse(JSON.stringify(fetchedP)))

    setSettings(mergedSettings)
    setInitialSettings(JSON.parse(JSON.stringify(mergedSettings)))

    setLoading(false)
  }

  const isGradesDirty = JSON.stringify(grades) !== JSON.stringify(initialGrades)
  const isPlacementsDirty = JSON.stringify(placements) !== JSON.stringify(initialPlacements)
  const isSettingsDirty = JSON.stringify(settings) !== JSON.stringify(initialSettings)

  async function saveGrades() {
    setSavingSection('grades')
    for (const g of grades) {
      await supabase.from('point_settings').update({
        min_percent: parseInt(g.min_percent),
        max_percent: parseInt(g.max_percent),
        points: parseInt(g.points),
      }).eq('id', g.id)
    }
    setInitialGrades(JSON.parse(JSON.stringify(grades)))
    setSavingSection(null); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  async function savePlacements() {
    setSavingSection('placements')
    for (const p of placements) {
      await supabase.from('placement_points').update({ points: parseInt(p.points) }).eq('id', p.id)
    }
    setInitialPlacements(JSON.parse(JSON.stringify(placements)))
    setSavingSection(null); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  async function saveAppSettings() {
    setSavingSection('settings')
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    }
    setInitialSettings(JSON.parse(JSON.stringify(settings)))
    setSavingSection(null); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  function updateGrade(id, field, val) {
    let numVal = val
    if (field === 'min_percent' || field === 'max_percent') {
      if (val !== '') {
        const parsed = Math.min(100, Math.max(0, parseInt(val, 10) || 0))
        numVal = String(parsed)
      }
    }
    setGrades(prev => prev.map(g => g.id === id ? { ...g, [field]: numVal } : g))
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

  if (!unlocked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 140px)', width: '100%', padding: '24px' }}>
        <form onSubmit={tryUnlock} style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 300, textAlign: 'center' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32, margin: '0 auto 14px', display: 'block' }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.3px' }}>Point Settings Locked</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>Enter master password to access scoring rules & app settings</p>
          <div className="field" style={{ textAlign: 'left', marginTop: 12 }}>
            <label className="field-lbl">Password</label>
            <input className="field-inp" type="password" autoComplete="off" placeholder="••••••••"
              value={pwInput} onChange={e => { setPwInput(e.target.value); setPwError('') }} />
          </div>
          {pwError && <p className="form-error">⚠ {pwError}</p>}
          <button className="btn-submit" type="submit" style={{ marginTop: 8, height: 38, fontSize: 13, fontWeight: 600 }}>Unlock Settings</button>
        </form>
      </div>
    )
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} />
    </div>
  )

  return (
    <div style={{ overflowY: 'auto', height: '100%', paddingBottom: 40 }}>
      {/* ── Page Title Header ── */}
      <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Point & App Settings</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Configure scoring rules, placement rewards, and global system parameters</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && (
            <div className="form-success" style={{ margin: 0, padding: '6px 14px', borderRadius: 20, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80' }}>
              ✓ Saved successfully!
            </div>
          )}
          <button onClick={() => setUnlocked(false)}
            style={{ background: 'none', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: 11, padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}>
            🔒 Lock
          </button>
        </div>
      </div>

      <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 840, margin: '0 auto' }}>

        {/* ── Grade Points Card ── */}
        <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Grade-Based Points</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>Set minimum and maximum score percentages for each grade</p>
            </div>
            <button className="btn-submit" style={{ width: 'auto', padding: '6px 18px', fontSize: 11, margin: 0, height: 32, opacity: isGradesDirty ? 1 : 0.4, cursor: isGradesDirty ? 'pointer' : 'not-allowed' }}
              disabled={savingSection !== null || !isGradesDirty} onClick={saveGrades}>
              {savingSection === 'grades' ? <span className="spin" /> : 'Save'}
            </button>
          </div>
          
          <table className="data-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: 12 }}>Grade</th>
                <th style={{ textAlign: 'center' }}>Min %</th>
                <th style={{ textAlign: 'center' }}>Max %</th>
                <th style={{ textAlign: 'center' }}>Points Awarded</th>
              </tr>
            </thead>
            <tbody>
              {grades.map(g => (
                <tr key={g.id}>
                  <td className="td-name" style={{ fontSize: 13, fontWeight: 600, paddingLeft: 12 }}>{g.grade}</td>
                  <td style={{ textAlign: 'center' }}>
                    <input className="field-inp" type="number" min="0" max="100" value={g.min_percent}
                      onChange={e => updateGrade(g.id, 'min_percent', e.target.value)}
                      style={{ width: 72, padding: '6px 8px', fontSize: 12, textAlign: 'center', margin: '0 auto' }} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input className="field-inp" type="number" min="0" max="100" value={g.max_percent}
                      onChange={e => updateGrade(g.id, 'max_percent', e.target.value)}
                      style={{ width: 72, padding: '6px 8px', fontSize: 12, textAlign: 'center', margin: '0 auto' }} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input className="field-inp" type="number" min="0" value={g.points}
                      onChange={e => updateGrade(g.id, 'points', e.target.value)}
                      style={{ width: 72, padding: '6px 8px', fontSize: 12, textAlign: 'center', margin: '0 auto', fontWeight: 600, color: 'var(--accent-light)' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── Placement Points Card ── */}
        <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Placement Points (1st / 2nd / 3rd)</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>Assign points for top positions by competition category type</p>
            </div>
            <button className="btn-submit" style={{ width: 'auto', padding: '6px 18px', fontSize: 11, margin: 0, height: 32, opacity: isPlacementsDirty ? 1 : 0.4, cursor: isPlacementsDirty ? 'pointer' : 'not-allowed' }}
              disabled={savingSection !== null || !isPlacementsDirty} onClick={savePlacements}>
              {savingSection === 'placements' ? <span className="spin" /> : 'Save'}
            </button>
          </div>
          
          <table className="data-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: 12 }}>Competition Type</th>
                <th style={{ textAlign: 'center' }}>🥇 1st Place</th>
                <th style={{ textAlign: 'center' }}>🥈 2nd Place</th>
                <th style={{ textAlign: 'center' }}>🥉 3rd Place</th>
              </tr>
            </thead>
            <tbody>
              {placementCategories.map(({ key, label }) => {
                const rows = placements.filter(p => p.competition_category === key).sort((a, b) => a.position - b.position)
                return (
                  <tr key={key}>
                    <td className="td-name" style={{ fontSize: 13, fontWeight: 500, paddingLeft: 12 }}>{label}</td>
                    {[1, 2, 3].map(pos => {
                      const row = rows.find(r => r.position === pos)
                      return (
                        <td key={pos} style={{ textAlign: 'center' }}>
                          {row ? (
                            <input className="field-inp" type="number" min="0" value={row.points}
                              onChange={e => updatePlacement(row.id, e.target.value)}
                              style={{ width: 72, padding: '6px 8px', fontSize: 12, textAlign: 'center', margin: '0 auto', fontWeight: 600 }} />
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {/* ── App Settings Card ── */}
        <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>System & Event Limits</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>Global parameters for student participation and access controls</p>
            </div>
            <button className="btn-submit" style={{ width: 'auto', padding: '6px 18px', fontSize: 11, margin: 0, height: 32, opacity: isSettingsDirty ? 1 : 0.4, cursor: isSettingsDirty ? 'pointer' : 'not-allowed' }}
              disabled={savingSection !== null || !isSettingsDirty} onClick={saveAppSettings}>
              {savingSection === 'settings' ? <span className="spin" /> : 'Save'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Event Limits Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="field">
                <label className="field-lbl">Max Stage Events / Student</label>
                <input className="field-inp" type="number" min="0" value={settings.max_stage_events}
                  onChange={e => setSettings(s => ({ ...s, max_stage_events: e.target.value }))}
                  placeholder="3" />
              </div>
              <div className="field">
                <label className="field-lbl">Max Off-Stage Events / Student</label>
                <input className="field-inp" type="number" min="0" value={settings.max_offstage_events}
                  onChange={e => setSettings(s => ({ ...s, max_offstage_events: e.target.value }))}
                  placeholder="2" />
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  )
}
