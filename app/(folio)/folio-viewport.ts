/** Visible frame — visualViewport when it diverges (iOS keyboard / URL bar). */
export function folioViewport() {
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  const top = vv?.offsetTop ?? 0
  const left = vv?.offsetLeft ?? 0
  const width = vv?.width ?? window.innerWidth
  // Match syncFolioVisualViewport: keyboard shrinks dock gap only — layout stays at rest.
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
let layoutHeightWritten = -1
let layoutTopWritten = -1
let attached = false
let detachBus: (() => void) | null = null

function page() {
  return document.querySelector('.folio-page')
}

/**
 * Two buses on one vv tick:
 * - Layout (`--folio-vv-height/top/bottom`) freezes while the keyboard is open.
 * - Dock (`--folio-dock-bottom`) always tracks the live visible bottom edge.
 * Layout listeners only run when layout vars change — not on pure keyboard ticks.
 */
export function syncFolioVisualViewport() {
  const root = page()
  if (!(root instanceof HTMLElement)) return false
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  const top = vv?.offsetTop ?? 0
  const layoutInnerHeight = window.innerHeight
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
  // Gap under the visible band — accounts for offsetTop when Safari shifts the page.
  const dockBottom = Math.max(0, layoutInnerHeight - (top + height))

  root.style.setProperty('--folio-dock-bottom', `${dockBottom}px`)

  const layoutChanged =
    layoutHeight !== layoutHeightWritten || layoutTop !== layoutTopWritten
  if (layoutChanged) {
    layoutHeightWritten = layoutHeight
    layoutTopWritten = layoutTop
    root.style.setProperty('--folio-vv-height', `${layoutHeight}px`)
    root.style.setProperty('--folio-vv-top', `${layoutTop}px`)
    root.style.setProperty('--folio-vv-bottom', `${layoutBottom}px`)
  }
  return layoutChanged
}

function attach() {
  if (attached || typeof window === 'undefined') return
  attached = true
  const run = () => {
    const layoutChanged = syncFolioVisualViewport()
    if (!layoutChanged) return
    for (const fn of [...listeners]) fn()
  }
  const onOrient = () => {
    restHeight = 0
    restTop = 0
    layoutHeightWritten = -1
    layoutTopWritten = -1
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
 * Layout-bus subscription. Fires when layout vars change — not on dock-only keyboard ticks.
 * Imperative sync still updates the dock pin every call.
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
