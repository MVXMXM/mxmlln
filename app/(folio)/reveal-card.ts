import { attachLiquidGlass } from '@/app/components/Dock/DockGlass'
import { targetForCardUrl } from '@/content/folio-card-map'
import {
  bindFolioVisualViewport,
  folioViewport,
  syncFolioVisualViewport,
} from './folio-viewport'

export {
  bindFolioVisualViewport,
  folioViewport,
  syncFolioVisualViewport,
} from './folio-viewport'

declare global {
  interface Window {
    __folioReady?: boolean
    __folioBootStarted?: boolean
    mountScrollThumb?: () => void
    disposeScrollThumb?: () => void
    collapseExpandedStack?: () => void
    unmountCardVideo?: (card: HTMLElement) => void
    mountCardVideo?: (card: HTMLElement) => void
    dehydrateStackMedia?: (cardStack: Element) => void
    hydrateStackMedia?: (cardStack: Element, options?: { frontOnly?: boolean }) => void
    lottie?: {
      loadAnimation: (options: {
        container: Element
        renderer: 'svg'
        loop: boolean
        autoplay: boolean
        path: string
      }) => { addEventListener: (event: string, handler: () => void) => void }
    }
  }
}

function dehydrateCard(card: HTMLElement) {
  window.unmountCardVideo?.(card)
}

function hydrateCard(card: HTMLElement) {
  window.mountCardVideo?.(card)
}

function refreshStackMedia() {
  document.querySelectorAll('.CardStack').forEach((stack) => {
    const expanded = stack.closest('.CardStackLabelContainer')?.classList.contains('expanded')
    if (expanded) window.hydrateStackMedia?.(stack, { frontOnly: false })
    else window.dehydrateStackMedia?.(stack)
  })
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function clean(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function findCard(pile: Element, title: string, badge?: string) {
  const cards = [...pile.querySelectorAll('.Card')].filter((card) => {
    const text = clean(card.querySelector('.CardTitle')?.textContent ?? '')
    if (text !== title && !text.includes(title)) return false
    if (!badge) return true
    const mark = clean(card.querySelector('.BadgeText')?.textContent ?? '')
    return mark.includes(badge)
  })
    // "logotype" is contained in "logotypes", so an exact title wins.
  return (
    cards.find((card) => clean(card.querySelector('.CardTitle')?.textContent ?? '') === title) ??
    cards[0] ??
    null
  )
}

type SavedStyle = { el: HTMLElement; style: string | null }

function motion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function page() {
  return document.querySelector('.folio-page')
}

function savedStyles(nodes: HTMLElement[]): SavedStyle[] {
  return nodes.map((el) => ({ el, style: el.getAttribute('style') }))
}

function restoreStyles(saved: SavedStyle[]) {
  for (const { el, style } of saved) {
    if (style == null) el.removeAttribute('style')
    else el.setAttribute('style', style)
  }
}

let motionToken = 0
let sessionUndo: (() => void) | null = null
let sessionCards: HTMLElement[] = []
let orbitRing: HTMLElement | null = null
let orbitFrame = 0
let orbitSpin = 0
let orbitSlots: HTMLElement[] = []
let orbitStartedAt = 0

let orbitTighten = 0
let orbitTightenTarget = 0

type CarouselState = {
  cards: HTMLElement[]
  offset: number
  
  rest: number
  velocity: number
  size: number
  radius: number
  step: number
  cx: number
  cy: number
  grid: HTMLElement
  springFrame: number
  
  inputUntil: number
  
  gestureOrigin: number
  drag: {
    x: number
    y: number
    offset: number
    moved: boolean
    lastX: number
    lastY: number
    lastT: number
    velocity: number
    pointerId: number
    card: HTMLElement | null
    /** Must be a .Card — masonry shell is pointer-events:none. */
    capture: HTMLElement
  } | null
  dispose: () => void
}

type RingPose = {
  cx: number
  cy: number
  radius: number
  size: number
}

const CAROUSEL_AUTOPLAY_MS = 4500
const CAROUSEL_WHEEL_GAIN = 0.005

const CAROUSEL_DRAG_GAIN = 0.01

const CAROUSEL_FLICK_VELOCITY = 0.55

const CAROUSEL_COMMIT_FRAC = 0.18

const CAROUSEL_WHEEL_LIVE_MS = 50

const CAROUSEL_STIFFNESS = 420
const CAROUSEL_DAMPING = 36

let carousel: CarouselState | null = null
let carouselChrome: HTMLElement | null = null
let carouselHeadline: HTMLElement | null = null
let carouselStepper: HTMLElement | null = null
let carouselPlaying = false
let carouselStepperIndex = -1
let carouselProgress: Animation | null = null
let headlineFadeTimer = 0
let carouselGlassDispose: (() => void) | null = null

export const ORBIT_INTRO_MS = 900
export const ORBIT_HOLD_MS = 2000
export const ORBIT_TRAVEL_MS = 1500

const ORBIT_REORBIT_CULL_MS = 160
const ORBIT_REORBIT_MS = 400
const ORBIT_REORBIT_FOCUS_MS = 280

export function folioSessionOpen() {
  return sessionUndo !== null
}

export function orbitRevealWaitMs() {
    // After a reveal the clock is stale; don't treat an old start as "hold already done".
  const orbiting = document.querySelector('.folio-masonry.is-orbit')
  if (!orbitStartedAt || !orbiting) return ORBIT_INTRO_MS + ORBIT_HOLD_MS
  return Math.max(0, orbitStartedAt + ORBIT_INTRO_MS + ORBIT_HOLD_MS - performance.now())
}

export function armOrbitHold() {
  if (!document.querySelector('.folio-masonry.is-orbit')) return
  orbitStartedAt = performance.now() - ORBIT_INTRO_MS
}

export function setOrbitLoading(loading: boolean) {
  orbitTightenTarget = loading ? 1 : 0
  if (!orbitFrame && document.querySelector('.folio-masonry.is-orbit')) runOrbit()
}

function stopOrbit() {
  if (orbitFrame) cancelAnimationFrame(orbitFrame)
  orbitFrame = 0
}

const ORBIT_THUMB_BORDER = 4
const ORBIT_THUMB_RADIUS = 16
const ORBIT_THUMB_SHADOW_Y = 8
const ORBIT_THUMB_SHADOW_BLUR = 18

/** Edge-to-edge along the arc — 1.25 ⇒ a 0.25-card gutter between neighbors. */
const ORBIT_PACK = 1.25

function clampRingRadius(count: number, radius: number, cardSize: number) {
  const n = Math.max(count, 2)
  const maxSpacing = cardSize * ORBIT_PACK
  const maxRadius = maxSpacing / (2 * Math.sin(Math.PI / n))
  return Math.min(radius, maxRadius)
}

function packOrbitSize(count: number, radius: number) {
  const n = Math.max(count, 2)
  return (2 * radius * Math.sin(Math.PI / n)) / ORBIT_PACK
}

function orbitMetrics(count: number) {
  const { width: vw, height: vh, top, left } = folioViewport()
  const sizeWide = orbitThumbSize(count)
  const wide = Math.max(vw, vh) / 2 - sizeWide * 0.2
  const ratio = sizeWide / Math.max(wide, 1)
  const logoHalf = 150
  const tight = (logoHalf + 20) / Math.max(0.35, 1 - 0.55 * ratio)
  const uncapped = wide + (tight - wide) * orbitTighten
  // Size from the uncapped ring — clamping radius must not shrink cards or the
  // first submit packs larger than later ones that share the same angular step.
  let size = Math.max(28, uncapped * ratio)
  const radius = clampRingRadius(count, uncapped, size)
  
  size = Math.min(size, Math.max(18, packOrbitSize(count, radius)))
  return {
    size,
    sizeWide,
    rx: Math.max(size, radius),
    ry: Math.max(size, radius),
    cx: left + vw / 2,
    cy: top + vh / 2,
  }
}

function styleOrbitThumb(card: HTMLElement, size: number, sizeWide: number) {
  const t = size / Math.max(sizeWide, 1)
  const border = Math.max(1, ORBIT_THUMB_BORDER * t)
  const radius = Math.max(2, ORBIT_THUMB_RADIUS * t)
  const shadowY = ORBIT_THUMB_SHADOW_Y * t
  const shadowBlur = ORBIT_THUMB_SHADOW_BLUR * t
  card.style.border = `${border}px solid #ffffff`
  card.style.borderRadius = `${radius}px`
  card.style.boxShadow = `0 ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, 0.12)`
}

function placeOrbitSlot(slot: HTMLElement, index: number, total: number, spin: number, metrics: ReturnType<typeof orbitMetrics>) {
  const angle = (index / total) * Math.PI * 2 + spin - Math.PI / 2
  const x = metrics.cx + Math.cos(angle) * metrics.rx - metrics.size / 2
  const y = metrics.cy + Math.sin(angle) * metrics.ry - metrics.size / 2
  
  const rotate = angle + Math.PI / 2
  slot.style.width = `${metrics.size}px`
  slot.style.height = `${metrics.size}px`
  slot.style.transformOrigin = 'center center'
  slot.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotate}rad)`
  const card = slot.firstElementChild
  if (card instanceof HTMLElement) styleOrbitThumb(card, metrics.size, metrics.sizeWide)
}

function paintOrbit(spin: number) {
  if (!orbitSlots.length) return
  const metrics = orbitMetrics(orbitSlots.length)
  orbitSlots.forEach((slot, index) => placeOrbitSlot(slot, index, orbitSlots.length, spin, metrics))
}

function runOrbit() {
  stopOrbit()
  if (motion()) {
    orbitTighten = orbitTightenTarget
    paintOrbit(orbitSpin)
    return
  }
  const tick = () => {
    orbitSpin += 0.0028
    const gap = orbitTightenTarget - orbitTighten
    if (Math.abs(gap) > 0.001) orbitTighten += gap * 0.08
    else orbitTighten = orbitTightenTarget
    paintOrbit(orbitSpin)
    orbitFrame = requestAnimationFrame(tick)
  }
  orbitFrame = requestAnimationFrame(tick)
}

function thumbCard(card: HTMLElement) {
  dehydrateCard(card)
  const metrics = orbitMetrics(Math.max(1, sessionCards.length || orbitSlots.length))
  card.style.boxSizing = 'border-box'
  card.style.position = 'relative'
  card.style.left = 'auto'
  card.style.top = 'auto'
  card.style.display = 'block'
  card.style.width = '100%'
  card.style.height = '100%'
  card.style.aspectRatio = '1'
  card.style.margin = '0'
  styleOrbitThumb(card, metrics.size, metrics.sizeWide)
  card.style.minWidth = '0'
  card.style.alignSelf = 'start'
  card.style.pointerEvents = 'none'
  card.style.opacity = '1'
  card.style.zIndex = '1'
  card.style.transformOrigin = 'center center'
  card.style.transform = 'none'
  card.style.transition = 'none'
  card.style.contentVisibility = 'visible'
  card.style.cursor = ''
  const inner = card.querySelector<HTMLElement>('.CardInnerContainer')
  if (inner) {
    inner.style.height = '0%'
    inner.style.width = '0%'
    inner.style.opacity = '0'
  }
}

export function cardsForAnswer(urls: string[]): HTMLElement[] {
  const seen = new Set<string>()
  const cards: HTMLElement[] = []
  for (const url of urls.slice(0, 6)) {
    const target = targetForCardUrl(url)
    if (!target?.title) continue
    const key = `${target.pile}\0${target.title}\0${target.badge ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    const card = findCard(document.body, target.title, target.badge)
    if (card) cards.push(card as HTMLElement)
  }
  return cards
}

export function enterFolioSession(grid: HTMLElement) {
  page()?.classList.add('is-folio-session')
  if (sessionUndo) return
  const cards = [...document.querySelectorAll<HTMLElement>('.Card')]
  const parents = new Map<HTMLElement, Node[]>()
  for (const card of cards) {
    const parent = card.parentElement
    if (parent && !parents.has(parent)) parents.set(parent, [...parent.childNodes])
  }
  const inners = cards.flatMap((card) => [...card.querySelectorAll<HTMLElement>('.CardInnerContainer')])
  const saved = savedStyles([...cards, ...inners])
  sessionCards = cards
  for (const card of sessionCards) dehydrateCard(card)
  sessionUndo = () => {
    disposeCarousel()
    stopOrbit()
    orbitRing?.remove()
    orbitRing = null
    orbitSlots = []
    for (const [parent, nodes] of parents) {
      for (const node of nodes) parent.appendChild(node)
    }
    restoreStyles(saved)
    sessionUndo = null
    sessionCards = []
    orbitStartedAt = 0
    orbitTighten = 0
    orbitTightenTarget = 0
    grid.classList.remove('is-result', 'is-orbit', 'is-carousel')
    page()?.classList.remove('is-folio-session')
    refreshStackMedia()
  }
}

function mountOrbitRing(grid: HTMLElement) {
  if (!orbitRing || !orbitRing.isConnected) {
    orbitRing = document.createElement('div')
    orbitRing.className = 'folio-orbit-ring'
    orbitRing.setAttribute('aria-hidden', 'true')
  }
  grid.replaceChildren(orbitRing)
  orbitSlots = []
  const metrics = orbitMetrics(sessionCards.length)
  sessionCards.forEach((card, index) => {
    const slot = document.createElement('div')
    slot.className = 'folio-orbit-slot'
    orbitRing!.appendChild(slot)
    orbitSlots.push(slot)
    placeOrbitSlot(slot, index, sessionCards.length, 0, metrics)
    slot.appendChild(card)
  })
  return metrics
}

export function beginFolioSession(grid: HTMLElement) {
  const token = ++motionToken
  const duration = motion() ? '0.01s' : `${ORBIT_INTRO_MS}ms`
  syncFolioVisualViewport()
  enterFolioSession(grid)
  grid.classList.remove('is-result')
  grid.classList.add('is-orbit')
  window.scrollTo(0, 0)
  stopOrbit()
  orbitSpin = 0
  orbitTighten = 0
  orbitTightenTarget = 0
  orbitStartedAt = performance.now()

  for (const card of sessionCards) {
    card.style.display = 'block'
    card.style.opacity = '1'
  }
  const first = new Map(sessionCards.map((card) => [card, card.getBoundingClientRect()]))
  mountOrbitRing(grid)
  for (const card of sessionCards) thumbCard(card)

  for (const card of sessionCards) {
    const start = first.get(card)
    const last = card.getBoundingClientRect()
    if (!start || last.width < 2 || start.width < 2) continue
    const dx = start.left - last.left
    const dy = start.top - last.top
    const scale = start.width / last.width
    card.style.transformOrigin = 'top left'
    card.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`
  }

  window.setTimeout(() => {
    if (token !== motionToken) return
    for (const card of sessionCards) {
      card.style.transition = `transform ${duration} cubic-bezier(0.22, 1, 0.36, 1)`
      card.style.transform = 'none'
    }
    window.setTimeout(() => {
      if (token !== motionToken) return
      runOrbit()
    }, motion() ? 0 : ORBIT_INTRO_MS)
  }, 40)
}

function cancelCarouselProgress() {
  carouselProgress?.cancel()
  carouselProgress = null
}

function disposeCarousel() {
  cancelCarouselProgress()
  carouselPlaying = false
  carouselStepperIndex = -1
  if (headlineFadeTimer) window.clearTimeout(headlineFadeTimer)
  headlineFadeTimer = 0
  carouselGlassDispose?.()
  carouselGlassDispose = null
  carouselChrome?.remove()
  carouselChrome = null
  carouselHeadline = null
  carouselStepper = null
  if (!carousel) return
  carousel.dispose()
  carousel = null
}

function cardHeadlineText(card: HTMLElement) {
  const label = (card.querySelector('.BadgeText')?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const title = (card.querySelector('.CardTitle')?.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (label && title) return `${label}: ${title}`
  return label || title
}

function syncCarouselHeadline(activeOverride?: number) {
  if (!carouselHeadline || !carousel) return
  const card = carousel.cards[activeOverride ?? activeCarouselIndex()]
  const text = card ? cardHeadlineText(card) : ''
  if (carouselHeadline.dataset.live === text) return
  carouselHeadline.dataset.live = text
  if (headlineFadeTimer) window.clearTimeout(headlineFadeTimer)
  if (!carouselHeadline.textContent) {
    carouselHeadline.textContent = text
    carouselHeadline.classList.remove('is-fading')
    return
  }
  carouselHeadline.classList.add('is-fading')
  headlineFadeTimer = window.setTimeout(() => {
    headlineFadeTimer = 0
    if (!carouselHeadline || carouselHeadline.dataset.live !== text) return
    carouselHeadline.textContent = text
    carouselHeadline.classList.remove('is-fading')
  }, 160)
}

function fillActiveDot() {
  cancelCarouselProgress()
  const fill = carouselStepper?.querySelector<HTMLElement>('.folio-carousel-dot.is-active .folio-carousel-dot-fill')
  if (fill) fill.style.width = '100%'
}

function pauseCarouselAutoplay() {
  if (!carouselPlaying) {
    fillActiveDot()
    return
  }
  carouselPlaying = false
  fillActiveDot()
}

function advanceCarouselAutoplay() {
  if (!carousel?.cards.length || !carouselPlaying) return
  const next = (activeCarouselIndex() + 1) % carousel.cards.length
  snapCarousel(next)
}

function restartCarouselProgress() {
  cancelCarouselProgress()
  if (!carouselStepper || !carousel || !carouselPlaying) return
  const active = carouselStepper.querySelector<HTMLElement>('.folio-carousel-dot.is-active')
  const fill = active?.querySelector<HTMLElement>('.folio-carousel-dot-fill')
  if (!active || !fill) return
  
  const circle = `${active.clientHeight || 10}px`
  fill.style.width = circle
  const animation = new Animation(
    new KeyframeEffect(fill, [{ width: circle }, { width: '100%' }], {
      duration: CAROUSEL_AUTOPLAY_MS,
      fill: 'forwards',
      easing: 'linear',
    }),
  )
  animation.onfinish = () => {
    if (carouselProgress !== animation) return
    advanceCarouselAutoplay()
  }
  carouselProgress = animation
  animation.play()
}

function syncCarouselStepper(activeOverride?: number) {
  if (!carousel) return
  const active = activeOverride ?? activeCarouselIndex()
  syncCarouselHeadline(active)
  syncCarouselStepperPos()
  if (!carouselStepper) return
  const dots = carouselStepper.querySelectorAll<HTMLElement>('.folio-carousel-dot')
  dots.forEach((dot, index) => {
    const on = index === active
    dot.classList.toggle('is-active', on)
    dot.setAttribute('aria-selected', on ? 'true' : 'false')
    if (!on) {
      const fill = dot.querySelector<HTMLElement>('.folio-carousel-dot-fill')
      if (fill) fill.style.width = '0%'
    }
  })
  if (active !== carouselStepperIndex) {
    carouselStepperIndex = active
    cancelCarouselProgress()
    if (carouselPlaying) restartCarouselProgress()
    else fillActiveDot()
  } else if (!carouselPlaying) {
    fillActiveDot()
  }
}

function lockCarouselPillWidth(pill: HTMLElement, count: number) {
  const dot = 10
  const active = 40
  const gap = 10
  const padX = 44
  const width = padX + (count - 1) * dot + active + Math.max(0, count - 1) * gap
  pill.style.width = `${width}px`
  pill.style.minWidth = `${width}px`
}

function mountCarouselStepper(count: number) {
  cancelCarouselProgress()
  carouselChrome?.remove()
  carouselChrome = null
  carouselHeadline = null
  carouselStepper = null
  carouselStepperIndex = -1
  carouselPlaying = false

  const chrome = document.createElement('div')
  chrome.className = 'folio-carousel-chrome'
  chrome.setAttribute('aria-label', 'Result cards')

  const headline = document.createElement('h2')
  headline.className = 'folio-carousel-headline'
  chrome.appendChild(headline)

  if (count >= 2) {
    const root = document.createElement('div')
    root.className = 'folio-carousel-stepper'

    const pill = document.createElement('div')
    pill.className = 'folio-carousel-pill'
    pill.setAttribute('role', 'tablist')
    pill.setAttribute('aria-label', 'Card pages')
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('button')
      dot.type = 'button'
      dot.className = 'folio-carousel-dot'
      dot.setAttribute('role', 'tab')
      dot.setAttribute('aria-label', `Show card ${i + 1}`)
      const fill = document.createElement('span')
      fill.className = 'folio-carousel-dot-fill'
      fill.setAttribute('aria-hidden', 'true')
      dot.appendChild(fill)
      dot.addEventListener('click', (event) => {
        event.preventDefault()
        pauseCarouselAutoplay()
        snapCarousel(i)
      })
      pill.appendChild(dot)
    }
    lockCarouselPillWidth(pill, count)
    root.appendChild(pill)
    chrome.appendChild(root)
    carouselStepper = root
    carouselPlaying = !motion()
  }

  document.body.appendChild(chrome)
  carouselChrome = chrome
  carouselHeadline = headline
  syncCarouselStepperPos()
  carouselGlassDispose?.()
  const glassHosts = [...chrome.querySelectorAll<HTMLElement>('.folio-carousel-pill')]
  const glassDisposers = glassHosts.map((host) => attachLiquidGlass(host))
  carouselGlassDispose = () => {
    for (const dispose of glassDisposers) dispose()
  }
    // After paint — otherwise the expand transition never runs.
  requestAnimationFrame(() => {
    chrome.classList.add('is-in')
    syncCarouselStepperPos()
  })
  if (carouselStepper) syncCarouselStepper()
}

/** Matches FolioEngine’s 16px lattice (background dots / title shift). */
export const FOLIO_GRID = 16

export function snapFolioGrid(
  value: number,
  mode: 'round' | 'floor' | 'ceil' = 'round',
) {
  const unit = FOLIO_GRID
  if (mode === 'floor') return Math.floor(value / unit) * unit
  if (mode === 'ceil') return Math.ceil(value / unit) * unit
  return Math.round(value / unit) * unit
}

export function folioFocusMetrics() {
  const { width: vw, height: vh, top, left } = folioViewport()
    // Even grid units so size/2 stays on-lattice (edges + center share the grid).
  let size = snapFolioGrid(Math.min(336, Math.max(256, vw * 0.38)))
  if ((size / FOLIO_GRID) % 2 !== 0) size -= FOLIO_GRID
  const cardTop = snapFolioGrid(top + vh / 2 - size / 2)
  const cardLeft = snapFolioGrid(left + vw / 2 - size / 2)
  return {
    size,
    focusX: cardLeft + size / 2,
    focusY: cardTop + size / 2,
    cardTop,
    cardBottom: cardTop + size,
    cardLeft,
  }
}

function dockTopY() {
  const { top, height } = folioViewport()
  return (
    document.querySelector<HTMLElement>('.mx-dock .dockDynamicContainer')?.getBoundingClientRect()
      .top ??
    document.querySelector<HTMLElement>('.mx-dock .dockCluster')?.getBoundingClientRect().top ??
    top + height - 88
  )
}

function syncCarouselStepperPos() {
  if (!carousel || !carouselHeadline) return
  const { cardBottom } = folioFocusMetrics()
  const bottomAnchor = carouselStepper
    ? dockTopY() - 24 - (carouselStepper.offsetHeight || 60)
    : dockTopY() - 24
  if (carouselStepper) {
    carouselStepper.style.top = `${bottomAnchor}px`
    carouselStepper.style.bottom = 'auto'
  }
  const headlineH = carouselHeadline.offsetHeight || 28
  const mid = (cardBottom + bottomAnchor) / 2
  carouselHeadline.style.top = `${mid - headlineH / 2}px`
  carouselHeadline.style.bottom = 'auto'
}

function orbitThumbSize(count: number) {
  const { width, height } = folioViewport()
  const span = Math.min(width, height)
  return Math.min(112, Math.max(72, span / Math.max(8, Math.sqrt(Math.max(count, 1)) * 2.2)))
}

function carouselMetrics(count: number) {
  const { size, focusX, focusY } = folioFocusMetrics()
  const packCount = Math.max(sessionCards.length, count, 1)
  const thumb = orbitThumbSize(packCount)
  const { width, height } = folioViewport()
  const thumbRadius = Math.max(width, height) / 2 - thumb * 0.2
  
  const radius = clampRingRadius(
    packCount,
    size * (thumbRadius / Math.max(thumb, 1)),
    size,
  )
  // Same angular step for every carousel length — don’t re-pack mid-session.
  const step = (Math.PI * 2) / packCount
  return { size, radius, step, cx: focusX, cy: focusY + radius, focusX, focusY }
}

function styleCarouselCard(card: HTMLElement, size: number) {
  hydrateCard(card)
  card.style.boxSizing = 'border-box'
  card.style.position = 'fixed'
  card.style.margin = '0'
  card.style.width = `${size}px`
  card.style.height = `${size}px`
  card.style.border = '10px solid #ffffff'
  card.style.borderRadius = '24px'
  card.style.boxShadow = '0 0px 30px rgba(0, 0, 0, 0.15)'
  card.style.opacity = '1'
  card.style.filter = 'none'
  card.style.display = 'block'
  card.style.pointerEvents = 'auto'
  card.style.cursor = 'pointer'
  card.style.contentVisibility = 'visible'
  card.style.transformOrigin = 'center center'
  
  const inner = card.querySelector<HTMLElement>('.CardInnerContainer')
  if (inner) {
    inner.style.height = '0%'
    inner.style.width = '0%'
    inner.style.opacity = '0'
  }
}

function carouselBounds() {
  if (!carousel?.cards.length) return { min: 0, max: 0 }
  return { min: 0, max: Math.max(0, (carousel.cards.length - 1) * carousel.step) }
}

function clampCarouselOffset(logical: number) {
  const { min, max } = carouselBounds()
  return Math.min(max, Math.max(min, logical))
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function angleDelta(from: number, to: number) {
  const tau = Math.PI * 2
  return ((((to - from) + Math.PI) % tau) + tau) % tau - Math.PI
}

function ccwDelta(from: number, to: number) {
  const tau = Math.PI * 2
  return (((to - from) % tau) + tau) % tau
}

function openArcContains(from: number, delta: number, barrier: number) {
  if (Math.abs(delta) < 1e-12) return false
  const tau = Math.PI * 2
  if (delta > 0) {
    const t = ccwDelta(from, barrier)
    return t > 1e-9 && t < delta - 1e-9
  }
  const t = (((from - barrier) % tau) + tau) % tau
  return t > 1e-9 && t < -delta - 1e-9
}

/**
 * Slide along the shortest arc that does not cross the focused card.
 * Shortest-path alone lets right-side cards hop through the top.
 */
function arcAvoidingBarrier(from: number, to: number, barrier: number) {
  const tau = Math.PI * 2
  const short = angleDelta(from, to)
  const long = short === 0 ? 0 : short > 0 ? short - tau : short + tau
  const shortCross = openArcContains(from, short, barrier)
  const longCross = openArcContains(from, long, barrier)
  if (!shortCross) return short
  if (!longCross) return long
  return Math.abs(short) <= Math.abs(long) ? short : long
}

function placeOnRing(
  card: HTMLElement,
  pose: RingPose,
  angle: number,
  scale = 1,
) {
  const x = pose.cx + Math.cos(angle) * pose.radius - pose.size / 2
  const y = pose.cy + Math.sin(angle) * pose.radius - pose.size / 2
  const rotate = angle + Math.PI / 2
  const align = Math.cos(angle + Math.PI / 2)
  card.style.transition = 'none'
  card.style.left = `${x}px`
  card.style.top = `${y}px`
  card.style.width = `${pose.size}px`
  card.style.height = `${pose.size}px`
  card.style.transformOrigin = 'center center'
  card.style.transform = `rotate(${rotate}rad) scale(${scale})`
  card.style.zIndex = String(Math.round(20 + align * 20))
}

function paintCarousel(logical: number, stepperIndex?: number) {
  if (!carousel) return
  const { cards, size, radius, step, cx, cy } = carousel
  const total = cards.length
  if (!total) return
  
  const pose: RingPose = { cx, cy, radius, size }
  cards.forEach((card, index) => {
    const angle = -Math.PI / 2 + index * step - logical
    const align = Math.cos(angle + Math.PI / 2)
    const scale = 0.9 + 0.1 * Math.max(0, align)
    placeOnRing(card, pose, angle, scale)
    card.style.opacity = '1'
    card.style.filter = 'none'
  })
  carousel.offset = logical
  syncCarouselStepper(stepperIndex)
}

function stopCarouselSpring() {
  if (!carousel?.springFrame) return
  cancelAnimationFrame(carousel.springFrame)
  carousel.springFrame = 0
}

function applyCarouselInput(raw: number, originIndex: number) {
  if (!carousel) return raw
  const { step } = carousel
  const { min, max } = carouselBounds()
  const lo = Math.max(min, (originIndex - 1) * step)
  const hi = Math.min(max, (originIndex + 1) * step)
  if (raw < lo) {
    if (lo <= min) return min
    const over = lo - raw
    return lo - (over * 0.32) / (1 + over * 3.2)
  }
  if (raw > hi) {
    if (hi >= max) return max
    const over = raw - hi
    return hi + (over * 0.32) / (1 + over * 3.2)
  }
  return raw
}

function resolveGestureSnapIndex(fromOffset: number, originIndex: number, velocity = 0) {
  if (!carousel) return originIndex
  const { step, cards } = carousel
  const last = cards.length - 1
  const origin = Math.min(last, Math.max(0, originIndex))
  const delta = fromOffset - origin * step
  let next = origin
  if (delta > step * CAROUSEL_COMMIT_FRAC || velocity > CAROUSEL_FLICK_VELOCITY) next = origin + 1
  else if (delta < -step * CAROUSEL_COMMIT_FRAC || velocity < -CAROUSEL_FLICK_VELOCITY) next = origin - 1
  next = Math.min(origin + 1, Math.max(origin - 1, next))
  return Math.min(last, Math.max(0, next))
}

/**
 * After nearly landing on a neighbor, further input is a new interaction — slide the ±1
 * window so keep-scrolling / flick-flick can walk the ring without waiting for settle.
 * Crossing halfway alone must not open the next page (that would let one flick skip).
 */
function advanceGestureOriginIfNeeded() {
  if (!carousel) return
  const { step, cards } = carousel
  const last = cards.length - 1
  const origin = carousel.gestureOrigin
  const delta = carousel.offset - origin * step
  if (delta >= step * 0.92 && origin < last) carousel.gestureOrigin = origin + 1
  else if (delta <= -step * 0.92 && origin > 0) carousel.gestureOrigin = origin - 1
}

function syncCarouselRestFromOffset(velocity = 0) {
  if (!carousel) return
  carousel.offset = clampCarouselOffset(carousel.offset)
  carousel.rest =
    resolveGestureSnapIndex(carousel.offset, carousel.gestureOrigin, velocity) * carousel.step
}

function ensureCarouselSpring() {
  if (!carousel || carousel.springFrame) return
  let last = performance.now()
  const tick = (now: number) => {
    if (!carousel) return
    const dt = Math.min(0.032, Math.max(0.008, (now - last) / 1000))
    last = now
    const inputOwns = !!carousel.drag || now < carousel.inputUntil

    if (inputOwns) {
      carousel.velocity = 0
      carousel.offset = clampCarouselOffset(carousel.offset)
      paintCarousel(carousel.offset)
      carousel.springFrame = requestAnimationFrame(tick)
      return
    }

    const delta = carousel.rest - carousel.offset
    const accel = CAROUSEL_STIFFNESS * delta - CAROUSEL_DAMPING * carousel.velocity
    carousel.velocity += accel * dt
    carousel.offset += carousel.velocity * dt
    carousel.offset = clampCarouselOffset(carousel.offset)

    if (Math.abs(carousel.rest - carousel.offset) < 0.0004 && Math.abs(carousel.velocity) < 0.02) {
      carousel.offset = carousel.rest
      carousel.velocity = 0
      carousel.springFrame = 0
      paintCarousel(carousel.rest)
      return
    }

    paintCarousel(carousel.offset)
    carousel.springFrame = requestAnimationFrame(tick)
  }
  carousel.springFrame = requestAnimationFrame(tick)
}

function snapCarousel(index?: number) {
  if (!carousel || !carousel.cards.length) return
  const total = carousel.cards.length
  const { step } = carousel
  const { min, max } = carouselBounds()
  let target: number
  if (typeof index === 'number') {
    target = Math.min(max, Math.max(min, (((index % total) + total) % total) * step))
    carousel.drag = null
  } else {
    target = Math.min(
      max,
      Math.max(min, resolveGestureSnapIndex(carousel.offset, carousel.gestureOrigin) * step),
    )
  }
  const toIndex = Math.round(target / step)
  carousel.gestureOrigin = toIndex
  carousel.rest = target
  carousel.inputUntil = 0
  if (motion()) {
    stopCarouselSpring()
    carousel.velocity = 0
    paintCarousel(target, toIndex)
    return
  }
  ensureCarouselSpring()
}

function activeCarouselIndex() {
  if (!carousel?.cards.length) return 0
  const { step, cards } = carousel
  const clamped = clampCarouselOffset(carousel.offset)
  const i = Math.round(clamped / step)
  return Math.min(cards.length - 1, Math.max(0, i))
}

function carouselDragGain() {
  if (!carousel) return CAROUSEL_DRAG_GAIN
  return carousel.step / Math.max(48, carousel.size * 0.75)
}

function mountCarousel(grid: HTMLElement, cards: HTMLElement[]) {
  disposeCarousel()
  const metrics = carouselMetrics(cards.length)
  grid.classList.add('is-carousel')
  cards.forEach((card) => styleCarouselCard(card, metrics.size))
  mountCarouselStepper(cards.length)

  const onWheel = (event: WheelEvent) => {
    if (!carousel) return
    event.preventDefault()
    pauseCarouselAutoplay()
    const { min, max } = carouselBounds()
    const delta = (event.deltaY + event.deltaX) * CAROUSEL_WHEEL_GAIN
        // Bookends are inert — no rubber, no bounce, no outbound reaction.
    if (
      (carousel.offset >= max - 1e-6 && delta > 0) ||
      (carousel.offset <= min + 1e-6 && delta < 0)
    ) {
      return
    }
    const now = performance.now()
        // New interaction once the live window lapses — re-arm even mid-spring so flick-flick isn’t blocked.
    if (now >= carousel.inputUntil) {
      carousel.gestureOrigin = activeCarouselIndex()
    }
    carousel.offset = applyCarouselInput(carousel.offset + delta, carousel.gestureOrigin)
    carousel.velocity = 0
    carousel.inputUntil = now + CAROUSEL_WHEEL_LIVE_MS
    advanceGestureOriginIfNeeded()
    syncCarouselRestFromOffset()
    paintCarousel(carousel.offset)
    ensureCarouselSpring()
  }

  const onPointerDown = (event: PointerEvent) => {
    if (!carousel || event.button > 0) return
    if (!(event.target instanceof Element)) return
    if (!grid.contains(event.target)) return
    const card = event.target.closest('.Card') as HTMLElement | null
    const hit = card && carousel.cards.includes(card) ? card : null
    if (!hit) return
    pauseCarouselAutoplay()
    carousel.gestureOrigin = activeCarouselIndex()
    carousel.velocity = 0
    const now = performance.now()
    carousel.drag = {
      x: event.clientX,
      y: event.clientY,
      offset: carousel.offset,
      moved: false,
      lastX: event.clientX,
      lastY: event.clientY,
      lastT: now,
      velocity: 0,
      pointerId: event.pointerId,
      card: hit,
      capture: hit,
    }
    hit.setPointerCapture?.(event.pointerId)
    ensureCarouselSpring()
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!carousel?.drag) return
    const drag = carousel.drag
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (Math.hypot(dx, dy) > 3) drag.moved = true
    const now = performance.now()
    const dt = Math.max(1, now - drag.lastT)
    // Negate so content follows the finger (swipe left → next). Wheel path stays as-is.
    const instant = -(event.clientX - drag.lastX + (event.clientY - drag.lastY)) / dt
    drag.velocity = drag.velocity * 0.65 + instant * 0.35
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    drag.lastT = now

    carousel.offset = applyCarouselInput(
      drag.offset - (dx + dy) * carouselDragGain(),
      carousel.gestureOrigin,
    )
    advanceGestureOriginIfNeeded()
    syncCarouselRestFromOffset(drag.velocity)
    paintCarousel(carousel.offset)
    ensureCarouselSpring()
  }

  const endDrag = (event: PointerEvent) => {
    if (!carousel?.drag) return
    if (event.pointerId !== carousel.drag.pointerId) return
    const drag = carousel.drag
    carousel.drag = null
    try {
      drag.capture.releasePointerCapture?.(drag.pointerId)
    } catch {}
    if (drag.moved) {
      event.preventDefault()
      syncCarouselRestFromOffset(drag.velocity)
      carousel.inputUntil = 0
      ensureCarouselSpring()
      return
    }
    const card = drag.card
    if (!card || !carousel.cards.includes(card)) return
    const index = carousel.cards.indexOf(card)
    if (index !== activeCarouselIndex()) {
      event.preventDefault()
      event.stopPropagation()
      snapCarousel(index)
      return
    }
    // Pointer capture suppresses the click FolioEngine listens for.
    event.preventDefault()
    event.stopPropagation()
    card.click()
  }

    // Unfocused cards only scroll into focus; actions stay on the focused card.
  const onClickCapture = (event: MouseEvent) => {
    if (!carousel) return
    if (!(event.target instanceof Element)) return
    const card = event.target.closest('.Card') as HTMLElement | null
    if (!card || !carousel.cards.includes(card)) return
    const index = carousel.cards.indexOf(card)
    if (index === activeCarouselIndex()) return
    event.preventDefault()
    event.stopPropagation()
    pauseCarouselAutoplay()
    snapCarousel(index)
  }

  const onResize = () => {
    if (!carousel) return
    const next = carouselMetrics(carousel.cards.length)
    const active = activeCarouselIndex()
    carousel.size = next.size
    carousel.radius = next.radius
    carousel.step = next.step
    carousel.cx = next.cx
    carousel.cy = next.cy
    carousel.cards.forEach((card) => styleCarouselCard(card, next.size))
    carousel.offset = active * next.step
    carousel.rest = carousel.offset
    carousel.velocity = 0
    paintCarousel(carousel.offset)
    syncCarouselStepperPos()
  }

  grid.addEventListener('wheel', onWheel, { passive: false })
  grid.addEventListener('pointerdown', onPointerDown, { passive: false })
  grid.addEventListener('pointermove', onPointerMove)
  grid.addEventListener('pointerup', endDrag)
  grid.addEventListener('pointercancel', endDrag)
  grid.addEventListener('lostpointercapture', endDrag)
  grid.addEventListener('click', onClickCapture, true)
  const unbindViewport = bindFolioVisualViewport((layoutChanged) => {
    if (!layoutChanged) return
    onResize()
  })

  carousel = {
    cards,
    offset: 0,
    rest: 0,
    velocity: 0,
    size: metrics.size,
    radius: metrics.radius,
    step: metrics.step,
    cx: metrics.cx,
    cy: metrics.cy,
    grid,
    springFrame: 0,
    inputUntil: 0,
    gestureOrigin: 0,
    drag: null,
    dispose: () => {
      stopCarouselSpring()
      for (const card of cards) {
        card.style.filter = 'none'
        card.style.opacity = '1'
      }
      grid.removeEventListener('wheel', onWheel)
      grid.removeEventListener('pointerdown', onPointerDown)
      grid.removeEventListener('pointermove', onPointerMove)
      grid.removeEventListener('pointerup', endDrag)
      grid.removeEventListener('pointercancel', endDrag)
      grid.removeEventListener('lostpointercapture', endDrag)
      grid.removeEventListener('click', onClickCapture, true)
      unbindViewport()
      grid.classList.remove('is-carousel')
    },
  }
  paintCarousel(0)
}

export function reorbitSession(grid: HTMLElement): Promise<void> {
  const token = ++motionToken

  
  const prior = carousel
  const kept = (prior?.cards.length ? prior.cards : sessionCards.filter((card) => {
    if (card.style.display === 'none') return false
    const rect = card.getBoundingClientRect()
    return rect.width > 2 && rect.height > 2
  })).filter((card) => sessionCards.includes(card))
  const activeIndex = prior ? activeCarouselIndex() : 0
  const fromOffset = prior ? clampCarouselOffset(prior.offset) : 0
  const resultRing: RingPose = prior
    ? { cx: prior.cx, cy: prior.cy, radius: prior.radius, size: prior.size }
    : (() => {
        const m = carouselMetrics(Math.max(kept.length, 1))
        return { cx: m.cx, cy: m.cy, radius: m.radius, size: m.size }
      })()
  const resultStep = prior?.step ?? carouselMetrics(Math.max(kept.length, 1)).step

  disposeCarousel()
  stopOrbit()
  enterFolioSession(grid)
  window.scrollTo(0, 0)

  
  orbitTighten = 1
  orbitTightenTarget = 1
  const orbitCount = Math.max(sessionCards.length, 1)
  const startMetrics = orbitMetrics(orbitCount)
  const startRing: RingPose = {
    cx: startMetrics.cx,
    cy: startMetrics.cy,
    radius: startMetrics.rx,
    size: startMetrics.size,
  }
  const startRatio = startRing.size / Math.max(startRing.radius, 1)
  const endRatio = resultRing.size / Math.max(resultRing.radius, 1)

  const startAngles = new Map<HTMLElement, number>()
  sessionCards.forEach((card, index) => {
    startAngles.set(card, (index / orbitCount) * Math.PI * 2 + orbitSpin - Math.PI / 2)
  })

  const focusCard = kept[Math.min(activeIndex, Math.max(kept.length - 1, 0))] ?? kept[0]
  if (!focusCard) {
    grid.classList.remove('is-carousel', 'is-result')
    grid.classList.add('is-orbit')
    mountOrbitRing(grid)
    orbitStartedAt = performance.now() - ORBIT_INTRO_MS
    runOrbit()
    return Promise.resolve()
  }

  const focusSpin = angleDelta(startAngles.get(focusCard) ?? -Math.PI / 2, -Math.PI / 2)
  const settledAngles = new Map<HTMLElement, number>()
  for (const card of sessionCards) {
    settledAngles.set(card, (startAngles.get(card) ?? 0) + focusSpin)
  }

  const culls = sessionCards.filter((card) => !kept.includes(card))
  const multi = kept.length > 1
  const endAngles = new Map(
    kept.map((card, index) => [
      card,
      prior
        ? -Math.PI / 2 + index * resultStep - fromOffset
        : settledAngles.get(card) ?? -Math.PI / 2,
    ] as const),
  )

  grid.classList.remove('is-carousel', 'is-orbit')
  grid.classList.add('is-result')
  grid.replaceChildren()
  orbitRing = null
  orbitSlots = []

  for (const card of sessionCards) {
    grid.appendChild(card)
    card.style.position = 'fixed'
    card.style.boxSizing = 'border-box'
    card.style.margin = '0'
    card.style.pointerEvents = 'none'
    card.style.contentVisibility = 'visible'
    card.style.transition = 'none'
    const inner = card.querySelector<HTMLElement>('.CardInnerContainer')
    if (inner) {
      inner.style.transition = 'none'
      inner.style.height = '0%'
      inner.style.width = '0%'
      inner.style.opacity = '0'
    }
  }

  const singleFocus = !multi && !prior

  
  
  for (const card of kept) {
    card.style.display = 'block'
    card.style.opacity = '1'
    card.style.border = '10px solid #ffffff'
    card.style.borderRadius = '24px'
    card.style.boxShadow = '0 0px 30px rgba(0, 0, 0, 0.15)'
    if (singleFocus) continue
    const angle = endAngles.get(card) ?? -Math.PI / 2
    const align = Math.cos(angle + Math.PI / 2)
    placeOnRing(card, resultRing, angle, multi ? 0.9 + 0.1 * Math.max(0, align) : 1)
  }
  for (const card of culls) {
    card.style.display = 'block'
    card.style.opacity = '0'
    card.style.border = '10px solid #ffffff'
    card.style.borderRadius = '24px'
    card.style.boxShadow = '0 0px 30px rgba(0, 0, 0, 0.15)'
    placeOnRing(card, resultRing, settledAngles.get(card) ?? -Math.PI / 2, 0)
  }

  const barrier = settledAngles.get(focusCard) ?? -Math.PI / 2

  return (async () => {
    
    if (singleFocus) {
      const card = focusCard
      const before = card.getBoundingClientRect()
      placeOnRing(card, resultRing, -Math.PI / 2, 1)
      const last = card.getBoundingClientRect()
      if (last.width > 2 && before.width > 2) {
        card.style.transformOrigin = 'top left'
        card.style.transform = `translate(${before.left - last.left}px, ${before.top - last.top}px) scale(${before.width / Math.max(last.width, 1)})`
        void grid.offsetHeight
        card.style.transition = `transform ${motion() ? 0.01 : ORBIT_REORBIT_FOCUS_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
        card.style.transform = 'none'
        await wait(motion() ? 0 : ORBIT_REORBIT_FOCUS_MS)
        if (token !== motionToken) return
        card.style.transition = 'none'
        placeOnRing(card, resultRing, -Math.PI / 2, 1)
      }
      endAngles.set(card, -Math.PI / 2)
    }

    
    const fromAngles = kept.map((card) => endAngles.get(card) ?? -Math.PI / 2)
    const toAngles = kept.map((card) => startAngles.get(card) ?? -Math.PI / 2)
    const slides = fromAngles.map((from, i) => {
      const card = kept[i]!
      const to = toAngles[i]!
      return card === focusCard ? angleDelta(from, to) : arcAvoidingBarrier(from, to, barrier)
    })
    const cullSet = new Set(culls)
    const cullRamp = ORBIT_REORBIT_MS / Math.max(ORBIT_REORBIT_CULL_MS, 1)
    await animateMs(motion() ? 0 : ORBIT_REORBIT_MS, token, (t) => {
      const radius = lerp(resultRing.radius, startRing.radius, t)
      const size = radius * lerp(endRatio, startRatio, t)
      const pose: RingPose = {
        cx: lerp(resultRing.cx, startRing.cx, t),
        cy: lerp(resultRing.cy, startRing.cy, t),
        radius,
        size,
      }
      const cullT = Math.min(1, t * cullRamp)
      const border = lerp(10, ORBIT_THUMB_BORDER * (startRing.size / startMetrics.sizeWide), t)
      const radiusPx = lerp(24, ORBIT_THUMB_RADIUS * (startRing.size / startMetrics.sizeWide), t)
      const shadowY = lerp(0, ORBIT_THUMB_SHADOW_Y * (startRing.size / startMetrics.sizeWide), t)
      const shadowBlur = lerp(30, ORBIT_THUMB_SHADOW_BLUR * (startRing.size / startMetrics.sizeWide), t)
      kept.forEach((card, i) => {
        const live = fromAngles[i]! + slides[i]! * t
        const align = Math.cos(live + Math.PI / 2)
        const scale = multi ? 0.9 + 0.1 * Math.max(0, align) : 1
        card.style.border = `${border}px solid #ffffff`
        card.style.borderRadius = `${radiusPx}px`
        card.style.boxShadow = `0 ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, 0.15)`
        card.style.opacity = '1'
        placeOnRing(card, pose, live, scale)
      })
      for (const card of culls) {
        const angle = (startAngles.get(card) ?? 0) + focusSpin * (1 - t)
        card.style.border = `${border}px solid #ffffff`
        card.style.borderRadius = `${radiusPx}px`
        card.style.boxShadow = `0 ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, 0.15)`
        card.style.opacity = String(cullT)
        placeOnRing(card, pose, angle, cullT)
      }
    })
    if (token !== motionToken) return

    grid.classList.remove('is-result')
    grid.classList.add('is-orbit')
    mountOrbitRing(grid)
    for (const card of sessionCards) {
      card.style.display = 'block'
      card.style.transition = 'none'
      card.style.transform = 'none'
      card.style.opacity = '1'
      thumbCard(card)
    }
    
    orbitStartedAt = performance.now() - ORBIT_INTRO_MS
    runOrbit()
  })()
}

function animateMs(duration: number, token: number, step: (t: number) => void) {
  return new Promise<void>((resolve) => {
    if (motion() || duration <= 0) {
      step(1)
      resolve()
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      if (token !== motionToken) {
        resolve()
        return
      }
      const t = Math.min(1, (now - start) / duration)
      step(easeOutCubic(t))
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
}

export type RevealSessionOptions = {
  onCull?: () => void
}

export function revealSessionCards(
  grid: HTMLElement,
  chosen: HTMLElement[],
  options?: RevealSessionOptions,
) {
  const token = ++motionToken
  disposeCarousel()
  stopOrbit()
  const keep = new Set(chosen.filter((card) => sessionCards.includes(card)))
  const orbitCount = Math.max(sessionCards.length, 1)
  const startMetrics = orbitMetrics(orbitCount)
  const startRing: RingPose = {
    cx: startMetrics.cx,
    cy: startMetrics.cy,
    radius: startMetrics.rx,
    size: startMetrics.size,
  }

  
  const startAngles = new Map<HTMLElement, number>()
  sessionCards.forEach((card, index) => {
    startAngles.set(card, (index / orbitCount) * Math.PI * 2 + orbitSpin - Math.PI / 2)
  })

  grid.classList.remove('is-orbit')
  grid.classList.add('is-result')
  grid.replaceChildren()
  orbitRing = null
  orbitSlots = []

  if (!keep.size) {
    for (const card of sessionCards) {
      grid.appendChild(card)
      card.style.display = 'none'
    }
    options?.onCull?.()
    return
  }

  for (const card of sessionCards) {
    const angle = startAngles.get(card)
    if (angle == null) continue
    grid.appendChild(card)
    card.style.position = 'fixed'
    card.style.boxSizing = 'border-box'
    card.style.margin = '0'
    card.style.opacity = '1'
    card.style.pointerEvents = 'none'
    card.style.contentVisibility = 'visible'
    card.style.display = 'block'
    styleOrbitThumb(card, startRing.size, startMetrics.sizeWide)
    placeOnRing(card, startRing, angle, 1)
  }

  const culls = sessionCards.filter((card) => !keep.has(card))
  const focusCard =
    chosen.find((card) => keep.has(card)) ??
    [...keep][0]!
  
  const settledAngles = new Map<HTMLElement, number>()
  const focusSpin = angleDelta(startAngles.get(focusCard) ?? -Math.PI / 2, -Math.PI / 2)
  for (const card of sessionCards) {
    settledAngles.set(card, (startAngles.get(card) ?? 0) + focusSpin)
  }
  const kept = [...keep].sort(
    (a, b) =>
      ccwDelta(settledAngles.get(focusCard) ?? -Math.PI / 2, settledAngles.get(a) ?? 0) -
      ccwDelta(settledAngles.get(focusCard) ?? -Math.PI / 2, settledAngles.get(b) ?? 0),
  )
  const multi = kept.length > 1

  const endMetrics = multi
    ? carouselMetrics(kept.length)
    : carouselMetrics(1)
  const endRing: RingPose = {
    cx: endMetrics.cx,
    cy: endMetrics.cy,
    radius: endMetrics.radius,
    size: endMetrics.size,
  }
  
  const startRatio = startRing.size / Math.max(startRing.radius, 1)
  const endRatio = endRing.size / Math.max(endRing.radius, 1)
  const endAngles = new Map(
    kept.map((card, index) => [
      card,
      -Math.PI / 2 + index * (multi ? endMetrics.step : 0),
    ] as const),
  )

  void (async () => {
    
    await animateMs(motion() ? 0 : ORBIT_TRAVEL_MS * 0.55, token, (t) => {
      const radius = lerp(startRing.radius, endRing.radius, t)
      const size = radius * lerp(startRatio, endRatio, t)
      const pose: RingPose = {
        cx: lerp(startRing.cx, endRing.cx, t),
        cy: lerp(startRing.cy, endRing.cy, t),
        radius,
        size,
      }
      const spin = focusSpin * t
      const border = lerp(
        ORBIT_THUMB_BORDER * (startRing.size / startMetrics.sizeWide),
        10,
        t,
      )
      const radiusPx = lerp(
        ORBIT_THUMB_RADIUS * (startRing.size / startMetrics.sizeWide),
        24,
        t,
      )
      const shadowY = lerp(
        ORBIT_THUMB_SHADOW_Y * (startRing.size / startMetrics.sizeWide),
        0,
        t,
      )
      const shadowBlur = lerp(
        ORBIT_THUMB_SHADOW_BLUR * (startRing.size / startMetrics.sizeWide),
        30,
        t,
      )
      for (const card of sessionCards) {
        if (card.style.display === 'none') continue
        const angle = (startAngles.get(card) ?? 0) + spin
        card.style.border = `${border}px solid #ffffff`
        card.style.borderRadius = `${radiusPx}px`
        card.style.boxShadow = `0 ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, 0.15)`
        placeOnRing(card, pose, angle, 1)
      }
    })
    if (token !== motionToken) return

    
    for (const card of sessionCards) {
      if (card.style.display === 'none') continue
      const angle = settledAngles.get(card)
      if (angle == null) continue
      card.style.border = '10px solid #ffffff'
      card.style.borderRadius = '24px'
      card.style.boxShadow = '0 0px 30px rgba(0, 0, 0, 0.15)'
      placeOnRing(card, endRing, angle, 1)
    }

    options?.onCull?.()

    
    await animateMs(motion() ? 0 : 420, token, (t) => {
      const scale = 1 - t
      for (const card of culls) {
        const angle = settledAngles.get(card)
        if (angle == null) continue
        placeOnRing(card, endRing, angle, scale)
        card.style.opacity = String(1 - t)
      }
    })
    if (token !== motionToken) return
    for (const card of culls) card.style.display = 'none'

    // Never slide through the focused card at the top.
    const barrier = settledAngles.get(focusCard) ?? -Math.PI / 2
    const fromAngles = kept.map((card) => settledAngles.get(card) ?? -Math.PI / 2)
    const toAngles = kept.map((card) => endAngles.get(card)!)
    const slides = fromAngles.map((from, i) =>
      kept[i] === focusCard ? 0 : arcAvoidingBarrier(from, toAngles[i]!, barrier),
    )
    await animateMs(motion() ? 0 : ORBIT_TRAVEL_MS * 0.55, token, (t) => {
      kept.forEach((card, i) => {
        const live = fromAngles[i]! + slides[i]! * t
        const align = Math.cos(live + Math.PI / 2)
        const scale = multi ? 0.9 + 0.1 * Math.max(0, align) : 1
        placeOnRing(card, endRing, live, scale)
      })
    })
    if (token !== motionToken) return

    kept.forEach((card) => {
      styleCarouselCard(card, endRing.size)
      const angle = endAngles.get(card)!
      const align = Math.cos(angle + Math.PI / 2)
      placeOnRing(card, endRing, angle, multi ? 0.9 + 0.1 * Math.max(0, align) : 1)
    })
    mountCarousel(grid, kept)
  })()
}

export function releaseFolioFocus() {
  motionToken += 1
  disposeCarousel()
  stopOrbit()
  if (sessionUndo) {
    const undo = sessionUndo
    sessionUndo = null
    undo()
  }
  if (document.querySelector('.CardStackLabelContainer.expanded')) {
    window.collapseExpandedStack?.()
  }
}
