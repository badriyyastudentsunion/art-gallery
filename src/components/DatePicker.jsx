import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './DatePicker.css'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

export default function DatePicker({ value, onChange, placeholder = "Select date", style }) {
  const [open, setOpen] = useState(false)
  
  // parsing value (YYYY-MM-DD)
  const selectedDate = value ? new Date(value) : null
  const [viewDate, setViewDate] = useState(selectedDate || new Date())
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const ref = useRef(null)
  const popoverRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target) && (!popoverRef.current || !popoverRef.current.contains(e.target))) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const handlePrev = (e) => {
    e.stopPropagation()
    setViewDate(new Date(year, month - 1, 1))
  }
  
  const handleNext = (e) => {
    e.stopPropagation()
    setViewDate(new Date(year, month + 1, 1))
  }

  const handleSelect = (d, e) => {
    e.stopPropagation()
    const m = String(month + 1).padStart(2, '0')
    const day = String(d).padStart(2, '0')
    onChange(`${year}-${m}-${day}`)
    setOpen(false)
  }

  const toggleOpen = (e) => {
    e.stopPropagation()
    if (!open) {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        setCoords({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX })
      }
      if (selectedDate) setViewDate(new Date(selectedDate))
      setOpen(true)
    } else {
      setOpen(false)
    }
  }

  const blanks = Array.from({ length: firstDay })
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const displayDate = selectedDate ? selectedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

  return (
    <div className="custom-datepicker" ref={ref} style={style}>
      <div className="custom-datepicker-input" onClick={toggleOpen}>
        <span style={{ color: displayDate ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {displayDate || placeholder}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {value && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              style={{ width: 13, height: 13, opacity: 0.6, cursor: 'pointer' }}
              onMouseEnter={(e) => e.target.style.opacity = 1}
              onMouseLeave={(e) => e.target.style.opacity = 0.6}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
      </div>
      
      {open && createPortal(
        <div 
          className="custom-datepicker-popover" 
          ref={popoverRef}
          style={{ top: coords.top + 4, left: coords.left }}
          onClick={e => e.stopPropagation()}
        >
          <div className="custom-datepicker-header">
            <button type="button" onClick={handlePrev}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div className="custom-datepicker-month">{MONTHS[month]} {year}</div>
            <button type="button" onClick={handleNext}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <div className="custom-datepicker-grid">
            {DAYS.map(d => <div key={d} className="custom-datepicker-day-name">{d}</div>)}
            {blanks.map((_, i) => <div key={`blank-${i}`} className="custom-datepicker-cell empty" />)}
            {days.map(d => {
              const isSelected = selectedDate && selectedDate.getDate() === d && selectedDate.getMonth() === month && selectedDate.getFullYear() === year
              const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year
              return (
                <div 
                  key={d} 
                  className={`custom-datepicker-cell ${isSelected ? 'selected' : ''} ${isToday && !isSelected ? 'today' : ''}`}
                  onClick={(e) => handleSelect(d, e)}
                >
                  {d}
                </div>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
