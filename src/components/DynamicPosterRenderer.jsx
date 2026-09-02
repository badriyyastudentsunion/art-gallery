// src/components/DynamicPosterRenderer.jsx
import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { toPng } from 'html-to-image'

export function extractTextLayers(htmlContent) {
  if (!htmlContent) return []
  const layers = []
  
  // Find all <div id="text_X"...> blocks
  const layerBlockRegex = /<div\s+id=["'](text_\d+)["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi
  let match

  while ((match = layerBlockRegex.exec(htmlContent)) !== null) {
    const id = match[1]
    const fullBlock = match[0]

    // Extract styles from innermost text div
    const fsMatch = fullBlock.match(/font-size:\s*(\d+)px/i)
    const fwMatch = fullBlock.match(/font-weight:\s*(\w+)/i)
    const lhMatch = fullBlock.match(/line-height:\s*([\d.]+)/i)

    const fontSize = fsMatch ? parseInt(fsMatch[1], 10) : 16
    const fontWeight = fwMatch ? fwMatch[1] : 'normal'
    const lineHeight = lhMatch ? parseFloat(lhMatch[1]) : 1.0

    // Extract raw text inside innermost tags
    const cleanText = fullBlock
      .replace(/<[^>]+>/g, '\n')
      .replace(/\n+/g, '\n')
      .trim()

    let defaultField = 'static'
    if (/^\d{1,3}$/.test(cleanText) || fontSize >= 90) {
      defaultField = 'code_number'
    } else if (fullBlock.includes('<br') && (lineHeight >= 1.8 && lineHeight <= 2.8 || /Althaf|Name|Participant/i.test(cleanText))) {
      defaultField = 'winners_names'
    } else if (fullBlock.includes('<br') && (lineHeight >= 2.9 || /Zahrawi|Sharqawi|Team/i.test(cleanText))) {
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
  }
  return layers
}

// Replace ONLY the text content inside the innermost div of a text layer, keeping all CSS intact
function replaceLayerText(html, layerId, newText) {
  // Regex that targets: <div id="text_X" ...><div ...><div style="...">OLD_CONTENT</div></div></div>
  const layerRegex = new RegExp(
    `(<div\\s+id=["']${layerId}["'][^>]*>[\\s\\S]*?<div[^>]*>[\\s\\S]*?<div[^>]*style=["'][^"']*["'][^>]*>)([\\s\\S]*?)(<\\/div>\\s*<\\/div>\\s*<\\/div>)`,
    'i'
  )
  return html.replace(layerRegex, `$1${newText}$3`)
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

  // Prepare dynamic data values
  const compName = competition?.name || mockData?.competition_name || 'Article Preveiw'
  const catName = competition?.categories?.name || mockData?.category_name || 'A ZONE'
  const codeNum = competition?.announcementNumber
    ? String(competition.announcementNumber).padStart(2, '0')
    : mockData?.code_number || '01'

  // Extract top 3 winners
  let winners = []
  if (results && results.length > 0) {
    winners = results.slice(0, 3).map((r, idx) => ({
      rank: r.position ? String(r.position).padStart(2, '0') + '.' : `0${idx + 1}.`,
      name: r.participants?.name || 'Participant',
      team: r.participants?.teams?.name || '—'
    }))
  } else if (mockData?.winners) {
    winners = mockData.winners
  } else {
    winners = [
      { rank: '01.', name: 'Suhail Kp', team: 'Zahrawi' },
      { rank: '02.', name: 'Sinan A', team: 'Zahrawi' },
      { rank: '03.', name: 'Hudaifath', team: 'Zahrawi' }
    ]
  }

  while (winners.length < 3) {
    winners.push({ rank: `0${winners.length + 1}.`, name: '—', team: '—' })
  }

  const winnersNamesStr = winners.map(w => w.name).join('<br />')
  const winnersTeamsStr = winners.map(w => w.team).join('<br />')

  // Generate dynamic HTML by binding placeholders and layer mapping
  const activeMapping = customMapping || template?.layer_mapping || {}

  const processedHtml = replacePosterLayers(
    template?.html_content || '',
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
        pixelRatio: 2,
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

export default DynamicPosterRenderer
