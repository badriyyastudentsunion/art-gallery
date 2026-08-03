// src/App.jsx
// ─── UI Design: Claude Sonnet 4.6 | Logic: Gemini ───
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { supabase } from './lib/supabase'
import LandingPage from './pages/LandingPage'
import AdminPanel from './pages/admin/AdminPanel'
import TeamDashboard from './pages/team/TeamDashboard'
import InvigilatorDashboard from './pages/invigilator/InvigilatorDashboard'
import JudgeDashboard from './pages/judge/JudgeDashboard'
import AnnouncerDashboard from './pages/announcer/AnnouncerDashboard'
import MediaDashboard from './pages/media/MediaDashboard'

import PWAInstallPrompt from './components/PWAInstallPrompt'
import MaintenanceScreen from './components/MaintenanceScreen'

function AppRoutes() {
  const { user } = useAuth()
  const [maintenance, setMaintenance] = useState({ all: false, notice: '' })

  const fetchMaintenance = async () => {
    try {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'maintenance_status').maybeSingle()
      if (data?.value) {
        setMaintenance(JSON.parse(data.value))
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchMaintenance()
    const rand = Math.random().toString(36).substring(2, 7)
    const ch = supabase.channel(`app-global-maint-${rand}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, (payload) => {
        if (!payload.new || payload.new.key === 'maintenance_status') {
          fetchMaintenance()
        }
      })
      .subscribe()

    const timer = setInterval(() => {
      fetchMaintenance()
    }, 2000)

    return () => {
      supabase.removeChannel(ch)
      clearInterval(timer)
    }
  }, [])

  // Admin panel is NEVER blocked by maintenance
  if (user?.role === 'Admin') {
    return <AdminPanel />
  }

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const bypassMaintenance = isLocalhost && maintenance.allow_localhost_bypass === true

  const isMasterMaintenance = maintenance.all === true

  if (!user) {
    if ((isMasterMaintenance || maintenance.landing_page) && !bypassMaintenance) {
      return <MaintenanceScreen title="Public Site Maintenance" notice={maintenance.notice} onRefresh={fetchMaintenance} />
    }
    return <LandingPage />
  }

  // Logged-in non-admin roles
  if (isMasterMaintenance && !bypassMaintenance) {
    return <MaintenanceScreen title="System Under Maintenance" notice={maintenance.notice} onRefresh={fetchMaintenance} />
  }

  if (user.role === 'Team' && maintenance.team_leaders && !bypassMaintenance) {
    return <MaintenanceScreen title="Team Leaders Dashboard Offline" notice={maintenance.notice} onRefresh={fetchMaintenance} />
  }

  if (user.role === 'Judge' && maintenance.judges && !bypassMaintenance) {
    return <MaintenanceScreen title="Judges Portal Offline" notice={maintenance.notice} onRefresh={fetchMaintenance} />
  }

  if (user.role === 'Announcer' && maintenance.announcers && !bypassMaintenance) {
    return <MaintenanceScreen title="Announcers Portal Offline" notice={maintenance.notice} onRefresh={fetchMaintenance} />
  }

  if (user.role === 'Invigilator' && maintenance.invigilators && !bypassMaintenance) {
    return <MaintenanceScreen title="Invigilators Portal Offline" notice={maintenance.notice} onRefresh={fetchMaintenance} />
  }

  if (user.role === 'Media' && maintenance.media && !bypassMaintenance) {
    return <MaintenanceScreen title="Media Portal Offline" notice={maintenance.notice} onRefresh={fetchMaintenance} />
  }

  return (
    <>
      {user.role === 'Team' && <TeamDashboard />}
      {user.role === 'Invigilator' && <InvigilatorDashboard />}
      {user.role === 'Judge' && <JudgeDashboard />}
      {user.role === 'Announcer' && <AnnouncerDashboard />}
      {user.role === 'Media' && <MediaDashboard />}
      <PWAInstallPrompt />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
