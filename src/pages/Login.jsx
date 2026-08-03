// src/pages/Login.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import PublicSchedule from '../components/PublicSchedule'
import './Login.css'

const ROLES = ['Admin', 'Team Leader', 'Judge', 'Announcer', 'Invigilator', 'Participant']

const IconFrame = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const IconEyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const IconArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPublicSchedule, setShowPublicSchedule] = useState(false)

  if (showPublicSchedule) {
    return <PublicSchedule onBack={() => setShowPublicSchedule(false)} />
  }

  const devIp = typeof __DEV_IP__ !== 'undefined' ? __DEV_IP__ : ''
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const networkUrl = isLocalhost && devIp ? `http://${devIp}:5173/` : window.location.origin + '/'
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=4f9cf9&bgcolor=12151c&data=${encodeURIComponent(networkUrl)}`

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.')
      return
    }
    setLoading(true)
    setError('')
    const result = await login(username.trim(), password)
    setLoading(false)
    if (!result?.success) setError(result?.message || 'Invalid username or password')
  }

  return (
    <div className="login-root">

      {/* ── Left Panel ── */}
      <div className="login-left">
        <div className="left-top">
          <div className="brand-mark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div className="mobile-only-logo" style={{ alignItems: 'center', gap: 10 }}>
              <img src="/inspico-logo.svg" alt="Inspico Logo" style={{ width: 26, height: 26, filter: 'brightness(0) invert(1)', flexShrink: 0 }} />
              <img src="/inspico.svg" alt="Inspico" style={{ height: 18, maxWidth: 110 }} />
            </div>
            <span className="desktop-bdsa-tag" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '2px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>BDSA · {new Date().getFullYear()}</span>
          </div>
        </div>

        <div className="left-center">
          {/* Logo + Title aligned in a row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <img src="/inspico-logo.svg" alt="Inspico Logo" style={{ width: 72, height: 72, filter: 'brightness(0) invert(1)', flexShrink: 0 }} />
            <img src="/inspico.svg" alt="Inspico" style={{ height: 56, maxWidth: 320 }} />
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 0, fontWeight: 400, letterSpacing: '1px', textTransform: 'uppercase' }}>Arts Gallery</p>
          <div className="hero-divider" />
          <p className="hero-tagline">
            A unified management platform for every role — from the stage to the scorecard.
          </p>
        </div>

        <div className="left-bottom">
          <p className="access-label">Access Levels</p>
          <div className="access-roles">
            {ROLES.map(r => (
              <span key={r} className="access-role">{r}</span>
            ))}
          </div>

          <div className="dev-qr-card">
            <img src={qrCodeUrl} alt="Local network QR Code" className="dev-qr-img" />
            <div className="dev-qr-info">
              <p className="dev-qr-title">Mobile Access QR</p>
              <p className="dev-qr-subtitle">Scan to open on mobile</p>
              <code className="dev-qr-url">{networkUrl}</code>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="login-right">
        <div className="login-form-inner">
          <div className="form-header">
            <h2 className="form-title">Sign In</h2>
            <p className="form-subtitle">Enter your credentials to continue</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
          {/* Username */}
          <div className="field-group">
            <label className="field-label" htmlFor="username">Username</label>
            <div className="field-input-wrap">
              <input
                id="username"
                className="field-input"
                type="text"
                placeholder="your username"
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                autoComplete="username"
                autoFocus
                spellCheck={false}
              />
              <span className="field-underline" />
            </div>
          </div>

          {/* Password */}
          <div className="field-group">
            <label className="field-label" htmlFor="password">Password</label>
            <div className="field-input-wrap">
              <input
                id="password"
                className="field-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                autoComplete="current-password"
              />
              <span className="field-underline" />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="error-message" role="alert">
              <IconAlert />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            id="login-submit-btn"
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            <span className="btn-content">
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  Authenticating
                </>
              ) : (
                <>
                  Sign In
                  <IconArrow />
                </>
              )}
            </span>
          </button>
          
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button 
              type="button" 
              className="pub-sched-btn" 
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-light)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
              onClick={() => setShowPublicSchedule(true)}
            >
              View Live Festival Schedule
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
