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

export function folioSessionOpen() {
  return sessionUndo !== null
}

function thumbCard(card: HTMLElement) {
  card.style.boxSizing = 'border-box'
  card.style.position = 'relative'
  card.style.left = 'auto'
  card.style.top = 'auto'
  card.style.display = 'block'
  card.style.width = '100%'
  card.style.height = 'auto'
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

export function beginFolioSession(grid: HTMLElement) {
  const token = ++motionToken
  const duration = motion() ? '0.01s' : '0.45s'
  page()?.classList.add('is-folio-session')
  grid.classList.remove('is-result')
  window.scrollTo(0, 0)

  if (!sessionUndo) {
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
      for (const [parent, nodes] of parents) {
        for (const node of nodes) parent.appendChild(node)
      }
      restoreStyles(saved)
      sessionUndo = null
      sessionCards = []
      grid.classList.remove('is-result')
      page()?.classList.remove('is-folio-session')
    }
  }

  const first = new Map(sessionCards.map((card) => [card, card.getBoundingClientRect()]))
  for (const card of sessionCards) {
    grid.appendChild(card)
    thumbCard(card)
  }
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
      card.style.transition = `transform ${duration} ease`
      card.style.transform = 'none'
    }
  }, 40)
}

export function revealSessionCards(grid: HTMLElement, chosen: HTMLElement[], top: number) {
  const token = ++motionToken
  const duration = motion() ? '0.01s' : '0.4s'
  const keep = new Set(chosen.filter((card) => sessionCards.includes(card)))
  if (!keep.size) return
  const size = keep.size > 1 ? 320 : 420
  const left = Math.max(24, (window.innerWidth - size) / 2)
  const fanBleed = keep.size > 1 ? 40 : 0

  for (const card of sessionCards) {
    const rect = card.getBoundingClientRect()
    if (keep.has(card)) continue
    card.style.position = 'fixed'
    card.style.left = `${rect.left}px`
    card.style.top = `${rect.top}px`
    card.style.width = `${rect.width}px`
    card.style.height = `${rect.height}px`
    card.style.margin = '0'
    card.style.transition = `transform ${duration} ease, opacity ${duration} ease`
    card.style.transformOrigin = 'center center'
    card.style.opacity = '0'
    card.style.transform = 'scale(0.7)'
    card.style.pointerEvents = 'none'
  }

  const kept = [...keep]
  const starts = new Map(kept.map((card) => [card, card.getBoundingClientRect()]))
  kept.forEach((card, index) => {
    card.style.transition = 'none'
    card.style.position = 'fixed'
    card.style.boxSizing = 'border-box'
    card.style.left = `${left}px`
    card.style.top = `${top + fanBleed}px`
    card.style.width = `${size}px`
    card.style.height = `${size}px`
    card.style.margin = '0'
    card.style.border = '10px solid #ffffff'
    card.style.borderRadius = '24px'
    card.style.boxShadow = '0 0px 30px rgba(0, 0, 0, 0.15)'
    card.style.opacity = '1'
    card.style.zIndex = String(kept.length - index + 2)
    card.style.pointerEvents = 'auto'
    card.style.contentVisibility = 'visible'
    card.style.cursor = ''
    const inner = card.querySelector<HTMLElement>('.CardInnerContainer')
    if (inner) {
      inner.style.height = '100%'
      inner.style.width = '100%'
      inner.style.opacity = '1'
    }
    card.style.transformOrigin = 'top left'
    const start = starts.get(card)
    const last = card.getBoundingClientRect()
    if (!start || last.width < 2) return
    const dx = start.left - last.left
    const dy = start.top - last.top
    const scale = start.width / last.width
    card.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`
  })
  grid.classList.add('is-result')

  window.setTimeout(() => {
    if (token !== motionToken) return
    kept.forEach((card, index) => {
      card.style.transition = `transform ${duration} ease`
      card.style.transform = featuredTransform(index, kept.length)
      card.style.transformOrigin = 'center center'
    })
  }, 30)

  window.setTimeout(() => {
    if (token !== motionToken) return
    for (const card of sessionCards) {
      if (!keep.has(card)) card.style.display = 'none'
    }
  }, motion() ? 0 : 420)
}

export function releaseFolioFocus() {
  generation += 1
  motionToken += 1
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
