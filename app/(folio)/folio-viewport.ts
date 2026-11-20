/** Visible frame — visualViewport when it diverges (iOS keyboard / URL bar). */
export function folioViewport() {
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  const top = vv?.offsetTop ?? 0
  const left = vv?.offsetLeft ?? 0
  const width = vv?.width ?? window.innerWidth
  // Match syncFolioVisualViewport: keyboard shrinks inset only — layout stays at rest.
  const liveRest = restHeight || height
  const inset = Math.max(0, liveRest - height)
  if (inset >= KEYBOARD_INSET_MIN) {
    return {
      width: window.innerWidth,
      height: liveRest,
      top: restTop,
      left: 0,
    }
  }
  return { width, height, top, left }
}

/** Ignore tiny URL-bar jitter when tracking resting height. */
const REST_HEIGHT_SLACK = 120
/** Inset at/above this is treated as the software keyboard (not URL-bar chrome). */
const KEYBOARD_INSET_MIN = REST_HEIGHT_SLACK

type Listener = () => void

const listeners = new Set<Listener>()
let restHeight = 0
let restTop = 0
let attached = false
let detachBus: (() => void) | null = null

function page() {
  return document.querySelector('.folio-page')
}

/**
 * Dock rides `--folio-vv-inset-bottom`. Layout vars (`height` / `top` / `bottom`)
 * freeze while the keyboard is open so orbit, session shell, and cards don’t reflow.
 */
export function syncFolioVisualViewport() {
  const root = page()
  if (!(root instanceof HTMLElement)) return
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  const top = vv?.offsetTop ?? 0
  // iOS often shrinks window.innerHeight with the keyboard, so
  // innerHeight − vv.bottom stays ~0. Diff against a resting vv height instead.
  if (height >= restHeight - 1) restHeight = height
  else if (restHeight - height < REST_HEIGHT_SLACK) restHeight = height

  const inset = Math.max(0, restHeight - height)
  const keyboardOpen = inset >= KEYBOARD_INSET_MIN
  if (!keyboardOpen) restTop = top

  const layoutHeight = keyboardOpen ? restHeight : height
  const layoutTop = keyboardOpen ? restTop : top
  const layoutBottom = layoutTop + layoutHeight

  root.style.setProperty('--folio-vv-inset-bottom', `${inset}px`)
  root.style.setProperty('--folio-vv-height', `${layoutHeight}px`)
  root.style.setProperty('--folio-vv-top', `${layoutTop}px`)
  root.style.setProperty('--folio-vv-bottom', `${layoutBottom}px`)
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
    restTop = 0
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
