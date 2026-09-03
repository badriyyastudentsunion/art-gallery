// src/components/VersionUpdateNotifier.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase, safeRemoveChannel } from '../lib/supabase'
import { APP_VERSION, BUILD_TIME } from '../version'

export default function VersionUpdateNotifier() {
  const { user } = useAuth()
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [newVersionLabel, setNewVersionLabel] = useState('')
  const [countdown, setCountdown] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const reloadingRef = useRef(false)

  // Trigger smooth reload
  const triggerReload = () => {
    if (reloadingRef.current) return
    reloadingRef.current = true
    try {
      // Clear cache-busters if needed
      window.location.reload()
    } catch (e) {
      window.location.href = window.location.href
    }
  }

  // Handle detection of a newer version
  const handleNewVersionDetected = (newVer, forceImmediate = false) => {
    if (reloadingRef.current) return
    setNewVersionLabel(newVer || 'latest')
    setUpdateAvailable(true)

    const isStaff = !!user && user.role !== 'Admin' // Judges, Invigilators, Team, Announcers

    if (!isStaff || forceImmediate) {
      // For Public visitors & Admin: Smooth auto reload after 2.5s countdown
      setCountdown(2)
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            triggerReload()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
  }

  // 1. Check HTTP version.json file
  const checkVersionFile = async () => {
    try {
      const res = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      if (!res.ok) return
      const data = await res.json()
      if (data && data.version && data.version !== APP_VERSION) {
        handleNewVersionDetected(data.version)
      } else if (data && data.buildTime && BUILD_TIME && data.buildTime > BUILD_TIME + 5000) {
        handleNewVersionDetected(data.version)
      }
    } catch (err) {
      // Silent error during offline or network hiccup
    }
  }

  useEffect(() => {
    // Check on initial load
    checkVersionFile()

    // Check periodically every 45s
    const interval = setInterval(checkVersionFile, 45000)

    // Check when user switches back to this tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkVersionFile()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', checkVersionFile)

    // 2. Realtime broadcast channel from Admin
    const rand = Math.random().toString(36).substring(2, 7)
    const ch = supabase.channel(`app-client-sync-${rand}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.app_client_broadcast' }, (payload) => {
        if (payload.new?.value) {
          try {
            const broadcast = JSON.parse(payload.new.value)
            if (broadcast.timestamp && broadcast.timestamp > (BUILD_TIME || 0)) {
              if (broadcast.target === 'public' && user) {
                // Ignore if targeted only for public and user is logged in
                return
              }
              handleNewVersionDetected(broadcast.version, broadcast.forceImmediate)
            }
          } catch (e) {}
        }
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', checkVersionFile)
      safeRemoveChannel(ch)
    }
  }, [user])

  if (!updateAvailable || dismissed) return null

  const isStaff = !!user && user.role !== 'Admin'

  // CASE 1: Compact minimal auto-refresh pill for Public site visitors
  if (countdown !== null) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 'max(80px, calc(16px + env(safe-area-inset-bottom)))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999999,
        maxWidth: 'calc(100vw - 28px)',
        width: 'max-content',
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(79, 156, 249, 0.35)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 16px rgba(79, 156, 249, 0.15)',
        borderRadius: 999,
        padding: '6px 10px 6px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: '#fff',
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: '#4f9cf9',
          boxShadow: '0 0 8px #4f9cf9',
          flexShrink: 0,
          animation: 'pulse 1s infinite'
        }} />
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.2px' }}>
          Updating in {countdown}s...
        </span>
        <button
          onClick={triggerReload}
          style={{
            background: 'var(--accent-light, #4f9cf9)',
            color: '#0b1120',
            border: 'none',
            borderRadius: 999,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          Refresh
        </button>
      </div>
    )
  }

  // CASE 2: Clean floating banner for Logged-in Staff (Judges, Invigilators, Teams)
  return (
    <div style={{
      position: 'fixed',
      top: 12,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 999999,
      maxWidth: 'calc(100vw - 24px)',
      width: 440,
      background: 'rgba(15, 23, 42, 0.94)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(247, 201, 72, 0.35)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      borderRadius: 12,
      padding: '8px 12px 8px 14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      color: '#fff',
      boxSizing: 'border-box',
      animation: 'fadeInDown 0.3s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>✨</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#f7c948', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            New update ({newVersionLabel})
          </p>
          <p style={{ margin: '1px 0 0 0', fontSize: 10.5, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Refresh when evaluation is complete
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button
          onClick={triggerReload}
          style={{
            background: '#f7c948',
            color: '#0e0b07',
            border: 'none',
            borderRadius: 999,
            padding: '5px 12px',
            fontSize: 11,
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          Update
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 14,
            cursor: 'pointer',
            padding: '2px 4px'
          }}
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
