export function folioViewport() {
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  const top = vv?.offsetTop ?? 0
  const left = vv?.offsetLeft ?? 0
  const width = vv?.width ?? window.innerWidth
  const liveRest = restHeight || height
  const inset = Math.max(0, liveRest - height)
  if (keyboardLatched || inset >= KEYBOARD_INSET_MIN) {
    return {
      width: window.innerWidth,
      height: liveRest,
      top: restTop,
      left: 0,
    }
  }
  return { width, height, top, left }
}

const KEYBOARD_INSET_MIN = 24

type Listener = (layoutChanged: boolean) => void

const listeners = new Set<Listener>()
let restHeight = 0
let restTop = 0
let keyboardLatched = false
let layoutHeightWritten = -1
let layoutTopWritten = -1
let attached = false
let detachBus: (() => void) | null = null
let syncRaf = 0

function page() {
  return document.querySelector('.folio-page')
}

export function syncFolioVisualViewport() {
  const root = page()
  if (!(root instanceof HTMLElement)) return false
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  const top = vv?.offsetTop ?? 0
  const layoutInnerHeight = window.innerHeight
  // iOS shrinks innerHeight with the keyboard — diff against resting vv height, never lower it.
  if (height >= restHeight - 1) {
    restHeight = height
    keyboardLatched = false
  } else if (restHeight - height >= KEYBOARD_INSET_MIN) {
    keyboardLatched = true
  }

  if (!keyboardLatched) restTop = top

  const layoutHeight = keyboardLatched ? restHeight : height
  const layoutTop = keyboardLatched ? restTop : top
  const layoutBottom = layoutTop + layoutHeight
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
  const flush = () => {
    syncRaf = 0
    const layoutChanged = syncFolioVisualViewport()
    for (const fn of [...listeners]) fn(layoutChanged)
  }
  const run = () => {
    // Pin the dock on the vv event — rAF coalescing made the OSK lead by a frame+.
    syncFolioVisualViewport()
    if (syncRaf) return
    syncRaf = requestAnimationFrame(flush)
  }
  const onOrient = () => {
    restHeight = 0
    restTop = 0
    keyboardLatched = false
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
    if (syncRaf) cancelAnimationFrame(syncRaf)
    syncRaf = 0
    window.removeEventListener('resize', run)
    window.removeEventListener('orientationchange', onOrient)
    vv?.removeEventListener('resize', run)
    vv?.removeEventListener('scroll', run)
    attached = false
    detachBus = null
  }
}

export function folioKeyboardLatched() {
  return keyboardLatched
}

/** `layoutChanged` is false while the keyboard is latched — gate reflows on it. */
export function bindFolioVisualViewport(onChange?: Listener) {
  attach()
  syncFolioVisualViewport()
  if (onChange) {
    listeners.add(onChange)
    onChange(true)
  }
  return () => {
    if (onChange) listeners.delete(onChange)
    if (listeners.size === 0) detachBus?.()
  }
}
