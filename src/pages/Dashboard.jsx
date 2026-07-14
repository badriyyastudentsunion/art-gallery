// src/pages/Dashboard.jsx
// Temporary placeholder — full dashboard coming next
import { useAuth } from '../context/AuthContext'

const ROLE_COLORS = {
  Admin:       '#8BAE66',
  'Team Leader': '#628141',
  Judge:       '#EBD5AB',
  Announcer:   '#8BAE66',
  Invigilator: '#a0b878',
  Participant: '#EBD5AB',
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const color = ROLE_COLORS[user?.role] || '#c4a458'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0e1210',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      gap: 24,
    }}>
      <div style={{
        background: '#151d13',
        border: '1px solid rgba(139,174,102,0.12)',
        borderRadius: 16,
        padding: '40px 48px',
        textAlign: 'center',
        maxWidth: 400,
        width: '100%',
      }}>
        <div style={{
          width: 56, height: 56,
          borderRadius: 14,
          background: `${color}20`,
          border: `1px solid ${color}40`,
          margin: '0 auto 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24,
        }}>🎨</div>
        <h2 style={{ color: '#EBD5AB', fontFamily: 'Playfair Display, serif', marginBottom: 8 }}>
          Welcome, {user?.username}
        </h2>
        <span style={{
          display: 'inline-block',
          padding: '4px 14px',
          borderRadius: 99,
          background: `${color}15`,
          border: `1px solid ${color}30`,
          color: color,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginBottom: 24,
        }}>{user?.role}</span>
        <p style={{ color: 'rgba(235,213,171,0.4)', fontSize: 13, marginBottom: 28 }}>
          Full dashboard coming soon. You're logged in successfully.
        </p>
        <button
          onClick={logout}
          style={{
            background: 'none',
            border: '1px solid rgba(139,174,102,0.2)',
            borderRadius: 8,
            color: 'rgba(235,213,171,0.6)',
            padding: '10px 24px',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'Inter, sans-serif',
          }}
          onMouseEnter={e => e.target.style.borderColor = 'rgba(139,174,102,0.5)'}
          onMouseLeave={e => e.target.style.borderColor = 'rgba(139,174,102,0.2)'}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
