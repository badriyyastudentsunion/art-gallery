// src/components/ResultPoster.jsx
import React, { useRef, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import DynamicPosterRenderer from './DynamicPosterRenderer'
import './ResultPoster.css'

/**
 * Checks if a given number matches a comma-separated range string.
 * Supports: "1-10, 30-40", "5, 12, 20-25", "all", "*" etc.
 */
export function matchesResultRange(rangeStr, num) {
  if (!rangeStr || !rangeStr.trim()) return false
  const cleanStr = rangeStr.trim().toLowerCase()
  if (cleanStr === 'all' || cleanStr === '*') return true
  if (num === null || num === undefined || isNaN(num)) return false

  const target = parseInt(num, 10)
  const parts = cleanStr.split(',').map(s => s.trim()).filter(Boolean)

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim())
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.min(start, end)
        const max = Math.max(start, end)
        if (target >= min && target <= max) return true
      }
    } else {
      const single = parseInt(part, 10)
      if (!isNaN(single) && single === target) return true
    }
  }

  return false
}

// In-memory cache across component mounts for instant zero-latency renders
let cachedTemplates = null
let lastMetadataSyncTime = 0
let inFlightSyncPromise = null

function getLocalTemplates() {
  if (cachedTemplates) return cachedTemplates
  try {
    const local = localStorage.getItem('inspico_poster_templates_cache')
    if (local) {
      cachedTemplates = JSON.parse(local)
      return cachedTemplates
    }
  } catch (_) {}
  return null
}

/**
 * Smart Metadata Sync:
 * Queries ONLY lightweight metadata (~100 bytes: id, updated_at, result_range, is_default).
 * If remote metadata matches local cache, it uses cached HTML with 0 BYTES heavy egress!
 * If Admin edited, renamed, or deleted a template, it pulls the full template data immediately.
 */
async function syncTemplatesWithRemote(forceFull = false) {
  if (inFlightSyncPromise) return inFlightSyncPromise

  inFlightSyncPromise = (async () => {
    try {
      const currentCache = getLocalTemplates()
      const now = Date.now()

      // If we synced within the last 15s and have valid cache, skip network check
      if (!forceFull && currentCache && (now - lastMetadataSyncTime < 15000)) {
        return currentCache
      }

      // Step 1: Lightweight check (only 100 bytes)
      const { data: remoteMeta, error: metaErr } = await supabase
        .from('poster_templates')
        .select('id, result_range, is_default, updated_at')
        .order('created_at', { ascending: false })

      if (metaErr) throw metaErr

      lastMetadataSyncTime = Date.now()
      const remotes = remoteMeta || []

      // If length matches, check if every template updated_at and range matches
      if (!forceFull && currentCache && currentCache.length === remotes.length) {
        let isIdentical = true
        for (const r of remotes) {
          const cached = currentCache.find(c => c.id === r.id)
          if (!cached || cached.updated_at !== r.updated_at || cached.result_range !== r.result_range || cached.is_default !== r.is_default) {
            isIdentical = false
            break
          }
        }

        if (isIdentical) {
          // Cache is 100% verified & fresh! 0 bytes heavy egress!
          return currentCache
        }
      }

      // Step 2: Only if metadata changed or no cache, download full template content
      const { data: fullTemplates, error: fullErr } = await supabase
        .from('poster_templates')
        .select('id, name, html_content, canvas_width, canvas_height, layer_mapping, result_range, is_default, updated_at, created_at')
        .order('created_at', { ascending: false })

      if (!fullErr && fullTemplates) {
        cachedTemplates = fullTemplates
        try {
          localStorage.setItem('inspico_poster_templates_cache', JSON.stringify(fullTemplates))
          localStorage.setItem('inspico_poster_templates_version', Date.now().toString())
        } catch (_) {}
        return fullTemplates
      }
    } catch (err) {
      console.warn('Smart template sync error, using fallback cache:', err)
    } finally {
      inFlightSyncPromise = null
    }

    return getLocalTemplates() || []
  })()

  return inFlightSyncPromise
}

export default function ResultPoster({ competition, results = [] }) {
  const codeNumber = competition?.announcementNumber
    ? parseInt(competition.announcementNumber, 10)
    : null

  const [template, setTemplate] = useState(() => {
    // Instant optimistic render from memory / localStorage
    const tpls = getLocalTemplates()
    if (tpls && codeNumber !== null) {
      return tpls.find(t => matchesResultRange(t.result_range, codeNumber)) || null
    }
    return null
  })

  const [loadingTemplate, setLoadingTemplate] = useState(() => !template)
  const [downloading, setDownloading] = useState(false)
  const dynamicRendererRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    async function ensureFreshTemplate(forceFull = false) {
      const allTemplates = await syncTemplatesWithRemote(forceFull)
      if (!isMounted) return

      let matched = null
      if (allTemplates && allTemplates.length > 0 && codeNumber !== null) {
        matched = allTemplates.find(t => matchesResultRange(t.result_range, codeNumber)) || null
      }

      setTemplate(matched && matched.html_content ? matched : null)
      setLoadingTemplate(false)
    }

    ensureFreshTemplate()

    // Listen for postgres changes on poster_templates table
    const ch = supabase.channel(`rt-templates-${Math.random().toString(36).substring(2, 7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poster_templates' }, () => {
        ensureFreshTemplate(true)
      })
      .subscribe()

    // Instant local listener when admin updates templates in the same browser session
    const handleLocalUpdate = () => ensureFreshTemplate(true)
    window.addEventListener('poster_templates_updated', handleLocalUpdate)

    return () => {
      isMounted = false
      supabase.removeChannel(ch)
      window.removeEventListener('poster_templates_updated', handleLocalUpdate)
    }
  }, [codeNumber])

  // If no template uploaded/found, return null gracefully
  if (!loadingTemplate && !template) {
    return null
  }

  const handleDownload = async (e) => {
    if (e) e.stopPropagation()
    if (downloading || !dynamicRendererRef.current) return
    try {
      setDownloading(true)
      await dynamicRendererRef.current.exportPng()
    } catch (err) {
      console.error('Download error:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="result-poster-wrapper">
      {loadingTemplate ? (
        <div
          style={{
            width: '100%',
            maxWidth: 480,
            aspectRatio: '1 / 1',
            background: 'linear-gradient(135deg, rgba(247,201,72,0.04) 0%, rgba(13,17,23,0.95) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid rgba(247,201,72,0.3)',
              borderTopColor: '#f7c948',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Loading poster...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          <div style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
            <DynamicPosterRenderer
              ref={dynamicRendererRef}
              template={template}
              competition={competition}
              results={results}
              customMapping={template.layer_mapping}
            />
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
                <span>Download Result Poster</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  )
}

