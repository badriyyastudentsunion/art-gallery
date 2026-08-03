// src/components/LoginModal.jsx
// Shared login modal used by LandingPage and MaintenanceScreen
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import '../pages/LandingPage.css'

/* ── Icons ── */
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
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
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)
const IconArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
)

export default function LoginModal({ onClose }) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="lp-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="lp-modal-card">
        <button className="lp-modal-close" onClick={onClose} aria-label="Close"><IconX /></button>
        <div className="lp-modal-brand">
          <img className="lp-modal-logo-icon" src="/inspico-logo.svg" alt="" />
          <img className="lp-modal-logo-word" src="/inspico.svg" alt="Inspico" />
        </div>
        <h2 className="lp-modal-title">Sign In</h2>
        <p className="lp-modal-sub">For event staff &amp; participants</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="lp-field">
            <label className="lp-label" htmlFor="lp-user">Username</label>
            <input id="lp-user" className="lp-input" type="text" placeholder="your username"
              value={username} onChange={e => { setUsername(e.target.value); setError('') }}
              autoComplete="username" autoFocus spellCheck={false} />
          </div>
          <div className="lp-field">
            <label className="lp-label" htmlFor="lp-pass">Password</label>
            <div className="lp-input-wrap">
              <input id="lp-pass" className="lp-input" type={showPass ? 'text' : 'password'}
                placeholder="••••••••" value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                autoComplete="current-password" />
              <button type="button" className="lp-eye-btn" onClick={() => setShowPass(v => !v)}>
                {showPass ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>
          {error && <div className="lp-error" role="alert"><IconAlert />{error}</div>}
          <button id="lp-submit" type="submit" className="lp-submit-btn" disabled={loading}>
            {loading ? <><span className="lp-spinner" />Authenticating</> : <>Sign In <IconArrow /></>}
          </button>
        </form>
      </div>
    </div>
  )
}
