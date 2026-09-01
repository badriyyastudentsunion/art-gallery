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
  { id: 'landing_page', label: 'Public Landing Page & Results' },
  { id: 'team_leaders', label: 'Team Leaders Dashboard' },
  { id: 'judges',       label: 'Judges Portal' },
  { id: 'announcers',   label: 'Announcers Portal' },
  { id: 'invigilators', label: 'Invigilators Portal' },
  { id: 'media',        label: 'Media Uploaders Portal' },
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
  const [showResultPoster, setShowResultPoster] = useState(true)

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

      const { data: posterData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'show_result_poster')
        .maybeSingle()
      if (posterData) {
        setShowResultPoster(posterData.value === true || posterData.value === 'true' || posterData.value === 1 || posterData.value === '1')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const toggleResultPoster = async () => {
    const nextVal = !showResultPoster
    setSaving(true)
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'show_result_poster', value: JSON.stringify(nextVal) })
      if (error) throw error
      setShowResultPoster(nextVal)
      showToast(nextVal ? 'Result Poster enabled!' : 'Result Poster disabled!')
    } catch (err) {
      console.error(err)
      showToast(`Failed: ${err.message}`, 'error')
    } finally {
      setSaving(false)
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
      showToast('Settings saved!')
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
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: maintenance.all ? '#ef4444' : '#10b981',
              boxShadow: maintenance.all ? '0 0 12px #ef4444' : '0 0 12px #10b981'
            }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>
              Master Status: {maintenance.all ? 'MAINTENANCE (ALL OFF)' : 'ALL PORTALS ONLINE'}
            </h3>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {maintenance.all ? (
              <button
                className="btn-submit"
                onClick={() => toggleAllPortals(false)}
                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', fontSize: 12, fontWeight: 700 }}
              >
                <IconPower /> Turn ALL ON
              </button>
            ) : (
              <button
                className="btn-delete"
                onClick={() => toggleAllPortals(true)}
                style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700 }}
              >
                <IconPower /> Maintenance Mode ON
              </button>
            )}
          </div>
        </div>

        {/* Section List Grid */}
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Portal Access Controls
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 24 }}>
          {PORTALS.map(portal => {
            const isOff = maintenance.all || maintenance[portal.id]

            return (
              <div
                key={portal.id}
                style={{
                  background: 'var(--bg-card)',
                  border: isOff ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff' }}>{portal.label}</h4>

                <button
                  onClick={() => toggleSingle(portal.id)}
                  style={{
                    background: isOff ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    border: isOff ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                    color: isOff ? '#f87171' : '#34d399',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isOff ? '🛑 OFF' : '🟢 ONLINE'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Localhost Bypass Settings Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16
        }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff' }}>Localhost Developer Bypass</h3>
          <button
            type="button"
            onClick={() => toggleSingle('allow_localhost_bypass')}
            style={{
              background: maintenance.allow_localhost_bypass ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
              border: maintenance.allow_localhost_bypass ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: maintenance.allow_localhost_bypass ? '#34d399' : 'rgba(255,255,255,0.4)',
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit'
            }}
          >
            {maintenance.allow_localhost_bypass ? '🟢 ENABLED' : '🛑 DISABLED'}
          </button>
        </div>

        {/* Result Poster Preference Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff' }}>Display Result Posters</h3>
          </div>
          <button
            type="button"
            onClick={toggleResultPoster}
            disabled={saving}
            style={{
              background: showResultPoster ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
              border: showResultPoster ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: showResultPoster ? '#34d399' : 'rgba(255,255,255,0.4)',
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit'
            }}
          >
            {showResultPoster ? '🟢 ENABLED' : '🛑 DISABLED'}
          </button>
        </div>

        {/* Custom Maintenance Message Setting */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, color: '#fff' }}>Maintenance Notice</h3>

          <textarea
            className="field-inp"
            rows="2"
            value={maintenance.notice || ''}
            onChange={e => setMaintenance(prev => ({ ...prev, notice: e.target.value }))}
            placeholder="Enter custom maintenance message..."
            style={{ width: '100%', marginBottom: 10, resize: 'vertical', fontSize: 12 }}
          />

          <button
            className="btn-submit"
            onClick={() => handleSave()}
            disabled={saving}
            style={{ height: 34, fontSize: 12, padding: '0 14px' }}
          >
            {saving ? 'Saving...' : <><IconCheck /> Save Notice</>}
          </button>
        </div>

        {/* Database & System Details Card */}
        <SystemDetailsCard />
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

function SystemDetailsCard() {
  const [stats, setStats] = useState({
    competitions: 0,
    participants: 0,
    teams: 0,
    stages: 0,
    judges: 0,
    invigilators: 0,
    results: 0,
    photos: 0,
    videos: 0,
    storageBytes: 0,
    loading: true,
    ping: 0,
    error: null
  })

  useEffect(() => {
    fetchStats()
  }, [])

  function formatBytes(bytes) {
    if (bytes === 0) return '0 KB'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  async function fetchStats() {
    setStats(prev => ({ ...prev, loading: true, error: null }))
    const start = performance.now()
    try {
      const [
        { count: compCount },
        { count: partCount },
        { count: teamCount },
        { count: stageCount },
        { count: judgeCount },
        { count: invigCount },
        { count: resCount },
        { data: mediaData },
        { data: posterData },
        { data: overlayData }
      ] = await Promise.all([
        supabase.from('competitions').select('id', { count: 'exact', head: true }),
        supabase.from('participants').select('id', { count: 'exact', head: true }),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('stages').select('id', { count: 'exact', head: true }),
        supabase.from('judges').select('id', { count: 'exact', head: true }),
        supabase.from('invigilators').select('id', { count: 'exact', head: true }),
        supabase.from('competition_results').select('competition_id', { count: 'exact', head: true }),
        supabase.from('app_settings').select('value').eq('key', 'event_media').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'competition_posters').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'gallery_overlays').maybeSingle()
      ])

      const latency = Math.round(performance.now() - start)

      let totalBytes = 0
      let photoCount = 0
      let videoCount = 0

      if (mediaData?.value) {
        try {
          const items = JSON.parse(mediaData.value)
          items.forEach(item => {
            if (item.type === 'photo' && item.url) {
              photoCount++
              totalBytes += item.url.length * 0.75
            } else if (item.type === 'video' || item.type === 'shorts' || item.type === 'live') {
              videoCount++
            }
          })
        } catch {}
      }

      if (posterData?.value) {
        try {
          const items = JSON.parse(posterData.value)
          items.forEach(item => {
            if (item.url) totalBytes += item.url.length * 0.75
          })
        } catch {}
      }

      if (overlayData?.value) {
        try {
          const ov = JSON.parse(overlayData.value)
          if (ov.overlay43) totalBytes += ov.overlay43.length * 0.75
          if (ov.overlay34) totalBytes += ov.overlay34.length * 0.75
        } catch {}
      }

      setStats({
        competitions: compCount || 0,
        participants: partCount || 0,
        teams: teamCount || 0,
        stages: stageCount || 0,
        judges: judgeCount || 0,
        invigilators: invigCount || 0,
        results: resCount || 0,
        photos: photoCount,
        videos: videoCount,
        storageBytes: totalBytes,
        ping: latency,
        loading: false,
        error: null
      })
    } catch (err) {
      console.error(err)
      setStats(prev => ({ ...prev, loading: false, error: err.message }))
    }
  }

  const statItems = [
    { label: 'Competitions', value: stats.competitions, icon: '🏆', color: '#4f9cf9' },
    { label: 'Participants', value: stats.participants, icon: '👥', color: '#a855f7' },
    { label: 'Teams', value: stats.teams, icon: '🛡️', color: '#2ed573' },
    { label: 'Stages', value: stats.stages, icon: '🎭', color: '#fb923c' },
    { label: 'Judges & Invigilators', value: stats.judges + stats.invigilators, icon: '⚖️', color: '#ff9f43' },
    { label: 'Gallery Photos', value: stats.photos, icon: '🖼️', color: '#ec4899' },
    { label: 'Published Results', value: stats.results, icon: '📊', color: '#00d2d3' }
  ]

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>Database & Storage Details</h3>
        <button
          onClick={fetchStats}
          disabled={stats.loading}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            padding: '5px 12px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          {stats.loading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Grid Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {statItems.map(item => (
          <div
            key={item.label}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: item.color }}>
                {stats.loading ? '...' : item.value}
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Database Connection & Storage Usage Info */}
      <div style={{
        background: 'rgba(13, 17, 23, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 10,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: stats.error ? '#ef4444' : '#2ed573', boxShadow: stats.error ? '0 0 8px #ef4444' : '0 0 8px #2ed573' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
              Database Status: {stats.error ? 'Error / Disconnected' : 'Connected to Supabase PostgreSQL'}
            </span>
          </div>
          {!stats.loading && !stats.error && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              Latency: {stats.ping} ms
            </span>
          )}
        </div>

        {/* Media Storage Usage Bar */}
        <div style={{ paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
            <span style={{ color: 'var(--text-secondary)' }}>💾 Media & Image Storage Usage:</span>
            <span style={{ color: '#ec4899', fontWeight: 700 }}>
              {stats.loading ? 'Calculating...' : `${formatBytes(stats.storageBytes)} used (Free Tier Limit ~500 MB)`}
            </span>
          </div>
          <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${Math.min(100, Math.max(1, (stats.storageBytes / (500 * 1024 * 1024)) * 100))}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, #ec4899, #a855f7)', 
                borderRadius: 4,
                transition: 'width 0.3s'
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}
