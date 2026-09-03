// src/components/DynamicPosterRenderer.jsx
import React, { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react'
import { toPng } from 'html-to-image'

export function extractTextLayers(htmlContent) {
  if (!htmlContent) return []
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlContent, 'text/html')
    const textDivs = doc.querySelectorAll('[id^="text_"]')
    const layers = []

    textDivs.forEach(div => {
      // Skip if this text container only wraps a <style> or <script> tag
      if (div.querySelector('style') || div.querySelector('script')) return

      const id = div.id
      const innerDiv = div.querySelector('div div') || div.querySelector('div') || div
      const cleanText = innerDiv.textContent.trim()

      // Ignore if text is purely CSS declarations (e.g. starts with # or contains { })
      if (!cleanText || cleanText.startsWith('#el-') || cleanText.includes('{ /') || cleanText.includes('margin:') || cleanText.includes('padding:')) {
        return
      }

      const styleStr = (innerDiv.getAttribute('style') || '') + ' ' + (div.getAttribute('style') || '')

      const fsMatch = styleStr.match(/font-size:\s*(\d+)px/i)
      const fwMatch = styleStr.match(/font-weight:\s*(\w+)/i)
      const lhMatch = styleStr.match(/line-height:\s*([\d.]+)/i)

      const fontSize = fsMatch ? parseInt(fsMatch[1], 10) : 16
      const fontWeight = fwMatch ? fwMatch[1] : 'normal'
      const lineHeight = lhMatch ? parseFloat(lhMatch[1]) : 1.0

      let defaultField = 'static'
      if (/^\d{1,3}$/.test(cleanText) || fontSize >= 90) {
        defaultField = 'code_number'
      } else if (innerDiv.innerHTML.includes('<br') && (lineHeight >= 1.8 && lineHeight <= 2.8 || /Althaf|Name|Participant/i.test(cleanText))) {
        defaultField = 'winners_names'
      } else if (innerDiv.innerHTML.includes('<br') && (lineHeight >= 2.9 || /Zahrawi|Sharqawi|Team/i.test(cleanText))) {
        defaultField = 'winners_teams'
      } else if (/Zone|Senior|Junior|Category/i.test(cleanText) || fontWeight === '300') {
        defaultField = 'category_name'
      } else if (fontWeight === 'bold' || fontWeight === '700' || /Song|Madh|Calligraphy|Essay|Speech|Quiz|Article/i.test(cleanText)) {
        defaultField = 'competition_name'
      }

      layers.push({
        id,
        sampleText: cleanText.replace(/\n/g, ' / '),
        fontSize,
        fontWeight,
        defaultField
      })
    })

    return layers
  } catch (e) {
    console.error('Fast extract error:', e)
    return []
  }
}

// Fast targeted replacement that keeps entire HTML document structure, fonts, and inline CSS intact
// Structure in PSD-to-HTML: <div id="text_X" style="..."> <- outer (absolute position)
//                             <div style="position: relative; ..."> <- middle wrapper
//                               <div style="font-size:...; line-height:..."> <- innermost (TEXT HERE)
//                             </div></div></div>
function replaceLayerText(html, layerId, newText) {
  if (!html) return ''
  const startMarker = `id="${layerId}"`
  const startIdx = html.indexOf(startMarker)
  if (startIdx === -1) return html

  const endBound = startIdx + 1400

  // Skip past the outer div opening tag (the one with id="text_X")
  const outerEnd = html.indexOf('>', startIdx)
  if (outerEnd === -1 || outerEnd > endBound) return html

  // Find the first nested <div> = the middle position:relative wrapper
  const middleDivStart = html.indexOf('<div', outerEnd + 1)
  if (middleDivStart === -1 || middleDivStart > endBound) return html
  const middleEnd = html.indexOf('>', middleDivStart)
  if (middleEnd === -1 || middleEnd > endBound) return html

  // Find the second nested <div> = the innermost text div with font-size, line-height etc.
  const innerDivStart = html.indexOf('<div', middleEnd + 1)
  if (innerDivStart === -1 || innerDivStart > endBound) return html
  const innerOpenEnd = html.indexOf('>', innerDivStart)
  if (innerOpenEnd === -1 || innerOpenEnd > endBound) return html

  // Find the closing </div> of the innermost div
  const innerCloseStart = html.indexOf('</div>', innerOpenEnd + 1)
  if (innerCloseStart === -1 || innerCloseStart > endBound) return html

  // Only replace the text content between innermost div's open tag and its close tag
  return html.substring(0, innerOpenEnd + 1) + newText + html.substring(innerCloseStart)
}

export function replacePosterLayers(html, { compName, catName, codeNum, winnersNamesStr, winnersTeamsStr, winners = [] }, customMapping = {}) {
  if (!html) return ''
  let out = html

  // 1. Direct tag replacements if template contains mustache tags
  out = out
    .replace(/\{\{\s*competition_name\s*\}\}/gi, compName)
    .replace(/\{\{\s*category_name\s*\}\}/gi, catName)
    .replace(/\{\{\s*code_number\s*\}\}/gi, codeNum)
    .replace(/\{\{\s*winners_names\s*\}\}/gi, winnersNamesStr)
    .replace(/\{\{\s*winners_teams\s*\}\}/gi, winnersTeamsStr)
    .replace(/\{\{\s*rank_1_name\s*\}\}/gi, winners[0]?.name || '')
    .replace(/\{\{\s*rank_1_team\s*\}\}/gi, winners[0]?.team || '')
    .replace(/\{\{\s*rank_2_name\s*\}\}/gi, winners[1]?.name || '')
    .replace(/\{\{\s*rank_2_team\s*\}\}/gi, winners[1]?.team || '')
    .replace(/\{\{\s*rank_3_name\s*\}\}/gi, winners[2]?.name || '')
    .replace(/\{\{\s*rank_3_team\s*\}\}/gi, winners[2]?.team || '')

  // 2. Custom layer mapping replacement
  if (customMapping && Object.keys(customMapping).length > 0) {
    Object.entries(customMapping).forEach(([layerId, mappedField]) => {
      let replacement = null
      switch (mappedField) {
        case 'code_number':
          replacement = codeNum
          break
        case 'competition_name':
          replacement = compName
          break
        case 'category_name':
          replacement = catName
          break
        case 'winners_names':
          replacement = winnersNamesStr
          break
        case 'winners_teams':
          replacement = winnersTeamsStr
          break
        case 'rank_1_name':
          replacement = winners[0]?.name || ''
          break
        case 'rank_1_team':
          replacement = winners[0]?.team || ''
          break
        case 'rank_2_name':
          replacement = winners[1]?.name || ''
          break
        case 'rank_2_team':
          replacement = winners[1]?.team || ''
          break
        case 'rank_3_name':
          replacement = winners[2]?.name || ''
          break
        case 'rank_3_team':
          replacement = winners[2]?.team || ''
          break
        default:
          break
      }

      if (replacement !== null) {
        out = replaceLayerText(out, layerId, replacement)
      }
    })
    return out
  }

  // 3. Fallback Auto-Detection if no custom mapping provided
  const layers = extractTextLayers(html)
  layers.forEach(l => {
    let rep = null
    if (l.defaultField === 'code_number') rep = codeNum
    else if (l.defaultField === 'winners_names') rep = winnersNamesStr
    else if (l.defaultField === 'winners_teams') rep = winnersTeamsStr
    else if (l.defaultField === 'category_name') rep = catName
    else if (l.defaultField === 'competition_name') rep = compName

    if (rep) {
      out = replaceLayerText(out, l.id, rep)
    }
  })

  return out
}

const DynamicPosterRenderer = forwardRef(function DynamicPosterRenderer({
  template,
  mockData = null,
  competition = null,
  results = [],
  customMapping = null,
  isHovered = false,
  onDownloadStart,
  onDownloadEnd
}, ref) {
  const containerRef = useRef(null)
  const posterCanvasRef = useRef(null)
  const [scale, setScale] = useState(0.35)
  const [isExporting, setIsExporting] = useState(false)

  const width = template?.canvas_width || 1254
  const height = template?.canvas_height || 1254

  // Measure container and compute proportional scale
  useEffect(() => {
    if (!containerRef.current) return
    const updateScale = () => {
      if (containerRef.current) {
        const availableW = containerRef.current.clientWidth || 300
        setScale(availableW / width)
      }
    }
    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [width])

  // Inject required Google Fonts from template HTML into document.head
  useEffect(() => {
    if (!template?.html_content) return
    const fontMatches = template.html_content.match(/https:\/\/fonts\.googleapis\.com\/css[^\s"'>]+/gi) || []
    fontMatches.forEach(fontUrl => {
      const existing = document.querySelector(`link[href="${fontUrl}"]`)
      if (!existing) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = fontUrl
        document.head.appendChild(link)
      }
    })
  }, [template?.html_content])

  // Prepare dynamic data values
  const compName = competition?.name || mockData?.competition_name || 'Article Preveiw'
  const catName = competition?.categories?.name || mockData?.category_name || 'A ZONE'
  const codeNum = competition?.announcementNumber
    ? String(competition.announcementNumber).padStart(2, '0')
    : mockData?.code_number || '01'

  // Extract top 3 winners (memoized)
  const winners = useMemo(() => {
    let list = []
    if (results && results.length > 0) {
      list = results.slice(0, 3).map((r, idx) => ({
        rank: r.position ? String(r.position).padStart(2, '0') + '.' : `0${idx + 1}.`,
        name: r.participants?.name || 'Participant',
        team: r.participants?.teams?.name || '—'
      }))
    } else if (mockData?.winners) {
      list = [...mockData.winners]
    } else {
      list = [
        { rank: '01.', name: 'Suhail Kp', team: 'Zahrawi' },
        { rank: '02.', name: 'Sinan A', team: 'Zahrawi' },
        { rank: '03.', name: 'Hudaifath', team: 'Zahrawi' }
      ]
    }

    while (list.length < 3) {
      list.push({ rank: `0${list.length + 1}.`, name: '—', team: '—' })
    }
    return list
  }, [results, mockData?.winners])

  // Generate dynamic HTML by binding placeholders and layer mapping (memoized to avoid expensive regex on large HTML)
  const activeMapping = customMapping || template?.layer_mapping || {}

  const processedHtml = useMemo(() => {
    const winnersNamesStr = winners.map(w => w.name).join('<br />')
    const winnersTeamsStr = winners.map(w => w.team).join('<br />')

    let baseHtml = template?.html_content || ''
    if (isHovered) {
      baseHtml = baseHtml.replace(/color:\s*(rgb\(255,\s*255,\s*255\)|#ffffff|#fff|white)/gi, 'color: #f7c948')
      baseHtml = baseHtml.replace(/color:\s*(rgb\(0,\s*0,\s*0\)|#000000|#000|black)/gi, 'color: #3b82f6')
    }

    return replacePosterLayers(
      baseHtml,
      {
        compName,
        catName,
        codeNum,
        winnersNamesStr,
        winnersTeamsStr,
        winners
      },
      activeMapping
    )
  }, [template?.html_content, compName, catName, codeNum, winners, activeMapping, isHovered])

  // Export high-res PNG handler
  const handleExportPng = async (e) => {
    if (e) e.stopPropagation()
    if (!posterCanvasRef.current || isExporting) return

    try {
      setIsExporting(true)
      if (onDownloadStart) onDownloadStart()
      if (document.fonts) {
        await document.fonts.ready
      }

      const dataUrl = await toPng(posterCanvasRef.current, {
        cacheBust: true,
        pixelRatio: 1,
        width: width,
        height: height,
        backgroundColor: '#ffffff',
        style: {
          transform: 'none',
          position: 'static',
          display: 'block'
        }
      })

      const link = document.createElement('a')
      const cleanName = compName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      link.download = `${cleanName || 'result'}-poster.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Failed to export poster PNG:', err)
      alert('Could not export poster image. Please try again.')
    } finally {
      setIsExporting(false)
      if (onDownloadEnd) onDownloadEnd()
    }
  }

  useImperativeHandle(ref, () => ({
    exportPng: handleExportPng,
    isExporting
  }))

  return (
    <div className="dyn-poster-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Viewport Box */}
      <div
        ref={containerRef}
        className="dyn-poster-viewport"
        style={{
          width: '100%',
          maxWidth: width * scale,
          height: height * scale,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 8,
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          background: '#111827'
        }}
      >
        <div
          style={{
            width: width,
            height: height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        >
          <div
            ref={posterCanvasRef}
            className="dyn-poster-canvas"
            style={{ width: width, height: height, position: 'relative', overflow: 'hidden', backgroundColor: '#ffffff' }}
            dangerouslySetInnerHTML={{ __html: processedHtml }}
          />
        </div>
      </div>
    </div>
  )
})

export default React.memo(DynamicPosterRenderer)
