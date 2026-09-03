// src/components/HeaderInstallButton.jsx
import React, { useState, useEffect } from 'react'

export default function HeaderInstallButton({ style, className }) {
  const [isStandalone] = useState(() => {
    return typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    )
  })
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handleInstalled = () => setInstalled(true)
    window.addEventListener('appinstalled', handleInstalled)
    return () => window.removeEventListener('appinstalled', handleInstalled)
  }, [])

  if (isStandalone || installed) return null

  const handleInstall = async (e) => {
    e.stopPropagation()
    const prompt = window.deferredPWAInstallPrompt
    if (prompt) {
      try {
        prompt.prompt()
        const { outcome } = await prompt.userChoice
        if (outcome === 'accepted') {
          window.deferredPWAInstallPrompt = null
          setInstalled(true)
        }
        return
      } catch (err) {
        console.warn('Install prompt error:', err)
      }
    }

    // Fallback if browser doesn't support direct programmatic prompt (e.g. iOS Safari)
    const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    if (isIOS) {
      alert("To install on iPhone/iPad: Tap the Share button (📤) at the bottom of Safari, then choose 'Add to Home Screen' (➕).")
    } else {
      alert("To install: Tap your browser menu (⋮) at top right and choose 'Install app' or 'Add to Home screen'.")
    }
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      className={className}
      style={{
        background: 'rgba(79, 156, 249, 0.12)',
        border: '1px solid rgba(79, 156, 249, 0.35)',
        color: '#4f9cf9',
        borderRadius: 8,
        width: 32,
        height: 32,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
        transition: 'all 0.2s ease',
        ...style
      }}
      title="Install App to Home Screen"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
  )
}
