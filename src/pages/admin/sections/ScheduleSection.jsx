// src/pages/admin/sections/ScheduleSection.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import '../sections.css'

const fmt = (d, t) => {
  const ds = d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'
  const ts = t ? t.slice(0, 5) : '—'
  return `${ds} ${ts}`
}

export default function ScheduleSection() {
  const [competitions, setCompetitions] = useState([])
  const [schedules, setSchedules] = useState({}) // keyed by competition_id
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState(null)
  const [success, setSuccess] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: comps }, { data: scheds }] = await Promise.all([
      supabase.from('competitions').select('id, name, competition_type, categories(name)').order('name'),
      supabase.from('competition_schedule').select('*'),
    ])
    setCompetitions(comps || [])
    const map = {}
    ;(scheds || []).forEach(s => {
      map[s.competition_id] = {
        id: s.id,
        scheduled_date: s.scheduled_date || '',
        scheduled_time: s.scheduled_time || '',
        stage_number: s.stage_number || '',
      }
    })
    setSchedules(map)
    setFetching(false)
  }

  function updateField(compId, field, val) {
    setSchedules(prev => ({
      ...prev,
      [compId]: { ...(prev[compId] || {}), scheduled_date: '', scheduled_time: '', stage_number: '', [field]: val }
    }))
  }

  async function saveSchedule(compId) {
    const s = schedules[compId] || {}
    setSaving(compId)
    if (s.id) {
      await supabase.from('competition_schedule').update({
        scheduled_date: s.scheduled_date || null,
        scheduled_time: s.scheduled_time || null,
        stage_number: s.stage_number || null,
      }).eq('id', s.id)
    } else {
      const { data } = await supabase.from('competition_schedule').insert([{
        competition_id: compId,
        scheduled_date: s.scheduled_date || null,
        scheduled_time: s.scheduled_time || null,
        stage_number: s.stage_number || null,
      }]).select().single()
      if (data) {
        setSchedules(prev => ({ ...prev, [compId]: { ...prev[compId], id: data.id } }))
      }
    }
    setSaving(null)
    setSuccess('Saved!'); setTimeout(() => setSuccess(''), 1500)
  }

  return (
    <div className="section-root" style={{ flexDirection: 'column', overflowY: 'auto', gap: 0 }}>
      <div className="list-header">
        <span className="list-title">Schedule</span>
        <span className="list-count">{competitions.length} competitions</span>
      </div>
      {fetching ? (
        <div className="empty-state"><div className="spin" style={{ borderTopColor: 'var(--accent-light)' }} /></div>
      ) : competitions.length === 0 ? (
        <div className="empty-state"><p>No competitions yet.</p></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '28%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Competition</th>
                <th>Type</th>
                <th>Date</th>
                <th>Time</th>
                <th>Stage / Room</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {competitions.map(c => {
                const s = schedules[c.id] || {}
                const isSaving = saving === c.id
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span className="td-name" style={{ fontSize: 12 }}>{c.name}</span>
                        {c.categories?.name && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.categories.name}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="td-badge" style={{
                        fontSize: 9,
                        background: c.competition_type === 'stage' ? 'rgba(201,148,63,0.1)' : 'rgba(100,150,220,0.1)',
                        borderColor: c.competition_type === 'stage' ? 'rgba(201,148,63,0.3)' : 'rgba(100,150,220,0.3)',
                        color: c.competition_type === 'stage' ? 'var(--accent-light)' : '#7baede',
                      }}>
                        {c.competition_type === 'stage' ? 'STAGE' : 'OFF-STAGE'}
                      </span>
                    </td>
                    <td>
                      <input
                        type="date"
                        className="field-inp"
                        style={{ padding: '5px 8px', fontSize: 11, width: '100%' }}
                        value={s.scheduled_date || ''}
                        onChange={e => updateField(c.id, 'scheduled_date', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        className="field-inp"
                        style={{ padding: '5px 8px', fontSize: 11, width: '100%' }}
                        value={s.scheduled_time || ''}
                        onChange={e => updateField(c.id, 'scheduled_time', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="field-inp"
                        style={{ padding: '5px 8px', fontSize: 11, width: '100%' }}
                        value={s.stage_number || ''}
                        onChange={e => updateField(c.id, 'stage_number', e.target.value)}
                      />
                    </td>
                    <td>
                      <button
                        className="btn-submit"
                        style={{ width: 'auto', padding: '5px 12px', fontSize: 11 }}
                        disabled={isSaving}
                        onClick={() => saveSchedule(c.id)}
                      >
                        {isSaving ? <span className="spin" style={{ width: 10, height: 10 }} /> : 'Save'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {success && <p className="form-success" style={{ padding: '8px 20px' }}>✓ {success}</p>}
        </div>
      )}
    </div>
  )
}
