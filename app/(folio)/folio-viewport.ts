/** Visible frame — visualViewport when it diverges (iOS keyboard / URL bar). */
export function folioViewport() {
  const vv = window.visualViewport
  return {
    width: vv?.width ?? window.innerWidth,
    height: vv?.height ?? window.innerHeight,
    top: vv?.offsetTop ?? 0,
    left: vv?.offsetLeft ?? 0,
  }
}

/** On-screen keyboard — not hardware focus. Desktop inset stays ~0. */
export const FOLIO_KEYBOARD_INSET = 120

type Listener = () => void

const listeners = new Set<Listener>()
let restHeight = 0
let attached = false
let detachBus: (() => void) | null = null

function page() {
  return document.querySelector('.folio-page')
}

/** Keep dock + session shell pinned to the visible band. */
export function syncFolioVisualViewport() {
  const root = page()
  if (!(root instanceof HTMLElement)) return
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  const top = vv?.offsetTop ?? 0
  const bottom = top + height
  // iOS often shrinks window.innerHeight with the keyboard, so
  // innerHeight − vv.bottom stays ~0. Diff against a resting vv height instead.
  if (height >= restHeight - 1) restHeight = height
  else if (restHeight - height < FOLIO_KEYBOARD_INSET) restHeight = height
  const inset = Math.max(0, restHeight - height)
  root.style.setProperty('--folio-vv-inset-bottom', `${inset}px`)
  root.style.setProperty('--folio-vv-height', `${height}px`)
  root.style.setProperty('--folio-vv-top', `${top}px`)
  root.style.setProperty('--folio-vv-bottom', `${bottom}px`)
  if (inset >= FOLIO_KEYBOARD_INSET) root.dataset.folioKeyboard = 'true'
  else delete root.dataset.folioKeyboard
}

export function folioKeyboardOpen() {
  return Boolean(page()?.hasAttribute('data-folio-keyboard'))
}

function attach() {
  if (attached || typeof window === 'undefined') return
  attached = true
  const run = () => {
    syncFolioVisualViewport()
    for (const fn of [...listeners]) fn()
  }
  const onOrient = () => {
    restHeight = 0
    run()
  }
  const vv = window.visualViewport
  window.addEventListener('resize', run)
  window.addEventListener('orientationchange', onOrient)
  vv?.addEventListener('resize', run)
  vv?.addEventListener('scroll', run)
  detachBus = () => {
    window.removeEventListener('resize', run)
    window.removeEventListener('orientationchange', onOrient)
    vv?.removeEventListener('resize', run)
    vv?.removeEventListener('scroll', run)
    attached = false
    detachBus = null
  }
}

/**
 * One window / visualViewport binding for the folio shell.
 * Imperative sync still works with zero subscribers.
 */
export function bindFolioVisualViewport(onChange?: Listener) {
  attach()
  syncFolioVisualViewport()
  if (onChange) {
    listeners.add(onChange)
    onChange()
  }
  return () => {
    if (onChange) listeners.delete(onChange)
    if (listeners.size === 0) detachBus?.()
  }
}
