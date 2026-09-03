// src/pages/LandingPage.jsx
// ─── UI Design: Claude Sonnet 4.6 | Logic: Gemini ───
import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase, safeRemoveChannel } from '../lib/supabase'
import LogoLoader from '../components/LogoLoader'
import { APP_VERSION } from '../version'
import { QRCodeSVG } from 'qrcode.react'
import LoginModal from '../components/LoginModal'
import ResultPoster from '../components/ResultPoster'
import './LandingPage.css'

/* ══════════ ICONS ══════════ */
const IconHome = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)
const IconMedia = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)
const IconTrophy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
  </svg>
)
const IconAward = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="6" />
    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
  </svg>
)
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const IconLogIn = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
)
const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)
const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const IconEyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)
const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)
const DownloadSpinner = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeDasharray="45 25" strokeLinecap="round" opacity="0.9" />
  </svg>
)

async function triggerFileDownload(targetUrl, filename) {
  if (!targetUrl) return
  if (targetUrl.startsWith('data:')) {
    const a = document.createElement('a')
    a.href = targetUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return
  }
  const response = await fetch(targetUrl)
  const blob = await response.blob()
  const blobUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(blobUrl)
}
const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)
const IconQr = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3z" />
    <path d="M17 14h4" />
    <path d="M14 17v4" />
    <path d="M20 17h1v4h-4" />
  </svg>
)
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const IconCrown = ({ color = '#FFD700' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
    <path d="M2 4l3 12h14l3-12-6 7-4-8-4 8-6-7z" fill={`${color}22`} />
    <circle cx="12" cy="19" r="1.5" fill={color} />
  </svg>
)
const IconMedal = ({ color = '#FFD700' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
    <circle cx="12" cy="15" r="5" fill={`${color}22`} />
    <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.11" />
  </svg>
)
const IconTimer = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)
const IconHandshake = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
    <path d="M18 11l-5-5-5 5m-2 2l-3 3a2.83 2.83 0 0 0 4 4l3-3m7-7l3-3a2.83 2.83 0 0 0-4-4l-3 3" />
    <path d="M7 13l5 5 5-5" />
  </svg>
)
const IconCheckCircle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)
const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)
const InspicoTitleLogo = ({ className = 'lp-logo-word' }) => (
  <svg viewBox="0 0 372.33 100.24" className={className}>
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
      <path className="lp-red-dot-glitch" d="M257.03,20.56c-12.78-.24-24.71-5.29-34.06-14.01l-.05-6.55h34.1s0,20.56,0,20.56Z"/>
    </g>
  </svg>
)

/* ══════════ DECORATIVE STAR ══════════ */
const DecoStar = ({ className }) => (
  <div className={`deco-star ${className}`} aria-hidden="true">
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M60 0 L72 48 L120 60 L72 72 L60 120 L48 72 L0 60 L48 48 Z" fill="#F97316" />
    </svg>
  </div>
)


/* ══════════ TYPEWRITER COMPONENT ══════════ */
function TypewriterText({ text, speed = 70, delay = 200 }) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)
  const ref = useState(null)
  const containerRef = useState(null)

  useEffect(() => {
    let timer
    let idx = 0
    const startDelay = setTimeout(() => {
      setStarted(true)
      timer = setInterval(() => {
        if (idx <= text.length) {
          setDisplayed(text.slice(0, idx))
          idx++
        } else {
          clearInterval(timer)
        }
      }, speed)
    }, delay)

    return () => {
      clearTimeout(startDelay)
      if (timer) clearInterval(timer)
    }
  }, [text, speed, delay])

  return (
    <span className="lp-typewriter">
      {displayed}
      <span className="lp-type-cursor">|</span>
    </span>
  )
}

/* ══════════ HERO LIVE STAGE STATUS / COUNTDOWN ══════════ */
function HeroStageStatus({ setTab }) {
  const [liveComp, setLiveComp] = useState(null)
  const [daysLeft, setDaysLeft] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Calculate days remaining to event start
    const startDate = new Date('2026-09-02T00:00:00')
    const now = new Date()
    const diff = startDate.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    setDaysLeft(days)

    async function fetchOngoingStageEvent() {
      try {
        const { data, error } = await supabase
          .from('competition_schedule')
          .select(`
            id, status, scheduled_time, actual_start_time,
            competitions (id, name, stage_id, stages (id, name, location), categories (name))
          `)
          .ilike('status', 'ongoing')

        if (error) {
          console.error("Failed to fetch ongoing stage event:", error)
          return
        }

        if (data && data.length > 0) {
          // Prioritize Main Stage if multiple ongoing
          const activeItem = data.find(item => 
            item.competitions?.stages?.name?.toLowerCase().includes('main') ||
            item.competitions?.stages?.name?.toLowerCase().includes('stage 1')
          ) || data[0]

          if (activeItem && activeItem.competitions) {
            setLiveComp({
              name: activeItem.competitions.name,
              category: activeItem.competitions.categories?.name,
              stageName: activeItem.competitions.stages?.name || 'Main Stage'
            })
          } else {
            setLiveComp(null)
          }
        } else {
          setLiveComp(null)
        }
      } catch (e) {
        console.error("Failed to fetch ongoing stage event:", e)
        setLiveComp(null)
      } finally {
        setLoading(false)
      }
    }

    fetchOngoingStageEvent()

    // Realtime listener for invigilator live updates
    const rand = Math.random().toString(36).substring(2, 7)
    const ch = supabase.channel(`hero-live-stage-${rand}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_schedule' }, fetchOngoingStageEvent)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, fetchOngoingStageEvent)
      .subscribe()

    // Periodic safety poll every 15s to keep live status in sync
    const interval = setInterval(fetchOngoingStageEvent, 15000)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(ch)
    }
  }, [])

  if (loading) return null

  // 1. If an active competition is marked 'ongoing' by the invigilator:
  if (liveComp) {
    let displayName = liveComp.name
    let displayCat = liveComp.category

    const match = displayName.match(/^(.*?)\s*\((.*?)\)$/)
    if (match) {
      displayName = match[1]
      displayCat = match[2]
    }

    return (
      <div 
        className="lp-live-pill" 
        onClick={() => setTab && setTab('schedule')}
        role="button"
        tabIndex={0}
        title="Click to view live stage schedule"
      >
        <span className="lp-live-pill-tag">
          <span className="lp-live-pulse-dot" />
          <span>LIVE</span>
        </span>
        <span className="lp-live-pill-sep">|</span>
        <span className="lp-live-pill-stage">{liveComp.stageName}:</span>
        <span className="lp-live-pill-title">
          {displayName}
          {displayCat && <span className="lp-live-pill-cat"> ({displayCat})</span>}
        </span>
      </div>
    )
  }

  // 2. If no competition is ongoing, but event is upcoming (daysLeft > 0):
  if (daysLeft !== null && daysLeft > 0) {
    return (
      <div className="lp-countdown" aria-label="Event Countdown">
        <span className="lp-cd-val">{daysLeft}</span>
        <span className="lp-cd-lbl">{daysLeft === 1 ? 'DAY TO GO' : 'DAYS TO GO'}</span>
      </div>
    )
  }

  // 3. If during event or ended and no competition is ongoing: show nothing
  return null
}

/* ══════════ INTERACTIVE LIVE MARQUEE ROW ══════════ */
function InteractiveMarqueeRow({ items, direction = 'left', onCardClick }) {
  const containerRef = useRef(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const currentOffset = useRef(0)
  const hasMoved = useRef(false)
  const dragDistance = useRef(0)
  const animFrameId = useRef(null)
  const lastTime = useRef(performance.now())

  // Ensure repetition for completely seamless wrap
  const singleList = useMemo(() => {
    if (!items || items.length === 0) return []
    let list = [...items]
    while (list.length < 10) {
      list = [...list, ...items]
    }
    return list
  }, [items])

  const fullList = useMemo(() => {
    if (singleList.length === 0) return []
    return [...singleList, ...singleList]
  }, [singleList])

  // Constant velocity: ~36 pixels per second
  const speed = 36 * (direction === 'left' ? -1 : 1)

  useEffect(() => {
    if (fullList.length === 0) return
    const el = containerRef.current
    if (!el) return

    // For right-sliding row, start at -halfWidth so it can scroll right smoothly
    if (direction === 'right' && currentOffset.current === 0) {
      const hw = el.scrollWidth / 2
      if (hw > 0) currentOffset.current = -hw
    }

    const tick = (now) => {
      const dt = Math.min(0.1, (now - lastTime.current) / 1000)
      lastTime.current = now

      if (!isDragging.current && el) {
        currentOffset.current += speed * dt

        const halfWidth = el.scrollWidth / 2
        if (halfWidth > 0) {
          while (currentOffset.current <= -halfWidth) {
            currentOffset.current += halfWidth
          }
          while (currentOffset.current > 0) {
            currentOffset.current -= halfWidth
          }
        }
        el.style.transform = `translate3d(${currentOffset.current}px, 0, 0)`
      }

      animFrameId.current = requestAnimationFrame(tick)
    }

    lastTime.current = performance.now()
    animFrameId.current = requestAnimationFrame(tick)

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current)
    }
  }, [speed, fullList.length, direction])

  if (fullList.length === 0) return null

  const getClientX = (e) => {
    if (e.touches && e.touches.length > 0) return e.touches[0].clientX
    if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0].clientX
    return e.clientX || 0
  }

  const handlePointerDown = (e) => {
    isDragging.current = true
    hasMoved.current = false
    dragDistance.current = 0
    startX.current = getClientX(e)
  }

  const handlePointerMove = (e) => {
    if (!isDragging.current) return
    const clientX = getClientX(e)
    const delta = clientX - startX.current
    dragDistance.current += Math.abs(delta)
    if (dragDistance.current > 6) {
      hasMoved.current = true
    }
    currentOffset.current += delta
    startX.current = clientX

    const el = containerRef.current
    if (el) {
      const halfWidth = el.scrollWidth / 2
      if (halfWidth > 0) {
        while (currentOffset.current <= -halfWidth) {
          currentOffset.current += halfWidth
        }
        while (currentOffset.current > 0) {
          currentOffset.current -= halfWidth
        }
      }
      el.style.transform = `translate3d(${currentOffset.current}px, 0, 0)`
    }
  }

  const handlePointerUp = () => {
    isDragging.current = false
    lastTime.current = performance.now()
  }

  return (
    <div
      ref={containerRef}
      className="lp-marquee-row"
      style={{
        cursor: 'grab',
        touchAction: 'pan-y',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        willChange: 'transform'
      }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onTouchCancel={handlePointerUp}
    >
      {fullList.map((item, idx) => (
        <div
          key={`${item.id}-${idx}`}
          className="lp-marquee-card"
          onClick={() => {
            if (!hasMoved.current && onCardClick) {
              onCardClick(item)
            }
          }}
        >
          <img
            src={item.thumbUrl || item.url}
            alt={item.caption || 'Gallery photo'}
            className="lp-marquee-img"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
          {item.caption && (
            <div className="lp-marquee-caption-overlay">
              <p className="lp-marquee-caption">{item.caption}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ══════════ HOME TAB ══════════ */
function HomeTab({ onLoginClick, setTab, liveStream, onOpenPoster }) {
  const [photos, setPhotos] = useState([])
  const [posters, setPosters] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [downloadingPosterId, setDownloadingPosterId] = useState(null)
  const [activePosterIdx, setActivePosterIdx] = useState(0)
  const [posterPaused, setPosterPaused] = useState(false)
  
  const dragStartX = useRef(null)
  const dragStartTime = useRef(0)
  const isDragging = useRef(false)
  const hasMoved = useRef(false)
  const wasContextMenuOpened = useRef(false)
  
  useEffect(() => {
    if (posters.length <= 1 || posterPaused) return
    const timer = setInterval(() => {
      setActivePosterIdx(prev => (prev + 1) % posters.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [posters.length, posterPaused])

  const handleDragStart = (clientX) => {
    dragStartX.current = clientX
    dragStartTime.current = Date.now()
    isDragging.current = true
    hasMoved.current = false
    setPosterPaused(true)
  }

  const handleDragMove = (clientX) => {
    if (!isDragging.current || dragStartX.current === null) return
    const diffX = clientX - dragStartX.current
    if (Math.abs(diffX) > 8) {
      hasMoved.current = true
    }
    if (Math.abs(diffX) > 40) {
      if (diffX < 0) {
        setActivePosterIdx(prev => (prev + 1) % posters.length)
      } else {
        setActivePosterIdx(prev => (prev - 1 + posters.length) % posters.length)
      }
      isDragging.current = false
      dragStartX.current = null
    }
  }

  const handleDragEnd = () => {
    isDragging.current = false
    dragStartX.current = null
  }

  useEffect(() => {
    try { localStorage.removeItem('inspico_gallery_cache') } catch {}
  }, [])

  useEffect(() => {
    async function loadPhotos() {
      try {
        const { data } = await supabase
          .from('gallery_media')
          .select('id, type, caption, thumb_url, competition_id, created_at')
          .order('created_at', { ascending: false })
        
        if (data && data.length > 0) {
          const imgItems = data.filter(item => item.type === 'photo').map(i => ({ ...i, thumbUrl: i.thumb_url }))
          const posterItems = data.filter(item => item.type === 'poster').map(i => ({ ...i, thumbUrl: i.thumb_url }))
          setPhotos(imgItems)
          setPosters(posterItems)
        }
      } catch (e) {
        console.error("Error loading photos:", e)
      }
    }
    loadPhotos()

    const ch = supabase.channel('lp-home-gallery-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_media' }, loadPhotos)
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [])

  useEffect(() => {
    if (photos.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % photos.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [photos])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
          }
        })
      },
      { threshold: 0.1 }
    )

    const elements = document.querySelectorAll('.lp-scroll-reveal')
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [photos, liveStream])

  function getYoutubeId(url) {
    if (!url) return null
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
    const match = url.trim().match(regExp)
    return match ? match[1] : null
  }

  return (
    <div className="lp-tab-home">
      <div className="lp-home-deco" aria-hidden="true">
        <img src="/inspico-logo.svg" className="lp-deco-logo lp-deco-logo--tl" alt="" />
        <img src="/inspico-logo.svg" className="lp-deco-logo lp-deco-logo--br" alt="" />
        <img src="/inspico-logo.svg" className="lp-deco-logo lp-deco-logo--tr" alt="" />
        <div className="deco-glow-teal" />
        <div className="deco-glow-subtle" />
      </div>

      <div className="lp-hero-content">
        <p className="lp-eyebrow lp-scroll-reveal">BDSA Presence</p>

        {/* Click to See More above title */}
        <div className="lp-scroll-reveal" style={{ marginBottom: 10 }}>
          <img src="/click-to-see-more.svg" alt="Click to see more" style={{ height: 28, opacity: 0.55, filter: 'invert(1)' }} />
        </div>

        <div className="lp-logo-block lp-scroll-reveal">
          <InspicoTitleLogo className="lp-logo-word" />
        </div>

        <p className="lp-arts-subtitle">Arts Gallery</p>

        <div className="lp-date-row">
          <span className="lp-date-year">2026</span>
          <span className="lp-date-month">September</span>
          <div className="lp-date-days">
            <span className="lp-date-day">02</span>
            <span className="lp-date-sep">|</span>
            <span className="lp-date-day">03</span>
            <span className="lp-date-sep">|</span>
            <span className="lp-date-day">04</span>
          </div>
        </div>

        {/* Hero Live Stage Status / Countdown */}
        <HeroStageStatus setTab={setTab} />

        {/* Malayalam tagline — magazine layout */}
        <div className="lp-ml-section lp-scroll-reveal">
          <div className="lp-ml-left">
            <p className="lp-ml-question">
              <TypewriterText text={"What the\nNext?"} speed={90} delay={400} />
            </p>
            <div className="lp-ml-left-accent" aria-hidden="true" />
            <div className="lp-creative-theme-1">
              <img src="/theme1.png" alt="Eyes" className="lp-theme-1-img" />
            </div>
          </div>
          <div className="lp-ml-right">
            <p className="lp-ml-body">
              ഒരു സാധാരണ ചോദ്യമല്ല. ജീവിതത്തിലെ ഓരോ ഘട്ടത്തിലും നമ്മെ ചിന്തിപ്പിക്കുന്ന ഒരു വിളിയാണ്.
            </p>
            <p className="lp-ml-body">
              നാം അറിവുകൾ നേടി. ഓരോ നേട്ടവും ഒരു അവസാനമല്ല; പുതിയൊരു ഉത്തരവാദിത്വത്തിന്റെ തുടക്കമാണ്. പഠനം പ്രവൃത്തിയിലേക്കും, കഴിവ് സേവനത്തിലേക്കും, വിശ്വാസം സമൂഹനന്മയിലേക്കും നയിക്കുമ്പോഴാണ് അതിന് യഥാർത്ഥ അർഥമുണ്ടാകുന്നത്.
            </p>
            <p className="lp-ml-body">
              ഓരോ വിദ്യാർത്ഥിയോടും ഉയരുന്ന ഒരു വെല്ലുവിളിയുണ്ട്: ഇന്നത്തെ നേട്ടങ്ങളിൽ തൃപ്തിപ്പെടാതെ, നാളെയെ കൂടുതൽ അർഥവത്താക്കാൻ നാം എന്ത് ചെയ്യും?
            </p>
            <p className="lp-ml-body">
              ചിന്തകൾക്ക് ചിറകു നൽകുകയും, കഴിവുകൾക്ക് ദിശ നൽകുകയും, സമൂഹത്തിന് ഉപകാരപ്പെടുന്ന വ്യക്തിത്വങ്ങളെ രൂപപ്പെടുത്തുകയും ചെയ്യുന്ന ഒരു യാത്രയാണ്...
            </p>
            <p className="lp-ml-brand">INSPICO 2026</p>
            <div className="lp-see-more-hero">
              <img src="/click-to-see-more.svg" alt="Click to See More..." className="lp-click-more-img" />
            </div>
            <p className="lp-ml-sub">ആശയമാകുന്നു...</p>
          </div>
        </div>

        {/* Event Posts Section (Focused Center 3D Carousel) */}
        {posters.length > 0 && (
          <div className="lp-home-gallery-wrap lp-scroll-reveal" style={{ marginTop: 36, marginBottom: 36 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 14px',
                borderRadius: 20,
                background: 'rgba(184, 25, 60, 0.1)',
                border: '1px solid rgba(184, 25, 60, 0.25)',
                marginBottom: 8
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#B8193C', display: 'inline-block', boxShadow: '0 0 8px #B8193C' }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#e2486b' }}>HIGHLIGHTS</span>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px', margin: 0 }}>
                Event Posts
              </h2>
            </div>
            
            <div
              className="lp-poster-3d-container"
              onMouseEnter={() => setPosterPaused(true)}
              onMouseLeave={() => { setPosterPaused(false); handleDragEnd() }}
              onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
              onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
              onTouchEnd={() => { handleDragEnd(); setPosterPaused(false) }}
              onMouseDown={(e) => handleDragStart(e.clientX)}
              onMouseMove={(e) => handleDragMove(e.clientX)}
              onMouseUp={() => { handleDragEnd(); setPosterPaused(false) }}
              onContextMenu={(e) => { e.preventDefault(); wasContextMenuOpened.current = true }}
            >
              <div className="lp-poster-3d-stage">
                {posters.map((poster, idx) => {
                  const n = posters.length
                  let diff = (idx - activePosterIdx) % n
                  if (diff > n / 2) diff -= n
                  if (diff < -n / 2) diff += n

                  const isCenter = diff === 0
                  const isHidden = Math.abs(diff) > 1

                  let translateX = 0
                  let scale = 1
                  let opacity = 1
                  let zIndex = 1

                  if (diff === 0) {
                    translateX = 0
                    scale = 1
                    opacity = 1
                    zIndex = 10
                  } else if (diff === -1 || (n === 2 && diff === 1)) {
                    translateX = -62
                    scale = 0.8
                    opacity = 0.5
                    zIndex = 5
                  } else if (diff === 1) {
                    translateX = 62
                    scale = 0.8
                    opacity = 0.5
                    zIndex = 5
                  } else {
                    translateX = diff < 0 ? -120 : 120
                    scale = 0.6
                    opacity = 0
                    zIndex = 1
                  }

                  const isItemDownloading = downloadingPosterId === poster.id

                  return (
                    <div
                      key={poster.id}
                      className={`lp-poster-3d-card ${isCenter ? 'is-center' : ''}`}
                      style={{
                        transform: `translate(-50%, -50%) translateX(${translateX}%) scale(${scale})`,
                        opacity: isHidden ? 0 : opacity,
                        zIndex,
                        pointerEvents: isHidden ? 'none' : 'auto'
                      }}
                      onContextMenu={(e) => { e.preventDefault(); wasContextMenuOpened.current = true }}
                      onClick={async (e) => {
                        if (e.button !== undefined && e.button !== 0) return
                        const holdDuration = Date.now() - (dragStartTime.current || 0)
                        const wasHoldOrDrag = hasMoved.current || wasContextMenuOpened.current || (dragStartTime.current > 0 && holdDuration > 180)

                        if (!isCenter) {
                          setActivePosterIdx(idx)
                        } else if (!wasHoldOrDrag) {
                          if (onOpenPoster) {
                            onOpenPoster(poster)
                          }
                        }
                      }}
                    >
                      <img
                        src={poster.thumb_url || poster.thumbUrl || poster.url}
                        alt={poster.caption || 'Event Poster'}
                        className="lp-poster-3d-img"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        onContextMenu={(e) => { e.preventDefault(); wasContextMenuOpened.current = true }}
                      />
                      {poster.caption && (
                        <div className="lp-poster-3d-caption-overlay">
                          <p className="lp-poster-3d-caption">{poster.caption}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Navigation Controls */}
              {posters.length > 1 && (
                <>
                  <button
                    className="lp-poster-3d-nav-btn lp-poster-3d-prev"
                    onClick={(e) => { e.stopPropagation(); setActivePosterIdx(prev => (prev - 1 + posters.length) % posters.length) }}
                    aria-label="Previous Poster"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  <button
                    className="lp-poster-3d-nav-btn lp-poster-3d-next"
                    onClick={(e) => { e.stopPropagation(); setActivePosterIdx(prev => (prev + 1) % posters.length) }}
                    aria-label="Next Poster"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  </button>

                  <div className="lp-poster-3d-dots">
                    {posters.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        className={`lp-poster-3d-dot ${dotIdx === activePosterIdx ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setActivePosterIdx(dotIdx) }}
                        aria-label={`Go to poster ${dotIdx + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Live Broadcast Section (if active) */}
        {liveStream && (
          <div className="lp-home-live-minimal lp-scroll-reveal">
            <div className="lp-live-minimal-header">
              <span className="lp-live-indicator-dot" />
              <span className="lp-live-header-text">LIVE STAGE</span>
            </div>

            {(() => {
              const ytId = getYoutubeId(liveStream.url)
              return ytId ? (
                <div className="lp-live-minimal-player">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1`}
                    title={liveStream.caption}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : null
            })()}

            <div className="lp-live-minimal-info">
              <h3 className="lp-live-minimal-title">{liveStream.caption}</h3>
              <a
                href={liveStream.url}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-live-minimal-yt"
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Open in YouTube
                </span>
              </a>
            </div>
          </div>
        )}

        {/* Dual Marquee Photos Slider Section */}
        {photos.length > 0 && (
          <div className="lp-home-gallery-wrap lp-scroll-reveal">
            <h3 className="lp-home-gallery-title">Live Event Gallery</h3>
            
            <div className="lp-marquee-container">
              {(() => {
                const halfCount = Math.ceil(photos.length / 2)
                const list1 = photos.slice(0, halfCount)
                const list2 = photos.slice(halfCount)
                
                const items1 = list1.length > 0 ? list1 : photos
                const items2 = list2.length > 0 ? list2 : photos

                return (
                  <>
                    <InteractiveMarqueeRow
                      items={items1}
                      direction="left"
                      onCardClick={() => setTab('gallery')}
                    />
                    <InteractiveMarqueeRow
                      items={items2}
                      direction="right"
                      onCardClick={() => setTab('gallery')}
                    />
                  </>
                )
              })()}
            </div>

            {/* Detail See in Gallery Button */}
            <button
              onClick={() => setTab('gallery')}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '999px',
                padding: '10px 22px',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <span>See details in Gallery section</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <IconArrow />
              </span>
            </button>
          </div>
        )}

        {/* Teams Section */}
        <div className="lp-teams-section lp-scroll-reveal">
          <h3 className="lp-teams-heading">The Teams</h3>

          <div className="lp-team-entries">
            {[
              {
                num: '1',
                name: 'Barmawi',
                arabic: 'البرماوي',
                title: 'The Jurist of Clarity',
                desc: 'ശാഫിഈ മദ്ഹബിലെ പ്രമുഖ ഫഖീഹ്. ദർസ് വിദ്യാർത്ഥികൾക്ക് എളുപ്പം മനസ്സിലാകുന്ന രീതിയിൽ ഗ്രന്ഥങ്ങൾ രചിച്ചു. ഇന്നും ഫിഖ്ഹ് സ്ഥാപനങ്ങളിൽ പഠിപ്പിക്കുന്നു.',
              },
              {
                num: '2',
                name: 'Zahrawi',
                arabic: 'الزهراوي',
                title: 'Father of Modern Surgery',
                desc: 'അൻദലുസിലെ കോർഡോബയിൽ ജീവിച്ച മുസ്ലിം വൈദ്യശാസ്ത്രജ്ഞൻ. 200-ലധികം ശസ്ത്രക്രിയാ ഉപകരണങ്ങൾ രൂപകൽപ്പന ചെയ്തു. ആധുനിക ശസ്ത്രക്രിയയുടെ പിതാവ്.',
              },
              {
                num: '3',
                name: 'Sharqawi',
                arabic: 'الشرقاوي',
                title: 'The Scholar of Resistance',
                desc: 'ഈജിപ്തിലെ ഏറ്റവും പ്രശസ്തരായ ഉലമാക്കളിൽ ഒരാൾ. അൽ-അസ്ഹർ സർവകലാശാലയുടെ ഗ്രാൻഡ് ഇമാം. അറിവും ധൈര്യവും ഒരുപോലെ ഉണ്ടായിരുന്ന പണ്ഡിതൻ.',
              },
            ].map((team, idx) => (
              <div key={team.num} className={`lp-team-entry lp-scroll-reveal lp-delay-${idx + 1}`}>
                <span className="lp-team-entry-num">{team.num}</span>
                <div className="lp-team-entry-body">
                  <div className="lp-team-entry-title-row">
                    <span className="lp-team-entry-name">{team.name}</span>
                    <span className="lp-team-entry-arabic">{team.arabic}</span>
                  </div>
                  <p className="lp-team-entry-subtitle">{team.title}</p>
                  <p className="lp-team-entry-desc">{team.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="lp-home-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/bdsa-logo.svg" alt="BDSA Logo" className="lp-footer-logo" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
          <div>
            <p className="lp-footer-org">Badriyya Dars Students' Association</p>
            <p className="lp-footer-place">Karukulangara, Narikkuni, Kozhikkode</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ══════════ TEAM POINTS TAB ══════════ */
function TeamPointsTab({ compact = false, showHeader = true, onOpenStatusPoster }) {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [resultsCount, setResultsCount] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [activePoster, setActivePoster] = useState(null)
  const [downloadingPoster, setDownloadingPoster] = useState(false)

  useEffect(() => {
    fetchTeamPoints(true)
    // realtime
    const ch = supabase.channel('lp-team-points')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_results' }, () => fetchTeamPoints(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => fetchTeamPoints(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_media' }, () => fetchTeamPoints(false))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function fetchTeamPoints(isInitial = false) {
    if (isInitial && teams.length === 0) {
      setLoading(true)
    }
    try {
      const [
        { data: teamsData },
        { data: settings },
        { data: milestoneMedia }
      ] = await Promise.all([
        supabase.from('teams').select('id, name').order('name'),
        supabase.from('app_settings').select('key, value').in('key', ['team_colors', 'leaderboard_suspense_active', 'leaderboard_reveal_milestones', 'leaderboard_revealed_milestone', 'announcer_sequence']),
        supabase.from('gallery_media').select('id, type, caption, thumb_url, hd_url, milestone').eq('type', 'poster').not('milestone', 'is', null)
      ])

      const revealedMilestoneSetting = settings?.find(s => s.key === 'leaderboard_revealed_milestone')
      const seqSetting = settings?.find(s => s.key === 'announcer_sequence')

      const revealedMilestone = parseInt(revealedMilestoneSetting?.value || '0', 10)
      
      // If no status divider has been passed yet (milestone is 0), hide the standings completely
      if (!revealedMilestone || revealedMilestone <= 0) {
        setIsRevealed(false)
        setResultsCount(0)
        setTeams([])
        setActivePoster(null)
        return
      }

      const currentMilestonePoster = (milestoneMedia || []).find(p => p.milestone === revealedMilestone)
      setActivePoster(currentMilestonePoster || null)

      let rawSeq = []
      try {
        if (seqSetting?.value) rawSeq = JSON.parse(seqSetting.value)
      } catch (e) {}

      // Extract only competition IDs from sequence (ignoring divider objects)
      const seqCompIds = rawSeq
        .map(i => (typeof i === 'string' ? i : (i?.isDivider ? null : i?.id)))
        .filter(Boolean)

      // Only include competitions up to the revealed milestone
      const includedComps = seqCompIds.slice(0, revealedMilestone)
      const excludeComps = seqCompIds.slice(revealedMilestone)

      setResultsCount(revealedMilestone)
      setIsRevealed(true)

      // Fetch aggregated standings from RPC
      const { data: standingsData } = await supabase.rpc('get_team_standings', { 
        exclude_comps: excludeComps || []
      })

      const colorSetting = settings?.find(s => s.key === 'team_colors')
      let colorMap = {}
      if (colorSetting?.value) {
        try { colorMap = JSON.parse(colorSetting.value) } catch (e) {}
      }

      const teamMap = {}
      ;(teamsData || []).forEach(t => { 
        teamMap[t.id] = { ...t, color: colorMap[t.id] || null, points: 0 } 
      })
      
      if (standingsData && standingsData.length > 0) {
        standingsData.forEach(r => {
          if (teamMap[r.team_id]) {
            teamMap[r.team_id].points = Number(r.points) || 0
          }
        })
      } else {
        // Fallback direct aggregation from competition_results for included competitions only
        const { data: directResults } = await supabase
          .from('competition_results')
          .select('placement_points, grade_points, competition_id, participants(team_id)')
          .eq('published', true)

        if (directResults) {
          directResults.forEach(cr => {
            const tId = cr.participants?.team_id
            const isIncluded = includedComps.length > 0 ? includedComps.includes(cr.competition_id) : (!excludeComps || !excludeComps.includes(cr.competition_id))
            if (tId && teamMap[tId] && isIncluded) {
              teamMap[tId].points += (Number(cr.placement_points) || 0) + (Number(cr.grade_points) || 0)
            }
          })
        }
      }

      const sorted = Object.values(teamMap).sort((a, b) => b.points - a.points)
      setTeams(sorted)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // If loading or no status divider reached yet, hide completely
  if (loading) return null
  if (!isRevealed || resultsCount <= 0) return null

  const maxPoints = teams[0]?.points || 0
  const isAllTied = teams.length > 0 && teams.every(t => t.points === teams[0].points)
  const filtered = teams

  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']

  if (compact) {
    if (loading) return null
    return (
      <div className="lp-team-compact-strip" style={{
        background: 'rgba(255, 255, 255, 0.025)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        padding: '12px 16px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-light)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Live Team Standings {resultsCount > 0 ? `(${resultsCount} Results)` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {teams.map((t) => {
            const rank = teams.findIndex(team => team.points === t.points) + 1
            const teamColor = t.color || 'var(--accent-light)'
            return (
              <div key={t.id} style={{
                flex: '0 0 auto',
                background: t.color ? `${t.color}15` : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${t.color ? `${t.color}40` : 'rgba(255, 255, 255, 0.06)'}`,
                borderRadius: '10px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: rankColors[rank - 1] || 'rgba(255,255,255,0.5)' }}>
                  #{rank}
                </span>
                {t.color && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: t.color }} />}
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{t.name}</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: teamColor, marginLeft: '4px' }}>{parseFloat(t.points.toFixed(1))}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const handleDownloadActivePoster = async (e) => {
    if (e) e.stopPropagation()
    if (!activePoster || downloadingPoster) return
    const url = activePoster.hd_url || activePoster.thumb_url
    try {
      setDownloadingPoster(true)
      const resp = await fetch(url)
      const blob = await resp.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `inspico-status-after-${activePoster.milestone || 'milestone'}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      window.open(url, '_blank')
    } finally {
      setDownloadingPoster(false)
    }
  }

  return (
    <div className="lp-tab-content" style={{ padding: showHeader ? undefined : 0, marginBottom: '24px' }}>
      {showHeader && (
        <div className="lp-section-header" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 className="lp-section-title" style={{ margin: 0 }}>Team Standings</h2>
            <span style={{
              background: 'rgba(79, 156, 249, 0.12)',
              border: '1px solid rgba(79, 156, 249, 0.25)',
              color: 'var(--accent, #4f9cf9)',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 12,
              letterSpacing: 0.3
            }}>
              {resultsCount > 0 ? `Points after ${resultsCount} ${resultsCount === 1 ? 'Result' : 'Results'}` : 'Initial Standings'}
            </span>
          </div>
          <div className="lp-live-badge">
            <span className="lp-live-dot" />
            Live
          </div>
        </div>
      )}

      {/* Direct Status Poster Display if active poster exists */}
      {activePoster && (
        <div className="result-poster-wrapper" style={{ margin: '0 auto 20px auto', maxWidth: 480 }}>
          <div
            onClick={() => onOpenStatusPoster?.(activePoster)}
            style={{
              width: 'fit-content',
              maxWidth: '100%',
              margin: '0 auto',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 8px 28px rgba(0, 0, 0, 0.6)',
              cursor: onOpenStatusPoster ? 'pointer' : 'default',
              lineHeight: 0
            }}
          >
            <img
              src={activePoster.hd_url || activePoster.thumb_url}
              alt={activePoster.caption || 'Status Poster'}
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '74vh',
                width: 'auto',
                height: 'auto',
                borderRadius: 12
              }}
            />
          </div>

          <button
            type="button"
            className="result-poster-download-btn"
            onClick={handleDownloadActivePoster}
            disabled={downloadingPoster}
          >
            {downloadingPoster ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="#0e0b07" strokeWidth="3" strokeDasharray="45 25" strokeLinecap="round" />
                </svg>
                <span>Downloading Poster...</span>
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
      )}

      {loading ? (
        <LogoLoader text="Loading team points..." />
      ) : teams.length === 0 ? (
        <div className="lp-empty"><IconTrophy /><p>No team data yet</p></div>
      ) : (
        <div className="lp-team-list">
          {/* Full List */}
          <div className="lp-teams-table">
            {filtered.map((team) => {
              const rank = teams.findIndex(t => t.points === team.points) + 1
              const pct = maxPoints > 0 ? (team.points / maxPoints) * 100 : 0
              const teamColor = team.color || 'var(--accent, #4f9cf9)'
              const isTop3 = rank <= 3
              const rankColor = isTop3 ? rankColors[rank - 1] : 'rgba(255, 255, 255, 0.4)'

              return (
                <div 
                  key={team.id} 
                  className="lp-team-row" 
                  style={{
                    borderLeft: `3.5px solid ${team.color || 'rgba(255,255,255,0.1)'}`,
                    background: team.color ? `${team.color}0A` : 'rgba(255, 255, 255, 0.01)',
                  }}
                >
                  <span className={`lp-team-rank ${isTop3 ? 'lp-rank-top' : ''}`} style={{ color: rankColor, fontWeight: 800, fontSize: 13 }}>
                    #{rank}
                  </span>
                  <div className="lp-team-info">
                    <div className="lp-team-name-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: teamColor, flexShrink: 0, boxShadow: `0 0 6px ${teamColor}80` }} />
                      <span className="lp-team-name" style={{ color: '#ffffff', fontWeight: 600 }}>{team.name}</span>
                    </div>
                    <div className="lp-team-bar-wrap">
                      <div className="lp-team-bar" style={{
                        width: isAllTied ? '100%' : `${pct}%`,
                        background: team.color ? `linear-gradient(90deg, ${team.color}, ${team.color}BB)` : 'var(--accent, #4f9cf9)'
                      }} />
                    </div>
                  </div>
                  <div className="lp-team-score-wrap">
                    <span className="lp-team-pts" style={{ color: isTop3 ? rankColor : (team.color || '#fff'), fontSize: 17, fontWeight: 800 }}>
                      {parseFloat(team.points.toFixed(1))}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════ RESULTS TAB ══════════ */
function ResultsTab() {
  const [competitions, setCompetitions] = useState([])
  const [selected, setSelected] = useState(null)
  const [results, setResults] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCat, setSelectedCat] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadingResults, setLoadingResults] = useState(false)
  const [search, setSearch] = useState('')
  const [showResultPoster, setShowResultPoster] = useState(true)
  const [milestonePosters, setMilestonePosters] = useState({})
  const [revealedMilestone, setRevealedMilestone] = useState(0)
  const [revealMilestones, setRevealMilestones] = useState([])
  const [teamsList, setTeamsList] = useState([])
  const [publishedPointsData, setPublishedPointsData] = useState([])
  const [activeStatusPosterModal, setActiveStatusPosterModal] = useState(null)
  const [downloadingPoster, setDownloadingPoster] = useState(false)

  const selectedRef = useRef(selected)
  const scrollYRef = useRef(0)
  const clickedCompIdRef = useRef(null)
  const clickedCardOffsetRef = useRef(null)

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  const closeResults = () => {
    const savedY = scrollYRef.current
    const compId = clickedCompIdRef.current
    const targetOffset = clickedCardOffsetRef.current

    setSelected(null)

    const restore = () => {
      const mainEl = document.querySelector('.lp-main')
      if (!mainEl) return

      // Precision anchoring: position the clicked card at the exact same screen position
      if (compId) {
        const cardEl = document.getElementById(`comp-card-${compId}`)
        if (cardEl) {
          if (targetOffset !== null) {
            const cardRect = cardEl.getBoundingClientRect()
            const mainRect = mainEl.getBoundingClientRect()
            const currentOffset = cardRect.top - mainRect.top
            const diff = currentOffset - targetOffset
            if (Math.abs(diff) > 0.5) {
              mainEl.scrollTop += diff
            }
            return
          } else {
            cardEl.scrollIntoView({ block: 'nearest', behavior: 'instant' })
            return
          }
        }
      }

      mainEl.scrollTop = savedY
      window.scrollTo({ top: savedY, behavior: 'instant' })
    }

    requestAnimationFrame(restore)
    setTimeout(restore, 25)
    setTimeout(restore, 80)
    setTimeout(restore, 200)
    setTimeout(restore, 400)
  }

  const goBack = () => {
    if (window.history.state?.view === 'result-detail') {
      window.history.back()
    } else {
      closeResults()
    }
  }

  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  const handleDownloadPoster = async (poster) => {
    if (!poster || downloadingPoster) return
    const url = poster.hd_url || poster.thumb_url
    try {
      setDownloadingPoster(true)
      const resp = await fetch(url)
      const blob = await resp.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `inspico-status-after-${poster.milestone || 'milestone'}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (e) {
      window.open(url, '_blank')
    } finally {
      setDownloadingPoster(false)
    }
  }

  const getStandingsAtMilestone = (milestoneNumber) => {
    const compsUpToM = competitions.slice(0, milestoneNumber).map(c => c.id)
    const compIdSet = new Set(compsUpToM)

    const pointsMap = {}
    teamsList.forEach(t => {
      pointsMap[t.id] = { id: t.id, name: t.name, color: t.color, points: 0 }
    })

    publishedPointsData.forEach(r => {
      if (compIdSet.has(r.competition_id)) {
        const tid = r.participants?.team_id
        if (tid && pointsMap[tid]) {
          pointsMap[tid].points += (Number(r.placement_points) || 0) + (Number(r.grade_points) || 0)
        }
      }
    })

    return Object.values(pointsMap).sort((a, b) => b.points - a.points)
  }

  useEffect(() => {
    fetchCompetitions(true)
    
    // Realtime subscription for live competition results & settings
    const rand = Math.random().toString(36).substring(2, 7)
    const ch = supabase.channel(`lp-results-rt-${rand}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_results' }, () => {
        fetchCompetitions(false)
        if (selectedRef.current) {
          openResults(selectedRef.current, false)
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_media' }, () => {
        fetchCompetitions(false)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, (payload) => {
        if (payload.new?.key === 'show_result_poster') {
          const val = payload.new.value
          setShowResultPoster(val === true || val === 'true' || val === 1 || val === '1')
        }
        fetchCompetitions(false)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [])

  // Handle mobile swipe-back gesture & Escape key for result details modal view
  useEffect(() => {
    const handlePopState = () => {
      if (selectedRef.current) {
        closeResults()
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedRef.current) {
        goBack()
      }
    }
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  async function fetchCompetitions(isInitial = false) {
    if (isInitial && competitions.length === 0) setLoading(true)
    
    try {
      const [
        { data: settingsData },
        { data: milestoneMedia },
        { data: teamsData },
        { data: allPubResults }
      ] = await Promise.all([
        supabase.from('app_settings').select('key, value').in('key', ['show_result_poster', 'leaderboard_revealed_milestone', 'leaderboard_reveal_milestones', 'team_colors']),
        supabase.from('gallery_media').select('id, type, caption, thumb_url, hd_url, milestone').eq('type', 'poster').not('milestone', 'is', null),
        supabase.from('teams').select('id, name').order('name'),
        supabase.from('competition_results').select('competition_id, placement_points, grade_points, participants(team_id)').eq('published', true)
      ])

      const posterSetting = settingsData?.find(s => s.key === 'show_result_poster')
      const revSetting = settingsData?.find(s => s.key === 'leaderboard_revealed_milestone')
      const milestonesSetting = settingsData?.find(s => s.key === 'leaderboard_reveal_milestones')
      const colorSetting = settingsData?.find(s => s.key === 'team_colors')

      let colorMap = {}
      if (colorSetting?.value) {
        try { colorMap = JSON.parse(colorSetting.value) } catch (e) {}
      }

      const formattedTeams = (teamsData || []).map(t => ({
        ...t,
        color: colorMap[t.id] || null
      }))
      setTeamsList(formattedTeams)
      setPublishedPointsData(allPubResults || [])

      if (posterSetting) {
        setShowResultPoster(posterSetting.value === true || posterSetting.value === 'true' || posterSetting.value === 1 || posterSetting.value === '1')
      } else {
        setShowResultPoster(true)
      }

      setRevealedMilestone(parseInt(revSetting?.value || '0', 10))

      let parsedMilestones = []
      try {
        if (milestonesSetting?.value) parsedMilestones = JSON.parse(milestonesSetting.value)
      } catch (e) {}
      setRevealMilestones(parsedMilestones)

      const posterMap = {}
      ;(milestoneMedia || []).forEach(p => {
        if (p.milestone) posterMap[p.milestone] = p
      })
      setMilestonePosters(posterMap)
    } catch (e) {
      console.error(e)
    }

    try {
      // Select min published_at per competition so we know when it was first announced
      const { data } = await supabase
        .from('competition_results')
        .select('competitions(id, name, categories(id, name), is_stage, is_group, max_participants), published_at')
        .eq('published', true)
        
      // Collect unique competitions + earliest published_at for each
      const compMap = {}
      if (data) {
        data.forEach(r => {
          const c = r.competitions
          if (!c) return
          if (!compMap[c.id]) {
            compMap[c.id] = { ...c, published_at: r.published_at }
          } else if (r.published_at && r.published_at < compMap[c.id].published_at) {
            compMap[c.id].published_at = r.published_at
          }
        })
      }
      // Sort by published_at ascending = announcement order
      const comps = Object.values(compMap).sort((a, b) => {
        if (!a.published_at) return 1
        if (!b.published_at) return -1
        return new Date(a.published_at) - new Date(b.published_at)
      })
      // Assign announcement number
      comps.forEach((c, i) => { c.announcementNumber = i + 1 })
      
      setCompetitions(comps)
      const cats = [...new Map(comps.filter(c => c.categories).map(c => [c.categories.id, c.categories])).values()]
      setCategories(cats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function openResults(comp, isInitial = true, targetCardEl = null) {
    if (isInitial) {
      const mainEl = document.querySelector('.lp-main')
      scrollYRef.current = mainEl ? mainEl.scrollTop : (window.scrollY || 0)
      clickedCompIdRef.current = comp.id

      if (targetCardEl && mainEl) {
        const cardRect = targetCardEl.getBoundingClientRect()
        const mainRect = mainEl.getBoundingClientRect()
        clickedCardOffsetRef.current = cardRect.top - mainRect.top
      } else {
        clickedCardOffsetRef.current = null
      }

      window.history.pushState({ view: 'result-detail' }, '')
      setLoadingResults(true)
    }
    setSelected(comp)

    if (isInitial) {
      requestAnimationFrame(() => {
        const mainEl = document.querySelector('.lp-main')
        if (mainEl) mainEl.scrollTop = 0
        window.scrollTo({ top: 0, behavior: 'instant' })
      })
    }

    try {
      const { data } = await supabase
        .from('competition_results')
        .select(`
          id, position, grade, avg_points, placement_points, grade_points,
          participants(name, chess_number, teams(name))
        `)
        .eq('competition_id', comp.id)
        .eq('published', true)
        
      // Use the published position from DB directly — no recalculation needed
      // Sort by published position, then by avg_points for same position
      const list = (data || []).map(r => ({ ...r }))
      list.sort((a, b) => {
        const posA = a.position || 999
        const posB = b.position || 999
        if (posA !== posB) return posA - posB
        return (b.avg_points || 0) - (a.avg_points || 0)
      })

      setResults(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingResults(false)
    }
  }

  const filtered = competitions.filter(c => {
    const matchCat = selectedCat === 'all' || c.categories?.id === selectedCat
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  if (selected) {
    return (
      <div className="lp-tab-content">
        <div className="lp-results-header" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="lp-back-btn" onClick={goBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {selected.announcementNumber && (
                <span style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#f7c948',
                  letterSpacing: '0.5px'
                }}>
                  #{String(selected.announcementNumber).padStart(2, '0')}
                </span>
              )}
              <h2 className="lp-section-title" style={{ margin: 0, fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.name}</h2>
              {selected.categories?.name && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  · {selected.categories.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {loadingResults ? (
          <LogoLoader text="Loading results..." />
        ) : results.length === 0 ? (
          <div className="lp-empty"><IconAward /><p>No results published yet</p></div>
        ) : (
          <>
            {showResultPoster && <ResultPoster competition={selected} results={results} />}
            <div className="lp-results-list" style={{ maxWidth: 480, margin: '0 auto' }}>
              {results.map((r, i) => {
                const pos = r.position || (i + 1)
                const isTied = results.filter(x => x.position === pos).length > 1
                return (
                  <div key={r.id} className={`lp-result-row ${pos === 1 ? 'lp-result-first' : pos === 2 ? 'lp-result-second' : pos === 3 ? 'lp-result-third' : ''}`}>
                    <div className="lp-result-rank-medal">
                      <span className="lp-result-num">{pos}</span>
                    </div>
                    <div className="lp-result-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="lp-result-name">{r.participants?.name}</span>
                        {isTied && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent-light)', background: 'rgba(79, 156, 249, 0.12)', border: '1px solid rgba(79, 156, 249, 0.3)', padding: '1px 5px', borderRadius: 4 }}>
                            TIED
                          </span>
                        )}
                      </div>
                      <span className="lp-result-meta">
                        {r.participants?.teams?.name && <span className="lp-result-team">{r.participants.teams.name}</span>}
                        {r.participants?.chess_number && <span className="lp-result-chess">#{r.participants.chess_number}</span>}
                      </span>
                    </div>
                    <span className="lp-result-score" style={{ fontSize: 15, fontWeight: 800 }}>
                      {r.grade && r.grade !== '—' ? r.grade : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="lp-tab-content">
      {/* Integrated Team Points Leaderboard at the top of Results */}
      <TeamPointsTab showHeader={true} onOpenStatusPoster={setActiveStatusPosterModal} />

      <div className="lp-section-header" style={{ marginTop: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div>
          <h2 className="lp-section-title" style={{ margin: 0 }}>Competition Results</h2>
          <p className="lp-section-sub" style={{ marginTop: 4 }}>Select a competition to view rankings</p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
          <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--accent-light, #4f9cf9)', lineHeight: 1, letterSpacing: '-0.5px' }}>
            {String(competitions.length).padStart(2, '0')}
          </span>
          <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted, #888)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 2 }}>
            Published
          </span>
        </div>
      </div>

      <div className="lp-search-wrap">
        <IconSearch />
        <input className="lp-search-input" type="text" placeholder="Search competitions…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {categories.length > 0 && (
        <div className="lp-cat-chips">
          <button className={`lp-chip ${selectedCat === 'all' ? 'lp-chip-active' : ''}`}
            onClick={() => setSelectedCat('all')}>All</button>
          {categories.map(c => (
            <button key={c.id} className={`lp-chip ${selectedCat === c.id ? 'lp-chip-active' : ''}`}
              onClick={() => setSelectedCat(c.id)}>{c.name}</button>
          ))}
        </div>
      )}

      {loading ? (
        <LogoLoader text="Loading competitions..." />
      ) : filtered.length === 0 ? (
        <div className="lp-empty"><IconAward /><p>No competitions found</p></div>
      ) : (
        <div className="lp-comp-grid">
          {filtered.map(c => {
            const hasMilestoneDivider = (revealMilestones.includes(c.announcementNumber) || !!milestonePosters[c.announcementNumber]) && (revealedMilestone >= c.announcementNumber)

            return (
              <Fragment key={c.id}>
                <button
                  id={`comp-card-${c.id}`}
                  className="lp-comp-card"
                  onClick={(e) => openResults(c, true, e.currentTarget)}
                >
                  <div className="lp-comp-card-top">
                    <span className="lp-comp-cat">{c.categories?.name || 'General'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                      {c.is_stage && <span className="lp-comp-badge">Stage</span>}
                      {c.is_group && <span className="lp-comp-badge lp-comp-badge-group">Group</span>}
                      {c.announcementNumber && (
                        <span style={{
                          fontSize: 10, fontWeight: 800, color: '#f7c948',
                          background: 'rgba(247,201,72,0.1)', border: '1px solid rgba(247,201,72,0.3)',
                          padding: '2px 7px', borderRadius: 20, letterSpacing: 0.5
                        }}>#{c.announcementNumber}</span>
                      )}
                    </div>
                  </div>
                  <p className="lp-comp-name">{c.name}</p>
                  <div className="lp-comp-footer">
                    <span className="lp-comp-view">View Results <IconArrow /></span>
                  </div>
                </button>

                {hasMilestoneDivider && (() => {
                  const milestoneStandings = getStandingsAtMilestone(c.announcementNumber)
                  const poster = milestonePosters[c.announcementNumber]

                  return (
                    <div
                      key={`divider-banner-${c.announcementNumber}`}
                      onClick={() => {
                        if (poster) setActiveStatusPosterModal(poster)
                      }}
                      style={{
                        gridColumn: '1 / -1',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(247, 201, 72, 0.22)',
                        borderRadius: 12,
                        padding: '16px 18px',
                        cursor: poster ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        margin: '6px 0 12px 0'
                      }}
                      onMouseEnter={e => {
                        if (poster) {
                          e.currentTarget.style.borderColor = 'rgba(247, 201, 72, 0.45)'
                          e.currentTarget.style.background = 'rgba(247, 201, 72, 0.03)'
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(247, 201, 72, 0.22)'
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                      }}
                    >
                      {/* Top Header Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 17, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px' }}>
                            After {c.announcementNumber} Results
                          </span>
                          {poster && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#f7c948', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              Tap to view poster ›
                            </span>
                          )}
                        </div>

                        {/* Poster preview visible from outside */}
                        {poster && (
                          <div style={{ flexShrink: 0 }}>
                            <img
                              src={poster.thumb_url}
                              alt={`Status Poster after ${c.announcementNumber} Results`}
                              style={{
                                width: 50,
                                height: 66,
                                objectFit: 'cover',
                                borderRadius: 6,
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
                                display: 'block'
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Bottom Text Points Strip */}
                      {milestoneStandings.length > 0 && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap',
                          paddingTop: 10,
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                        }}>
                          {milestoneStandings.map((t, idx) => (
                            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: idx === 0 ? '#f7c948' : 'rgba(255,255,255,0.4)' }}>
                                {idx + 1}.
                              </span>
                              <span style={{
                                display: 'inline-block',
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: t.color || '#4f9cf9',
                                boxShadow: t.color ? `0 0 5px ${t.color}` : 'none'
                              }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                                {t.name}
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 800, color: idx === 0 ? '#f7c948' : '#e2e8f0' }}>
                                ({parseFloat(t.points.toFixed(1))} pts)
                              </span>
                              {idx < milestoneStandings.length - 1 && (
                                <span style={{ color: 'rgba(255,255,255,0.15)', marginLeft: 3 }}>|</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </Fragment>
            )
          })}
        </div>
      )}

      {/* ── Status Milestone Poster Modal (Matching Result Poster Look) ── */}
      {activeStatusPosterModal && (
        <div
          className="lp-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto'
          }}
          onClick={() => setActiveStatusPosterModal(null)}
        >
          <div
            className="result-poster-wrapper"
            style={{
              position: 'relative',
              maxWidth: 480,
              width: '100%',
              margin: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setActiveStatusPosterModal(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#fff',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Poster Image Viewport */}
            <div
              style={{
                width: 'fit-content',
                maxWidth: '100%',
                margin: '0 auto',
                borderRadius: 12,
                overflow: 'hidden',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
                lineHeight: 0
              }}
            >
              <img
                src={activeStatusPosterModal.hd_url || activeStatusPosterModal.thumb_url}
                alt={activeStatusPosterModal.caption || 'Status Poster'}
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: '74vh',
                  width: 'auto',
                  height: 'auto',
                  borderRadius: 12
                }}
              />
            </div>

            {/* Matching Yellow Download Poster Button */}
            <button
              type="button"
              className="result-poster-download-btn"
              onClick={() => handleDownloadPoster(activeStatusPosterModal)}
              disabled={downloadingPoster}
              style={{ marginTop: 12 }}
            >
              {downloadingPoster ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="#0e0b07" strokeWidth="3" strokeDasharray="45 25" strokeLinecap="round" />
                  </svg>
                  <span>Downloading Poster...</span>
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
        </div>
      )}
    </div>
  )
}

/* ══════════ SCHEDULE TAB ══════════ */
function ScheduleTab({ isActive = true }) {
  const { user } = useAuth() || {}
  const [stages, setStages] = useState([])
  const [schedules, setSchedules] = useState([])
  const [dates, setDates] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewingRules, setViewingRules] = useState(null)
  const [teamParticipants, setTeamParticipants] = useState([])
  const [loadingTeamParts, setLoadingTeamParts] = useState(false)

  const dateTabsRef = useRef(null)

  // Auto-center selected date tab in schedule when active or navigating
  useEffect(() => {
    if (isActive && !loading && selectedDate && dateTabsRef.current) {
      const runScroll = () => {
        const activeEl = dateTabsRef.current?.querySelector('.lp-date-tab.active')
        if (activeEl) {
          activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
        }
      }
      const t1 = setTimeout(runScroll, 60)
      const t2 = setTimeout(runScroll, 220)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
  }, [isActive, selectedDate, loading])

  async function handleOpenRules(comp) {
    setViewingRules(comp)
    setTeamParticipants([])

    if (user?.role === 'Team' && user?.teamId && comp?.id) {
      setLoadingTeamParts(true)
      try {
        const { data } = await supabase
          .from('competition_participants')
          .select('participant_id, participants!inner(name, chess_number, team_id)')
          .eq('competition_id', comp.id)
          .eq('participants.team_id', user.teamId)

        if (data) {
          setTeamParticipants(data.map(d => d.participants))
        }
      } catch (err) {
        console.error('Error fetching team participants:', err)
      } finally {
        setLoadingTeamParts(false)
      }
    }
  }

  useEffect(() => {
    fetchData()
    const ch = supabase.channel('lp-schedule')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_schedule' }, fetchSchedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, fetchSchedule)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function fetchData() {
    const { data: stgs } = await supabase.from('stages').select('id, name, location').order('name')
    setStages(stgs || [])
    await fetchSchedule()
  }

  async function fetchSchedule() {
    const { data } = await supabase
      .from('competition_schedule')
      .select(`id, scheduled_date, scheduled_time, sequence_order, estimated_duration_mins, status,
        actual_start_time, competition_id,
        competitions(id, name, stage_id, stages(name, location), categories(name), rules_description, rules_duration, mark_criteria)`)
      .order('sequence_order', { ascending: true })
    const list = (data || []).filter(s => s.scheduled_date)
    setSchedules(list)
    const uniq = [...new Set(list.map(s => s.scheduled_date).filter(Boolean))].sort()
    setDates(uniq)
    if (uniq.length > 0 && !selectedDate) {
      const todayStr = new Date().toISOString().split('T')[0]
      if (uniq.includes(todayStr)) {
        setSelectedDate(todayStr)
      } else {
        // Pick first upcoming date >= today
        const upcoming = uniq.find(d => d >= todayStr)
        if (upcoming) {
          setSelectedDate(upcoming)
        } else {
          // If all dates past, pick the latest / last date
          setSelectedDate(uniq[uniq.length - 1])
        }
      }
    }
    setLoading(false)
  }

  const dateScheds = schedules.filter(s => s.scheduled_date === selectedDate)
  const stageGroups = {}
  stages.forEach(stg => {
    stageGroups[stg.id] = { stage: stg, items: dateScheds.filter(s => s.competitions?.stage_id === stg.id) }
  })

  // Off-stage / Unassigned stage items for this date
  const offStageItems = dateScheds.filter(s => !s.competitions?.stage_id)
  if (offStageItems.length > 0) {
    stageGroups['off-stage'] = {
      stage: { id: 'off-stage', name: 'Off-Stage / Written Events', location: 'Various Venues' },
      items: offStageItems
    }
  }

  const hasItems = Object.values(stageGroups).some(g => g.items.length > 0)

  const todayStr = new Date().toISOString().split('T')[0]
  const fmt = d => {
    const formatted = new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' })
    if (d === todayStr) return `Today (${formatted})`
    return formatted
  }
  function formatMinsTo12h(totalMins) {
    if (totalMins === null || totalMins === undefined) return "TBD";
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 || 12;
    return `${String(displayH).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  function getSessionName(totalMins) {
    if (totalMins === null || totalMins === undefined) return null;
    const h = Math.floor(totalMins / 60);
    if (h < 12) return "Morning Session";
    if (h < 16) return "Afternoon Session";
    return "Evening Session";
  }


  return (
    <div className="lp-tab-content">
      <div className="lp-section-header">
        <div>
          <h2 className="lp-section-title">Schedule</h2>
          <p className="lp-section-sub">Live festival schedule</p>
        </div>
        <div className="lp-live-badge"><span className="lp-live-dot" />Live</div>
      </div>

      {dates.length > 0 && (
        <div ref={dateTabsRef} className="lp-date-tabs" style={{ scrollBehavior: 'smooth' }}>
          {dates.map(d => (
            <button key={d} className={`lp-date-tab ${selectedDate === d ? 'active' : ''} ${d < todayStr ? 'past' : ''}`}
              onClick={() => setSelectedDate(d)}>{fmt(d)}</button>
          ))}
        </div>
      )}

      {loading ? (
        <LogoLoader text="Loading live schedule..." />
      ) : !hasItems ? (
        <div className="lp-empty"><IconCalendar /><p>No schedule for this day</p></div>
      ) : (
        <div className="lp-stage-list">
          {Object.values(stageGroups).map(group => {
            if (!group || group.items.length === 0) return null
            const stg = group.stage

            // Calculate start times sequentially across all items
            let currentMins = null;
            const itemsWithTime = group.items.map(item => {
              let startMins = null;
              let isAnchor = false;
              
              if (item.scheduled_time) {
                const [h, m] = item.scheduled_time.split(':').map(Number);
                startMins = h * 60 + m;
                currentMins = startMins;
                isAnchor = true;
              } else if (currentMins !== null) {
                startMins = currentMins;
              }
              
              if (currentMins !== null) {
                const dur = parseInt(item.estimated_duration_mins) || 30;
                currentMins = currentMins + dur;
              }
              
              return {
                ...item,
                computed_start_mins: startMins,
                is_anchor: isAnchor
              };
            });

            const hasOngoing = itemsWithTime.some(i => i.status === 'ongoing');

            return (
              <div key={stg.id} className="lp-stage-card">
                <div className="lp-stage-card-header">
                  <div>
                    <p className="lp-stage-name">{stg.name}</p>
                    {stg.location && <p className="lp-stage-loc">{stg.location}</p>}
                  </div>
                  {hasOngoing && <span className="lp-stage-on-air"><span className="lp-live-dot-red" /> ON AIR</span>}
                </div>

                {itemsWithTime.map((item, index) => {
                  const comp = item.competitions
                  const hasRules = comp && (comp.rules_description || comp.rules_duration || comp.mark_criteria)
                  const isOngoing = item.status === 'ongoing'
                  const isCompleted = item.status === 'completed'
                  
                  // Session divider detection
                  const currentSession = getSessionName(item.computed_start_mins)
                  const prevItem = index > 0 ? itemsWithTime[index - 1] : null
                  const prevSession = prevItem ? getSessionName(prevItem.computed_start_mins) : null
                  const showSessionDivider = currentSession && (index === 0 || currentSession !== prevSession)
                  
                  // Break divider detection
                  let showBreakDivider = false
                  let gapMins = 0
                  if (item.is_anchor && prevItem && prevItem.computed_start_mins !== null) {
                    const prevEndMins = prevItem.computed_start_mins + (parseInt(prevItem.estimated_duration_mins) || 30)
                    if (item.computed_start_mins > prevEndMins + 15) {
                      showBreakDivider = true;
                      gapMins = item.computed_start_mins - prevEndMins;
                    }
                  }

                  const sessionIcon = currentSession === 'Morning Session' ? '☀️' 
                                    : currentSession === 'Afternoon Session' ? '⛅' 
                                    : '🌙';

                  return (
                    <div key={item.id}>
                      {showSessionDivider && (
                        <div className="lp-sched-session-divider">
                          <span>{sessionIcon} {currentSession}</span>
                        </div>
                      )}
                      {showBreakDivider && !showSessionDivider && (
                        <div className="lp-sched-break-divider">
                          <span>Break ({gapMins} mins)</span>
                        </div>
                      )}
                      
                      <div 
                        className={`lp-sched-item ${isOngoing ? "lp-sched-ongoing" : ""}`}
                        onClick={() => handleOpenRules(comp)}
                        style={{ 
                          cursor: 'pointer', 
                          opacity: isCompleted ? 0.6 : 1,
                          borderLeft: isOngoing ? "4px solid #ff4757" : undefined
                        }}
                      >
                        <span 
                          className="lp-sched-status-dot" 
                          style={{ 
                            background: isOngoing ? "#ff4757" : isCompleted ? "#2ed573" : "rgba(255,255,255,0.25)", 
                            boxShadow: isOngoing ? "0 0 8px #ff4757" : undefined 
                          }} 
                        />
                        <div className="lp-sched-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <p 
                              className="lp-sched-name" 
                              style={{ 
                                margin: 0, 
                                textDecoration: isCompleted ? "line-through" : "none" 
                              }}
                            >
                              {comp?.name}
                            </p>
                            {hasRules && (
                              <span
                                style={{
                                  background: isOngoing ? "rgba(79, 156, 249, 0.15)" : "rgba(255, 255, 255, 0.08)",
                                  border: isOngoing ? "1px solid rgba(79, 156, 249, 0.3)" : "1px solid rgba(255, 255, 255, 0.15)",
                                  color: isOngoing ? "var(--accent)" : "rgba(255, 255, 255, 0.8)",
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                  fontFamily: 'inherit'
                                }}
                              >
                                Rules
                              </span>
                            )}
                          </div>
                          <p className="lp-sched-cat">{comp?.categories?.name}</p>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                          {item.computed_start_mins !== null && (
                            <span 
                              className="lp-sched-time-tag"
                              style={{
                                fontSize: "11px",
                                fontWeight: item.is_anchor ? 700 : 500,
                                color: item.is_anchor ? "#2ed573" : "rgba(255,255,255,0.5)",
                              }}
                            >
                              {item.is_anchor ? "" : "~"}{formatMinsTo12h(item.computed_start_mins)}
                            </span>
                          )}
                          <span className="lp-sched-pill" style={{ 
                            background: isOngoing ? "rgba(255,71,87,0.15)" : "rgba(255,255,255,0.05)", 
                            color: isOngoing ? "#ff4757" : "rgba(255,255,255,0.5)", 
                            border: isOngoing ? "1px solid rgba(255,71,87,0.3)" : "1px solid rgba(255,255,255,0.1)" 
                          }}>
                            {isOngoing ? "Live" : item.estimated_duration_mins ? `${item.estimated_duration_mins}m` : "Soon"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Rules View Modal */}
      {viewingRules && (
        <div className="lp-modal-backdrop" onClick={() => setViewingRules(null)}>
          <div className="lp-modal-card" style={{ maxWidth: 520, padding: 24, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--accent, #4f9cf9)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>മത്സര വിവരങ്ങൾ</span>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '2px 0 0 0', color: '#fff' }}>
                  {viewingRules.name}
                </h3>
              </div>
              <button className="lp-modal-close" onClick={() => setViewingRules(null)}><IconX /></button>
            </div>

            {(() => {
              const desc = viewingRules.rules_description
              const duration = viewingRules.rules_duration
              const criteria = []
              if (viewingRules.mark_criteria) {
                viewingRules.mark_criteria.split(',').forEach(item => {
                  const parts = item.split(/[:=]/)
                  if (parts.length >= 2) {
                    criteria.push({ label: parts[0].trim(), mark: parts.slice(1).join(':').trim() })
                  } else if (parts[0].trim()) {
                    criteria.push({ label: parts[0].trim(), mark: '' })
                  }
                })
              }
              const totalMarks = criteria.reduce((sum, item) => sum + (parseFloat(item.mark) || 0), 0)

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4, textAlign: 'left' }}>
                  {(duration || totalMarks > 0) && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {duration && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(79,156,249,0.08)', border: '1px solid rgba(79,156,249,0.2)', color: 'var(--accent, #4f9cf9)', padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                          <span>സമയം:</span> <span>{duration}</span>
                        </div>
                      )}
                      {totalMarks > 0 && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(46, 213, 115, 0.12)', border: '1px solid rgba(46, 213, 115, 0.3)', color: '#2ed573', padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                          <span>ആകെ മാർക്ക്:</span> <span>{totalMarks}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {desc && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderLeft: '4px solid var(--accent, #4f9cf9)',
                      borderRadius: 8,
                      padding: '14px 16px',
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: 14,
                      lineHeight: 1.7,
                      whiteSpace: 'pre-line'
                    }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>വിശദീകരണം / Topic</p>
                      {desc}
                    </div>
                  )}

                  {criteria.length > 0 && (
                    <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ background: 'rgba(255,255,255,0.04)', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                        മാർക്ക് വിഭജനം (Evaluation Criteria)
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'left' }}>
                            <th style={{ padding: '8px 14px' }}>വിഷയം / Section</th>
                            <th style={{ padding: '8px 14px', width: 110, textAlign: 'right' }}>മാർക്ക്</th>
                          </tr>
                        </thead>
                        <tbody>
                          {criteria.map((item, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '10px 14px', color: '#fff', fontWeight: 500 }}>{item.label || '—'}</td>
                              <td style={{ padding: '10px 14px', color: 'var(--accent, #4f9cf9)', fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                {item.mark ? `${item.mark} മാർക്ക്` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Team Leader registered participants list */}
                  {user?.role === 'Team' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        നിങ്ങളുടെ ടീമിലെ മത്സരാർത്ഥികൾ ({user.username})
                      </p>
                      {loadingTeamParts ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
                          <div className="spin" style={{ width: 18, height: 18, borderTopColor: 'var(--accent)' }} />
                        </div>
                      ) : teamParticipants.length === 0 ? (
                        <div style={{ padding: 12, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 8 }}>
                          ഈ മത്സരത്തിൽ നിങ്ങളുടെ ടീമിൽ നിന്ന് ആരും രജിസ്റ്റർ ചെയ്തിട്ടില്ല.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto', background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                          {teamParticipants.map((p, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                              <span style={{ fontWeight: 600, color: '#fff' }}>{p.name}</span>
                              <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent)', background: 'rgba(79, 156, 249, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                                {p.chess_number}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════ GALLERY TAB ══════════ */
function GalleryTab({ initialItem, onClearInitialItem }) {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'photo' | 'video' | 'live'
  const [lightboxItem, setLightboxItem] = useState(null)
  const [hdImage, setHdImage] = useState(null)
  const [hdLoaded, setHdLoaded] = useState(false)
  const [isDownloadingHd, setIsDownloadingHd] = useState(false)
  const [activeVideo, setActiveVideo] = useState(null)

  const openItemModal = (item, isPhoto) => {
    if (isPhoto) {
      setLightboxItem(item)
      setHdImage(item.hd_url || null)
      setHdLoaded(false)
      // Lazily fetch HD in background for full crisp quality
      supabase.from('gallery_media').select('hd_url').eq('id', item.id).maybeSingle().then(({ data }) => {
        if (data?.hd_url) setHdImage(data.hd_url)
      })
    } else {
      setActiveVideo(item)
    }
    window.history.pushState({ modal: 'gallery-lightbox' }, '')
  }

  useEffect(() => {
    if (initialItem) {
      openItemModal(initialItem, initialItem.type === 'photo' || initialItem.type === 'poster')
      onClearInitialItem()
    }
  }, [initialItem])

  useEffect(() => {
    const handlePopState = () => {
      if (lightboxItem) {
        setLightboxItem(null)
        setHdLoaded(false)
      }
      if (activeVideo) setActiveVideo(null)
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && (lightboxItem || activeVideo)) {
        window.history.back()
      }
    }
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [lightboxItem, activeVideo])

  const fetchMedia = async (isInitial = false) => {
    if (isInitial && media.length === 0) setLoading(true)
    try {
      const { data } = await supabase
        .from('gallery_media')
        .select('id, type, caption, thumb_url, hd_url, competition_id, uploader_name, created_at')
        .order('created_at', { ascending: false })

      if (data) {
        const mapped = data.map(item => ({
          ...item,
          thumbUrl: item.thumb_url,
          url: item.thumb_url // preview
        }))
        setMedia(mapped)
      } else {
        setMedia([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMedia(media.length === 0)
    const ch = supabase.channel('lp-gallery-stream-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_media' }, () => fetchMedia(false))
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [])

  function getYoutubeId(url) {
    if (!url) return null
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
    const match = url.trim().match(regExp)
    return match ? match[1] : null
  }

  const liveStreams = media.filter(item => item.type === 'live')
  const otherMedia = media.filter(item => {
    if (filter === 'all') return true
    if (filter === 'poster') return item.type === 'poster'
    if (filter === 'photo') return item.type === 'photo'
    if (filter === 'video') return item.type === 'video' || item.type === 'shorts'
    if (filter === 'live') return item.type === 'live'
    return true
  })

  return (
    <div className="lp-tab-content">
      <div className="lp-section-header">
        <div>
          <h2 className="lp-section-title">Event Gallery</h2>
          <p className="lp-section-sub">Live updates, photos, and video feeds</p>
        </div>
        {liveStreams.length > 0 && (
          <div className="lp-live-badge">
            <span className="lp-live-dot" />
            Live Event
          </div>
        )}
      </div>

      {/* Active Live Stream Hero */}
      {liveStreams.length > 0 && (
        <div className="lp-live-stream-hero lp-scroll-reveal" style={{
          background: 'radial-gradient(circle at top left, rgba(239, 68, 68, 0.15) 0%, rgba(13, 18, 28, 0.6) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 16,
          padding: 20,
          marginBottom: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 14
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="lp-live-dot" style={{ background: '#ef4444', width: 10, height: 10 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f87171', letterSpacing: 0.5, textTransform: 'uppercase' }}>Active Live Broadcast</span>
          </div>
          {(() => {
            const currentLive = liveStreams[0]
            const ytId = getYoutubeId(currentLive.url)
            return (
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                {ytId ? (
                  <div style={{ flex: '1 1 320px', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                      title={currentLive.caption}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                ) : null}
                <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>{currentLive.caption}</h3>
                  <a
                    href={currentLive.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lp-live-yt-link"
                  >
                    Watch on YouTube ↗
                  </a>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="lp-cat-chips" style={{ marginBottom: 20 }}>
        {[
          { id: 'all', label: 'All Updates' },
          { id: 'poster', label: 'Posters' },
          { id: 'photo', label: 'Photos' },
          { id: 'video', label: 'Videos & Shorts' },
          { id: 'live', label: 'Live Broadcasts' }
        ].map(tabItem => (
          <button
            key={tabItem.id}
            className={`lp-chip ${filter === tabItem.id ? 'lp-chip-active' : ''}`}
            onClick={() => setFilter(tabItem.id)}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <LogoLoader text="Loading live gallery..." />
        </div>
      ) : otherMedia.length === 0 ? (
        <div className="lp-empty" style={{ padding: '60px 20px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 16 }}>
          <IconAward />
          <p>No media updates found in this category</p>
        </div>
      ) : (
        <div className="lp-gallery-masonry">
          {otherMedia.map(item => {
            const isPhoto = item.type === 'photo' || item.type === 'poster'
            const ytId = !isPhoto ? getYoutubeId(item.url) : null

            return (
              <div
                key={item.id}
                className="lp-gallery-card-item"
                onClick={() => openItemModal(item, isPhoto)}
              >
                {isPhoto ? (
                  <div style={{ position: 'relative', width: '100%', display: 'block', overflow: 'hidden' }}>
                    <img
                      src={item.thumbUrl || item.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        borderRadius: 12,
                        objectFit: 'contain'
                      }}
                    />
                    {item.caption && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
                          display: 'flex',
                          alignItems: 'flex-end',
                          padding: '10px 12px',
                          borderRadius: 12
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: '#fff', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {item.caption}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ position: 'relative', width: '100%', aspectRatio: item.type === 'shorts' ? '9/16' : '16/9', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {ytId ? (
                        <>
                          <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#ef4444', color: '#fff', width: 42, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>▶</div>
                        </>
                      ) : (
                        <span style={{ fontSize: 24 }}>🎥</span>
                      )}
                      <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(239, 68, 68, 0.85)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {item.type}
                      </span>
                    </div>
                    {item.caption && (
                      <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.3)' }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#fff', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                          {item.caption}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Photo Lightbox Modal ── */}
      {lightboxItem && (
        <div 
          onClick={() => { setLightboxItem(null); setHdImage(null); setHdLoaded(false); }} 
          style={{ 
            position: 'fixed', inset: 0, zIndex: 999999, 
            background: 'rgba(0, 0, 0, 0.95)', 
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20
          }}
        >
          {/* Top Right Controls (Download & Close) */}
          <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 16, zIndex: 10 }}>
            <button
              disabled={isDownloadingHd}
              onClick={async (e) => {
                e.stopPropagation()
                if (isDownloadingHd || !lightboxItem) return
                setIsDownloadingHd(true)
                try {
                  let downloadUrl = hdImage || lightboxItem.hd_url
                  if (!downloadUrl) {
                    const { data } = await supabase.from('gallery_media').select('hd_url').eq('id', lightboxItem.id).single()
                    downloadUrl = data?.hd_url || lightboxItem.thumb_url || lightboxItem.thumbUrl || lightboxItem.url
                  }
                  await triggerFileDownload(downloadUrl, `${lightboxItem.type || 'photo'}-${lightboxItem.id}.jpg`)
                } catch (err) {
                  console.error('Download error:', err)
                } finally {
                  setIsDownloadingHd(false)
                }
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff', width: 44, height: 44, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: isDownloadingHd ? 'default' : 'pointer', backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              title="Download HD Image"
            >
              {isDownloadingHd ? <DownloadSpinner size={18} /> : <IconDownload />}
            </button>
            <button
              onClick={() => { setLightboxItem(null); setHdImage(null); setHdLoaded(false); }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff', width: 44, height: 44, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              title="Close"
            >
              <IconX />
            </button>
          </div>

          <div 
            onClick={e => e.stopPropagation()}
            style={{ 
              position: 'relative', 
              width: '100%',
              maxWidth: '100%', 
              maxHeight: '85vh', 
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}
          >
            {/* The thumbnail image - always visible first to define size */}
            <img 
              src={lightboxItem.thumb_url || lightboxItem.thumbUrl || lightboxItem.url} 
              alt="" 
              style={{ 
                display: 'block',
                width: '100%',
                height: 'auto',
                maxWidth: '100%', 
                maxHeight: '85vh', 
                objectFit: 'contain', 
                borderRadius: 8
              }} 
            />
            {/* The HD image - loaded absolutely over the thumbnail */}
            {hdImage && (
              <img 
                src={hdImage} 
                alt="" 
                onLoad={() => setHdLoaded(true)}
                style={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: 8,
                  opacity: hdLoaded ? 1 : 0,
                  transition: 'opacity 0.4s ease'
                }} 
              />
            )}
            {/* WhatsApp-like HD loading indicator */}
            {!hdLoaded && hdImage && (
              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                zIndex: 25
              }}>
                <DownloadSpinner size={12} color="#fff" />
                <span style={{ letterSpacing: '0.5px' }}>HD loading...</span>
              </div>
            )}
          </div>
          
          {/* Caption overlay at the bottom */}
          {lightboxItem.caption && (
            <div style={{
              position: 'absolute', bottom: 40,
              maxWidth: '80%', textAlign: 'center',
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 30,
              fontSize: 14, fontWeight: 500,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              pointerEvents: 'none'
            }}>
              {lightboxItem.caption}
            </div>
          )}
        </div>
      )}

      {/* ── YouTube Video Player Modal ── */}
      {activeVideo && (
        <div 
          onClick={() => setActiveVideo(null)} 
          style={{ 
            position: 'fixed', inset: 0, zIndex: 999999, 
            background: 'rgba(0, 0, 0, 0.95)', 
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20
          }}
        >
          {/* Top Right Controls (Close) */}
          <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 16, zIndex: 10 }}>
            <button
              onClick={() => setActiveVideo(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff', width: 44, height: 44, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              title="Close"
            >
              <IconX />
            </button>
          </div>

          <div style={{ width: '100%', maxWidth: 840, display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
            {(() => {
              const ytId = getYoutubeId(activeVideo.url)
              return ytId ? (
                <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', background: '#000' }}>
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1`}
                    title={activeVideo.caption}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : null
            })()}
            {activeVideo.caption && (
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#fff' }}>{activeVideo.caption}</p>
                <p style={{ margin: '6px 0 0 0', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Uploaded by {activeVideo.uploader_name} • {new Date(activeVideo.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

/* ══════════ MAIN LANDING PAGE ══════════ */
export default function LandingPage() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState('home')
  const [showLogin, setShowLogin] = useState(false)
  const [scannedParticipant, setScannedParticipant] = useState(null)
  const [loadingScanned, setLoadingScanned] = useState(false)
  const [participantRegistrations, setParticipantRegistrations] = useState([])
  const [viewingRules, setViewingRules] = useState(null)
  const [rulesMap, setRulesMap] = useState({})
  const [liveStream, setLiveStream] = useState(null)
  const [activeLightboxPoster, setActiveLightboxPoster] = useState(null)
  
  const tabScrollPositions = useRef({})
  const prevTabRef = useRef(tab)

  const VALID_TABS = ['home', 'gallery', 'points', 'results', 'schedule', 'profile']

  const changeTab = (newTab, push = true) => {
    if (!VALID_TABS.includes(newTab)) return
    setTab(newTab)
    let targetHash = newTab === 'home' ? '' : `#${newTab}`
    if (newTab === 'profile' && scannedParticipant) {
      targetHash = `#${scannedParticipant.chess_number}`
    }
    if (push && window.location.hash !== targetHash) {
      window.history.pushState({ tab: newTab }, '', targetHash || window.location.pathname)
    }
  }

  const openLoginModal = () => {
    setShowLogin(true)
    window.history.pushState({ modal: 'login' }, '')
  }

  const openRulesModal = (rules) => {
    setViewingRules(rules)
    window.history.pushState({ modal: 'rules' }, '')
  }

  useEffect(() => {
    async function checkLive() {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'event_media').maybeSingle()
      if (data?.value) {
        try {
          const feed = JSON.parse(data.value)
          const live = feed.find(item => item.type === 'live')
          setLiveStream(live || null)
        } catch {
          setLiveStream(null)
        }
      } else {
        setLiveStream(null)
      }
    }
    checkLive()

    const rand = Math.random().toString(36).substring(2, 7)
    const ch = supabase.channel(`lp-global-live-${rand}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, (payload) => {
        if (!payload.new || payload.new.key === 'event_media') {
          checkLive()
        }
      })
      .subscribe()

    return () => {
      safeRemoveChannel(ch)
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (viewingRules) setViewingRules(null)
        else if (showLogin) setShowLogin(false)
        else if (scannedParticipant) { setScannedParticipant(null); setParticipantRegistrations([]); window.location.hash = '#profile' }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewingRules, showLogin, scannedParticipant])

  useEffect(() => {
    async function fetchRules() {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'competition_rules').maybeSingle()
      if (data?.value) {
        try { setRulesMap(JSON.parse(data.value)) } catch {}
      }
    }
    fetchRules()
  }, [])

  useEffect(() => {
    async function initSavedProfile() {
      const savedChest = localStorage.getItem('ag_scanned_chest')
      const rawHash = window.location.hash.replace('#', '').trim()
      if (!rawHash && savedChest) {
        setLoadingScanned(true)
        const { data: part } = await supabase
          .from('participants')
          .select('id, name, chess_number, teams(name), categories(name)')
          .ilike('chess_number', savedChest)
          .maybeSingle()
        if (part) {
          setScannedParticipant(part)
          const { data: regs } = await supabase
            .from('competition_participants')
            .select('competition_id, competitions(id, name, competition_type, rules_description, rules_duration, mark_criteria, stages(name), competition_schedule(scheduled_date, estimated_duration_mins))')
            .eq('participant_id', part.id)
          setParticipantRegistrations(regs || [])
        }
        setLoadingScanned(false)
      }
    }
    initSavedProfile()
  }, [])

  useEffect(() => {
    async function handleRouteSync() {
      const rawHash = window.location.hash.replace('#', '').trim()
      const decodedHash = decodeURIComponent(rawHash)

      if (VALID_TABS.includes(decodedHash)) {
        setTab(decodedHash)
      } else if (!decodedHash) {
        setTab('home')
      } else {
        setLoadingScanned(true)
        setTab('profile')

        const { data: part, error: partError } = await supabase
          .from('participants')
          .select('id, name, chess_number, teams(name), categories(name)')
          .ilike('chess_number', decodedHash)
          .maybeSingle()

        if (part) {
          setScannedParticipant(part)
          localStorage.setItem('ag_scanned_chest', part.chess_number)
          const { data: regs } = await supabase
            .from('competition_participants')
            .select('competition_id, competitions(id, name, competition_type, rules_description, rules_duration, mark_criteria, stages(name), competition_schedule(scheduled_date, estimated_duration_mins))')
            .eq('participant_id', part.id)
          setParticipantRegistrations(regs || [])
        } else {
          console.warn('No participant found for chess number:', decodedHash, partError)
        }
        setLoadingScanned(false)
      }
    }

    handleRouteSync()
    window.addEventListener('popstate', handleRouteSync)
    window.addEventListener('hashchange', handleRouteSync)
    return () => {
      window.removeEventListener('popstate', handleRouteSync)
      window.removeEventListener('hashchange', handleRouteSync)
    }
  }, [])

  useEffect(() => {
    const prevTab = prevTabRef.current
    if (prevTab !== tab) {
      tabScrollPositions.current[prevTab] = window.scrollY
    }

    const targetScroll = tabScrollPositions.current[tab] || 0
    
    const handleScrollRestore = () => {
      window.scrollTo({
        top: targetScroll,
        behavior: 'auto'
      })
    }
    
    requestAnimationFrame(() => {
      requestAnimationFrame(handleScrollRestore)
    })

    prevTabRef.current = tab
  }, [tab])

  const tabs = [
    { id: 'home',    icon: <IconHome />,     label: 'Home' },
    { id: 'gallery', icon: <IconMedia />,    label: 'Gallery' },
    { id: 'results', icon: <IconAward />,    label: 'Results' },
    { id: 'schedule',icon: <IconCalendar />, label: 'Schedule' },
    { id: 'profile', icon: <IconUser />,     label: 'Profile', badge: !!(scannedParticipant || loadingScanned) },
  ]

  return (
    <div className="lp-root">
      {/* ── Top Header ── */}
      <header className="lp-topbar">
        <div className="lp-topbar-brand">
          <img className="lp-topbar-logo" src="/inspico-logo.svg" alt="Inspico Logo" />
          <InspicoTitleLogo className="lp-topbar-word" />
        </div>

        {/* Desktop nav */}
        <nav className="lp-desktop-nav">
          {tabs.map(t => (
            <button key={t.id}
              className={`lp-desktop-nav-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => changeTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        <button id="topbar-login-btn" className="lp-topbar-login" onClick={openLoginModal}>
          <IconLogIn />
          <span>Login</span>
        </button>
      </header>

      {/* ── Live Banner ── */}
      {liveStream && (
        <button
          onClick={() => changeTab('gallery')}
          className="lp-global-live-banner"
          style={{
            background: 'linear-gradient(90deg, #ef4444, #e11d48)',
            border: 'none',
            color: '#fff',
            padding: '10px 16px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            cursor: 'pointer',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
          }}
        >
          <span className="lp-live-dot" style={{ background: '#fff', animation: 'pulse 1.5s infinite', width: 8, height: 8, borderRadius: '50%' }} />
          <span>LIVE BROADCAST: {liveStream.caption} — Click to Watch!</span>
          <span style={{ fontSize: 10 }}>▶</span>
        </button>
      )}

      {/* ── Main Content ── */}
      <main className="lp-main">
        <div style={{ display: tab === 'home' ? 'block' : 'none' }}>
          <HomeTab 
            onLoginClick={openLoginModal} 
            setTab={changeTab} 
            liveStream={liveStream} 
            onOpenPoster={(poster) => {
              changeTab('gallery')
              setActiveLightboxPoster(poster)
            }}
          />
        </div>
        <div style={{ display: tab === 'gallery' ? 'block' : 'none' }}>
          <GalleryTab 
            initialItem={activeLightboxPoster} 
            onClearInitialItem={() => setActiveLightboxPoster(null)} 
          />
        </div>
        <div style={{ display: (tab === 'results' || tab === 'points') ? 'block' : 'none' }}>
          <ResultsTab />
        </div>
        <div style={{ display: tab === 'schedule' ? 'block' : 'none' }}>
          <ScheduleTab isActive={tab === 'schedule'} />
        </div>
        {tab === 'profile' && (
          <ParticipantProfileTab
            participant={scannedParticipant}
            registrations={participantRegistrations}
            loading={loadingScanned}
            user={user}
            onLogout={logout}
            onClear={() => { setScannedParticipant(null); setParticipantRegistrations([]); localStorage.removeItem('ag_scanned_chest'); window.location.hash = '#profile' }}
            onScanResult={async (chessNo) => {
              const hash = chessNo.replace(/.*#/, '').trim()
              if (!hash) return
              window.location.hash = hash
            }}
            setViewingRules={openRulesModal}
            rulesMap={rulesMap}
          />
        )}


      </main>

      {/* ── Bottom Navigation (mobile + desktop) ── */}
      <nav className="lp-bottom-nav" aria-label="Main navigation">
        {tabs.map(t => (
          <button key={t.id}
            id={`nav-${t.id}`}
            className={`lp-nav-btn ${tab === t.id ? 'active' : ''} ${t.id === 'profile' && t.badge ? 'lp-nav-btn--badge' : ''}`}
            onClick={() => changeTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}>
            <span className="lp-nav-icon" style={{ position: 'relative' }}>
              {t.icon}
              {t.badge && <span className="lp-nav-dot" />}
            </span>
            <span className="lp-nav-label">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Login Modal ── */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      {/* ── Rules View Modal ── */}
      {viewingRules && (
        <div className="lp-modal-backdrop" onClick={() => setViewingRules(null)}>
          <div className="lp-modal-card" style={{ maxWidth: 520, padding: 24, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
              <div>
                <span style={{ fontSize: 11, color: '#F97316', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>മത്സര നിയമാവലി</span>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '2px 0 0 0', color: '#fff' }}>
                  📜 {viewingRules.name}
                </h3>
              </div>
              <button className="lp-modal-close" onClick={() => setViewingRules(null)}><IconX /></button>
            </div>

            {(() => {
              const desc = viewingRules.rules_description
              const duration = viewingRules.rules_duration
              const criteria = []
              if (viewingRules.mark_criteria) {
                viewingRules.mark_criteria.split(',').forEach(item => {
                  const parts = item.split(/[:=]/)
                  if (parts.length >= 2) {
                    criteria.push({ label: parts[0].trim(), mark: parts.slice(1).join(':').trim() })
                  } else if (parts[0].trim()) {
                    criteria.push({ label: parts[0].trim(), mark: '' })
                  }
                })
              }
              const totalMarks = criteria.reduce((sum, item) => sum + (parseFloat(item.mark) || 0), 0)

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4, textAlign: 'left' }}>
                  {(duration || totalMarks > 0) && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {duration && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(184,25,60,0.12)', border: '1px solid rgba(184,25,60,0.3)', color: '#B8193C', padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                          <span>⏱️ സമയം:</span> <span>{duration}</span>
                        </div>
                      )}
                      {totalMarks > 0 && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(46, 213, 115, 0.12)', border: '1px solid rgba(46, 213, 115, 0.3)', color: '#2ed573', padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                          <span>🎯 ആകെ മാർക്ക്:</span> <span>{totalMarks}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {desc && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderLeft: '4px solid #B8193C',
                      borderRadius: 8,
                      padding: '14px 16px',
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: 14,
                      lineHeight: 1.7,
                      whiteSpace: 'pre-line'
                    }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>വിശദീകരണം / Topic</p>
                      {desc}
                    </div>
                  )}

                  {criteria.length > 0 && (
                    <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                        മാർക്ക് വിഭജനം (Evaluation Criteria)
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'left' }}>
                            <th style={{ padding: '8px 14px' }}>വിഷയം / Section</th>
                            <th style={{ padding: '8px 14px', width: 110, textAlign: 'right' }}>മാർക്ക്</th>
                          </tr>
                        </thead>
                        <tbody>
                          {criteria.map((item, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '10px 14px', color: '#fff', fontWeight: 500 }}>{item.label || '—'}</td>
                              <td style={{ padding: '10px 14px', color: '#B8193C', fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                {item.mark ? `${item.mark} മാർക്ക്` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}

    </div>
  )
}

/* ══════════ PARTICIPANT PROFILE TAB ══════════ */
function QrScanner({ onScan, onClose }) {
  const scannerRef = useRef(null)
  const scannerInstance = useRef(null)

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    let scanner
    async function startScanner() {
      const { Html5QrcodeScanner } = await import('html5-qrcode')
      scanner = new Html5QrcodeScanner(
        'lp-qr-reader',
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          rememberLastUsedCamera: true,
          supportedScanTypes: [0],
          videoConstraints: {
            facingMode: 'environment'
          }
        },
        false
      )
      scanner.render(
        (text) => {
          // Extract chess number from URL hash or use raw text
          const match = text.match(/#(.+)$/)
          const code = match ? match[1] : text
          onScan(code)
          scanner.clear().catch(() => {})
          onClose()
        },
        () => {}
      )
      scannerInstance.current = scanner
    }
    startScanner()
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (scannerInstance.current) {
        scannerInstance.current.clear().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="lp-scanner-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="lp-scanner-modal">
        <div className="lp-scanner-header">
          <span className="lp-scanner-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconQr />
            <span>Scan Chest Card QR</span>
          </span>
          <button className="lp-profile-clear" style={{ position: 'static', width: 32, height: 32 }} onClick={onClose}><IconX /></button>
        </div>
        <div id="lp-qr-reader" style={{ width: '100%' }} />
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 10 }}>
          Point camera at the QR code on the chest card
        </p>
      </div>
    </div>
  )
}

function ParticipantProfileTab({ participant, registrations, loading, onClear, onScanResult, user, onLogout, setViewingRules, rulesMap }) {
  const [showScanner, setShowScanner] = useState(false)
  const [confirmLogoutActive, setConfirmLogoutActive] = useState(false)
  const [publishedMap, setPublishedMap] = useState({})
  const [viewingResultComp, setViewingResultComp] = useState(null)
  const [compResults, setCompResults] = useState([])
  const [loadingCompResults, setLoadingCompResults] = useState(false)

  // PWA installation state
  const [isStandalone] = useState(() => {
    return typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    )
  })
  const [isIOS] = useState(() => {
    return typeof window !== 'undefined' && /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
  })
  const [showInstallGuide, setShowInstallGuide] = useState(false)

  async function handleInstallApp() {
    const prompt = window.deferredPWAInstallPrompt
    if (prompt) {
      try {
        prompt.prompt()
        const { outcome } = await prompt.userChoice
        if (outcome === 'accepted') {
          window.deferredPWAInstallPrompt = null
        }
        return
      } catch (err) {
        console.warn('PWA prompt failed:', err)
      }
    }
    // Fallback guide for iOS or browsers without direct prompt
    setShowInstallGuide(true)
  }

  // Fetch published status for all registered competitions
  useEffect(() => {
    if (!participant?.id || !registrations || registrations.length === 0) {
      setPublishedMap({})
      return
    }

    const compIds = registrations
      .map(r => r.competition_id || r.competitions?.id)
      .filter(Boolean)

    if (compIds.length === 0) return

    async function loadPublishedStatus() {
      try {
        const { data, error } = await supabase
          .from('competition_results')
          .select('id, competition_id, participant_id, position, grade, avg_points, published, published_at')
          .in('competition_id', compIds)
          .eq('published', true)

        if (!error && data) {
          const map = {}
          data.forEach(row => {
            if (!map[row.competition_id]) {
              map[row.competition_id] = {
                isPublished: true,
                publishedAt: row.published_at,
                myResult: null
              }
            }
            if (row.participant_id === participant.id) {
              map[row.competition_id].myResult = row
            }
          })
          setPublishedMap(map)
        }
      } catch (e) {
        console.error('Error fetching published status in profile:', e)
      }
    }

    loadPublishedStatus()

    const ch = supabase.channel(`profile-results-${participant.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_results' }, () => {
        loadPublishedStatus()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [participant?.id, registrations])

  // Open competition result details modal
  async function openCompResult(comp) {
    if (!comp) return
    setViewingResultComp(comp)
    setLoadingCompResults(true)
    try {
      const [resultsRes, publishedSeqRes] = await Promise.all([
        supabase
          .from('competition_results')
          .select(`
            id, position, grade, avg_points, placement_points, grade_points, participant_id,
            participants(id, name, chess_number, teams(name))
          `)
          .eq('competition_id', comp.id)
          .eq('published', true),
        supabase
          .from('competition_results')
          .select('competition_id, published_at')
          .eq('published', true)
      ])

      let announcementNumber = null
      if (publishedSeqRes.data) {
        const compMap = {}
        publishedSeqRes.data.forEach(r => {
          if (r.competition_id) {
            if (!compMap[r.competition_id] || (r.published_at && r.published_at < compMap[r.competition_id])) {
              compMap[r.competition_id] = r.published_at
            }
          }
        })
        const sortedIds = Object.keys(compMap).sort((a, b) => new Date(compMap[a]) - new Date(compMap[b]))
        const idx = sortedIds.indexOf(comp.id)
        if (idx !== -1) {
          announcementNumber = idx + 1
        }
      }

      setViewingResultComp(prev => ({
        ...prev,
        announcementNumber: announcementNumber || prev?.announcementNumber
      }))

      const list = (resultsRes.data || []).map(r => ({ ...r }))
      list.sort((a, b) => {
        const posA = a.position || 999
        const posB = b.position || 999
        if (posA !== posB) return posA - posB
        return (b.avg_points || 0) - (a.avg_points || 0)
      })
      setCompResults(list)
    } catch (err) {
      console.error('Failed to load competition results in profile:', err)
    } finally {
      setLoadingCompResults(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, height: '70vh', alignItems: 'center', justifyContent: 'center' }}>
        <LogoLoader text="Loading profile..." />
      </div>
    )
  }

  return (
    <div className="lp-profile-tab">

      {/* ── Top action bar ── */}
      {(participant || user) && (
        <div className="lp-profile-topbar">
          {participant && (
            <button className="lp-scan-btn" onClick={() => setShowScanner(true)}>
              <IconQr />
              <span>Scan QR</span>
            </button>
          )}
          {user && (
            <button className="lp-logout-btn" onClick={onLogout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Logout ({user.username})</span>
            </button>
          )}
        </div>
      )}

      {!participant ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 20, padding: 32, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" style={{ width: 36, height: 36 }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: 600, margin: '0 0 6px' }}>No Profile Loaded</p>
            <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>Scan a participant's chest card QR code to view their profile and competition details here.</p>
          </div>
          <button className="lp-scan-btn lp-scan-btn--large" onClick={() => setShowScanner(true)}>
            <IconQr />
            <span>Open Camera & Scan</span>
          </button>
        </div>
      ) : (
        <>
          {/* ── Hero: Actual Chest Card Design (Medium size) ── */}
          <div className="lp-profile-card-hero">
            <button
              className="lp-profile-clear-btn lp-profile-logout-btn-custom"
              onClick={() => {
                setConfirmLogoutActive(true)
              }}
              title="Close & Logout Profile"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
            <div className="lp-profile-card-scale-box">
              <div
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
                  fontSize: '1.954312rem',
                  borderRadius: 16,
                  textAlign: 'left'
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
                        value={`${window.location.origin}/#${participant.chess_number || ''}`}
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
                      {participant.chess_number || '—'}
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
                    <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{(participant.name || '').toUpperCase()}</span>
                    <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{(participant.teams?.name || '').toUpperCase()}</span>
                    <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{(participant.categories?.name || '').toUpperCase()}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Ultra-Compact Single Install App Banner ── */}
          {!isStandalone && (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '0 16px', boxSizing: 'border-box' }}>
              <div
                onClick={handleInstallApp}
                style={{
                  margin: '12px 0 4px 0',
                  maxWidth: 420,
                  width: '100%',
                  padding: '8px 12px 8px 14px',
                  background: 'linear-gradient(135deg, rgba(79, 156, 249, 0.1) 0%, rgba(247, 201, 72, 0.04) 100%)',
                  border: '1px solid rgba(79, 156, 249, 0.28)',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  cursor: 'pointer',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.25)',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'rgba(79, 156, 249, 0.2)',
                    border: '1px solid rgba(79, 156, 249, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <img src="/inspico-logo.svg" alt="Inspico" style={{ width: 15, height: 15, filter: 'brightness(0) invert(1)' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                    Install Inspico App
                  </span>
                </div>

                <button
                  type="button"
                  style={{
                    background: 'var(--accent-light, #4f9cf9)',
                    color: '#0e0b07',
                    border: 'none',
                    borderRadius: 7,
                    padding: '5px 12px',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  Install
                </button>
              </div>
            </div>
          )}

            {/* ── Competitions List ── */}
            <div className="lp-profile-comps">
              <div className="lp-profile-comps-header">
                <span className="lp-profile-comps-title">Competitions</span>
                <span className="lp-profile-comps-count">{registrations.length}</span>
              </div>

              {registrations.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                  No registered competitions found.
                </div>
              ) : (
                <div className="lp-profile-comps-list">
                  {registrations.map((r, i) => {
                    const c = r.competitions
                    const pubInfo = c ? publishedMap[c.id] : null
                    const isPublished = !!pubInfo?.isPublished
                    const myRes = pubInfo?.myResult
                    const sched = Array.isArray(c?.competition_schedule) ? c.competition_schedule[0] : c?.competition_schedule
                    const schedDate = sched?.scheduled_date
                      ? new Date(sched.scheduled_date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
                      : null
                    const schedTime = sched?.estimated_duration_mins ? `${sched.estimated_duration_mins} min` : null
                    const isStage = c?.competition_type === 'stage'

                    const handleCardClick = () => {
                      if (isPublished) {
                        openCompResult(c)
                      } else if (c) {
                        const ruleObj = (rulesMap && rulesMap[c.id]) || {}
                        setViewingRules({
                          ...c,
                          rules_description: c.rules_description || ruleObj.description || '',
                          rules_duration: c.rules_duration || ruleObj.duration || '',
                          mark_criteria: c.mark_criteria || ruleObj.mark_criteria || ''
                        })
                      }
                    }

                    const handleRulesClick = (e) => {
                      e.stopPropagation()
                      if (c) {
                        const ruleObj = (rulesMap && rulesMap[c.id]) || {}
                        setViewingRules({
                          ...c,
                          rules_description: c.rules_description || ruleObj.description || '',
                          rules_duration: c.rules_duration || ruleObj.duration || '',
                          mark_criteria: c.mark_criteria || ruleObj.mark_criteria || ''
                        })
                      }
                    }

                    return (
                      <div
                        key={c?.id || i}
                        className="lp-comp-card"
                        style={{
                          cursor: 'pointer',
                          position: 'relative',
                          border: isPublished ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                          background: isPublished
                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(255,255,255,0.02) 100%)'
                            : 'rgba(255,255,255,0.02)',
                          transition: 'all 0.25s ease'
                        }}
                        onClick={handleCardClick}
                      >
                        <div className="lp-comp-card-body">
                          {/* Top Tag Row: Category, Stage, and Published Status */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span className={`lp-comp-type-badge ${isStage ? 'stage' : 'offstage'}`}>
                                {isStage ? `Stage · ${c?.stages?.name || 'Assigned'}` : 'Off-Stage'}
                              </span>
                              {c?.categories?.name && (
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>
                                  {c.categories.name}
                                </span>
                              )}
                            </div>

                            {/* Status Tag */}
                            {isPublished ? (
                              <span style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                color: '#34d399',
                                background: 'rgba(16, 185, 129, 0.16)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                padding: '2px 8px',
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
                                Result Published
                              </span>
                            ) : (
                              <span style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: 'rgba(255,255,255,0.4)',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                padding: '2px 7px',
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                ⏳ Result Pending
                              </span>
                            )}
                          </div>

                          {/* Competition Name & Rules Trigger */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                            <p className="lp-comp-name" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>
                              {c?.name}
                            </p>
                            <button
                              type="button"
                              onClick={handleRulesClick}
                              style={{
                                background: 'rgba(184, 25, 60, 0.1)',
                                border: '1px solid rgba(184, 25, 60, 0.25)',
                                color: '#f43f5e',
                                fontSize: 11,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                cursor: 'pointer',
                                padding: '3px 8px',
                                borderRadius: 5,
                                flexShrink: 0
                              }}
                              title="View Rules"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                              </svg>
                              നിയമാവലി
                            </button>
                          </div>

                          {/* Award / Position Highlight for current participant */}
                          {myRes && (myRes.position || myRes.grade) && (
                            <div style={{
                              marginTop: 8,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              background: myRes.position === 1 ? 'rgba(247, 201, 72, 0.14)' : 'rgba(255,255,255,0.06)',
                              border: `1px solid ${myRes.position === 1 ? 'rgba(247, 201, 72, 0.4)' : 'rgba(255,255,255,0.12)'}`,
                              padding: '3px 9px',
                              borderRadius: 6
                            }}>
                              <span style={{
                                fontSize: 12,
                                fontWeight: 800,
                                color: myRes.position === 1 ? '#f7c948' : myRes.position === 2 ? '#e2e8f0' : myRes.position === 3 ? '#fb923c' : '#38bdf8'
                              }}>
                                {myRes.position === 1 ? '🥇 1st Place' : myRes.position === 2 ? '🥈 2nd Place' : myRes.position === 3 ? '🥉 3rd Place' : `Rank #${myRes.position}`}
                              </span>
                              {myRes.grade && myRes.grade !== '—' && (
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>
                                  · Grade {myRes.grade}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Footer Row */}
                        <div className="lp-comp-footer" style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
                          {(schedDate || schedTime) ? (
                            <div className="lp-comp-schedule" style={{ margin: 0 }}>
                              {schedDate && <span className="lp-comp-date">{schedDate}</span>}
                              {schedTime && <span className="lp-comp-dur">{schedTime}</span>}
                            </div>
                          ) : <div />}

                          {isPublished ? (
                            <span style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#f7c948',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              View Result <IconArrow />
                            </span>
                          ) : (
                            <span className="lp-comp-view" style={{ fontSize: 11.5 }}>
                              View Rules <IconArrow />
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
        </>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <QrScanner
          onScan={onScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* ── Competition Result Modal for Profile ── */}
      {viewingResultComp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}
          onClick={() => setViewingResultComp(null)}
        >
          <div
            style={{
              maxWidth: 520,
              width: '100%',
              margin: '0 auto',
              padding: '24px 16px 80px 16px',
              minHeight: '100%'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top Bar with Back & Close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <button
                type="button"
                className="lp-back-btn"
                onClick={() => setViewingResultComp(null)}
                style={{ margin: 0 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to Profile
              </button>

              <button
                type="button"
                onClick={() => setViewingResultComp(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#fff',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Competition Title Header */}
            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {viewingResultComp.announcementNumber && (
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#f7c948' }}>
                    #{String(viewingResultComp.announcementNumber).padStart(2, '0')}
                  </span>
                )}
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-light, #4f9cf9)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Competition Result
                </span>
              </div>
              <h2 style={{ margin: '4px 0 0 0', fontSize: 22, fontWeight: 800, color: '#fff' }}>
                {viewingResultComp.name}
              </h2>
              {viewingResultComp.categories?.name && (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4, display: 'inline-block' }}>
                  {viewingResultComp.categories.name}
                </span>
              )}
            </div>

            {loadingCompResults ? (
              <LogoLoader text="Loading results..." />
            ) : compResults.length === 0 ? (
              <div className="lp-empty"><IconAward /><p>No published results found</p></div>
            ) : (
              <>
                {/* Result Poster if template exists */}
                <ResultPoster competition={viewingResultComp} results={compResults} />

                {/* Published Winners List */}
                <div className="lp-results-list" style={{ maxWidth: 480, margin: '18px auto 0 auto' }}>
                  {compResults.map((r, i) => {
                    const pos = r.position || (i + 1)
                    const isTied = compResults.filter(x => x.position === pos).length > 1
                    const isMe = r.participant_id === participant.id || r.participants?.id === participant.id
                    return (
                      <div
                        key={r.id}
                        className={`lp-result-row ${pos === 1 ? 'lp-result-first' : pos === 2 ? 'lp-result-second' : pos === 3 ? 'lp-result-third' : ''}`}
                        style={isMe ? {
                          border: '2px solid #f7c948',
                          background: 'rgba(247, 201, 72, 0.12)',
                          boxShadow: '0 0 18px rgba(247, 201, 72, 0.25)'
                        } : undefined}
                      >
                        <div className="lp-result-rank-medal">
                          <span className="lp-result-num">{pos}</span>
                        </div>
                        <div className="lp-result-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="lp-result-name" style={isMe ? { color: '#f7c948', fontWeight: 800 } : undefined}>
                              {r.participants?.name} {isMe && '(You)'}
                            </span>
                            {isTied && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent-light)', background: 'rgba(79, 156, 249, 0.12)', border: '1px solid rgba(79, 156, 249, 0.3)', padding: '1px 5px', borderRadius: 4 }}>
                                TIED
                              </span>
                            )}
                          </div>
                          <span className="lp-result-meta">
                            {r.participants?.teams?.name && <span className="lp-result-team">{r.participants.teams.name}</span>}
                            {r.participants?.chess_number && <span className="lp-result-chess">#{r.participants.chess_number}</span>}
                          </span>
                        </div>
                        <span className="lp-result-score" style={{ fontSize: 15, fontWeight: 800 }}>
                          {r.grade && r.grade !== '—' ? r.grade : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Custom Logout Confirmation Dialog */}
      {confirmLogoutActive && (
        <div className="lp-modal-backdrop" onClick={() => setConfirmLogoutActive(false)}>
          <div className="lp-modal-card" style={{ maxWidth: 360, padding: 20, borderRadius: 14, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px 0', color: '#fff' }}>Logout & Clear Profile</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Are you sure you want to close this profile view?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="lp-modal-close"
                style={{ flex: 1, padding: '10px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, position: 'static' }}
                onClick={() => setConfirmLogoutActive(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{ flex: 1, padding: '10px 16px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                onClick={() => {
                  setConfirmLogoutActive(false)
                  onClear()
                }}
              >
                Yes, Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PWA Install Guide Modal (iOS & Android fallback) ── */}
      {showInstallGuide && (
        <div
          className="lp-modal-backdrop"
          onClick={() => setShowInstallGuide(false)}
          style={{ zIndex: 999999 }}
        >
          <div
            className="lp-modal-card"
            style={{ maxWidth: 380, padding: '24px 20px', borderRadius: 16, textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(79, 156, 249, 0.2), rgba(247, 201, 72, 0.1))',
                border: '1px solid rgba(79, 156, 249, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img src="/inspico-logo.svg" alt="Inspico" style={{ width: 26, height: 26, filter: 'brightness(0) invert(1)' }} />
              </div>
            </div>

            <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 6px 0', color: '#fff' }}>
              Install Inspico App
            </h3>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', margin: '0 0 18px 0', lineHeight: 1.5 }}>
              {isIOS
                ? 'Follow these 2 simple steps to add Inspico to your iPhone Home Screen:'
                : 'Follow these steps to add Inspico to your Home Screen:'}
            </p>

            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '14px 16px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginBottom: 20
            }}>
              {isIOS ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', background: 'rgba(79, 156, 249, 0.2)',
                      color: '#4f9cf9', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>1</span>
                    <span style={{ fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.4 }}>
                      Tap the <strong>Share button (📤)</strong> at the bottom of Safari.
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', background: 'rgba(79, 156, 249, 0.2)',
                      color: '#4f9cf9', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>2</span>
                    <span style={{ fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.4 }}>
                      Scroll down and tap <strong>"Add to Home Screen" (➕)</strong>.
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', background: 'rgba(79, 156, 249, 0.2)',
                      color: '#4f9cf9', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>1</span>
                    <span style={{ fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.4 }}>
                      Tap the <strong>Browser menu (⋮)</strong> at top right.
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', background: 'rgba(79, 156, 249, 0.2)',
                      color: '#4f9cf9', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>2</span>
                    <span style={{ fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.4 }}>
                      Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowInstallGuide(false)}
              style={{
                width: '100%',
                padding: '10px 0',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

