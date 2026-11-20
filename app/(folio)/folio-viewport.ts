export function folioViewport() {
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  const top = vv?.offsetTop ?? 0
  const left = vv?.offsetLeft ?? 0
  const width = vv?.width ?? window.innerWidth
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

/** URL-bar jitter stays under this; larger shrinks are treated as the keyboard. */
const REST_HEIGHT_SLACK = 120
const KEYBOARD_INSET_MIN = REST_HEIGHT_SLACK

type Listener = () => void

const listeners = new Set<Listener>()
let restHeight = 0
let restTop = 0
let layoutHeightWritten = -1
let layoutTopWritten = -1
let attached = false
let detachBus: (() => void) | null = null
let syncRaf = 0
let composerFocus = false

function page() {
  return document.querySelector('.folio-page')
}

export function setFolioComposerFocus(open: boolean) {
  composerFocus = open
  const root = page()
  if (root instanceof HTMLElement) {
    if (open) root.dataset.folioComposer = 'true'
    else delete root.dataset.folioComposer
  }
  if (open) window.scrollTo(0, 0)
  syncFolioVisualViewport()
}

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
  const dockBottom = Math.max(0, layoutInnerHeight - (top + height))

  root.style.setProperty('--folio-dock-bottom', `${dockBottom}px`)
  root.style.setProperty('--folio-vv-offset-top', composerFocus ? `${top}px` : '0px')

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
    if (!layoutChanged) return
    for (const fn of [...listeners]) fn()
  }
  const run = () => {
    if (syncRaf) return
    syncRaf = requestAnimationFrame(flush)
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

/** Layout listeners only — dock pin updates every sync regardless. */
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
