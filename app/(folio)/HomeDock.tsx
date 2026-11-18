'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import lottie from 'lottie-web'
import { Dock, type DockItem } from '@/app/components/Dock/Dock'
import {
  armOrbitHold,
  beginFolioSession,
  cardsForAnswer,
  FOLIO_GRID,
  folioFocusMetrics,
  folioSessionOpen,
  ORBIT_TRAVEL_MS,
  orbitRevealWaitMs,
  releaseFolioFocus,
  reorbitSession,
  revealSessionCards,
  setOrbitLoading,
  snapFolioGrid,
} from './reveal-card'

type FolioTurn = {
  userMessage: string
  assistantMessage: string
  cardHeader: string
  cardDescription: string
  cardURL: string
  cardImage: string
}

const FAILURE = 'Something went wrong on my side. Try again in a moment.'
/** Matches FolioEngine’s IntroLoader pop (0 → 300). */
const LOGO_POP_MS = 500

function ChatResponseMark({ spinning }: { spinning: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const animRef = useRef<ReturnType<typeof lottie.loadAnimation> | null>(null)
  const spinningRef = useRef(spinning)
  const [ready, setReady] = useState(false)
  spinningRef.current = spinning

  useEffect(() => {
    const container = ref.current
    if (!container) return
    const anim = lottie.loadAnimation({
      container,
      path: '/assets/LogoSpin2026.json',
      renderer: 'svg',
      loop: true,
      autoplay: spinningRef.current,
    })
    animRef.current = anim
    const onReady = () => {
      setReady(true)
      if (!spinningRef.current) anim.pause()
    }
    anim.addEventListener('DOMLoaded', onReady)
    return () => {
      anim.removeEventListener('DOMLoaded', onReady)
      anim.destroy()
      animRef.current = null
    }
  }, [])

  useEffect(() => {
    const anim = animRef.current
    if (!anim) return
    if (spinning) anim.play()
    else anim.pause()
  }, [spinning])

  return (
    <div className="chatResponseLogo">
      <div ref={ref} className="chatResponseLogoLottie" aria-hidden />
      {!ready && <img src="/assets/LogoSpin2024.SML.gif" alt="" />}
    </div>
  )
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function travelMs() {
  return reducedMotion() ? 0 : ORBIT_TRAVEL_MS
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

function afterPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

async function streamBlurb(
  full: string,
  setText: (value: string) => void,
  live: () => boolean,
) {
  if (!live()) return
  if (!full || reducedMotion()) {
    setText(full)
    return
  }
  const step = full.length > 180 ? 4 : full.length > 90 ? 3 : 2
  for (let i = step; i < full.length; i += step) {
    if (!live()) return
    setText(full.slice(0, i))
    await wait(16)
  }
  if (live()) setText(full)
}

function dockCapsuleRect() {
  return document.querySelector<HTMLElement>('.mx-dock .dockDynamicContainer')?.getBoundingClientRect() ?? null
}

/** Vertically center the reply column in the band above the focused card (~40px gap), snapped to the 16px grid. */
function placeReplyColumn(frame: HTMLElement) {
  const { cardTop } = folioFocusMetrics()
  const width = snapFolioGrid(Math.min(600, window.innerWidth - 40))
  const left = snapFolioGrid((window.innerWidth - width) / 2)
  const bandTop = FOLIO_GRID
  // Keep ~40px clearance, but land the band edge on a grid line.
  const bandBottom = snapFolioGrid(cardTop - 40, 'floor')
  frame.style.width = `${width}px`
  frame.style.left = `${left}px`
  frame.style.right = 'auto'
  frame.style.bottom = 'auto'
  frame.style.transform = 'none'
  frame.style.top = `${bandTop}px`
  const height = frame.getBoundingClientRect().height
  const band = Math.max(0, bandBottom - bandTop)
  const rawTop =
    height >= band
      ? bandBottom - height
      : bandTop + (band - height) / 2
  frame.style.top = `${Math.max(0, snapFolioGrid(rawTop))}px`
}

/** Peel a message chip off the dock capsule and morph it into the resting bubble. */
async function launchFromDock(bubble: HTMLElement, text: string, origin: DOMRect) {
  const ms = reducedMotion() ? 0 : 400
  const copy = bubble.querySelector<HTMLElement>('p')
  // Measure the landing pill with nowrap so in-flight height matches the single-line chip
  // (wrapped height + nowrap text was leaving the line stranded too high in the pill).
  if (copy) copy.style.whiteSpace = 'nowrap'
  const dest = bubble.getBoundingClientRect()
  const style = getComputedStyle(bubble)
  const copyStyle = copy ? getComputedStyle(copy) : null
  if (copy) copy.style.whiteSpace = ''
  if (dest.width < 2 || dest.height < 2) {
    bubble.style.opacity = ''
    return
  }

  bubble.style.opacity = '0'

  const fly = document.createElement('div')
  fly.className = 'folio-launch-msg'
  const line = document.createElement('p')
  line.textContent = text
  fly.appendChild(line)
  fly.style.left = `${origin.left}px`
  fly.style.top = `${origin.top}px`
  fly.style.width = `${origin.width}px`
  fly.style.height = `${origin.height}px`
  fly.style.borderRadius = '40px'
  fly.style.padding = '0 52px 0 28px'
  fly.style.filter = 'blur(5px)'
  document.body.appendChild(fly)
  void fly.offsetHeight

  // Fast peel like before, with less late-stage coasting so the second half stays alive.
  const ease = 'cubic-bezier(0.22, 0.15, 0.25, 1)'
  fly.style.transition = [
    `left ${ms}ms ${ease}`,
    `top ${ms}ms ${ease}`,
    `width ${ms}ms ${ease}`,
    `height ${ms}ms ${ease}`,
    `border-radius ${ms}ms ${ease}`,
    `padding ${ms}ms ${ease}`,
    `box-shadow ${ms}ms ease`,
    `filter ${ms}ms ${ease}`,
  ].join(', ')
  fly.style.left = `${dest.left}px`
  fly.style.top = `${dest.top}px`
  fly.style.width = `${dest.width}px`
  fly.style.height = `${dest.height}px`
  fly.style.borderRadius = style.borderRadius || '24px 24px 4px 24px'
  fly.style.padding = style.padding
  fly.style.boxShadow = 'none'
  fly.style.filter = 'blur(0px)'
  fly.style.alignItems = 'center'
  if (copyStyle) {
    line.style.fontSize = copyStyle.fontSize
    line.style.fontWeight = copyStyle.fontWeight
    line.style.letterSpacing = copyStyle.letterSpacing
    line.style.lineHeight = copyStyle.lineHeight
  }

  await wait(ms || 40)
  fly.remove()
  bubble.style.opacity = ''
}

async function presentLoadingTurn(frame: HTMLElement, text: string, origin: DOMRect | null) {
  frame.classList.remove('is-answered')
  frame.style.top = ''
  frame.style.left = ''
  frame.style.width = ''
  frame.style.transform = ''
  frame.style.transition = ''
  frame.style.opacity = '1'

  const bubble = frame.querySelector<HTMLElement>('.chatQuery')
  if (bubble && origin) await launchFromDock(bubble, text, origin)
  else if (bubble) bubble.style.opacity = ''
}

export function HomeDock() {
  const turn = useRef<FolioTurn | null>(null)
  const turnId = useRef(0)
  const busy = useRef(false)
  const column = useRef<HTMLDivElement>(null)
  const masonry = useRef<HTMLDivElement>(null)
  const skipBegin = useRef(false)
  const [userMessage, setUserMessage] = useState<string | null>(null)
  const [assistantMessage, setAssistantMessage] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMounted, setChatMounted] = useState(false)
  const [logoIn, setLogoIn] = useState(false)
  const [answers, setAnswers] = useState<HTMLElement[] | null>(null)
  const [dockLaunch, setDockLaunch] = useState(false)
  const [markLanded, setMarkLanded] = useState(false)
  const fadeGen = useRef(0)
  const revealTimer = useRef(0)
  const closeTimer = useRef(0)
  const waiting = !answers
  const loading = waiting && !!userMessage

  useLayoutEffect(() => {
    if (!chatMounted) return
    const grid = masonry.current
    if (!grid) return
    const frame = column.current

    // Empty chat + loading share the orbit; answers drives reveal afterward.
    if (!answers) {
      if (frame) {
        frame.classList.remove('is-answered')
        frame.style.top = ''
        frame.style.left = ''
        frame.style.bottom = ''
        frame.style.width = ''
        frame.style.transform = ''
        frame.style.transition = ''
        frame.style.opacity = ''
      }
      setOrbitLoading(!!userMessage)
      if (skipBegin.current) {
        skipBegin.current = false
        return
      }
      if (!grid.classList.contains('is-orbit')) beginFolioSession(grid)
      // beginFolioSession resets tighten — re-apply if this mount is a loading turn.
      if (userMessage) setOrbitLoading(true)
      return
    }

    if (!frame) return
    // Vertically center reply content in the band above the focused card (grid-snapped).
    const { cardTop } = folioFocusMetrics()
    const travel = reducedMotion() ? '0.01s' : `${ORBIT_TRAVEL_MS}ms`
    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)'
    frame.classList.add('is-answered')
    frame.style.transition = 'none'
    placeReplyColumn(frame)
    const gatherTop = cardTop
    const last = frame.getBoundingClientRect()
    // Park back at center, then settle into the centered band with the orbit exit.
    frame.style.bottom = ''
    frame.style.top = '50%'
    frame.style.left = '50%'
    frame.style.transform = 'translate(-50%, -50%)'
    void frame.offsetHeight
    frame.style.transition = [
      `top ${travel} ${ease}`,
      `left ${travel} ${ease}`,
      `transform ${travel} ${ease}`,
    ].join(', ')
    frame.style.top = `${last.top}px`
    frame.style.left = `${last.left}px`
    frame.style.transform = 'none'
    const id = turnId.current
    const blurb = turn.current?.assistantMessage ?? ''
    revealSessionCards(grid, answers, gatherTop, {
      afterTravel: async () => {
        // Logo has landed on the final reply frame — freeze the spin, then stream.
        setMarkLanded(true)
        await streamBlurb(blurb, setAssistantMessage, () => turnId.current === id)
      },
      gatherTop: () => folioFocusMetrics().cardTop,
    })
  }, [chatMounted, userMessage, answers])

  // Re-center as the blurb streams / viewport changes (skip while assistant is still empty
  // so we don’t fight the opening travel animation).
  useLayoutEffect(() => {
    if (!chatMounted || !answers || !assistantMessage || !column.current) return
    const frame = column.current
    if (!frame.classList.contains('is-answered')) return
    frame.style.transition = 'none'
    placeReplyColumn(frame)
    const onResize = () => placeReplyColumn(frame)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [chatMounted, answers, assistantMessage])

  useEffect(() => {
    return () => {
      if (revealTimer.current) window.clearTimeout(revealTimer.current)
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      document.querySelector('.folio-dock')?.classList.add('is-in')
    }, 4000)
    return () => window.clearTimeout(id)
  }, [])

  function clearTurn() {
    turnId.current += 1
    turn.current = null
    skipBegin.current = false
    if (revealTimer.current) window.clearTimeout(revealTimer.current)
    revealTimer.current = 0
    setAnswers(null)
    setUserMessage(null)
    setAssistantMessage(null)
    setFailure(null)
    setDockLaunch(false)
    setMarkLanded(false)
    setLogoIn(false)
    setOrbitLoading(false)
    releaseFolioFocus()
  }

  function openChat() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = 0
    }
    setChatOpen(true)
    setChatMounted(true)
    setLogoIn(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setLogoIn(true))
    })
  }

  function closeChat() {
    if (!chatMounted && !chatOpen) return
    setChatOpen(false)
    setLogoIn(false)
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = 0
      clearTurn()
      setChatMounted(false)
    }, reducedMotion() ? 0 : LOGO_POP_MS)
  }

  function present(about: boolean) {
    const page = document.querySelector<HTMLElement>('.folio-page')
    if (!page || (page.dataset.folioView === 'about') === about) return
    const gen = ++fadeGen.current
    page.dataset.folioFade = 'true'
    window.scrollTo(0, 0)
    void page.offsetHeight
    if (about) page.dataset.folioView = 'about'
    else delete page.dataset.folioView
    window.setTimeout(() => {
      if (fadeGen.current === gen) delete page.dataset.folioFade
    }, 450)
  }

  function selectItem(item: DockItem) {
    present(item === 'about')
    if (item === 'chat') openChat()
    else closeChat()
  }

  async function send(value: string) {
    if (busy.current) return
    busy.current = true
    const id = ++turnId.current
    if (!folioSessionOpen()) {
      const restoring =
        !!document.querySelector('.is-folio-focus') ||
        !!document.querySelector('.CardStackLabelContainer.expanded')
      releaseFolioFocus()
      if (restoring) await new Promise((resolve) => window.setTimeout(resolve, 420))
      if (turnId.current !== id) return
    }
    if (revealTimer.current) window.clearTimeout(revealTimer.current)
    revealTimer.current = 0

    // Capture before the draft clears / any column motion so the peel lines up.
    const origin = dockCapsuleRect()
    const grid = masonry.current
    const frame = column.current
    const fromResult = !!grid?.classList.contains('is-result')

    const request = fetch('/api/openai/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defineProblem: value }),
    })

    try {
      // Follow-ups used to await a full column exit (~travelMs) before peeling —
      // that read as input lag. Reset instantly and peel on the next paint.
      if (fromResult && frame) {
        frame.classList.remove('is-answered')
        frame.style.transition = 'none'
        frame.style.transform = ''
        frame.style.opacity = '1'
        frame.style.top = ''
        frame.style.left = ''
        frame.style.bottom = ''
        frame.style.width = ''
      }

      skipBegin.current = true
      setDockLaunch(true)
      setMarkLanded(false)
      setAnswers(null)
      setUserMessage(value)
      setAssistantMessage(null)
      setFailure(null)
      // Empty-state orbit may have been spinning awhile — arm a fresh hold for this turn.
      if (!fromResult) armOrbitHold()
      setOrbitLoading(true)

      const cards =
        fromResult && grid
          ? reorbitSession(grid)
          : Promise.resolve()

      await afterPaint()
      if (turnId.current !== id) return

      const nextFrame = column.current
      const nextGrid = masonry.current
      if (!fromResult && nextGrid && !nextGrid.classList.contains('is-orbit')) {
        beginFolioSession(nextGrid)
        setOrbitLoading(true)
      }
      if (nextFrame) await presentLoadingTurn(nextFrame, value, origin)
      setDockLaunch(false)
      if (turnId.current !== id) return
      await cards

      if (turnId.current !== id) return
      const res = await request
      if (turnId.current !== id) return
      const data = (await res.json()) as { AiResponse?: unknown }
      if (!res.ok || typeof data.AiResponse !== 'string') throw new Error('bad response')
      const card = JSON.parse(data.AiResponse) as {
        blurb?: string
        cardHeader?: string
        cardDescription?: string
        cardURL?: string
        cardURLs?: string[]
        cardImage?: string
      }
      turn.current = {
        userMessage: value,
        assistantMessage: card.blurb ?? '',
        cardHeader: card.cardHeader ?? '',
        cardDescription: card.cardDescription ?? '',
        cardURL: card.cardURL ?? '',
        cardImage: card.cardImage ?? '',
      }
      const urls = Array.isArray(card.cardURLs)
        ? card.cardURLs.filter((url): url is string => typeof url === 'string')
        : []
      if (turnId.current !== id) return
      const chosen = cardsForAnswer(urls.length ? urls : turn.current.cardURL ? [turn.current.cardURL] : [])
      const waitMs = orbitRevealWaitMs()
      revealTimer.current = window.setTimeout(() => {
        revealTimer.current = 0
        if (turnId.current !== id) return
        // Cards gather first; the blurb streams in afterTravel before enlarge.
        setAnswers(chosen)
      }, waitMs)
    } catch {
      if (turnId.current !== id) return
      setFailure(FAILURE)
    } finally {
      busy.current = false
    }
  }

  return (
    <>
      {chatMounted ? (
        <div className="folio-focus-column is-session" ref={column}>
          {userMessage ? (
            <div className="folio-user-msg">
              <div className="chatQueryContainer">
                <div className="chatQuery" style={dockLaunch ? { opacity: 0 } : undefined}>
                  <p>{userMessage}</p>
                </div>
              </div>
            </div>
          ) : null}
          {!failure ? (
            <div
              className={[
                'folio-assistant-msg is-reply',
                waiting ? 'is-waiting' : '',
                logoIn ? 'is-logo-in' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="status"
              style={
                {
                  '--folio-travel': `${ORBIT_TRAVEL_MS}ms`,
                  '--folio-logo-pop': `${LOGO_POP_MS}ms`,
                } as CSSProperties
              }
            >
              <div className="chatBlurb">
                <div className="chatResponseLogoContainer">
                  <ChatResponseMark spinning={loading && !reducedMotion()} />
                </div>
                {assistantMessage !== null ? <p>{assistantMessage}</p> : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {chatMounted ? <div className="folio-masonry" ref={masonry} /> : null}
      {chatMounted && failure ? (
        <p className="folio-chat-failure" role="status">
          {failure}
        </p>
      ) : null}
      <div className="folio-dock">
        <Dock onActiveItemChange={selectItem} onSend={send} />
      </div>
    </>
  )
}
