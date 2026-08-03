// src/components/MaintenanceScreen.jsx
import { useState } from 'react'

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

export default function MaintenanceScreen({ title = "System Maintenance", notice, onRefresh }) {
  const [checking, setChecking] = useState(false)

  const handleRefresh = async () => {
    setChecking(true)
    if (onRefresh) await onRefresh()
    setTimeout(() => {
      setChecking(false)
      window.location.reload()
    }, 600)
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

      {/* Footer copyright */}
      <div style={{
        marginTop: '32px',
        fontSize: '12px',
        color: 'var(--text-muted)',
        zIndex: 2
      }}>
        © {new Date().getFullYear()} Inspico Art Gallery Platform. All rights reserved.
      </div>
    </div>
  )
}
