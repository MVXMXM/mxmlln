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
  offset: number
  size: number
  radius: number
  step: number
  cx: number
  cy: number
  grid: HTMLElement
  snapping: boolean
  drag: { x: number; y: number; offset: number; moved: boolean } | null
  dispose: () => void
}

/** Clear space between neighboring cards’ bottom edges (which face the ring center). */
const CAROUSEL_GUTTER_PX = 40

let carousel: CarouselState | null = null
let carouselStepper: HTMLElement | null = null

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

function disposeCarousel() {
  carouselStepper?.remove()
  carouselStepper = null
  if (!carousel) return
  carousel.dispose()
  carousel = null
}

function syncCarouselStepper() {
  if (!carouselStepper || !carousel) return
  const active = activeCarouselIndex()
  const dots = carouselStepper.querySelectorAll<HTMLElement>('.folio-carousel-dot')
  dots.forEach((dot, index) => {
    const on = index === active
    dot.classList.toggle('is-active', on)
    dot.setAttribute('aria-selected', on ? 'true' : 'false')
  })
}

function mountCarouselStepper(count: number) {
  carouselStepper?.remove()
  if (count < 2) {
    carouselStepper = null
    return
  }
  const root = document.createElement('div')
  root.className = 'folio-carousel-stepper'
  root.setAttribute('role', 'tablist')
  root.setAttribute('aria-label', 'Result cards')
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('button')
    dot.type = 'button'
    dot.className = 'folio-carousel-dot'
    dot.setAttribute('role', 'tab')
    dot.setAttribute('aria-label', `Show card ${i + 1}`)
    dot.addEventListener('click', (event) => {
      event.preventDefault()
      snapCarousel(i)
    })
    root.appendChild(dot)
  }
  document.body.appendChild(root)
  // Enter after paint so the Apple-style expand can play.
  requestAnimationFrame(() => root.classList.add('is-in'))
  carouselStepper = root
  syncCarouselStepper()
}

function carouselMetrics(_count: number) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const size = Math.min(340, Math.max(260, Math.round(vw * 0.38)))
  const focusX = vw / 2
  const focusY = vh / 2
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

function paintCarousel(logical: number, withTransition: boolean) {
  if (!carousel) return
  const { cards, size, radius, step, cx, cy } = carousel
  const total = cards.length
  if (!total) return
  const offset = rubberDisplayOffset(logical)
  const travel = `${ORBIT_TRAVEL_MS}ms`
  // Slight spring so edge releases feel like a rubber band, not a linear ease.
  const ease = 'cubic-bezier(0.22, 1.2, 0.36, 1)'
  cards.forEach((card, index) => {
    // Fixed arc step — only uses the circle's curvature, never packs the full ring.
    const angle = -Math.PI / 2 + index * step - offset
    const x = cx + Math.cos(angle) * radius - size / 2
    const y = cy + Math.sin(angle) * radius - size / 2
    const rotate = angle + Math.PI / 2
    const align = Math.cos(angle + Math.PI / 2)
    const scale = 0.9 + 0.1 * Math.max(0, align)
    card.style.transition = withTransition && !motion()
      ? `left ${travel} ${ease}, top ${travel} ${ease}, transform ${travel} ${ease}`
      : 'none'
    card.style.left = `${x}px`
    card.style.top = `${y}px`
    card.style.transform = `rotate(${rotate}rad) scale(${scale})`
    card.style.zIndex = String(Math.round(20 + align * 20))
  })
  carousel.offset = logical
  syncCarouselStepper()
}

function snapCarousel(index?: number) {
  if (!carousel || !carousel.cards.length) return
  const total = carousel.cards.length
  const { step } = carousel
  const { min, max } = carouselBounds()
  // Collapse any rubber stretch to the current visual pose, then spring to a stop.
  const visual = rubberDisplayOffset(carousel.offset)
  carousel.offset = visual
  paintCarousel(visual, false)

  let target: number
  if (typeof index === 'number') {
    target = Math.min(max, Math.max(min, (((index % total) + total) % total) * step))
  } else {
    target = Math.min(max, Math.max(min, Math.round(visual / step) * step))
  }

  void carousel.grid.offsetHeight
  carousel.snapping = true
  paintCarousel(target, true)
  window.setTimeout(() => {
    if (!carousel) return
    carousel.offset = target
    paintCarousel(target, false)
    carousel.snapping = false
  }, motion() ? 0 : ORBIT_TRAVEL_MS)
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

  let snapTimer = 0
  const scheduleSnap = () => {
    window.clearTimeout(snapTimer)
    snapTimer = window.setTimeout(() => snapCarousel(), 140)
  }

  const onWheel = (event: WheelEvent) => {
    if (!carousel || carousel.snapping) return
    event.preventDefault()
    // Scroll down → clockwise.
    paintCarousel(carousel.offset + event.deltaY * 0.0018, false)
    scheduleSnap()
  }

  const onPointerDown = (event: PointerEvent) => {
    if (!carousel || carousel.snapping) return
    if (!(event.target instanceof Element)) return
    const card = event.target.closest('.Card') as HTMLElement | null
    if (!card || !carousel.cards.includes(card)) return
    carousel.drag = {
      x: event.clientX,
      y: event.clientY,
      offset: carousel.offset,
      moved: false,
    }
    card.setPointerCapture?.(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!carousel?.drag) return
    const dx = event.clientX - carousel.drag.x
    const dy = event.clientY - carousel.drag.y
    if (Math.hypot(dx, dy) > 6) carousel.drag.moved = true
    // Drag right / down nudges clockwise (same sense as scroll down).
    const next = carousel.drag.offset + (dx + dy) * 0.004
    paintCarousel(next, false)
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
      // Center card: leave the click for Intense / normal card behavior.
    }
    scheduleSnap()
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
    paintCarousel(active * next.step, false)
  }

  grid.addEventListener('wheel', onWheel, { passive: false })
  grid.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('resize', onResize)

  carousel = {
    cards,
    offset: 0,
    size: metrics.size,
    radius: metrics.radius,
    step: metrics.step,
    cx: metrics.cx,
    cy: metrics.cy,
    grid,
    snapping: false,
    drag: null,
    dispose: () => {
      window.clearTimeout(snapTimer)
      grid.removeEventListener('wheel', onWheel)
      grid.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('resize', onResize)
      grid.classList.remove('is-carousel')
    },
  }
  paintCarousel(0, false)
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
  const travel = motion() ? '0.01s' : `${ORBIT_TRAVEL_MS}ms`
  const enlarge = motion() ? '0.01s' : `${ORBIT_ENLARGE_MS}ms`
  const keep = new Set(chosen.filter((card) => sessionCards.includes(card)))
  const orbitCount = Math.max(sessionCards.length, 1)
  const orbitSize = orbitMetrics(orbitCount).size
  const orbitCx = window.innerWidth / 2
  const orbitCy = window.innerHeight / 2
  const exit = Math.hypot(window.innerWidth, window.innerHeight) * 0.72

  // Preserve each card's orbit pose (including radial rotation) before leaving slots.
  const poses = new Map<HTMLElement, { angle: number; x: number; y: number; size: number }>()
  sessionCards.forEach((card, index) => {
    const angle = (index / orbitCount) * Math.PI * 2 + orbitSpin - Math.PI / 2
    const x = orbitCx + Math.cos(angle) * orbitMetrics(orbitCount).rx - orbitSize / 2
    const y = orbitCy + Math.sin(angle) * orbitMetrics(orbitCount).ry - orbitSize / 2
    poses.set(card, { angle, x, y, size: orbitSize })
  })

  grid.classList.remove('is-orbit')
  grid.classList.add('is-result')
  grid.replaceChildren()

  if (!keep.size) {
    orbitRing = null
    orbitSlots = []
    for (const card of sessionCards) {
      grid.appendChild(card)
      card.style.display = 'none'
    }
    void options?.afterTravel?.()
    return
  }

  for (const card of sessionCards) {
    const pose = poses.get(card)
    if (!pose) continue
    grid.appendChild(card)
    card.style.transition = 'none'
    card.style.position = 'fixed'
    card.style.boxSizing = 'border-box'
    card.style.left = `${pose.x}px`
    card.style.top = `${pose.y}px`
    card.style.width = `${pose.size}px`
    card.style.height = `${pose.size}px`
    card.style.margin = '0'
    card.style.transformOrigin = 'center center'
    card.style.transform = `rotate(${pose.angle + Math.PI / 2}rad)`
    card.style.opacity = '1'
    card.style.pointerEvents = 'none'
    card.style.contentVisibility = 'visible'
    card.style.display = 'block'
  }
  orbitRing = null
  orbitSlots = []
  void grid.offsetHeight

  // Irrelevant cards continue outward on their radial ray.
  for (const card of sessionCards) {
    if (keep.has(card)) continue
    const pose = poses.get(card)
    if (!pose) continue
    const mx = Math.cos(pose.angle)
    const my = Math.sin(pose.angle)
    card.style.transition = `transform ${travel} cubic-bezier(0.22, 1, 0.36, 1), opacity ${travel} ease`
    card.style.transform = `translate3d(${mx * exit}px, ${my * exit}px, 0) rotate(${pose.angle + Math.PI / 2}rad) scale(0.72)`
    card.style.opacity = '0'
  }

  const kept = [...keep]
  const multi = kept.length > 1

  if (multi) {
    const metrics = carouselMetrics(kept.length)
    kept.forEach((card, index) => {
      const angle = -Math.PI / 2 + index * metrics.step
      const x = metrics.cx + Math.cos(angle) * metrics.radius - metrics.size / 2
      const y = metrics.cy + Math.sin(angle) * metrics.radius - metrics.size / 2
      const rotate = angle + Math.PI / 2
      const align = Math.cos(angle + Math.PI / 2)
      const scale = 0.9 + 0.1 * Math.max(0, align)
      styleCarouselCard(card, metrics.size)
      card.style.pointerEvents = 'none'
      card.style.transition = [
        `left ${travel} cubic-bezier(0.22, 1, 0.36, 1)`,
        `top ${travel} cubic-bezier(0.22, 1, 0.36, 1)`,
        `width ${travel} cubic-bezier(0.22, 1, 0.36, 1)`,
        `height ${travel} cubic-bezier(0.22, 1, 0.36, 1)`,
        `transform ${travel} cubic-bezier(0.22, 1, 0.36, 1)`,
        `border-radius ${travel} ease`,
      ].join(', ')
      card.style.left = `${x}px`
      card.style.top = `${y}px`
      card.style.width = `${metrics.size}px`
      card.style.height = `${metrics.size}px`
      card.style.transform = `rotate(${rotate}rad) scale(${scale})`
      card.style.zIndex = String(Math.round(20 + align * 20))
    })
  } else {
    // Single card: same radial exit language, upright under the reply column.
    const card = kept[0]
    if (card) {
      const size = Math.min(420, window.innerWidth - 48)
      const left = Math.max(24, (window.innerWidth - size) / 2)
      card.style.transition = [
        `left ${travel} cubic-bezier(0.22, 1, 0.36, 1)`,
        `top ${travel} cubic-bezier(0.22, 1, 0.36, 1)`,
        `width ${travel} cubic-bezier(0.22, 1, 0.36, 1)`,
        `height ${travel} cubic-bezier(0.22, 1, 0.36, 1)`,
        `transform ${travel} cubic-bezier(0.22, 1, 0.36, 1)`,
      ].join(', ')
      card.style.left = `${left}px`
      card.style.top = `${top}px`
      card.style.width = `${size}px`
      card.style.height = `${size}px`
      card.style.transform = 'rotate(0rad)'
      card.style.zIndex = '30'
    }
  }

  window.setTimeout(() => {
    void (async () => {
      if (token !== motionToken) return
      for (const card of sessionCards) {
        if (!keep.has(card)) card.style.display = 'none'
      }

      if (multi) {
        // Commit carousel poses, stream, then unlock interaction.
        kept.forEach((card) => {
          card.style.transition = 'none'
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
      const visual = card.getBoundingClientRect()
      card.style.transition = 'none'
      card.style.transform = 'none'
      card.style.left = `${visual.left}px`
      card.style.top = `${visual.top}px`
      card.style.width = `${visual.width}px`
      card.style.height = `${visual.height}px`

      if (options?.afterTravel) {
        await options.afterTravel()
        if (token !== motionToken) return
      }

      const size = Math.min(420, window.innerWidth - 48)
      const left = Math.max(24, (window.innerWidth - size) / 2)
      const settleTop = options?.gatherTop?.() ?? top
      const before = card.getBoundingClientRect()
      card.style.left = `${left}px`
      card.style.top = `${settleTop}px`
      card.style.width = `${size}px`
      card.style.height = `${size}px`
      card.style.border = '10px solid #ffffff'
      card.style.borderRadius = '24px'
      card.style.boxShadow = '0 0px 30px rgba(0, 0, 0, 0.15)'
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
        card.style.transform = `translate(${before.left - last.left}px, ${before.top - last.top}px) scale(${before.width / last.width})`
        void grid.offsetHeight
        card.style.transition = `transform ${enlarge} cubic-bezier(0.22, 1, 0.36, 1)`
        card.style.transform = 'none'
        card.style.transformOrigin = 'center center'
      }
    })()
  }, motion() ? 0 : ORBIT_TRAVEL_MS)
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
