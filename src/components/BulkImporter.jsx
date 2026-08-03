// src/components/BulkImporter.jsx
// Reusable CSV bulk import widget
// Props:
//   columns       : [{ key, label }]  — CSV column definitions
//   sampleRows    : string[][]        — sample data for template preview
//   onImport      : async (rows) => { imported, errors }
//   disabled      : bool

import { useState, useRef } from 'react'
import './BulkImporter.css'

const IconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round" className="drop-zone-icon">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
)

const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round">
    <polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/>
  </svg>
)

// Minimal CSV parser (handles quoted fields)
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  return lines.map(line => {
    const row = []
    let cur = '', inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { row.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    row.push(cur.trim())
    return row
  })
}

function downloadTemplate(columns, sampleRows = [], filename = 'template.csv') {
  const header = columns.map(c => c.label).join(',')
  const formattedRows = sampleRows.map(row => {
    if (Array.isArray(row)) {
      return row.map(cell => {
        const str = String(cell ?? '')
        return str.includes(',') || str.includes('\n') || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    } else if (row && typeof row === 'object') {
      return columns.map(col => {
        const cell = row[col.key] ?? row[col.label] ?? ''
        const str = String(cell ?? '')
        return str.includes(',') || str.includes('\n') || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    }
    return ''
  }).filter(Boolean)

  const csv = [header, ...formattedRows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    if (a.parentNode) document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 300)
}

const CHUNK = 50

export default function BulkImporter({ columns, sampleRows, onImport, disabled, filename = 'template.csv' }) {
  const [rows, setRows] = useState(null)       // parsed CSV rows (excluding header)
  const [headers, setHeaders] = useState([])   // detected headers
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)   // { imported, errors }
  const [errors, setErrors] = useState([])
  const fileRef = useRef()

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const all = parseCSV(e.target.result)
      if (all.length < 2) return
      setHeaders(all[0].map(h => h.toLowerCase().replace(/\s+/g, '_')))
      setRows(all.slice(1).filter(r => r.some(c => c.trim())))
      setResult(null); setProgress(0); setErrors([])
    }
    reader.readAsText(file)
  }

  function clearFile() {
    setRows(null); setHeaders([]); setResult(null); setProgress(0); setErrors([])
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleImport() {
    if (!rows?.length) return
    setImporting(true); setErrors([]); setResult(null)

    let imported = 0; const errs = []
    const total = rows.length

    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      const mapped = chunk.map(row => {
        const obj = {}
        columns.forEach((col) => {
          // Find matching index from detected CSV headers (case-insensitive, strip spaces)
          const headerIdx = headers.findIndex(h => {
            const cleanH = h.trim().toLowerCase()
            const cleanKey = (col.key || '').trim().toLowerCase()
            const cleanLabel = (col.label || '').trim().toLowerCase().replace(/\s+/g, '_')
            return cleanH === cleanKey || cleanH === cleanLabel || cleanH.startsWith(cleanKey)
          })
          // Only use header-based index; if not found, empty string (no position fallback to avoid column shift)
          obj[col.key] = headerIdx !== -1 ? (row[headerIdx] ?? '') : ''
        })

        // Also preserve raw header keys in object for custom handler lookups
        headers.forEach((h, hIdx) => {
          if (obj[h] === undefined) {
            obj[h] = row[hIdx] ?? ''
          }
        })

        return obj
      })

      const { imported: n, errors: errs2 } = await onImport(mapped)
      imported += n
      errs.push(...errs2)
      setProgress(Math.round(((i + chunk.length) / total) * 100))
    }

    setImporting(false)
    setResult({ imported, errors: errs.length })
    setErrors(errs)
  }

  const PREVIEW_MAX = 8

  return (
    <div>
      {!rows ? (
        /* ── Drop Zone ── */
        <div>
          <div
            className={`drop-zone ${dragging ? 'dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={e => handleFile(e.target.files[0])}
            />
            <IconUpload />
            <p className="drop-zone-title">Drop CSV file here</p>
            <p className="drop-zone-hint">or click to browse · .csv or .txt</p>
          </div>

          {/* Template */}
          <div className="csv-template" style={{ marginTop: 16 }}>
            <p className="csv-template-label">Expected Format</p>
            <code className="csv-template-code">
              {columns.map(c => c.label).join(',')}
            </code>
            <button className="btn-download-template" type="button"
              onClick={() => downloadTemplate(columns, sampleRows, filename)}>
              <IconDownload />
              Download Template
            </button>
          </div>
        </div>
      ) : (
        /* ── Preview ── */
        <div>
          <div className="preview-header">
            <span className="preview-count">{rows.length} rows ready to import</span>
            <button className="btn-clear-file" type="button" onClick={clearFile}>✕ Clear</button>
          </div>

          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead>
                <tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, PREVIEW_MAX).map((row, i) => (
                  <tr key={i}>
                    {columns.map((c, j) => <td key={c.key}>{row[j] || <span style={{ opacity: 0.4 }}>—</span>}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > PREVIEW_MAX && (
              <p className="preview-more">…and {rows.length - PREVIEW_MAX} more rows</p>
            )}
          </div>

          {importing && (
            <div className="import-progress-wrap">
              <div className="import-progress-label">
                <span>Importing…</span>
                <span>{progress}%</span>
              </div>
              <div className="import-progress-bar">
                <div className="import-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {result && (
            <div>
              <p className="form-success" style={{ marginBottom: 6 }}>
                ✓ {result.imported} rows imported successfully
                {result.errors > 0 && ` · ${result.errors} failed`}
              </p>
              {errors.length > 0 && (
                <div className="import-errors">
                  {errors.map((e, i) => <span key={i}>Row {e.row}: {e.msg}</span>)}
                </div>
              )}
            </div>
          )}

          {!result && (
            <button className="btn-submit" type="button" onClick={handleImport} disabled={importing || disabled}>
              {importing ? <span className="spin" /> : null}
              {importing ? `Importing ${progress}%…` : `Import ${rows.length} Rows`}
            </button>
          )}

          {result && (
            <button className="btn-submit" type="button"
              onClick={clearFile}
              style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', marginTop: 8 }}>
              Import More
            </button>
          )}
        </div>
      )}
    </div>
  )
}
