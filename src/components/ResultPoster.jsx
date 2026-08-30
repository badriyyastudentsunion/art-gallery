// src/components/ResultPoster.jsx
import React, { useRef, useState, useEffect } from 'react'
import { toPng } from 'html-to-image'
import './ResultPoster.css'

export default function ResultPoster({ competition, results = [] }) {
  const posterRef = useRef(null)
  const containerRef = useRef(null)
  const [scale, setScale] = useState(0.4)
  const [downloading, setDownloading] = useState(false)

  // Measure preview container and compute scale factor relative to 1162px canvas
  useEffect(() => {
    if (!containerRef.current) return
    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth
        setScale(width / 1162)
      }
    }
    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const categoryName = competition?.categories?.name || 'General'
  const competitionName = competition?.name || 'Competition'
  const codeNumber = competition?.announcementNumber
    ? String(competition.announcementNumber).padStart(2, '0')
    : '01'

  // Extract top 3 positions / winners
  const topWinners = (results || []).slice(0, 3).map((r, idx) => {
    const rankNum = r.position ? String(r.position).padStart(2, '0') : String(idx + 1).padStart(2, '0')
    return {
      rank: `${rankNum}.`,
      name: r.participants?.name || 'Participant',
      team: r.participants?.teams?.name || '—'
    }
  })

  // Fill in blanks if fewer than 3 winners
  while (topWinners.length < 3) {
    const nextRank = String(topWinners.length + 1).padStart(2, '0')
    topWinners.push({
      rank: `${nextRank}.`,
      name: '—',
      team: '—'
    })
  }

  const handleDownload = async (e) => {
    if (e) e.stopPropagation()
    if (!posterRef.current || downloading) return
    try {
      setDownloading(true)
      if (document.fonts) {
        await document.fonts.ready
      }
      // Render canvas at full 1162x1353 px
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: 2, // High resolution rendering
        width: 1162,
        height: 1353,
        backgroundColor: '#033a2e',
        style: {
          transform: 'none',
          position: 'static',
          display: 'block'
        }
      })
      const link = document.createElement('a')
      const cleanName = competitionName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      link.download = `${cleanName}-result-poster.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Failed to export poster image:', err)
      alert('Could not download poster. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="result-poster-wrapper">
      {/* Scaled Preview */}
      <div
        ref={containerRef}
        className="result-poster-viewport"
        style={{ cursor: 'default' }}
      >
        <div
          className="result-poster-scale-box"
          style={{ transform: `scale(${scale})` }}
        >
          {/* Main 1162x1353 Canvas */}
          <div ref={posterRef} className="result-poster-canvas">
            {/* Background Graphic */}
            <img
              src="/result-poster-bg.png"
              alt="Poster Background"
              className="rp-bg-image"
              crossOrigin="anonymous"
              loading="eager"
            />

            {/* Category Tag */}
            <div className="rp-layer-category">
              {categoryName}
            </div>

            {/* Competition Title */}
            <div className="rp-layer-competition">
              {competitionName}
            </div>

            {/* Announcement / Code Number */}
            <div className="rp-layer-code">
              {codeNumber}
            </div>

            {/* Winners List (Ranks 01, 02, 03) */}
            <div className="rp-winners-container">
              {topWinners.map((winner, idx) => (
                <div key={idx} className="rp-winner-item">
                  <div className="rp-winner-rank">{winner.rank}</div>
                  <div className="rp-winner-details">
                    <div className="rp-winner-name">{winner.name}</div>
                    <div className="rp-winner-team">{winner.team}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="result-poster-download-btn"
        onClick={handleDownload}
        disabled={downloading}
      >
        {downloading ? (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="3" strokeDasharray="45 25" strokeLinecap="round" />
            </svg>
            <span>Generating Poster...</span>
          </>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download Poster</span>
          </>
        )}
      </button>
    </div>
  )
}
