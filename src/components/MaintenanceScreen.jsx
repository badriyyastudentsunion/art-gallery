// src/components/MaintenanceScreen.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const IconTools = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 44, height: 44, color: 'var(--accent)' }}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
)

const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
)

const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export default function MaintenanceScreen({ title = "System Maintenance", notice, onRefresh }) {
  const { login } = useAuth()
  const [checking, setChecking] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Login form state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    // Auto open login modal if URL hash contains #login or #admin
    const checkHash = () => {
      const h = window.location.hash.toLowerCase()
      if (h === '#login' || h === '#admin') {
        setShowLoginModal(true)
      }
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  const handleRefresh = async () => {
    setChecking(true)
    if (onRefresh) await onRefresh()
    setTimeout(() => {
      setChecking(false)
      window.location.reload()
    }, 600)
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLoginError('')
    if (!username.trim() || !password.trim()) {
      setLoginError('Please enter username and password')
      return
    }
    setLoginLoading(true)
    try {
      const res = await login(username.trim(), password.trim())
      if (!res.success) {
        setLoginError(res.error || 'Invalid credentials')
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed')
    } finally {
      setLoginLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glow ambient rings */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(79, 156, 249, 0.12) 0%, rgba(13, 17, 23, 0) 70%)',
        pointerEvents: 'none'
      }} />

      {/* Top Header Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '32px',
        zIndex: 2
      }}>
        <img src="/inspico-logo.svg" alt="Inspico" style={{ height: 28, width: 28, filter: 'brightness(0) invert(1)' }} />
        <img src="/inspico.svg" alt="Inspico" style={{ height: 20, maxWidth: 120 }} />
      </div>

      {/* Main Glass Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        padding: '40px 32px',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        boxShadow: 'var(--shadow-card)',
        position: 'relative',
        zIndex: 2,
        boxSizing: 'border-box'
      }}>
        {/* Animated Badge Icon */}
        <div style={{
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          background: 'var(--accent-dim)',
          border: '1px solid rgba(79, 156, 249, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px auto',
          boxShadow: 'var(--shadow-accent)'
        }}>
          <IconTools />
        </div>

        <h1 style={{
          fontSize: '22px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: '0 0 12px 0',
          letterSpacing: '-0.3px'
        }}>
          {title}
        </h1>

        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          margin: '0 0 24px 0'
        }}>
          {notice || "This section is temporarily offline for scheduled system maintenance. Please check back shortly."}
        </p>

        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '28px',
          fontSize: '12px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
          <span>Status: Maintenance In Progress</span>
        </div>

        <button
          onClick={handleRefresh}
          disabled={checking}
          style={{
            background: 'linear-gradient(135deg, var(--btn-from), var(--btn-to))',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 24px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: checking ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            transition: 'var(--transition)',
            boxShadow: '0 4px 15px rgba(79, 156, 249, 0.25)'
          }}
        >
          <IconRefresh />
          <span>{checking ? 'Checking Status...' : 'Check Status Again'}</span>
        </button>
      </div>

      {/* Footer copyright + Discreet Admin Login Link */}
      <div style={{
        marginTop: '32px',
        fontSize: '12px',
        color: 'var(--text-muted)',
        zIndex: 2,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div>© {new Date().getFullYear()} Inspico Art Gallery Platform. All rights reserved.</div>
        <button
          onClick={() => setShowLoginModal(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            opacity: 0.6,
            transition: 'var(--transition)'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
        >
          <IconLock />
          <span>Staff & Admin Portal Login</span>
        </button>
      </div>

      {/* Admin / Staff Login Modal */}
      {showLoginModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: 20
        }} onClick={() => setShowLoginModal(false)}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '32px 28px',
            maxWidth: '380px',
            width: '100%',
            boxShadow: 'var(--shadow-card)',
            position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            
            <button
              onClick={() => setShowLoginModal(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <IconX />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconLock />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Admin & Staff Login</h3>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Enter your admin credentials to access system</p>
              </div>
            </div>

            {loginError && (
              <div style={{
                background: 'rgba(255, 107, 107, 0.1)',
                border: '1px solid rgba(255, 107, 107, 0.3)',
                color: '#ff6b6b',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                marginBottom: '16px'
              }}>
                {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--accent-light)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. admin"
                  autoFocus
                  style={{
                    width: '100%',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--accent-light)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                style={{
                  background: 'linear-gradient(135deg, var(--btn-from), var(--btn-to))',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: loginLoading ? 'not-allowed' : 'pointer',
                  marginTop: '8px',
                  boxShadow: '0 4px 15px rgba(79, 156, 249, 0.25)'
                }}
              >
                {loginLoading ? 'Authenticating...' : 'Sign In to Admin Panel'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
