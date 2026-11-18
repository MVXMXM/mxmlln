import { targetForCardUrl, type FolioTarget } from '@/content/folio-card-map'

declare global {
  interface Window {
    __folioReady?: boolean
    __folioBootStarted?: boolean
    mountScrollThumb?: () => void
    disposeScrollThumb?: () => void
    expandCardStackLabelContainer?: (container: Element) => void
    collapseExpandedStack?: () => void
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

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function clean(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

async function whenFolioReady() {
  const started = Date.now()
  while (!window.__folioReady && Date.now() - started < 4000) {
    await wait(50)
  }
  if (!window.__folioReady || !window.expandCardStackLabelContainer) {
    throw new Error('folio engine unavailable')
  }
}

function findPile(label: string) {
  const piles = document.querySelectorAll('.CardStackLabelContainer')
  for (const pile of piles) {
    const text = pile.querySelector('.CardStackLabelContainerValue')?.textContent ?? ''
    if (clean(text) === label) return pile
  }
  return null
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

export type FolioFocus = {
  mode: 'card' | 'pile' | 'stack'
  pile: HTMLElement
  card: HTMLElement | null
  cards?: HTMLElement[]
}

const FAN_ROTATION = [-12, 8, -5, 14, -9, 6]

type SavedStyle = { el: HTMLElement; style: string | null }

let generation = 0
let undoPile: (() => void) | null = null

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

function scrollToNode(node: Element) {
  const rect = node.getBoundingClientRect()
  const top = window.scrollY + rect.top - 120
  window.scrollTo(0, Math.max(0, top))
}

let motionToken = 0
let sessionUndo: (() => void) | null = null
let sessionCards: HTMLElement[] = []
let orbitRing: HTMLElement | null = null
let orbitFrame = 0
let orbitSpin = 0
let orbitSlots: HTMLElement[] = []
let orbitStartedAt = 0

type CarouselState = {
  cards: HTMLElement[]
  /** Unconstrained offset — may overshoot ends; paint applies rubber for display. */
  offset: number
  /** Spring rest target (usually an index * step). */
  rest: number
  velocity: number
  size: number
  radius: number
  step: number
  cx: number
  cy: number
  grid: HTMLElement
  springFrame: number
  /** Wheel input stays “live” until this timestamp (ms). */
  inputUntil: number
  /** Index at the start of the current interaction — one flick stays within ±1. */
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
  } | null
  dispose: () => void
}

type RingPose = {
  cx: number
  cy: number
  radius: number
  size: number
}

/** Clear space between neighboring cards’ bottom edges (which face the ring center). */
const CAROUSEL_GUTTER_PX = 40
/** Autoplay dwell — progress fill on the active pill is the clock. */
const CAROUSEL_AUTOPLAY_MS = 4500
const CAROUSEL_WHEEL_GAIN = 0.005
const CAROUSEL_DRAG_GAIN = 0.01
/** Commit to the neighbor before halfway when the flick is decisive (px/ms). */
const CAROUSEL_FLICK_VELOCITY = 0.55
/** Fraction of a step that counts as intent toward the neighbor. */
const CAROUSEL_COMMIT_FRAC = 0.18
/** Keep wheel “live” briefly so the spring doesn’t fight mid-flick (inside bounds only). */
const CAROUSEL_WHEEL_LIVE_MS = 50
/** Spring toward rest — snappy, critically-ish damped. */
const CAROUSEL_STIFFNESS = 420
const CAROUSEL_DAMPING = 36
/** Past absolute ends — stiffer so rubber returns don’t linger like a page snap. */
const CAROUSEL_EDGE_STIFFNESS = 980
const CAROUSEL_EDGE_DAMPING = 48

let carousel: CarouselState | null = null
let carouselStepper: HTMLElement | null = null
let carouselPlaying = false
let carouselStepperIndex = -1
let carouselProgress: Animation | null = null

const PLAY_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13l11-6.5z"/></svg>'
const PAUSE_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 5.5h3.5v13H7zm6.5 0H17v13h-3.5z"/></svg>'

/** Settle onto the ring, then hold it before any reveal may start. */
export const ORBIT_INTRO_MS = 900
export const ORBIT_HOLD_MS = 2000
export const ORBIT_TRAVEL_MS = 1500
export const ORBIT_ENLARGE_MS = 700
export const ORBIT_REVEAL_MS = ORBIT_TRAVEL_MS + ORBIT_ENLARGE_MS

export function folioSessionOpen() {
  return sessionUndo !== null
}

export function orbitRevealWaitMs() {
  // After a reveal the clock is stale; don't treat an old start as "hold already done".
  const orbiting = document.querySelector('.folio-masonry.is-orbit')
  if (!orbitStartedAt || !orbiting) return ORBIT_INTRO_MS + ORBIT_HOLD_MS
  return Math.max(0, orbitStartedAt + ORBIT_INTRO_MS + ORBIT_HOLD_MS - performance.now())
}

/** Start a fresh hold while the ring is already spinning (empty chat → first send). */
export function armOrbitHold() {
  if (!document.querySelector('.folio-masonry.is-orbit')) return
  orbitStartedAt = performance.now() - ORBIT_INTRO_MS
}

function stopOrbit() {
  if (orbitFrame) cancelAnimationFrame(orbitFrame)
  orbitFrame = 0
}

function orbitMetrics(count: number) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const size = Math.min(112, Math.max(72, Math.min(vw, vh) / Math.max(8, Math.sqrt(count) * 2.2)))
  // One radius for both axes so the ring stays round and may spill past the short sides.
  const radius = Math.max(vw, vh) / 2 - size * 0.2
  return {
    size,
    rx: Math.max(size, radius),
    ry: Math.max(size, radius),
    cx: vw / 2,
    cy: vh / 2,
  }
}

function placeOrbitSlot(slot: HTMLElement, index: number, total: number, spin: number, metrics: ReturnType<typeof orbitMetrics>) {
  const angle = (index / total) * Math.PI * 2 + spin - Math.PI / 2
  const x = metrics.cx + Math.cos(angle) * metrics.rx - metrics.size / 2
  const y = metrics.cy + Math.sin(angle) * metrics.ry - metrics.size / 2
  // Bottom of the card faces the ring center (top points outward).
  const rotate = angle + Math.PI / 2
  slot.style.width = `${metrics.size}px`
  slot.style.height = `${metrics.size}px`
  slot.style.transformOrigin = 'center center'
  slot.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotate}rad)`
}

function paintOrbit(spin: number) {
  if (!orbitSlots.length) return
  const metrics = orbitMetrics(orbitSlots.length)
  orbitSlots.forEach((slot, index) => placeOrbitSlot(slot, index, orbitSlots.length, spin, metrics))
}

function runOrbit() {
  stopOrbit()
  if (motion()) {
    paintOrbit(orbitSpin)
    return
  }
  const tick = () => {
    orbitSpin += 0.0028
    paintOrbit(orbitSpin)
    orbitFrame = requestAnimationFrame(tick)
  }
  orbitFrame = requestAnimationFrame(tick)
}

function thumbCard(card: HTMLElement) {
  card.style.boxSizing = 'border-box'
  card.style.position = 'relative'
  card.style.left = 'auto'
  card.style.top = 'auto'
  card.style.display = 'block'
  card.style.width = '100%'
  card.style.height = '100%'
  card.style.aspectRatio = '1'
  card.style.margin = '0'
  card.style.border = '4px solid #ffffff'
  card.style.borderRadius = '16px'
  card.style.boxShadow = '0 8px 18px rgba(0, 0, 0, 0.12)'
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

function featuredTransform(index: number, total: number) {
  if (total < 2) return 'none'
  const scale = index > 2 ? 1 - ((index - 2) / Math.min(total - 2, 97)) * 0.25 : 1
  return `rotate(${FAN_ROTATION[index] ?? 0}deg) scale(${scale.toFixed(2)})`
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

function ensureSession(grid: HTMLElement) {
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
      grid.classList.remove('is-result', 'is-orbit', 'is-carousel')
      page()?.classList.remove('is-folio-session')
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
  ensureSession(grid)
  grid.classList.remove('is-result')
  grid.classList.add('is-orbit')
  window.scrollTo(0, 0)
  stopOrbit()
  orbitSpin = 0
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
  carouselStepper?.remove()
  carouselStepper = null
  if (!carousel) return
  carousel.dispose()
  carousel = null
}

function syncPlayButton() {
  const button = carouselStepper?.querySelector<HTMLButtonElement>('.folio-carousel-play')
  if (!button) return
  button.innerHTML = carouselPlaying ? PAUSE_ICON : PLAY_ICON
  button.setAttribute('aria-label', carouselPlaying ? 'Pause gallery' : 'Play gallery')
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
  syncPlayButton()
}

function playCarouselAutoplay() {
  if (!carousel || !carouselStepper) return
  carouselPlaying = true
  syncPlayButton()
  restartCarouselProgress()
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
  if (!fill) return
  // Circle (= track height) grows into the full capsule so the ends stay round.
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
  if (!carouselStepper || !carousel) return
  const active = activeOverride ?? activeCarouselIndex()
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

/** Keep pill width stable: one elongated active + the rest as dots. */
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
  carouselStepper?.remove()
  carouselStepperIndex = -1
  if (count < 2) {
    carouselStepper = null
    carouselPlaying = false
    return
  }
  const root = document.createElement('div')
  root.className = 'folio-carousel-stepper'
  root.setAttribute('aria-label', 'Result cards')

  const play = document.createElement('button')
  play.type = 'button'
  play.className = 'folio-carousel-play'
  play.addEventListener('click', (event) => {
    event.preventDefault()
    if (carouselPlaying) pauseCarouselAutoplay()
    else playCarouselAutoplay()
  })
  root.appendChild(play)

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

  document.body.appendChild(root)
  carouselStepper = root
  syncCarouselStepperPos()
  // Enter after paint so the Apple-style expand can play.
  requestAnimationFrame(() => {
    root.classList.add('is-in')
    syncCarouselStepperPos()
  })
  carouselPlaying = !motion()
  syncPlayButton()
  syncCarouselStepper()
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

/**
 * Shared focus geometry — card centered on the 16px grid; reply column & stepper
 * keep relative gaps but snap their edges onto the same lattice.
 */
export function folioFocusMetrics() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  // Even grid units so size/2 stays on-lattice (edges + center share the grid).
  let size = snapFolioGrid(Math.min(336, Math.max(256, vw * 0.38)))
  if ((size / FOLIO_GRID) % 2 !== 0) size -= FOLIO_GRID
  const cardTop = snapFolioGrid(vh / 2 - size / 2)
  const cardLeft = snapFolioGrid(vw / 2 - size / 2)
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
  return (
    document.querySelector<HTMLElement>('.mx-dock .dockCluster')?.getBoundingClientRect().top ??
    window.innerHeight - 88
  )
}

function syncCarouselStepperPos() {
  if (!carouselStepper || !carousel) return
  const { cardBottom } = folioFocusMetrics()
  const mid = (cardBottom + dockTopY()) / 2
  const height = carouselStepper.offsetHeight || 60
  carouselStepper.style.top = `${snapFolioGrid(mid - height / 2)}px`
  carouselStepper.style.bottom = 'auto'
}

function carouselMetrics(_count: number) {
  const { size, focusX, focusY } = folioFocusMetrics()
  const vh = window.innerHeight
  // Circle center sits below the focus so the on-state rests at viewport center.
  const radius = Math.max(vh * 0.78, size * 2.05)
  // Bottoms face the center — space those inner edges by a fixed gutter along the arc.
  const rInner = Math.max(radius - size / 2, 1)
  const half = Math.atan(size / 2 / rInner)
  const step = CAROUSEL_GUTTER_PX / rInner + 2 * half
  return { size, radius, step, cx: focusX, cy: focusY + radius, focusX, focusY }
}

function styleCarouselCard(card: HTMLElement, size: number) {
  card.style.boxSizing = 'border-box'
  card.style.position = 'fixed'
  card.style.margin = '0'
  card.style.width = `${size}px`
  card.style.height = `${size}px`
  card.style.border = '10px solid #ffffff'
  card.style.borderRadius = '24px'
  card.style.boxShadow = '0 0px 30px rgba(0, 0, 0, 0.15)'
  card.style.opacity = '1'
  card.style.display = 'block'
  card.style.pointerEvents = 'auto'
  card.style.cursor = 'pointer'
  card.style.contentVisibility = 'visible'
  card.style.transformOrigin = 'center center'
  const inner = card.querySelector<HTMLElement>('.CardInnerContainer')
  if (inner) {
    inner.style.height = '100%'
    inner.style.width = '100%'
    inner.style.opacity = '1'
  }
}

function carouselBounds() {
  if (!carousel?.cards.length) return { min: 0, max: 0 }
  return { min: 0, max: Math.max(0, (carousel.cards.length - 1) * carousel.step) }
}

/** Map a logical offset past the ends into a diminishing overscroll. */
function rubberDisplayOffset(logical: number) {
  const { min, max } = carouselBounds()
  if (logical < min) {
    const over = min - logical
    return min - (over * 0.42) / (1 + over * 2.8)
  }
  if (logical > max) {
    const over = logical - max
    return max + (over * 0.42) / (1 + over * 2.8)
  }
  return logical
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** Shortest signed delta from one angle to another. */
function angleDelta(from: number, to: number) {
  const tau = Math.PI * 2
  return ((((to - from) + Math.PI) % tau) + tau) % tau - Math.PI
}

function meanAngle(angles: number[]) {
  if (!angles.length) return 0
  let x = 0
  let y = 0
  for (const angle of angles) {
    x += Math.cos(angle)
    y += Math.sin(angle)
  }
  return Math.atan2(y / angles.length, x / angles.length)
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
  // Display is rubbered; stored offset may still overshoot so the spring can pull it back.
  const offset = rubberDisplayOffset(logical)
  const pose: RingPose = { cx, cy, radius, size }
  cards.forEach((card, index) => {
    const angle = -Math.PI / 2 + index * step - offset
    const align = Math.cos(angle + Math.PI / 2)
    const scale = 0.9 + 0.1 * Math.max(0, align)
    placeOnRing(card, pose, angle, scale)
  })
  carousel.offset = logical
  syncCarouselStepper(stepperIndex)
}

function stopCarouselSpring() {
  if (!carousel?.springFrame) return
  cancelAnimationFrame(carousel.springFrame)
  carousel.springFrame = 0
}

/**
 * Soft ±1 window around the current interaction origin.
 * Past absolute ends, keep raw overshoot so paint can rubber.
 */
function applyCarouselInput(raw: number, originIndex: number) {
  if (!carousel) return raw
  const { step } = carousel
  const { min, max } = carouselBounds()
  const lo = Math.max(min, (originIndex - 1) * step)
  const hi = Math.min(max, (originIndex + 1) * step)
  if (raw < lo) {
    if (lo <= min) return raw
    const over = lo - raw
    return lo - (over * 0.32) / (1 + over * 3.2)
  }
  if (raw > hi) {
    if (hi >= max) return raw
    const over = raw - hi
    return hi + (over * 0.32) / (1 + over * 3.2)
  }
  return raw
}

/** One interaction → at most a neighbor; velocity only tips the commit. */
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
  const { min, max } = carouselBounds()
  if (carousel.offset > max) {
    carousel.rest = max
    return
  }
  if (carousel.offset < min) {
    carousel.rest = min
    return
  }
  carousel.rest =
    resolveGestureSnapIndex(carousel.offset, carousel.gestureOrigin, velocity) * carousel.step
}

/** Continuous spring — inside bounds, input owns offset until release; past ends, spring always runs. */
function ensureCarouselSpring() {
  if (!carousel || carousel.springFrame) return
  let last = performance.now()
  const tick = (now: number) => {
    if (!carousel) return
    const dt = Math.min(0.032, Math.max(0.008, (now - last) / 1000))
    last = now
    const { min, max } = carouselBounds()
    const overscrolled = carousel.offset > max || carousel.offset < min
    const inputLive = !!carousel.drag || now < carousel.inputUntil

    // Free paging: track 1:1 while the gesture is live. Edge rubber never waits on that gate.
    if (inputLive && !overscrolled) {
      carousel.velocity = 0
      paintCarousel(carousel.offset)
      carousel.springFrame = requestAnimationFrame(tick)
      return
    }

    if (carousel.offset > max) carousel.rest = max
    else if (carousel.offset < min) carousel.rest = min

    const stiffness = overscrolled ? CAROUSEL_EDGE_STIFFNESS : CAROUSEL_STIFFNESS
    const damping = overscrolled ? CAROUSEL_EDGE_DAMPING : CAROUSEL_DAMPING
    const delta = carousel.rest - carousel.offset
    const accel = stiffness * delta - damping * carousel.velocity
    carousel.velocity += accel * dt
    carousel.offset += carousel.velocity * dt

    if (Math.abs(delta) < 0.0004 && Math.abs(carousel.velocity) < 0.02) {
      carousel.offset = carousel.rest
      carousel.velocity = 0
      paintCarousel(carousel.rest)
      carousel.springFrame = 0
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
  const { min, max } = carouselBounds()
  const clamped = Math.min(max, Math.max(min, rubberDisplayOffset(carousel.offset)))
  const i = Math.round(clamped / step)
  return Math.min(cards.length - 1, Math.max(0, i))
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
    const now = performance.now()
    // New interaction once the live window lapses — re-arm even mid-spring so flick-flick isn’t blocked.
    if (now >= carousel.inputUntil) {
      carousel.gestureOrigin = activeCarouselIndex()
    }
    const delta = (event.deltaY + event.deltaX) * CAROUSEL_WHEEL_GAIN
    carousel.offset = applyCarouselInput(carousel.offset + delta, carousel.gestureOrigin)
    carousel.inputUntil = now + CAROUSEL_WHEEL_LIVE_MS
    carousel.velocity = 0
    advanceGestureOriginIfNeeded()
    syncCarouselRestFromOffset()
    paintCarousel(carousel.offset)
    ensureCarouselSpring()
  }

  const onPointerDown = (event: PointerEvent) => {
    if (!carousel) return
    if (!(event.target instanceof Element)) return
    const card = event.target.closest('.Card') as HTMLElement | null
    if (!card || !carousel.cards.includes(card)) return
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
    }
    card.setPointerCapture?.(event.pointerId)
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
    const instant = (event.clientX - drag.lastX + (event.clientY - drag.lastY)) / dt
    drag.velocity = drag.velocity * 0.65 + instant * 0.35
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    drag.lastT = now
    // Keep drag origin fixed for the press; ±1 only. Lift + press again to go further.
    carousel.offset = applyCarouselInput(
      drag.offset + (dx + dy) * CAROUSEL_DRAG_GAIN,
      carousel.gestureOrigin,
    )
    syncCarouselRestFromOffset(drag.velocity)
    paintCarousel(carousel.offset)
    ensureCarouselSpring()
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!carousel?.drag) return
    const drag = carousel.drag
    carousel.drag = null
    const card = event.target instanceof Element ? (event.target.closest('.Card') as HTMLElement | null) : null
    if (!drag.moved && card && carousel.cards.includes(card)) {
      const index = carousel.cards.indexOf(card)
      if (index !== activeCarouselIndex()) {
        event.preventDefault()
        event.stopPropagation()
        snapCarousel(index)
        return
      }
      return
    }
    syncCarouselRestFromOffset(drag.velocity)
    carousel.inputUntil = 0
    ensureCarouselSpring()
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
  grid.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('resize', onResize)

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
      grid.removeEventListener('wheel', onWheel)
      grid.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('resize', onResize)
      grid.classList.remove('is-carousel')
    },
  }
  paintCarousel(0)
}

/** Inverse of reveal: shrink featured cards, refill the ring from the edges, then spin. */
export function reorbitSession(grid: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const token = ++motionToken
    disposeCarousel()
    stopOrbit()
    ensureSession(grid)
    window.scrollTo(0, 0)
    orbitSpin = 0
    grid.classList.remove('is-carousel')

    const shrink = motion() ? 0 : ORBIT_ENLARGE_MS
    const travel = motion() ? 0 : ORBIT_TRAVEL_MS
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    const exit = Math.hypot(window.innerWidth, window.innerHeight) * 0.72
    const metrics = orbitMetrics(sessionCards.length)
    const thumb = metrics.size

    const featured = sessionCards.filter((card) => {
      if (card.style.display === 'none') return false
      const rect = card.getBoundingClientRect()
      return rect.width > 2 && rect.height > 2
    })
    const featuredSet = new Set(featured)

    // Phase 1: collapse featured cards to thumb size in place (inverse enlarge).
    for (const card of featured) {
      const rect = card.getBoundingClientRect()
      const scale = thumb / Math.max(rect.width, 1)
      card.style.transition = `transform ${shrink}ms cubic-bezier(0.22, 1, 0.36, 1)`
      card.style.transformOrigin = 'center center'
      card.style.transform = `scale(${scale})`
      card.style.pointerEvents = 'none'
      const inner = card.querySelector<HTMLElement>('.CardInnerContainer')
      if (inner) {
        inner.style.transition = `opacity ${shrink}ms ease, width ${shrink}ms ease, height ${shrink}ms ease`
        inner.style.opacity = '0'
        inner.style.width = '0%'
        inner.style.height = '0%'
      }
    }

    window.setTimeout(() => {
      if (token !== motionToken) {
        resolve()
        return
      }

      // Capture where featured thumbs sit after the shrink.
      const from = new Map<HTMLElement, DOMRect>()
      for (const card of featured) from.set(card, card.getBoundingClientRect())

      grid.classList.remove('is-result')
      grid.classList.add('is-orbit')
      mountOrbitRing(grid)

      for (const card of sessionCards) {
        card.style.display = 'block'
        thumbCard(card)
      }

      const outside = (card: HTMLElement, rect: DOMRect | undefined) => {
        const slot = card.getBoundingClientRect()
        if (rect && rect.width > 2) {
          const dx = rect.left - slot.left
          const dy = rect.top - slot.top
          const scale = rect.width / Math.max(slot.width, 1)
          card.style.transformOrigin = 'top left'
          card.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`
          card.style.opacity = '1'
          return
        }
        // Rejects re-enter from the same radial exit they left on.
        const mx = slot.left + slot.width / 2 - cx
        const my = slot.top + slot.height / 2 - cy
        const len = Math.hypot(mx, my) || 1
        const dx = (mx / len) * exit - mx
        const dy = (my / len) * exit - my
        card.style.transformOrigin = 'center center'
        card.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(0.72)`
        card.style.opacity = '0'
      }

      for (const card of sessionCards) {
        outside(card, featuredSet.has(card) ? from.get(card) : undefined)
      }
      void grid.offsetHeight

      for (const card of sessionCards) {
        card.style.transition = `transform ${travel}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${travel}ms ease`
        card.style.transform = 'none'
        card.style.opacity = '1'
      }

      window.setTimeout(() => {
        if (token !== motionToken) {
          resolve()
          return
        }
        for (const card of sessionCards) {
          card.style.transition = 'none'
          card.style.transform = 'none'
        }
        // Intro already played as shrink+travel — only the hold remains.
        orbitStartedAt = performance.now() - ORBIT_INTRO_MS
        runOrbit()
        resolve()
      }, travel || 40)
    }, shrink || 40)
  })
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
  /** Runs after the circle settles into the result pose (e.g. stream the blurb). */
  afterTravel?: () => Promise<void>
  /** Re-read gather top after afterTravel (single-card path). */
  gatherTop?: () => number
}

export function revealSessionCards(
  grid: HTMLElement,
  chosen: HTMLElement[],
  top: number,
  options?: RevealSessionOptions,
) {
  const token = ++motionToken
  disposeCarousel()
  stopOrbit()
  const enlarge = motion() ? '0.01s' : `${ORBIT_ENLARGE_MS}ms`
  const keep = new Set(chosen.filter((card) => sessionCards.includes(card)))
  const orbitCount = Math.max(sessionCards.length, 1)
  const startMetrics = orbitMetrics(orbitCount)
  const startRing: RingPose = {
    cx: startMetrics.cx,
    cy: startMetrics.cy,
    radius: startMetrics.rx,
    size: startMetrics.size,
  }

  // Preserve each card's orbit angle before leaving slots.
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
    void options?.afterTravel?.()
    return
  }

  for (const card of sessionCards) {
    const angle = startAngles.get(card)
    if (angle == null) continue
    grid.appendChild(card)
    card.style.position = 'fixed'
    card.style.boxSizing = 'border-box'
    card.style.margin = '0'
    card.style.border = '4px solid #ffffff'
    card.style.borderRadius = '16px'
    card.style.boxShadow = '0 8px 18px rgba(0, 0, 0, 0.12)'
    card.style.opacity = '1'
    card.style.pointerEvents = 'none'
    card.style.contentVisibility = 'visible'
    card.style.display = 'block'
    placeOnRing(card, startRing, angle, 1)
  }

  const culls = sessionCards.filter((card) => !keep.has(card))
  // Keep angular order so neighbors stay neighbors while clustering at the top.
  const kept = [...keep].sort(
    (a, b) => (startAngles.get(a) ?? 0) - (startAngles.get(b) ?? 0),
  )
  const multi = kept.length > 1

  const focus = folioFocusMetrics()
  const endMetrics = multi
    ? carouselMetrics(kept.length)
    : (() => {
        const size = focus.size
        const radius = Math.max(window.innerHeight * 0.78, size * 2.05)
        return {
          size,
          radius,
          step: 0,
          cx: focus.focusX,
          cy: focus.cardTop + size / 2 + radius,
        }
      })()
  const endRing: RingPose = {
    cx: endMetrics.cx,
    cy: endMetrics.cy,
    radius: endMetrics.radius,
    size: endMetrics.size,
  }
  const endAngles = new Map(
    kept.map((card, index) => [card, -Math.PI / 2 + index * endMetrics.step] as const),
  )

  void (async () => {
    // 1) Cull rejects in place — shrink to 0×0 on the loading ring.
    await animateMs(motion() ? 0 : 420, token, (t) => {
      const scale = 1 - t
      for (const card of culls) {
        const angle = startAngles.get(card)
        if (angle == null) continue
        placeOnRing(card, startRing, angle, scale)
        card.style.opacity = String(1 - t)
      }
    })
    if (token !== motionToken) return
    for (const card of culls) card.style.display = 'none'

    // 2) Grow + drop the rig while kept cards slide on it: rigid rotate to the
    //    top, then compress spacing — always painted from shared polar pose.
    const fromAngles = kept.map((card) => startAngles.get(card) ?? -Math.PI / 2)
    const toAngles = kept.map((card) => endAngles.get(card)!)
    const rigidShift = angleDelta(meanAngle(fromAngles), meanAngle(toAngles))
    const midAngles = fromAngles.map((angle) => angle + rigidShift)
    await animateMs(motion() ? 0 : ORBIT_TRAVEL_MS, token, (t) => {
      const pose: RingPose = {
        cx: lerp(startRing.cx, endRing.cx, t),
        cy: lerp(startRing.cy, endRing.cy, t),
        radius: lerp(startRing.radius, endRing.radius, t),
        size: lerp(startRing.size, endRing.size, t),
      }
      // First half: rotate the kept arc as one piece. Second: close the gaps.
      const compress = t < 0.45 ? 0 : (t - 0.45) / 0.55
      const rigidT = Math.min(1, t / 0.45)
      const border = lerp(4, 10, t)
      const radiusPx = lerp(16, 24, t)
      kept.forEach((card, i) => {
        const live = compress > 0
          ? midAngles[i]! + angleDelta(midAngles[i]!, toAngles[i]!) * compress
          : fromAngles[i]! + rigidShift * rigidT
        const align = Math.cos(live + Math.PI / 2)
        const scale = multi ? 0.9 + 0.1 * Math.max(0, align) : 1
        card.style.border = `${border}px solid #ffffff`
        card.style.borderRadius = `${radiusPx}px`
        card.style.boxShadow = '0 0px 30px rgba(0, 0, 0, 0.15)'
        placeOnRing(card, pose, live, scale)
        const inner = card.querySelector<HTMLElement>('.CardInnerContainer')
        if (inner) {
          const open = `${Math.round(t * 100)}%`
          inner.style.height = open
          inner.style.width = open
          inner.style.opacity = String(t)
        }
      })
    })
    if (token !== motionToken) return

    if (multi) {
      kept.forEach((card) => {
        styleCarouselCard(card, endRing.size)
        card.style.pointerEvents = 'none'
      })
      kept.forEach((card) => {
        const angle = endAngles.get(card)!
        const align = Math.cos(angle + Math.PI / 2)
        placeOnRing(card, endRing, angle, 0.9 + 0.1 * Math.max(0, align))
      })
      if (options?.afterTravel) {
        await options.afterTravel()
        if (token !== motionToken) return
      }
      mountCarousel(grid, kept)
      return
    }

    const card = kept[0]
    if (!card) {
      await options?.afterTravel?.()
      return
    }

    // At the top of the circle, bottoms-to-center is already upright.
    placeOnRing(card, endRing, -Math.PI / 2, 1)
    card.style.border = '10px solid #ffffff'
    card.style.borderRadius = '24px'
    card.style.boxShadow = '0 0px 30px rgba(0, 0, 0, 0.15)'

    if (options?.afterTravel) {
      await options.afterTravel()
      if (token !== motionToken) return
    }

    const settle = folioFocusMetrics()
    const before = card.getBoundingClientRect()
    card.style.transition = 'none'
    card.style.left = `${settle.focusX - settle.size / 2}px`
    card.style.top = `${settle.cardTop}px`
    card.style.width = `${settle.size}px`
    card.style.height = `${settle.size}px`
    card.style.transform = 'none'
    card.style.zIndex = '30'
    card.style.pointerEvents = 'auto'
    card.style.cursor = ''
    const inner = card.querySelector<HTMLElement>('.CardInnerContainer')
    if (inner) {
      inner.style.height = '100%'
      inner.style.width = '100%'
      inner.style.opacity = '1'
    }
    const last = card.getBoundingClientRect()
    if (last.width > 2 && before.width > 2) {
      card.style.transformOrigin = 'top left'
      card.style.transform = `translate(${before.left - last.left}px, ${before.top - last.top}px) scale(${before.width / Math.max(last.width, 1)})`
      void grid.offsetHeight
      card.style.transition = `transform ${enlarge} cubic-bezier(0.22, 1, 0.36, 1)`
      card.style.transform = 'none'
      card.style.transformOrigin = 'center center'
    }
  })()
}

export function releaseFolioFocus() {
  generation += 1
  motionToken += 1
  disposeCarousel()
  stopOrbit()
  page()?.classList.remove('is-folio-focus')
  document.querySelectorAll('.Card.is-picked, .is-scanning').forEach((el) => {
    el.classList.remove('is-picked', 'is-scanning')
  })
  if (sessionUndo) {
    const undo = sessionUndo
    sessionUndo = null
    undo()
  }
  if (undoPile) {
    const undo = undoPile
    undoPile = null
    undo()
    return
  }
  if (document.querySelector('.CardStackLabelContainer.expanded')) {
    window.collapseExpandedStack?.()
  }
}

export async function stageFolioFocus(
  target: FolioTarget,
  live: () => boolean,
): Promise<FolioFocus | null> {
  await whenFolioReady()
  if (!live()) return null
  const pile = findPile(target.pile) as HTMLElement | null
  const expand = window.expandCardStackLabelContainer
  if (!pile || !expand) throw new Error('folio card missing')

  if (!target.title) {
    scrollToNode(pile)
    if (!motion()) await wait(550)
    if (!live()) return null
    return { mode: 'pile', pile, card: null }
  }

  page()?.classList.add('is-folio-focus')
  const expanded = document.querySelector('.CardStackLabelContainer.expanded')
  if (expanded && expanded !== pile) {
    window.collapseExpandedStack?.()
    await wait(motion() ? 20 : 450)
    if (!live()) return null
  }
  if (!pile.classList.contains('expanded')) {
    expand(pile)
    await wait(motion() ? 40 : 700)
    if (!live()) return null
  }

  const card = (findCard(pile, target.title, target.badge) ?? pile.querySelector('.Card')) as HTMLElement | null
  if (!card) return { mode: 'pile', pile, card: null }
  scrollToNode(card)
  if (!motion()) await wait(550)
  if (!live()) return null
  return { mode: 'card', pile, card }
}

export async function stageFolioAnswer(
  urls: string[],
  live: () => boolean,
): Promise<FolioFocus | null> {
  const titled: FolioTarget[] = []
  const seen = new Set<string>()
  for (const url of urls.slice(0, 6)) {
    const target = targetForCardUrl(url)
    if (!target?.title) continue
    const key = `${target.pile}\0${target.title}\0${target.badge ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    titled.push(target)
  }
  if (titled.length > 1) {
    await whenFolioReady()
    if (!live()) return null
    const cards = titled.flatMap((target) => {
      const pile = findPile(target.pile)
      const card = pile ? findCard(pile, target.title ?? '', target.badge) : null
      return card ? [card as HTMLElement] : []
    })
    if (cards.length > 1) {
      const pile = cards[0].closest('.CardStackLabelContainer') as HTMLElement | null
      if (!pile) return null
      scrollToNode(pile)
      if (!motion()) await wait(400)
      if (!live()) return null
      return { mode: 'stack', pile, card: null, cards }
    }
  }
  const target = titled[0] ?? targetForCardUrl(urls[0])
  if (!target) return null
  return stageFolioFocus(target, live)
}

let playedGeneration = -1

function play(change: () => void) {
  const token = generation
  let played = false
  const run = () => {
    if (played || token !== generation) return
    played = true
    change()
    playedGeneration = token
  }
  // rAF does not run while the tab is in the background, so a timeout applies the same change.
  requestAnimationFrame(run)
  window.setTimeout(run, 40)
}

export function focusHasSettled() {
  return playedGeneration === generation
}

function zeroCard(card: HTMLElement, duration: string) {
  card.style.transition = `all ${duration} ease`
  card.style.width = '0px'
  card.style.height = '0px'
  card.style.margin = '0px'
  card.style.transform = 'none'
  card.style.border = '0px solid transparent'
  card.style.boxShadow = 'none'
}

export function settleFolioFocus(focus: FolioFocus, viewportTop: number) {
  page()?.classList.add('is-folio-focus')
  const reduce = motion()
  const duration = reduce ? '0.01s' : '0.35s'
  if (focus.mode === 'card' && focus.card) {
    settleCard(focus.pile, focus.card, viewportTop, duration)
    return
  }
  if (focus.mode === 'stack' && focus.cards && focus.cards.length > 1) {
    settleStack(focus.pile, focus.cards, viewportTop, duration)
    return
  }
  settlePile(focus.pile, viewportTop, duration)
}

function pinMargin(el: HTMLElement, anchor: HTMLElement, viewportTop: number) {
  el.style.transition = 'none'
  for (let i = 0; i < 4; i++) {
    const delta = viewportTop - anchor.getBoundingClientRect().top
    if (Math.abs(delta) < 1) return
    const margin = parseFloat(getComputedStyle(el).marginTop) || 0
    el.style.marginTop = `${margin + delta}px`
  }
}

function settleCard(pile: HTMLElement, card: HTMLElement, viewportTop: number, duration: string) {
  const stack = card.closest('.CardStack') as HTMLElement | null
  if (!stack) return
  const cards = [...pile.querySelectorAll<HTMLElement>('.Card')]

  play(() => {
    const first = card.getBoundingClientRect()
    pile.style.justifyContent = 'flex-start'
    cards.forEach((el) => {
      if (el === card) return
      zeroCard(el, '0s')
      el.style.transition = 'none'
    })
    stack.style.gap = '0px'
    stack.style.marginLeft = '0px'
    stack.style.marginRight = '0px'
    stack.style.marginBottom = '0px'
    pinMargin(stack, card, viewportTop)
    const last = card.getBoundingClientRect()
    const dx = first.left - last.left
    const dy = first.top - last.top
    card.style.transition = 'none'
    card.style.transform = `translate(${dx}px, ${dy}px)`
    window.setTimeout(() => {
      card.style.transition = `transform ${duration} ease`
      card.style.transform = 'translate(0px, 0px) rotate(0deg)'
    }, 30)
  })
}

function settlePile(pile: HTMLElement, viewportTop: number, duration: string) {
  const anchor = (pile.querySelector('.CardStack') as HTMLElement | null) ?? pile
  const piles = [...document.querySelectorAll<HTMLElement>('.CardStackLabelContainer')]
  const stacks = [...document.querySelectorAll<HTMLElement>('.CardStack')]
  const cards = [...document.querySelectorAll<HTMLElement>('.Card')]
  const extras = ['.AllStacks', '.TitleBlock3', '.appStore']
    .map((selector) => document.querySelector<HTMLElement>(selector))
    .filter((el): el is HTMLElement => !!el)
  const touched = [...extras, ...piles, ...stacks, ...cards]
  const saved = savedStyles(touched)
  const scrollY = window.scrollY
  undoPile = () => {
    for (const { el } of saved) el.style.transition = `all ${duration} ease`
    requestAnimationFrame(() => {
      restoreStyles(saved)
      window.scrollTo({ top: scrollY, behavior: motion() ? 'auto' : 'smooth' })
    })
  }

  const apply = (animated: boolean) => {
    const transition = animated ? `all ${duration} ease` : 'none'
    for (const el of extras) {
      el.style.transition = transition
      if (el.classList.contains('AllStacks')) {
        el.style.maxWidth = '100vw'
        el.style.gap = '0px'
        el.style.margin = '0px'
        el.style.alignItems = 'flex-start'
        el.style.justifyContent = 'flex-start'
        continue
      }
      el.style.opacity = '0'
      el.style.height = '0px'
      el.style.width = '0px'
      el.style.marginTop = '0px'
      el.style.marginBottom = '0px'
      el.style.overflow = 'hidden'
    }
    for (const other of piles) {
      if (other === pile) continue
      other.style.transition = transition
      other.style.width = '0px'
      other.style.height = '0px'
      other.style.overflow = 'hidden'
    }
    for (const stack of stacks) {
      if (pile.contains(stack)) continue
      stack.style.transition = transition
      stack.style.width = '0px'
      stack.style.height = '0px'
    }
    for (const card of cards) {
      if (pile.contains(card)) continue
      zeroCard(card, animated ? duration : '0s')
      if (!animated) card.style.transition = 'none'
    }
  }

  play(() => {
    apply(false)
    pile.style.justifyContent = 'flex-start'
    pinMargin(pile, anchor, viewportTop)
  })
}

function holdCard(card: HTMLElement) {
  const stop = (event: Event) => event.stopPropagation()
  card.addEventListener('click', stop)
  card.addEventListener('mouseover', stop)
  card.addEventListener('mouseout', stop)
  return () => {
    card.removeEventListener('click', stop)
    card.removeEventListener('mouseover', stop)
    card.removeEventListener('mouseout', stop)
  }
}

function settleStack(
  pile: HTMLElement,
  chosen: HTMLElement[],
  viewportTop: number,
  duration: string,
) {
  const stack = (pile.querySelector('.CardStack') as HTMLElement | null) ?? pile
  const parentOrder = new Map<HTMLElement, Node[]>()
  for (const card of chosen) {
    const parent = card.parentElement
    if (parent && !parentOrder.has(parent)) parentOrder.set(parent, [...parent.childNodes])
  }
  const piles = [...document.querySelectorAll<HTMLElement>('.CardStackLabelContainer')]
  const stacks = [...document.querySelectorAll<HTMLElement>('.CardStack')]
  const cards = [...document.querySelectorAll<HTMLElement>('.Card')]
  const labels = [...document.querySelectorAll<HTMLElement>('.CardStackLabelContainerValue')]
  const extras = ['.AllStacks', '.TitleBlock3', '.appStore']
    .map((selector) => document.querySelector<HTMLElement>(selector))
    .filter((el): el is HTMLElement => !!el)
  const saved = savedStyles([...extras, ...piles, ...stacks, ...cards, ...labels])
  const scrollY = window.scrollY
  const release = chosen.map(holdCard)
  undoPile = () => {
    release.forEach((undo) => undo())
    // The saved list is the parent’s children before the fan moved any of them.
    for (const [parent, nodes] of parentOrder) {
      for (const node of nodes) parent.appendChild(node)
    }
    for (const { el } of saved) el.style.transition = `all ${duration} ease`
    requestAnimationFrame(() => {
      restoreStyles(saved)
      window.scrollTo({ top: scrollY, behavior: motion() ? 'auto' : 'smooth' })
    })
  }

  play(() => {
    for (const card of chosen) stack.appendChild(card)
    for (const el of extras) {
      el.style.transition = 'none'
      if (el.classList.contains('AllStacks')) {
        el.style.maxWidth = '100vw'
        el.style.gap = '0px'
        el.style.margin = '0px'
        el.style.alignItems = 'flex-start'
        el.style.justifyContent = 'flex-start'
        continue
      }
      el.style.opacity = '0'
      el.style.height = '0px'
      el.style.width = '0px'
      el.style.marginTop = '0px'
      el.style.marginBottom = '0px'
      el.style.overflow = 'hidden'
    }
    for (const other of piles) {
      if (other === pile) continue
      other.style.transition = 'none'
      other.style.width = '0px'
      other.style.height = '0px'
      other.style.overflow = 'hidden'
    }
    for (const other of stacks) {
      if (other === stack) continue
      other.style.transition = 'none'
      other.style.width = '0px'
      other.style.height = '0px'
    }
    for (const card of cards) {
      if (chosen.includes(card)) continue
      zeroCard(card, '0s')
      card.style.transition = 'none'
    }
    for (const label of labels) {
      label.style.transition = 'none'
      label.style.opacity = '0'
      label.style.height = '0px'
      label.style.width = '0px'
      label.style.padding = '0px'
      label.style.overflow = 'hidden'
    }
    pile.style.justifyContent = 'flex-start'
    pile.style.alignItems = 'center'
    pile.style.width = '450px'
    pile.style.height = '450px'
    pile.style.minHeight = '450px'
    pile.style.overflow = 'visible'
    stack.style.transition = 'none'
    stack.style.width = '400px'
    stack.style.height = '400px'
    stack.style.margin = '0px'
    stack.style.opacity = '1'
    stack.style.filter = 'none'
    chosen.forEach((card, index) => {
      const scale =
        index > 2 ? 1 - ((index - 2) / Math.min(chosen.length - 2, 97)) * 0.25 : 1
      card.style.transition = `all ${duration} ease`
      card.style.width = '300px'
      card.style.height = '300px'
      card.style.margin = '-160px'
      card.style.border = '10px solid #ffffff'
      card.style.borderRadius = '24px'
      card.style.boxShadow = '0 0px 30px rgba(0, 0, 0, 0.15)'
      card.style.transform = `rotate(${FAN_ROTATION[index] ?? 0}deg) scale(${scale.toFixed(2)})`
      card.style.zIndex = String(Math.min(chosen.length, 6) - index)
      card.style.pointerEvents = 'auto'
      card.style.opacity = '1'
    })
    pinMargin(pile, stack, viewportTop)
  })
}

export function nudgeFolioFocus(focus: FolioFocus, viewportTop: number) {
  const anchor =
    focus.card ?? (focus.pile.querySelector('.CardStack') as HTMLElement | null) ?? focus.pile
  const moved = (
    focus.mode === 'card' ? focus.card?.closest('.CardStack') : focus.pile
  ) as HTMLElement | null
  if (!moved) return
  focus.pile.style.justifyContent = 'flex-start'
  pinMargin(moved, anchor, viewportTop)
}
