// src/pages/invigilator/InvigilatorDashboard.jsx
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
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
const IcoStage    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20"/><path d="M6 20V10l6-6 6 6v10"/><path d="M12 20v-6"/></svg>
const IcoOffStage = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
const IcoDone     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IcoQR       = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="3" y="16" width="5" height="5" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/></svg>
const IcoChevron  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
const IcoBack     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
const IcoSend     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const IcoClose    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>

export default function InvigilatorDashboard() {
  const { user, logout } = useAuth()
  const [competitions, setCompetitions]   = useState([])
  const [selected, setSelected]           = useState(null)
  const [participants, setParticipants]   = useState([])
  // checkinOrder: array of participant_ids in the order they checked in
  const [checkinOrder, setCheckinOrder]   = useState([])
  const [fetching, setFetching]           = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [submitted, setSubmitted]         = useState(false)
  const [invTab, setInvTab]               = useState('pending')
  const [scanning, setScanning]           = useState(false)
  const [scanMsg, setScanMsg]             = useState(null) // { text, type }
  const [submittedCodes, setSubmittedCodes] = useState({}) // pid → code_letter (after submit)

  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef    = useRef(null)
  const lastScanned = useRef({ code: '', time: 0 })
  const checkinSetRef = useRef(new Set()) // Synchronous guard to prevent scan race conditions

  const invigId = user?.invigilatorId || user?.id

  // Realtime updates setup
  useEffect(() => {
    fetchCompetitions()

    if (!invigId) return
    const ch = supabase
      .channel('invigilator-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_reports' }, fetchCompetitions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_invigilators', filter: `invigilator_id=eq.${invigId}` }, fetchCompetitions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_participants' }, fetchCompetitions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, fetchCompetitions)
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

    if (!ciRows?.length) { setFetching(false); return }
    const ids = ciRows.map(r => r.competition_id)

    const [{ data: comps }, { data: repData }] = await Promise.all([
      supabase.from('competitions')
        .select('*, categories(name), competition_schedule(scheduled_date, scheduled_time, stage_number)')
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

  // ── Open a competition for reporting ──
  // Handle hardware/browser back swipe to close detail view instead of exiting app
  useEffect(() => {
    const handlePopState = (e) => {
      if (selected) {
        setSelected(null);
        setSubmitted(false);
        stopCamera();
        setScanMsg(null);
      }
    };
    if (selected) {
      window.history.pushState({ type: 'invigilator-detail' }, '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selected]);

  async function openCompetition(comp) {
    setSelected(comp)
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
      // Reconstruct check-in order and submitted codes from database
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
        const scannedChess = code.data.trim()
        const now = Date.now()
        // Cool down to prevent duplicate scanning updates too fast (1.5 seconds)
        if (lastScanned.current.code === scannedChess && now - lastScanned.current.time < 1500) {
          rafRef.current = requestAnimationFrame(scanFrame)
          return
        }
        lastScanned.current = { code: scannedChess, time: now }

        // Find participant with this chess number
        const match = participants.find(p => String(p.chess_number).trim() === scannedChess)
        if (match) {
          if (checkinSetRef.current.has(match.id)) {
            showScanMsg(`${match.name} already checked in`, 'err')
            playErrorBeep()
          } else {
            // Synchronously record check-in to prevent race condition duplicates
            checkinSetRef.current.add(match.id)
            setCheckinOrder(Array.from(checkinSetRef.current))
            showScanMsg(`✓ Checked in: ${match.name}`, 'ok')
            // Play premium native barcode scanner sound via Audio Synthesis
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
          // Not found in this competition
          if (scannedChess.startsWith('http') || scannedChess.length > 20) {
            showScanMsg("Wrong QR Code", 'err')
            playErrorBeep()
          } else {
            // Async check if it exists in participants table at all
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

  // ── Submit report — conditional randomized/sequential code letters ──
  async function handleSubmit() {
    if (!checkinOrder.length) return
    setSubmitting(true)

    const isStage = selected?.competition_type === 'stage'
    let pool = checkinOrder.map((_, i) => String.fromCharCode(65 + i))

    // For stage competitions, shuffle code letters randomly.
    // For non-stage (off-stage) competitions, keep them exactly in check-in order.
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

  const schd = selected?.competition_schedule?.[0]
  // Max participants limit from competition
  const maxLimit = selected?.max_participants_per_team

  // ── RENDER ──
  return (
    <div className="inv-root">

      {/* ── Top Bar ── */}
      <header className="inv-topbar">
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
        <button className="inv-logout" onClick={logout}>Logout</button>
      </header>

      <main className="inv-main">
        {!selected ? (
          /* ═══ Competition List ═══ */
          <div className="inv-card-list">
            <div className="inv-tab-bar">
              {[['pending','Pending'],['completed','Completed']].map(([tab, lbl]) => (
                <button key={tab}
                  className={`inv-tab ${invTab === tab ? 'active' : ''}`}
                  onClick={() => setInvTab(tab)}>
                  {lbl} ({competitions.filter(c => tab === 'pending' ? !c.reported : c.reported).length})
                </button>
              ))}
            </div>

            {fetching ? (
              <div className="inv-center"><div className="spin" style={{ borderTopColor: 'var(--accent-light)', width: 22, height: 22 }} /></div>
            ) : competitions.filter(c => invTab === 'pending' ? !c.reported : c.reported).length === 0 ? (
              <div className="inv-center"><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No {invTab} competitions.</p></div>
            ) : (
              <div className="inv-group-box">
                {competitions.filter(c => invTab === 'pending' ? !c.reported : c.reported).map(c => {
                  const s = c.competition_schedule?.[0]
                  const isStage = c.competition_type === 'stage'
                  return (
                    <div key={c.id} className={`inv-comp-card ${c.reported ? 'done' : ''}`} onClick={() => openCompetition(c)}>
                      <div className={`inv-comp-icon ${c.reported ? 'done-icon' : ''}`}>
                        {c.reported ? <IcoDone /> : (isStage ? <IcoStage /> : <IcoOffStage />)}
                      </div>
                      <div className="inv-comp-body">
                        <p className="inv-comp-name">{c.name}</p>
                        <div className="inv-comp-meta">
                          {c.categories?.name && <span>{c.categories.name}</span>}
                          <span style={{ color: isStage ? 'var(--accent-light)' : '#7baede' }}>
                            {isStage ? 'Stage' : 'Off-Stage'}
                          </span>
                          {s?.scheduled_time && <span>{s.scheduled_time.slice(0, 5)}</span>}
                          {s?.stage_number && <span>Room {s.stage_number}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span className={`inv-status-badge ${c.reported ? 'done' : 'pending'}`}>
                          {c.reported ? 'Done' : 'Pending'}
                        </span>
                        <span className="inv-comp-chevron"><IcoChevron /></span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* ═══ Check-in Detail ═══ */
          <div className="inv-report-wrap">

            {/* Schedule + limit info */}
            <div className="inv-meta-row">
              {schd && (
                <span>
                  {schd.scheduled_date && new Date(schd.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  {schd.scheduled_time && ` · ${schd.scheduled_time.slice(0, 5)}`}
                  {schd.stage_number && ` · Room ${schd.stage_number}`}
                </span>
              )}
              {maxLimit && (
                <span className="inv-limit-badge">Max {maxLimit}/team</span>
              )}
            </div>

            {/* QR Scan button — competition-level */}
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
              <div className="inv-success-card">
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(100,180,100,0.12)', border: '1px solid rgba(100,180,100,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7bc47b' }}>
                  <IcoDone />
                </div>
                <p style={{ fontWeight: 700, fontSize: 15 }}>Report Submitted</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {checkinOrder.length} participants — Code letters assigned {selected?.competition_type === 'stage' ? 'randomly' : 'sequentially'}
                </p>

                {/* Code letter result table */}
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
                {/* Participants list */}
                <p style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 4px 6px' }}>
                  Scan participant QR code to check in.
                </p>
                <div className="inv-participants-list">
                  {participants.map(p => {
                    const isChecked = checkinOrder.includes(p.id)
                    const checkinPos = checkinOrder.indexOf(p.id)
                    return (
                      <div key={p.id} className={`inv-part-row ${isChecked ? 'present' : ''}`}>
                        {/* Circle status indicator instead of checkbox */}
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

                        {/* Code Letter Badge displayed on the right side of the row */}
                        {isChecked && (
                          <span className="inv-code-badge" style={{ fontSize: 11, padding: '4px 8px', minWidth: 'auto', borderRadius: 6 }}>
                            {selected?.competition_type === 'stage' ? `#${checkinPos + 1}` : `Code ${String.fromCharCode(65 + checkinPos)}`}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Submit bar */}
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