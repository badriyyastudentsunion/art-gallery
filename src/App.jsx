// src/App.jsx
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import AdminPanel from './pages/admin/AdminPanel'
import TeamDashboard from './pages/team/TeamDashboard'
import InvigilatorDashboard from './pages/invigilator/InvigilatorDashboard'
import JudgeDashboard from './pages/judge/JudgeDashboard'
import AnnouncerDashboard from './pages/announcer/AnnouncerDashboard'

function AppRoutes() {
  const { user } = useAuth()
  if (!user) return <Login />
  if (user.role === 'Admin') return <AdminPanel />
  if (user.role === 'Team') return <TeamDashboard />
  if (user.role === 'Invigilator') return <InvigilatorDashboard />
  if (user.role === 'Judge') return <JudgeDashboard />
  if (user.role === 'Announcer') return <AnnouncerDashboard />
  return <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
