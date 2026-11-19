import { attachLiquidGlass } from '@/app/components/Dock/DockGlass'
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

/** Largest recent visual height while the keyboard is down (URL-bar noise folds in). */
let folioVvRestHeight = 0

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
  if (height >= folioVvRestHeight - 1) folioVvRestHeight = height
  else if (folioVvRestHeight - height < FOLIO_KEYBOARD_INSET) folioVvRestHeight = height
  const inset = Math.max(0, folioVvRestHeight - height)
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

export function bindFolioVisualViewport(onChange?: () => void) {
  const run = () => {
    syncFolioVisualViewport()
    onChange?.()
  }
  const onOrient = () => {
    folioVvRestHeight = 0
    run()
  }
  run()
  const vv = window.visualViewport
  window.addEventListener('resize', run)
  window.addEventListener('orientationchange', onOrient)
  vv?.addEventListener('resize', run)
  vv?.addEventListener('scroll', run)
  return () => {
    window.removeEventListener('resize', run)
    window.removeEventListener('orientationchange', onOrient)
    vv?.removeEventListener('resize', run)
    vv?.removeEventListener('scroll', run)
  }
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
/** 0 = empty-state wide ring; 1 = loading ring pulled in around the logo. */
let orbitTighten = 0
let orbitTightenTarget = 0

type CarouselState = {
  cards: HTMLElement[]
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

/** Autoplay dwell — progress fill on the active pill is the clock. */
const CAROUSEL_AUTOPLAY_MS = 4500
const CAROUSEL_WHEEL_GAIN = 0.005
/** Fallback px→rad when size isn’t ready; live drag uses step / (0.75 × card). */
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

let carousel: CarouselState | null = null
let carouselChrome: HTMLElement | null = null
let carouselHeadline: HTMLElement | null = null
let carouselStepper: HTMLElement | null = null
let carouselPlaying = false
let carouselStepperIndex = -1
let carouselProgress: Animation | null = null
let headlineFadeTimer = 0
let carouselGlassDispose: (() => void) | null = null

/** Settle onto the ring, then hold it before any reveal may start. */
export const ORBIT_INTRO_MS = 900
export const ORBIT_HOLD_MS = 2000
export const ORBIT_TRAVEL_MS = 1500
export const ORBIT_ENLARGE_MS = 700
export const ORBIT_REVEAL_MS = ORBIT_TRAVEL_MS + ORBIT_ENLARGE_MS
/** Response → loader inverse — snappier so the ring meets the logo pop. */
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

/** Start a fresh hold while the ring is already spinning (empty chat → first send). */
export function armOrbitHold() {
  if (!document.querySelector('.folio-masonry.is-orbit')) return
  orbitStartedAt = performance.now() - ORBIT_INTRO_MS
}

/** Pull the orbit in around the logo while a turn is loading; release for empty idle. */
export function setOrbitLoading(loading: boolean) {
  orbitTightenTarget = loading ? 1 : 0
  if (!orbitFrame && document.querySelector('.folio-masonry.is-orbit')) runOrbit()
}

function stopOrbit() {
  if (orbitFrame) cancelAnimationFrame(orbitFrame)
  orbitFrame = 0
}

/** Empty-state thumb chrome — scaled down with the card when the ring tightens. */
const ORBIT_THUMB_BORDER = 4
const ORBIT_THUMB_RADIUS = 16
const ORBIT_THUMB_SHADOW_Y = 8
const ORBIT_THUMB_SHADOW_BLUR = 18

/** Edge-to-edge along the arc — 1.25 ⇒ a 0.25-card gutter between neighbors. */
const ORBIT_PACK = 1.25

/** Prefer a smaller ring over sparse cards — edge gap stays under 0.25 card (orbit + carousel). */
function clampRingRadius(count: number, radius: number, cardSize: number) {
  const n = Math.max(count, 2)
  const maxSpacing = cardSize * ORBIT_PACK
  const maxRadius = maxSpacing / (2 * Math.sin(Math.PI / n))
  return Math.min(radius, maxRadius)
}

/** Thumb that keeps the 0.25-card gutter on a given ring (shrinks when the ring is tight). */
function packOrbitSize(count: number, radius: number) {
  const n = Math.max(count, 2)
  return (2 * radius * Math.sin(Math.PI / n)) / ORBIT_PACK
}

function orbitMetrics(count: number) {
  const { width: vw, height: vh, top, left } = folioViewport()
  const keyboard = folioKeyboardOpen()
  // Always the empty-state thumb — chrome (border/radius/shadow) scales from this.
  const sizeWide = orbitThumbSize(count)

  if (keyboard) {
    // Fill the short visual axis and spill under the dock glass; size follows the gap rule.
    const radius = Math.min(vw, vh) / 2 + sizeWide * 0.2
    const size = Math.min(sizeWide, Math.max(18, packOrbitSize(count, radius)))
    return {
      size,
      sizeWide,
      rx: Math.max(size, radius),
      ry: Math.max(size, radius),
      cx: left + vw / 2,
      cy: top + vh / 2,
    }
  }

  // Wide empty ring may spill past the short sides; loading hugs the ~300px logo area.
  const wide = Math.max(vw, vh) / 2 - sizeWide * 0.2
  const ratio = sizeWide / Math.max(wide, 1)
  const logoHalf = 150
  const tight = (logoHalf + 20) / Math.max(0.35, 1 - 0.55 * ratio)
  const uncapped = wide + (tight - wide) * orbitTighten
  // Size from the uncapped ring — clamping radius must not shrink cards or the
  // relative gap stays the same and the cap does nothing on large screens.
  let size = Math.max(28, uncapped * ratio)
  const radius = clampRingRadius(count, uncapped, size)
  // When the ring tightens faster than the thumbs, shrink thumbs so they don’t overlap.
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
  // Bottom of the card faces the ring center (top points outward).
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
      orbitTighten = 0
      orbitTightenTarget = 0
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

/** Snap results back to a full empty orbit while the keyboard is open. */
export function parkResultsForCompose(grid: HTMLElement) {
  if (grid.classList.contains('is-orbit') && !grid.classList.contains('is-result')) return
  motionToken += 1
  disposeCarousel()
  stopOrbit()
  ensureSession(grid)
  syncFolioVisualViewport()
  // Fresh compose pose — full ring, spin at 0. Answers stay in React.
  orbitSpin = 0
  orbitTighten = 0
  orbitTightenTarget = 0
  orbitStartedAt = performance.now()
  grid.classList.remove('is-carousel', 'is-result')
  grid.classList.add('is-orbit')
  for (const card of sessionCards) {
    card.style.display = 'block'
    card.style.opacity = '1'
    card.style.filter = 'none'
  }
  mountOrbitRing(grid)
  for (const card of sessionCards) thumbCard(card)
  runOrbit()
}

export function beginFolioSession(grid: HTMLElement) {
  const token = ++motionToken
  const duration = motion() ? '0.01s' : `${ORBIT_INTRO_MS}ms`
  syncFolioVisualViewport()
  ensureSession(grid)
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

/**
 * Shared focus geometry — card centered on the 16px grid; reply column & stepper
 * keep relative gaps but snap their edges onto the same lattice.
 */
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

/** Empty-orbit thumb size — shared so assortment and carousel keep one packing ratio. */
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
  // Same size/radius as the full assortment at featured scale — then clamp gaps.
  const radius = clampRingRadius(
    packCount,
    size * (thumbRadius / Math.max(thumb, 1)),
    size,
  )
  // Same angular step as pre-cull equal spacing — don’t re-pack after the cull.
  const step = (Math.PI * 2) / packCount
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
  card.style.filter = 'none'
  card.style.display = 'block'
  card.style.pointerEvents = 'auto'
  card.style.cursor = 'pointer'
  card.style.contentVisibility = 'visible'
  card.style.transformOrigin = 'center center'
  // Image-only — badge/title live in the carousel headline, even for one card.
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

/** Shortest signed delta from one angle to another. */
function angleDelta(from: number, to: number) {
  const tau = Math.PI * 2
  return ((((to - from) + Math.PI) % tau) + tau) % tau - Math.PI
}

/** Always-counterclockwise delta in [0, 2π) — used to order neighbors around the ring. */
function ccwDelta(from: number, to: number) {
  const tau = Math.PI * 2
  return (((to - from) % tau) + tau) % tau
}

/** True if traveling `delta` from `from` passes through `barrier` (not just endpoints). */
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
  // Offset is already soft-clamped at the ends on input — paint 1:1.
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

/**
 * Soft ±1 window around the current interaction origin.
 * Absolute ends are hard-clamped — no rubber / overscroll.
 */
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
  carousel.offset = clampCarouselOffset(carousel.offset)
  carousel.rest =
    resolveGestureSnapIndex(carousel.offset, carousel.gestureOrigin, velocity) * carousel.step
}

/** Continuous spring — input owns offset while the gesture is live; spring after release. */
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
    // Stepper lives outside the grid; ignore anything that isn’t the ring surface.
    if (!grid.contains(event.target)) return
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
    grid.setPointerCapture?.(event.pointerId)
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
    // Keep drag origin fixed for the press; ±1 only. Lift + press again to go further.
    carousel.offset = applyCarouselInput(
      drag.offset - (dx + dy) * carouselDragGain(),
      carousel.gestureOrigin,
    )
    syncCarouselRestFromOffset(drag.velocity)
    paintCarousel(carousel.offset)
    ensureCarouselSpring()
  }

  const endDrag = (event: PointerEvent) => {
    if (!carousel?.drag) return
    const drag = carousel.drag
    carousel.drag = null
    try {
      grid.releasePointerCapture?.(event.pointerId)
    } catch {
      /* already released */
    }
    const card = event.target instanceof Element ? (event.target.closest('.Card') as HTMLElement | null) : null
    if (!drag.moved && card && carousel.cards.includes(card)) {
      const index = carousel.cards.indexOf(card)
      if (index !== activeCarouselIndex()) {
        event.preventDefault()
        event.stopPropagation()
        snapCarousel(index)
        return
      }
      // Focused card — leave the click for FolioEngine’s real action.
      return
    }
    if (drag.moved) {
      event.preventDefault()
      syncCarouselRestFromOffset(drag.velocity)
      carousel.inputUntil = 0
      ensureCarouselSpring()
    }
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
    syncFolioVisualViewport()
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
  window.addEventListener('resize', onResize)
  const vv = window.visualViewport
  vv?.addEventListener('resize', onResize)
  vv?.addEventListener('scroll', onResize)

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
      window.removeEventListener('resize', onResize)
      vv?.removeEventListener('resize', onResize)
      vv?.removeEventListener('scroll', onResize)
      grid.classList.remove('is-carousel')
    },
  }
  paintCarousel(0)
}

/**
 * Perfect inverse of revealSessionCards:
 * un-slide, un-cull, and shrink/unspin run as one pass onto the loading ring.
 */
export function reorbitSession(grid: HTMLElement): Promise<void> {
  const token = ++motionToken

  // Capture carousel pose before teardown — inverse starts from here.
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
  ensureSession(grid)
  window.scrollTo(0, 0)

  // Loading ring is the destination (tight around the logo).
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

  // Seed on the result ring immediately (carousel) so reconstruction starts on submit.
  // Single-card focus stays put until the inverse settle FLIP below.
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
    // Single-card focus sits off-ring — park it on the top slot first.
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

    // Un-slide + shrink + un-cull together — resize must start on submit, not after slide.
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
    // Intro already played as the inverse travel — only the hold remains.
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
  /** Fires when rejects start culling — blurb stream syncs here. */
  onCull?: () => void
  /** Runs after the circle settles into the result pose. */
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
    options?.onCull?.()
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
  // Carousel order: focus at top, then the rest continuing counterclockwise.
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
  // Size stays tied to radius; end ratio is the carousel’s so t=1 lands on endRing exactly.
  const startRatio = startRing.size / Math.max(startRing.radius, 1)
  const endRatio = endRing.size / Math.max(endRing.radius, 1)
  const endAngles = new Map(
    kept.map((card, index) => [
      card,
      -Math.PI / 2 + index * (multi ? endMetrics.step : 0),
    ] as const),
  )

  void (async () => {
    // 1) Grow onto the shared ring at final carousel size; spin so the focus card lands at top.
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

    // Snap every visible card to the exact carousel pose before culling.
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

    // 2) Cull rejects in place on that same ring.
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

    // 3) Slide kept cards into slots — never through the focused card at the top.
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
    if (options?.afterTravel) {
      await options.afterTravel()
      if (token !== motionToken) return
    }
    mountCarousel(grid, kept)
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
