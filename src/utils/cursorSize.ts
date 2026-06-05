// --- Accessible (large) mouse cursor support ---
//
// Renders a scaled custom cursor (arrow + hand pointer) as inline-SVG data URIs
// and applies it globally via an injected <style> tag. Browsers cap custom
// cursors at ~128px, so that is our max. A size of 0 means "system default"
// (no override), which removes the injected style entirely.

export const CURSOR_SIZE_KEY = 'cursorSize'
export const DEFAULT_CURSOR_SIZE = 0
export const MAX_CURSOR_SIZE = 128

export interface CursorSizeOption {
  label: string
  value: number
}

// 0 = system default. The others go up to the browser's 128px hard cap.
export const CURSOR_SIZES: CursorSizeOption[] = [
  { label: 'Normal (system)', value: 0 },
  { label: 'Large', value: 48 },
  { label: 'Extra Large', value: 80 },
  { label: 'Huge', value: 112 },
  { label: 'Maximum', value: MAX_CURSOR_SIZE }
]

const STYLE_ELEMENT_ID = 'clickomator-cursor-size'

// Classic arrow, tip anchored at the top-left (viewBox origin) so the hotspot
// is (0, 0). White fill + black outline keeps it visible on the app's dark UI.
const arrowSvg = (size: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 22">` +
  `<path d="M0 0 L0 19 L5 14 L8.5 21 L11.5 19.6 L8 13 L15 13 Z" ` +
  `fill="#ffffff" stroke="#000000" stroke-width="1" stroke-linejoin="round"/></svg>`

// Pointing hand silhouette, fingertip near (9, 1) in the viewBox.
const handSvg = (size: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">` +
  `<path fill="#ffffff" stroke="#000000" stroke-width="1" stroke-linejoin="round" d="` +
  `M9 1 c-1.1 0-2 .9-2 2 v9.6 l-1.8-1.8 c-.8-.8-2-.8-2.8 0 c-.7 .7-.8 1.9-.1 2.7 ` +
  `l4.8 6 c.8 1 2 1.5 3.3 1.5 h4.6 c1.7 0 3.2-1.2 3.5-2.9 l.9-4.7 ` +
  `c.2-1.2-.6-2.3-1.8-2.5 c-.3-.1-.7 0-1 .1 c-.1-1-.9-1.8-2-1.8 c-.4 0-.7 .1-1 .3 ` +
  `c-.3-.8-1-1.3-1.9-1.3 c-.2 0-.5 0-.7 .1 V3 c0-1.1-.9-2-2-2 Z"/></svg>`

const dataUri = (svg: string) =>
  `data:image/svg+xml,${encodeURIComponent(svg)}`

export function normalizeCursorSize(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.min(Math.round(value), MAX_CURSOR_SIZE)
}

export function getStoredCursorSize(): number {
  const stored = localStorage.getItem(CURSOR_SIZE_KEY)
  return stored ? normalizeCursorSize(parseInt(stored, 10)) : DEFAULT_CURSOR_SIZE
}

/**
 * Applies the cursor size globally by injecting (or removing) a <style> tag.
 * Mutates the document directly, so a single call affects the whole app.
 */
export function applyCursorSize(rawSize: number): void {
  if (typeof document === 'undefined') return

  const size = normalizeCursorSize(rawSize)
  const existing = document.getElementById(STYLE_ELEMENT_ID)

  // 0 -> system default: tear down any override.
  if (size === 0) {
    existing?.remove()
    return
  }

  const arrow = dataUri(arrowSvg(size))
  const hand = dataUri(handSvg(size))
  // Hotspots, derived from each SVG's viewBox.
  const handX = Math.round((size * 9) / 24)
  const handY = Math.round((size * 1) / 24)

  const css =
    `*, *::before, *::after { cursor: url("${arrow}") 0 0, auto !important; }\n` +
    `a, button, [role="button"], [role="menuitem"], [role="tab"], [role="option"], ` +
    `select, summary, label[for], input[type="checkbox"], input[type="radio"], ` +
    `input[type="range"], .cursor-pointer, [data-cursor="pointer"] ` +
    `{ cursor: url("${hand}") ${handX} ${handY}, pointer !important; }`

  const style =
    (existing as HTMLStyleElement | null) ?? document.createElement('style')
  style.id = STYLE_ELEMENT_ID
  style.textContent = css
  if (!existing) document.head.appendChild(style)
}

/** Persists the chosen size and applies it immediately. */
export function setStoredCursorSize(rawSize: number): void {
  const size = normalizeCursorSize(rawSize)
  localStorage.setItem(CURSOR_SIZE_KEY, size.toString())
  applyCursorSize(size)
}
