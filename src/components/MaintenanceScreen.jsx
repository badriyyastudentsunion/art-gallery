// src/components/MaintenanceScreen.jsx
import { useState, useEffect } from 'react'
import LoginModal from './LoginModal'
import '../pages/LandingPage.css'

/* ── Icons ── */
const IconLogIn = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, opacity: 0.8 }}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
)

const InspicoTitleLogo = ({ style = {} }) => (
  <svg viewBox="0 0 372.33 100.24" style={{ height: 60, maxWidth: 350, width: '100%', ...style }}>
    <g>
      <g>
        <path fill="#fff" d="M184.6,71.02v29.19s-27.08-.01-27.08-.01V0s59.67,0,59.67,0l.02,71.01h-32.61ZM190.61,22.21h-6.01v30.45h6.01v-30.45Z"/>
        <path fill="#fff" d="M151.9,100.2h-58.36s0-27.72,0-27.72h33.23s-.04-7.62-.04-7.62l-27.17-.06c-3.51-.06-6.02-2.23-6.02-5.77V0s58.36,0,58.36,0v28.5s-34.45,0-34.45,0v7.36s29.17,0,29.17,0c2.82-.07,4.91,1.79,5.28,4.66v59.68Z"/>
        <path fill="#fff" d="M60.05,41.72l-18.86-18.94.08,7.75,14.08,13.98c2.6,2.58,4.77,5.35,6.65,8.47,2.29,4.18,2.83,8.52,3.37,13.32l.13,33.91h-32.78s0-100.2,0-100.2h55.4s0,100.22,0,100.22l-12.09-.12c-2.65-.03-4.57-2.35-5.16-4.62l-.49-3.73-.2-24.8c-.08-9.71-3.09-18.19-10.12-25.24Z"/>
        <rect fill="#fff" y="0" width="27.1" height="100.24"/>
        <path fill="#fff" d="M368.25,100.19l-40.23.03c-2.83,0-5.95-1.71-5.95-5.03l-.04-89.16c0-2.75,1.48-5.96,4.64-5.96h41.35c2.93,0,4.3,3.07,4.3,5.61v90.24c0,2.19-2.13,3.7-4.08,4.28ZM350.52,74.99V24.32c0-1.8-1.64-2.26-3.2-2.19-.93.04-2.98.21-2.98,1.65l-.02,50.56c0,.67.33,1.89.82,1.97l2.3.38c.89.15,3.08-.05,3.08-1.7Z"/>
        <path fill="#fff" d="M286.19,72.16c.19,1.61,1.11,2.4,2.47,2.37h28.11s0,25.68,0,25.68l-53.79-.02V0s53.79,0,53.79,0v23.91s-27.76,0-27.76,0c-1.72-.02-2.68,1.15-2.82,2.9v45.36Z"/>
        <path fill="#fff" d="M257.02,100.21h-34.11s.01-86.79.01-86.79c10.02,7.66,21.58,11.85,34.1,11.91v74.88Z"/>
      </g>
      <path className="lp-red-dot-glitch" fill="#B8193C" d="M257.03,20.56c-12.78-.24-24.71-5.29-34.06-14.01l-.05-6.55h34.1s0,20.56,0,20.56Z"/>
    </g>
  </svg>
)

export default function MaintenanceScreen({ title = "System Maintenance", notice, onRefresh }) {
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Auto-open on URL hash #admin or #login
  useEffect(() => {
    const checkHash = () => {
      const h = window.location.hash.toLowerCase()
      if (h === '#login' || h === '#admin') setShowLoginModal(true)
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  // Close on Escape
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') setShowLoginModal(false) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      background: '#0D090B',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: 'hidden',
      position: 'relative'
    }}>

      {/* ── Decorative rotating logos (same as HomeTab) ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <img src="/inspico-logo.svg" alt="" style={{
          position: 'absolute', width: 220, height: 220, top: -50, left: -50,
          opacity: 0.07, filter: 'invert(1) brightness(0.4)',
          animation: 'lp-spin-slow 30s linear infinite'
        }} />
        <img src="/inspico-logo.svg" alt="" style={{
          position: 'absolute', width: 280, height: 280, bottom: -70, right: -70,
          opacity: 0.06, filter: 'invert(1) brightness(0.4)',
          animation: 'lp-spin-slow 45s linear infinite reverse'
        }} />
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(184,25,60,0.12) 0%, transparent 65%)',
          top: -150, right: -150
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(79,156,249,0.05) 0%, transparent 65%)',
          bottom: 0, left: -100
        }} />
      </div>

      {/* ── Topbar — exact same style as lp-topbar ── */}
      <header style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 24px',
        height: 56,
        background: 'rgba(14, 14, 14, 0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 20,
        position: 'relative'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <img src="/inspico-logo.svg" alt="Inspico" style={{ width: 26, height: 26, filter: 'brightness(0) invert(1)' }} />
          <img src="/inspico.svg" alt="Inspico" style={{ height: 16, maxWidth: 120 }} />
        </div>

        {/* Login button on topbar right — same style as lp-topbar-login */}
        <button
          onClick={() => setShowLoginModal(true)}
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 999,
            color: 'rgba(255,255,255,0.9)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <IconLogIn />
          <span>Login</span>
        </button>
      </header>

      {/* ── Main Content — centered text, no box ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '36px 24px',
        position: 'relative',
        zIndex: 2,
        animation: 'lp-fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both'
      }}>
        {/* Eyebrow */}
        <p style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '4px',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)',
          marginBottom: 32
        }}>BDSA Presence</p>

        {/* Click to See More */}
        <div style={{ marginBottom: 10, opacity: 0.5 }}>
          <img src="/click-to-see-more.svg" alt="Click to see more" style={{ height: 26, filter: 'invert(1)' }} />
        </div>

        {/* Big title logo — same size as lp-logo-word */}
        <InspicoTitleLogo />

        <p style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '5px',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.35)',
          marginTop: 14,
          marginBottom: 36
        }}>Arts Gallery</p>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', maxWidth: 320, marginBottom: 36 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#B8193C' }} />
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        </div>

        {/* Maintenance label */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16
        }}>
          <span style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#B8193C',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: '#B8193C'
          }}>
            {title}
          </span>
        </div>

        {/* Notice text */}
        {notice && (
          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.7,
            maxWidth: 380,
            margin: 0
          }}>
            {notice}
          </p>
        )}

        {!notice && (
          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.35)',
            lineHeight: 1.7,
            maxWidth: 380,
            margin: 0
          }}>
            We're back very soon. Thank you for your patience.
          </p>
        )}
      </div>

      {/* ── Shared Login Modal ── */}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </div>
  )
}
