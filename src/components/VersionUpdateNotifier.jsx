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

  // CASE 1: Auto-refresh countdown for Public site visitors
  if (countdown !== null) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999999,
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        border: '1px solid rgba(79, 156, 249, 0.4)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(79, 156, 249, 0.2)',
        borderRadius: 30,
        padding: '10px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        animation: 'fadeInUp 0.3s ease'
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#4f9cf9',
          boxShadow: '0 0 10px #4f9cf9',
          animation: 'pulse 1s infinite'
        }} />
        <span>✨ New update available ({newVersionLabel}) — Refreshing in {countdown}s...</span>
        <button
          onClick={triggerReload}
          style={{
            background: 'var(--accent-light, #4f9cf9)',
            color: '#0e0b07',
            border: 'none',
            borderRadius: 16,
            padding: '4px 12px',
            fontSize: 11,
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          Refresh Now
        </button>
      </div>
    )
  }

  // CASE 2: Safe top floating banner for Logged-in Staff (Judges, Invigilators, Teams)
  return (
    <div style={{
      position: 'fixed',
      top: 12,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 999999,
      maxWidth: '92%',
      width: 480,
      background: 'linear-gradient(135deg, #1e293b, #111827)',
      border: '1px solid rgba(247, 201, 72, 0.35)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      borderRadius: 12,
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      color: '#fff',
      animation: 'fadeInDown 0.3s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>✨</span>
        <div>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#f7c948' }}>
            New System Update Available
          </p>
          <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
            Update to {newVersionLabel} when your current evaluation is complete.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={triggerReload}
          style={{
            background: '#f7c948',
            color: '#0e0b07',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 11.5,
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          Update Now
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 16,
            cursor: 'pointer',
            padding: '0 4px'
          }}
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
