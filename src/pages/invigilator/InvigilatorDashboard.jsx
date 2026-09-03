// src/pages/invigilator/InvigilatorDashboard.jsx
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import HeaderInstallButton from '../../components/HeaderInstallButton'
import './invigilator.css'

// ── jsQR loader ──
let jsQRLib = null
async function loadJsQR() {
  if (jsQRLib) return jsQRLib
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
    script.onload = () => { jsQRLib = window.jsQR; resolve(jsQRLib) }
    document.head.appendChild(script)
  })
}

// ── SVG Icons ──
const IcoStage    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
const IcoOffStage = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M18 2L22 6L9 19L5 15L18 2Z" /><path d="M9 19L3 21L5 15" /><path d="M14 6L18 10" /></svg>
const IcoDone     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IcoQR       = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="3" y="16" width="5" height="5" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/></svg>
const IcoChevron  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
const IcoBack     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
const IcoSend     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const IcoClose    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IcoPlay     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>

export default function InvigilatorDashboard() {
  const { user, logout } = useAuth()
  const [competitions, setCompetitions]   = useState([])
  const [selectedId, setSelectedId]       = useState(null)
  const selected = competitions.find(c => c.id === selectedId)
  const [participants, setParticipants]   = useState([])
  const [checkinOrder, setCheckinOrder]   = useState([])
  const [fetching, setFetching]           = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [submitted, setSubmitted]         = useState(false)
  const [invTab, setInvTab]               = useState('pending')
  const [scanning, setScanning]           = useState(false)
  const [scanMsg, setScanMsg]             = useState(null)
  const [submittedCodes, setSubmittedCodes] = useState({})
  const [updatingSchedId, setUpdatingSchedId] = useState(null)

  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef    = useRef(null)
  const lastScanned = useRef({ code: '', time: 0 })
  const checkinSetRef = useRef(new Set())

  const invigId = user?.invigilatorId || user?.id

  // ── Helper to resolve 1-to-1 or 1-to-many schedule relationship ──
  const getSchedule = (comp) => {
    if (!comp?.competition_schedule) return null
    if (Array.isArray(comp.competition_schedule)) {
      return comp.competition_schedule[0] || null
    }
    return comp.competition_schedule
  }

  // ── Timer State & Logic ──
  const [secondsLeft, setSecondsLeft] = useState(null)
  const schd = getSchedule(selected)

  // Self-heal: If schedule is manually marked as 'ongoing' in DB but actual_start_time is null, set it to now
  useEffect(() => {
    if (schd?.status === 'ongoing' && !schd?.actual_start_time) {
      const nowStr = new Date().toISOString()
      console.log("Self-healing: setting actual_start_time to", nowStr)
      supabase.from('competition_schedule')
        .update({ actual_start_time: nowStr })
        .eq('id', schd.id)
        .then(() => fetchCompetitions())
    }
  }, [schd?.status, schd?.actual_start_time, schd?.id])

  useEffect(() => {
    if (schd?.status !== 'ongoing' || !schd?.actual_start_time) {
      setSecondsLeft(null)
      return
    }
    const durationMs = (schd.estimated_duration_mins || 30) * 60 * 1000
    
    // Convert PostgreSQL offset (e.g. +00 or -05) to standard ISO-8601 offset (+00:00 or -05:00)
    const cleanTimeStr = schd.actual_start_time
      .replace(' ', 'T')
      .replace(/([\+\-])(\d{2})$/, '$1$2:00')
      
    const startTs = new Date(cleanTimeStr).getTime()
    
    const updateTimer = () => {
      const now = Date.now()
      const elapsed = now - startTs
      const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000))
      setSecondsLeft(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [schd?.status, schd?.actual_start_time, schd?.estimated_duration_mins])

  const formatTime = (secs) => {
    if (secs === null) return ''
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Realtime updates setup
  useEffect(() => {
    fetchCompetitions()

    if (!invigId) return
    const ch = supabase
      .channel('invigilator-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_reports' }, fetchCompetitions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_invigilators' }, fetchCompetitions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_participants' }, fetchCompetitions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, fetchCompetitions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_schedule' }, fetchCompetitions)
      .subscribe()

    return () => {
      stopCamera()
      supabase.removeChannel(ch)
    }
  }, [invigId])

  // ── Fetch competitions assigned to this invigilator ──
  async function fetchCompetitions() {
    if (!invigId) { setFetching(false); return }
    const { data: ciRows } = await supabase
      .from('competition_invigilators')
      .select('competition_id')
      .eq('invigilator_id', invigId)

    if (!ciRows?.length) { 
      setCompetitions([])
      setFetching(false) 
      return 
    }
    const ids = ciRows.map(r => r.competition_id)

    const [{ data: comps }, { data: repData }] = await Promise.all([
      supabase.from('competitions')
        .select('*, categories(name), stages(name), competition_schedule(id, scheduled_date, scheduled_time, status, actual_start_time, actual_end_time, estimated_duration_mins)')
        .in('id', ids)
        .order('created_at'),
      supabase.from('competition_reports')
        .select('competition_id')
        .in('competition_id', ids)
        .eq('reported_by', invigId),
    ])

    const reportedSet = new Set((repData || []).map(r => r.competition_id))
    setCompetitions((comps || []).map(c => ({ ...c, reported: reportedSet.has(c.id) })))
    setFetching(false)
  }

  // Handle Start / Complete actions
  async function updateStatus(schedId, newStatus) {
    setUpdatingSchedId(schedId)
    const payload = { status: newStatus }
    if (newStatus === 'ongoing') {
      payload.actual_start_time = new Date().toISOString()
    } else if (newStatus === 'completed') {
      payload.actual_end_time = new Date().toISOString()
    }

    console.log("Updating schedule status:", schedId, payload)
    const { data, error } = await supabase.from('competition_schedule').update(payload).eq('id', schedId).select()
    if (error) {
      console.error("Failed to update status:", error)
      alert("Database Error: " + error.message)
    } else {
      console.log("Update status response:", data)
    }
    await fetchCompetitions()
    setUpdatingSchedId(null)
  }

  // ── Open a competition for reporting ──
  useEffect(() => {
    const handlePopState = (e) => {
      if (selectedId) {
        setSelectedId(null);
        setSubmitted(false);
        stopCamera();
        setScanMsg(null);
      }
    };
    if (selectedId) {
      window.history.pushState({ type: 'invigilator-detail' }, '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedId]);

  async function openCompetition(comp) {
    setSelectedId(comp.id)
    setLoadingDetail(true)
    setSubmitted(false)

    const { data: cpRows } = await supabase
      .from('competition_participants')
      .select('participant_id, participants(id, name, chess_number, teams(name))')
      .eq('competition_id', comp.id)

    const parts = (cpRows || []).map(r => r.participants).filter(Boolean)
    setParticipants(parts)

    // Load existing reports (already submitted earlier)
    const { data: existing } = await supabase
      .from('competition_reports')
      .select('*')
      .eq('competition_id', comp.id)

    if (existing?.length) {
      const ordered = [...existing].sort((a, b) => a.code_letter.localeCompare(b.code_letter))
      const ids = ordered.map(r => r.participant_id)
      checkinSetRef.current = new Set(ids)
      setCheckinOrder(ids)
      const codeMap = {}
      existing.forEach(r => {
        codeMap[r.participant_id] = r.code_letter
      })
      setSubmittedCodes(codeMap)
      setSubmitted(true)
    } else {
      checkinSetRef.current = new Set()
      setCheckinOrder([])
      setSubmittedCodes({})
      setSubmitted(false)
    }

    setLoadingDetail(false)
  }

  // ── QR scan: competition-level (one scanner) ──
  function showScanMsg(text, type = 'ok') {
    setScanMsg({ text, type })
  }

  async function startScan() {
    setScanning(true)
    setScanMsg(null)
    await loadJsQR()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
          scanFrame()
        }
      }, 300)
    } catch {
      showScanMsg('Camera permission denied.', 'err')
      setScanning(false)
    }
  }

  function playErrorBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.value = 150
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      gain.gain.setValueAtTime(1, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
      setTimeout(() => osc.stop(), 300)
    } catch (e) {}
  }

  function scanFrame() {
    if (!videoRef.current || !canvasRef.current) return
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = window.jsQR?.(imageData.data, imageData.width, imageData.height)
      if (code?.data) {
        const rawText = code.data.trim()
        const matchHash = rawText.match(/#([a-zA-Z0-9_\-]+)/)
        const scannedChess = matchHash ? matchHash[1] : (rawText.startsWith('http') ? rawText.split('/').pop() : rawText)
        
        const now = Date.now()
        if (lastScanned.current.code === scannedChess && now - lastScanned.current.time < 1500) {
          rafRef.current = requestAnimationFrame(scanFrame)
          return
        }
        lastScanned.current = { code: scannedChess, time: now }

        const match = participants.find(p => String(p.chess_number).trim() === scannedChess)
        if (match) {
          if (checkinSetRef.current.has(match.id)) {
            showScanMsg(`${match.name} already checked in`, 'err')
            playErrorBeep()
          } else {
            checkinSetRef.current.add(match.id)
            setCheckinOrder(Array.from(checkinSetRef.current))
            showScanMsg(`✓ Checked in: ${match.name}`, 'ok')
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
              const osc = audioCtx.createOscillator()
              osc.frequency.value = 850
              osc.connect(audioCtx.destination)
              osc.start()
              setTimeout(() => osc.stop(), 90)
            } catch (e) {}
          }
        } else {
          if (scannedChess.length > 10 || (rawText.startsWith('http') && !matchHash)) {
            showScanMsg("Wrong QR Code", 'err')
            playErrorBeep()
          } else {
            supabase.from('participants').select('id').eq('chess_number', scannedChess).single().then(({data}) => {
              if (data) {
                showScanMsg(`Chess #${scannedChess} is not in this competition`, 'err')
              } else {
                showScanMsg("Wrong QR Code", 'err')
              }
              playErrorBeep()
            })
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(scanFrame)
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  // ── Manual Check-in ──
  function toggleManualCheckin(pid) {
    const match = participants.find(p => p.id === pid)
    if (!match) return
    if (checkinSetRef.current.has(pid)) {
      checkinSetRef.current.delete(pid)
      setCheckinOrder(Array.from(checkinSetRef.current))
      showScanMsg(`Checked out: ${match.name}`, 'err')
    } else {
      checkinSetRef.current.add(pid)
      setCheckinOrder(Array.from(checkinSetRef.current))
      showScanMsg(`✓ Checked in: ${match.name}`, 'ok')
    }
  }

  // ── Submit report ──
  async function handleSubmit() {
    if (!checkinOrder.length) return
    setSubmitting(true)

    const isStage = selected?.competition_type === 'stage'
    let pool = checkinOrder.map((_, i) => String.fromCharCode(65 + i))

    if (isStage) {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]]
      }
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const reportedBy = uuidRegex.test(invigId) ? invigId : null;

    const codeMap = {}
    const rows = checkinOrder.map((pid, i) => {
      const p = participants.find(x => x.id === pid)
      codeMap[pid] = pool[i]
      return {
        competition_id: selected.id,
        participant_id: pid,
        code_letter: pool[i],
        chess_number: p?.chess_number || '',
        reported_by: reportedBy,
      }
    })

    const { error } = await supabase.from('competition_reports').upsert(rows, { onConflict: 'competition_id,participant_id' })
    
    if (error) {
      console.error("Submit error:", error)
      alert("Error submitting check-in: " + error.message)
      setSubmitting(false)
      return
    }

    setSubmittedCodes(codeMap)
    setSubmitting(false)
    setSubmitted(true)
    await fetchCompetitions()
  }

  const maxLimit = selected?.max_participants_per_team

  return (
    <div className="inv-root">
      {/* ── Top Bar ── */}
      <header className="inv-topbar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {selected && (
              <button className="inv-back" onClick={() => window.history.back()}>
                <IcoBack />
              </button>
            )}
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                {selected ? 'Check-in' : 'Invigilator'}
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {selected ? selected.name : user?.name || user?.username}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HeaderInstallButton />
            <button className="inv-logout" onClick={logout}>Logout</button>
          </div>
        </div>
      </header>

      <main className="inv-main">
        {!selected ? (
          /* ── Competition List ── */
          <div className="inv-card-list">
            <div className="inv-tab-bar">
              {[['pending','Pending'],['completed','Completed']].map(([tab, lbl]) => {
                const count = competitions.filter(c => {
                  const isDone = getSchedule(c)?.status === 'completed'
                  return tab === 'pending' ? !isDone : isDone
                }).length
                return (
                  <button key={tab}
                    className={`inv-tab ${invTab === tab ? 'active' : ''}`}
                    onClick={() => setInvTab(tab)}>
                    {lbl} ({count})
                  </button>
                )
              })}
            </div>

            {fetching ? (
              <div className="inv-center"><div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} /></div>
            ) : competitions.filter(c => {
              const isDone = getSchedule(c)?.status === 'completed'
              return invTab === 'pending' ? !isDone : isDone
            }).length === 0 ? (
              <div className="inv-center"><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No {invTab} competitions.</p></div>
            ) : (
              <div className="inv-group-box">
                {competitions.filter(c => {
                  const isDone = getSchedule(c)?.status === 'completed'
                  return invTab === 'pending' ? !isDone : isDone
                }).map(c => {
                  const s = getSchedule(c)
                  const isStage = c.competition_type === 'stage'
                  const schedStatus = s?.status || 'scheduled'
                  const isDone = schedStatus === 'completed'
                  
                  return (
                    <div key={c.id} className={`inv-comp-card ${isDone ? 'done' : ''}`} onClick={() => openCompetition(c)}>
                      <div className={`inv-comp-icon ${isDone ? 'done-icon' : ''}`}>
                        {isDone ? <IcoDone /> : (isStage ? <IcoStage /> : <IcoOffStage />)}
                      </div>
                      <div className="inv-comp-body">
                        <p className="inv-comp-name">{c.name}</p>
                        <div className="inv-comp-meta">
                          {c.categories?.name && <span>{c.categories.name}</span>}
                          <span style={{ color: isStage ? 'var(--accent-light)' : '#7baede' }}>
                            {isStage ? 'Stage' : 'Off-Stage'}
                          </span>
                          {s?.scheduled_time && <span>{s.scheduled_time.slice(0, 5)}</span>}
                          {s?.stages?.name && <span>{s.stages.name}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={e => e.stopPropagation()}>
                        


                        {/* Status badges */}
                        {schedStatus === 'ongoing' && (
                          <span className="inv-status-badge pending" style={{ background: 'var(--error-bg)', color: 'var(--error)', borderColor: 'var(--error)' }}>
                            LIVE
                          </span>
                        )}

                        <span className={`inv-status-badge ${isDone ? 'done' : 'pending'}`}>
                          {isDone ? 'Done' : 'Pending'}
                        </span>
                        
                        <span className="inv-comp-chevron" onClick={() => openCompetition(c)} style={{ cursor: 'pointer' }}><IcoChevron /></span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── Check-in Detail ── */
          <div className="inv-report-wrap">
            <div className="inv-meta-row">
              {schd && (
                <span>
                  {schd.scheduled_date && new Date(schd.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  {schd.scheduled_time && ` · ${schd.scheduled_time.slice(0, 5)}`}
                  {schd.stages?.name && ` · ${schd.stages.name}`}
                </span>
              )}
              {maxLimit && (
                <span className="inv-limit-badge">Max {maxLimit}/team</span>
              )}
            </div>

            <div className="inv-qr-bar">
              <button className="inv-qr-main-btn" onClick={scanning ? stopCamera : startScan}>
                {scanning ? <IcoClose /> : <IcoQR />}
                {scanning ? 'Done Scanning' : 'Scan QR Code'}
              </button>
              {scanning && (
                <div className="inv-qr-inline-container" style={{ position: 'relative', overflow: 'hidden', borderRadius: 10, border: '1px solid var(--border-subtle)', background: '#000', height: 180, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay playsInline muted />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
              )}
              {scanMsg && (
                <p className={`inv-scan-msg ${scanMsg.type}`}>
                  {scanMsg.text}
                </p>
              )}
            </div>

            {loadingDetail ? (
              <div className="inv-center"><div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} /></div>
            ) : submitted ? (
              <div className="inv-success-card" style={{ gap: 16 }}>
                
                {/* Header state */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(100,180,100,0.12)', border: '1px solid rgba(100,180,100,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7bc47b' }}>
                    <IcoDone />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>Report Submitted</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {checkinOrder.length} participants checked in
                    </p>
                  </div>
                </div>

                {/* Competition status & action center */}
                {schd ? (
                  <div style={{
                    width: '100%', padding: 14, background: 'var(--bg-secondary)', 
                    border: '1px solid var(--border-subtle)', borderRadius: 8,
                    display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
                    marginTop: 4
                  }}>
                    {schd.status === 'scheduled' && (
                      <>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Check-in completed. Start the competition:</p>
                        <button 
                          className="btn-submit" 
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 6 }}
                          onClick={() => updateStatus(schd.id, 'ongoing')}
                          disabled={updatingSchedId === schd.id}
                        >
                          <IcoPlay /> Start Competition
                        </button>
                      </>
                    )}

                    {schd.status === 'ongoing' && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--error)', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--error)', letterSpacing: 1 }}>COMPETITION LIVE</span>
                        </div>

                        {secondsLeft !== null && (
                          <div style={{ fontSize: 32, fontWeight: 800, color: secondsLeft < 120 ? 'var(--error)' : 'var(--cream)', letterSpacing: 1, fontVariantNumeric: 'tabular-nums', margin: '4px 0' }}>
                            {secondsLeft === 0 ? "Time's Up!" : formatTime(secondsLeft)}
                          </div>
                        )}

                        <button 
                          className="btn-submit" 
                          style={{ width: '100%', background: 'var(--error)', borderColor: 'var(--error)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 6 }}
                          onClick={() => updateStatus(schd.id, 'completed')}
                          disabled={updatingSchedId === schd.id}
                        >
                          <IcoDone /> End Competition
                        </button>
                      </>
                    )}

                    {schd.status === 'completed' && (
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#7bc47b' }}>✓ Competition Successfully Ended</p>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Note: This competition is not scheduled yet by the Admin.</p>
                )}

                {/* Participant list assigned codes */}
                <div className="inv-group-box" style={{ width: '100%', textAlign: 'left', marginTop: 4 }}>
                  {[...checkinOrder].sort((a, b) => {
                    const codeA = submittedCodes[a] || '';
                    const codeB = submittedCodes[b] || '';
                    return codeA.localeCompare(codeB);
                  }).map(pid => {
                    const p = participants.find(x => x.id === pid)
                    return (
                      <div key={pid} className="inv-part-row" style={{ cursor: 'default' }}>
                        <span className="inv-code-badge" style={{ fontSize: 14, fontWeight: 800, minWidth: 32, textAlign: 'center' }}>
                          {submittedCodes[pid]}
                        </span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 500, fontSize: 13 }}>{p?.name}</p>
                          {p?.chess_number && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>#{p.chess_number}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <button className="inv-submit-btn" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }} onClick={() => window.history.back()}>
                  Back
                </button>
              </div>
            ) : participants.length === 0 ? (
              <div className="inv-center"><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No participants registered for this competition.</p></div>
            ) : (
              <>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 4px 6px' }}>
                  Scan participant QR code, or tap a row to manually check in.
                </p>
                <div className="inv-participants-list">
                  {participants.map(p => {
                    const isChecked = checkinOrder.includes(p.id)
                    const checkinPos = checkinOrder.indexOf(p.id)
                    return (
                      <div key={p.id} className={`inv-part-row ${isChecked ? 'present' : ''}`} onClick={() => toggleManualCheckin(p.id)} style={{ cursor: 'pointer' }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%',
                          border: isChecked ? 'none' : '1.5px solid var(--border-subtle)',
                          background: isChecked ? '#7bc47b' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isChecked && <svg viewBox="0 0 24 24" fill="none" stroke="#0e0b07" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 8, height: 8 }}><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                            {p.teams?.name && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.teams.name}</span>}
                            {p.chess_number && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>#{p.chess_number}</span>}
                          </div>
                        </div>

                        {isChecked && (
                          <span className="inv-code-badge" style={{ fontSize: 11, padding: '4px 8px', minWidth: 'auto', borderRadius: 6 }}>
                            {selected?.competition_type === 'stage' ? `#${checkinPos + 1}` : `Code ${String.fromCharCode(65 + checkinPos)}`}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="inv-submit-bar" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="inv-submit-btn"
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={submitting || checkinOrder.length === 0}
                    onClick={handleSubmit}>
                    {submitting
                      ? <span className="spin" style={{ width: 14, height: 14 }} />
                      : <><IcoSend /> Submit Check-in</>}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}