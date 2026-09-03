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

export default function ResultPoster({ competition, results = [] }) {
  const codeNumber = competition?.announcementNumber
    ? parseInt(competition.announcementNumber, 10)
    : null

  const [template, setTemplate] = useState(() => {
    // Optimistic initial render from memory/localStorage
    if (cachedTemplates && codeNumber !== null) {
      return cachedTemplates.find(t => matchesResultRange(t.result_range, codeNumber)) || null
    }
    try {
      const local = localStorage.getItem('inspico_poster_templates_cache')
      if (local) {
        const parsed = JSON.parse(local)
        cachedTemplates = parsed
        if (codeNumber !== null) {
          return parsed.find(t => matchesResultRange(t.result_range, codeNumber)) || null
        }
      }
    } catch (_) {}
    return null
  })

  const [loadingTemplate, setLoadingTemplate] = useState(() => !template)
  const [downloading, setDownloading] = useState(false)
  const dynamicRendererRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    async function fetchActiveTemplate() {
      try {
        // Always query Supabase as source of truth to avoid stale or deleted templates
        const { data: allTemplates, error } = await supabase
          .from('poster_templates')
          .select('id, name, html_content, canvas_width, canvas_height, layer_mapping, result_range, is_default, created_at')
          .order('created_at', { ascending: false })

        if (!error && allTemplates) {
          cachedTemplates = allTemplates
          try {
            localStorage.setItem('inspico_poster_templates_cache', JSON.stringify(allTemplates))
          } catch (_) {}

          let matched = null
          if (allTemplates.length > 0 && codeNumber !== null) {
            matched = allTemplates.find(t => matchesResultRange(t.result_range, codeNumber)) || null
          }

          if (isMounted) {
            setTemplate(matched && matched.html_content ? matched : null)
            setLoadingTemplate(false)
          }
          return
        }
      } catch (err) {
        console.error('Error fetching poster templates from Supabase:', err)
      }

      // Offline or network error fallback
      try {
        const localStr = localStorage.getItem('inspico_poster_templates_cache')
        if (localStr) {
          const parsed = JSON.parse(localStr)
          cachedTemplates = parsed
          if (isMounted) {
            const matched = codeNumber !== null ? parsed.find(t => matchesResultRange(t.result_range, codeNumber)) : null
            setTemplate(matched && matched.html_content ? matched : null)
          }
        }
      } catch (_) {}

      if (isMounted) setLoadingTemplate(false)
    }

    fetchActiveTemplate()

    // Realtime listener for template additions / deletions / edits
    const ch = supabase.channel(`rt-templates-${Math.random().toString(36).substring(2, 7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poster_templates' }, () => {
        fetchActiveTemplate()
      })
      .subscribe()

    // Local event listener when admin updates templates in the same session
    const handleLocalUpdate = () => fetchActiveTemplate()
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

