// src/components/ThemeSwitcher.jsx
import { useState } from 'react'
import { THEMES, applyTheme, getSavedTheme } from '../themes'
import './ThemeSwitcher.css'

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(getSavedTheme)

  const handleSelect = (theme) => {
    applyTheme(theme)
    setActive(theme.id)
    setOpen(false)
  }

  return (
    <div className="ts-root">
      {/* Panel */}
      <div className={`ts-panel ${open ? 'ts-panel--open' : ''}`}>
        <p className="ts-heading">Choose a Theme</p>
        <div className="ts-grid">
          {THEMES.map(t => (
            <button
              key={t.id}
              className={`ts-card ${active === t.id ? 'ts-card--active' : ''}`}
              onClick={() => handleSelect(t)}
              title={t.name}
            >
              {/* Mini preview */}
              <div className="ts-preview" style={{ background: t.colors['--bg-primary'] }}>
                <div className="ts-preview-card" style={{
                  background: t.colors['--bg-card'],
                  border: `1px solid ${t.colors['--border-subtle']}`,
                }}>
                  <div className="ts-preview-dot" style={{ background: t.colors['--accent-light'] }} />
                  <div className="ts-preview-line" style={{ background: t.colors['--text-muted'] }} />
                  <div className="ts-preview-line ts-preview-line--short" style={{ background: t.colors['--text-muted'] }} />
                  <div className="ts-preview-btn" style={{ background: t.colors['--accent'] }} />
                </div>
              </div>
              <div className="ts-card-info">
                <span className="ts-emoji">{t.emoji}</span>
                <span className="ts-name">{t.name}</span>
              </div>
              {active === t.id && (
                <div className="ts-active-ring" style={{ borderColor: t.colors['--accent-light'] }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Trigger button */}
      <button
        className="ts-trigger"
        onClick={() => setOpen(v => !v)}
        title="Switch Theme"
      >
        <span className="ts-trigger-icon">
          {THEMES.find(t => t.id === active)?.emoji || '🎨'}
        </span>
        <span className="ts-trigger-label">
          {open ? 'Close' : 'Themes'}
        </span>
        <svg
          className={`ts-chevron ${open ? 'ts-chevron--up' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  )
}
