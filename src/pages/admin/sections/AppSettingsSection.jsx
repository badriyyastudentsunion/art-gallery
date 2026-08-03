// src/pages/admin/sections/AppSettingsSection.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import './competitions.css'

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconPower = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    <line x1="12" y1="2" x2="12" y2="12" />
  </svg>
)

const PORTALS = [
  { id: 'landing_page', label: 'Public Landing Page & Results', desc: 'Main public site viewable by visitors' },
  { id: 'team_leaders', label: 'Team Leaders Dashboard', desc: 'Participant registration & team point portal' },
  { id: 'judges',       label: 'Judges Portal', desc: 'Score entry and judging interface' },
  { id: 'announcers',   label: 'Announcers Portal', desc: 'Live stage callings & stage tally interface' },
  { id: 'invigilators', label: 'Invigilators Portal', desc: 'Exam hall & competition monitoring' },
  { id: 'media',        label: 'Media Uploaders Portal', desc: 'Event photo, video & live stream uploader' },
]

export default function AppSettingsSection() {
  const [maintenance, setMaintenance] = useState({
    all: false,
    landing_page: false,
    team_leaders: false,
    judges: false,
    announcers: false,
    invigilators: false,
    media: false,
    allow_localhost_bypass: false,
    notice: 'System is currently undergoing scheduled maintenance. Please check back shortly.'
  })

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchSettings()
    const ch = supabase.channel('rt-app-settings-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.maintenance_status' }, fetchSettings)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function fetchSettings() {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'maintenance_status')
        .maybeSingle()
      if (data?.value) {
        setMaintenance(prev => ({ ...prev, ...JSON.parse(data.value) }))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSave = async (updatedState) => {
    const payload = updatedState || maintenance
    setSaving(true)
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'maintenance_status', value: JSON.stringify(payload) })

      if (error) throw error
      setMaintenance(payload)
      showToast('Maintenance settings saved & updated in real-time!')
    } catch (err) {
      console.error(err)
      showToast(`Failed: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleSingle = (key) => {
    const updated = { ...maintenance, [key]: !maintenance[key] }
    handleSave(updated)
  }

  const toggleAllPortals = (turnOff) => {
    const updated = {
      ...maintenance,
      all: turnOff,
      landing_page: turnOff,
      team_leaders: turnOff,
      judges: turnOff,
      announcers: turnOff,
      invigilators: turnOff,
      media: turnOff
    }
    handleSave(updated)
  }

  return (
    <div className="section-root" style={{ gap: 20 }}>
      <div className="section-list">
        {/* Top Header */}
        <div className="sect-header" style={{ marginBottom: 16 }}>
          <h2 className="sect-title">App Maintenance & Access Settings</h2>
        </div>

        {/* Master Maintenance Switch Hero Banner */}
        <div style={{
          background: maintenance.all
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(13, 17, 23, 0.8) 100%)'
            : 'linear-gradient(135deg, rgba(79, 156, 249, 0.08) 0%, rgba(13, 17, 23, 0.8) 100%)',
          border: maintenance.all ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: 20,
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: maintenance.all ? '#ef4444' : '#10b981',
                boxShadow: maintenance.all ? '0 0 12px #ef4444' : '0 0 12px #10b981'
              }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
                Master System Mode: {maintenance.all ? 'MAINTENANCE (ALL PORTALS OFF)' : 'ALL PORTALS ONLINE'}
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
              {maintenance.all
                ? 'All user logins and public pages are currently suspended for maintenance. Admin panel remains accessible.'
                : 'Turn off all logins simultaneously or toggle specific sections individually below.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {maintenance.all ? (
              <button
                className="btn-submit"
                onClick={() => toggleAllPortals(false)}
                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 18px', fontSize: 12, fontWeight: 700 }}
              >
                <IconPower /> Turn ALL Portals ON
              </button>
            ) : (
              <button
                className="btn-delete"
                onClick={() => toggleAllPortals(true)}
                style={{ padding: '10px 18px', fontSize: 12, fontWeight: 700 }}
              >
                <IconPower /> Master Maintenance ON (All OFF)
              </button>
            )}
          </div>
        </div>

        {/* Section List Grid */}
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Individual Section Access Controls
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 28 }}>
          {PORTALS.map(portal => {
            const isOff = maintenance.all || maintenance[portal.id]

            return (
              <div
                key={portal.id}
                style={{
                  background: 'var(--bg-card)',
                  border: isOff ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'var(--transition)'
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 600, color: '#fff' }}>{portal.label}</h4>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{portal.desc}</p>
                </div>

                <button
                  onClick={() => toggleSingle(portal.id)}
                  style={{
                    background: isOff ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    border: isOff ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                    color: isOff ? '#f87171' : '#34d399',
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isOff ? '🛑 MAINTENANCE' : '🟢 ONLINE'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Localhost Bypass Settings Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16
        }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 700, color: '#fff' }}>Localhost Developer Bypass</h3>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
              Allow developers to bypass maintenance blocks and test all portals when running on http://localhost or http://127.0.0.1.
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggleSingle('allow_localhost_bypass')}
            style={{
              background: maintenance.allow_localhost_bypass ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
              border: maintenance.allow_localhost_bypass ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: maintenance.allow_localhost_bypass ? '#34d399' : 'rgba(255,255,255,0.4)',
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit'
            }}
          >
            {maintenance.allow_localhost_bypass ? '🟢 ENABLED (BYPASS ACTIVE)' : '🛑 DISABLED'}
          </button>
        </div>

        {/* Custom Maintenance Message Setting */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 700, color: '#fff' }}>Custom Maintenance Announcement Notice</h3>
          <p style={{ margin: '0 0 14px 0', fontSize: 12, color: 'var(--text-secondary)' }}>
            This custom text will be shown on the maintenance screen when users attempt to access a section that is offline.
          </p>

          <textarea
            className="field-inp"
            rows="3"
            value={maintenance.notice || ''}
            onChange={e => setMaintenance(prev => ({ ...prev, notice: e.target.value }))}
            placeholder="Enter custom maintenance message..."
            style={{ width: '100%', marginBottom: 14, resize: 'vertical' }}
          />

          <button
            className="btn-submit"
            onClick={() => handleSave()}
            disabled={saving}
          >
            {saving ? 'Saving...' : <><IconCheck /> Save Announcement Notice</>}
          </button>
        </div>
      </div>

      {/* Toast alert */}
      {toast && (
        <div className={`med-toast ${toast.type}`} style={{ position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 999999, background: toast.type === 'error' ? '#dc2626' : '#059669', color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}
