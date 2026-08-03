import { useRef, useState, useEffect } from 'react'
import { toJpeg } from 'html-to-image'
import { QRCodeSVG } from 'qrcode.react'

export default function ChestCardModal({ participant, onClose }) {
  const cardRef = useRef(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const chessNo = participant.chess_number || '—'
  const name = (participant.name || '').toUpperCase()
  const team = (participant.teams?.name || '').toUpperCase()
  const category = (participant.categories?.name || '').toUpperCase()

  const domainUrl = window.location.origin
  const qrText = chessNo && chessNo !== '—' ? `${domainUrl}/#${chessNo}` : domainUrl

  async function handleDownloadJPEG() {
    if (!cardRef.current) return
    try {
      setDownloading(true)
      const dataUrl = await toJpeg(cardRef.current, { quality: 0.95, pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = `ChestCard_${chessNo}_${name.replace(/\s+/g, '_')}.jpeg`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Failed to download card JPEG:', err)
      alert('Could not download image. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          maxWidth: '90vw',
          maxHeight: '90vh'
        }}
      >
        {/* Actions header */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={handleDownloadJPEG}
            disabled={downloading}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #4f9cf9, #2563eb)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: downloading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? 'Generating JPEG...' : 'Download Card JPEG'}
          </button>

          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Card Canvas Preview (scaled visually to fit modal perfectly centered without extra border/background) */}
        <div
          style={{
            overflow: 'hidden',
            maxHeight: 'calc(90vh - 80px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 700,
            height: 385
          }}
        >
          <div style={{ transform: 'scale(0.65)', transformOrigin: 'center center' }}>
            <div
              ref={cardRef}
              style={{
                width: 1051,
                height: 574,
                boxSizing: 'border-box',
                position: 'relative',
                backgroundImage: 'url(/chest_card_bg.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
                fontFamily: "'Poppins', sans-serif",
                color: '#ffffff',
                padding: '84px 0 223px',
                fontSize: '1.954312rem'
              }}
            >
              <div style={{ margin: '0 auto', position: 'relative', width: 875 }} className="group">
              <div style={{ float: 'left', position: 'relative', width: 209 }}>
                <div
                  style={{
                    width: 209,
                    height: 209,
                    backgroundColor: '#ffffff',
                    padding: 6,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  <QRCodeSVG
                    value={qrText}
                    size={197}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                  />
                </div>
                <p
                  style={{
                    margin: '37px 0 0',
                    fontSize: '3.079191rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    lineHeight: 1,
                    color: '#ffffff'
                  }}
                >
                  {chessNo}
                </p>
              </div>
              <p
                style={{
                  float: 'right',
                  margin: '49px 9px 0 0',
                  width: 359,
                  fontWeight: 500,
                  lineHeight: '48.32482px',
                  color: '#ffffff',
                  overflow: 'visible'
                }}
              >
                <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{name}</span>
                <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{team}</span>
                <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{category}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
