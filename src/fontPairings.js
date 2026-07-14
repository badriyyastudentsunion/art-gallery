// src/fontPairings.js

export const FONT_PAIRINGS = [
  {
    id: 'editorial',
    name: 'Classic Editorial',
    desc: 'Editorial luxury',
    heading: "'Cormorant Garamond', Georgia, serif",
    body: "'Jost', sans-serif",
    headingStyle: 'italic',
    headingWeight: '600',
  },
  {
    id: 'minimalist',
    name: 'Modern Minimalist',
    desc: 'Clean & high-tech',
    heading: "'Syncopate', sans-serif",
    body: "'Plus Jakarta Sans', sans-serif",
    headingStyle: 'normal',
    headingWeight: '700',
  },
  {
    id: 'heritage',
    name: 'Sophisticated Heritage',
    desc: 'Roman engraving feel',
    heading: "'Cinzel', serif",
    body: "'Montserrat', sans-serif",
    headingStyle: 'normal',
    headingWeight: '600',
  },
  {
    id: 'artistic',
    name: 'Artistic & Crafted',
    desc: 'Expressive elegance',
    heading: "'Playfair Display', serif",
    body: "'Outfit', sans-serif",
    headingStyle: 'italic',
    headingWeight: '700',
  },
  {
    id: 'contemporary',
    name: 'Bold Contemporary',
    desc: 'Artistic post-modern',
    heading: "'Syne', sans-serif",
    body: "'Inter', sans-serif",
    headingStyle: 'normal',
    headingWeight: '800',
  },
  {
    id: 'gothic',
    name: 'Neo-Gothic Ornate',
    desc: 'Mystical & decorated',
    heading: "'Cinzel Decorative', serif",
    body: "'Jost', sans-serif",
    headingStyle: 'normal',
    headingWeight: '700',
  },
  {
    id: 'abstract',
    name: 'Abstract Art Deco',
    desc: 'Geometric poster art',
    heading: "'Righteous', sans-serif",
    body: "'Space Grotesk', sans-serif",
    headingStyle: 'normal',
    headingWeight: '400',
  },
  {
    id: 'italian',
    name: 'Delicate Italian',
    desc: 'High fashion & fine art',
    heading: "'Italiana', serif",
    body: "'DM Sans', sans-serif",
    headingStyle: 'normal',
    headingWeight: '400',
  },
  {
    id: 'highcontrast',
    name: 'High-Contrast Display',
    desc: 'Dramatic & bold statement',
    heading: "'Abril Fatface', serif",
    body: "'Cabin', sans-serif",
    headingStyle: 'normal',
    headingWeight: '400',
  },
  {
    id: 'brutalist',
    name: 'Futuristic Brutalist',
    desc: 'Cyberpunk gallery feel',
    heading: "'Share Tech Mono', monospace",
    body: "'Sora', sans-serif",
    headingStyle: 'normal',
    headingWeight: '400',
  },
]

export function applyFontPairing(pairing) {
  const root = document.documentElement
  root.style.setProperty('--font-heading', pairing.heading)
  root.style.setProperty('--font-body', pairing.body)
  root.style.setProperty('--font-heading-style', pairing.headingStyle)
  root.style.setProperty('--font-heading-weight', pairing.headingWeight)
  localStorage.setItem('ag_font_pairing', pairing.id)
}

export function getSavedFontPairing() {
  return localStorage.getItem('ag_font_pairing') || 'editorial'
}
