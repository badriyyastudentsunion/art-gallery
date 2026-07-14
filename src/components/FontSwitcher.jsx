// src/components/FontSwitcher.jsx
import { useState } from 'react'
import { FONT_PAIRINGS, applyFontPairing, getSavedFontPairing } from '../fontPairings'
import './FontSwitcher.css'

export default function FontSwitcher() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(getSavedFontPairing)

  const handleSelect = (pairing) => {
    applyFontPairing(pairing)
    setActive(pairing.id)
  }

  return (
    <div className="fs-root">
      {/* Selector Drawer */}
      <div className={`fs-drawer ${open ? 'fs-drawer--open' : ''}`}>
        <p className="fs-title">Select Font Pairing</p>
        <div className="fs-list">
          {FONT_PAIRINGS.map(p => (
            <button
              key={p.id}
              className={`fs-item ${active === p.id ? 'fs-item--active' : ''}`}
              onClick={() => handleSelect(p)}
            >
              <div className="fs-item-preview">
                <span className="fs-preview-heading" style={{
                  fontFamily: p.heading,
                  fontStyle: p.headingStyle,
                  fontWeight: p.headingWeight
                }}>
                  Aa
                </span>
                <span className="fs-preview-body" style={{ fontFamily: p.body }}>
                  ab
                </span>
              </div>
              <div className="fs-item-info">
                <span className="fs-item-name">{p.name}</span>
                <span className="fs-item-desc">{p.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        className="fs-trigger"
        onClick={() => setOpen(v => !v)}
      >
        <span className="fs-trigger-icon">🔤</span>
        <span>{open ? 'Hide Fonts' : 'Choose Font Pairing'}</span>
        <svg
          className={`fs-chevron ${open ? 'fs-chevron--up' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  )
}
