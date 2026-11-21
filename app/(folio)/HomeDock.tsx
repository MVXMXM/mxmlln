'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import lottie from 'lottie-web'
import { Dock, type DockItem } from '@/app/components/Dock/Dock'
import { bindFolioVisualViewport, folioViewport } from './folio-viewport'
import {
  armOrbitHold,
  beginFolioSession,
  cardsForAnswer,
  folioFocusMetrics,
  chatSessionOpen,
  enterChatSessionMobile,
  ORBIT_TRAVEL_MS,
  orbitRevealWaitMs,
  exitChatSession,
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
const NO_CARD_MSG =
  "Sorry, my website isn't intelligent enough to answer that yet. I'm actively working on improvements, which you can follow along on X for updates."
const NO_CARD_LINK = 'follow along on X for updates'
const X_PROFILE = 'https://x.com/MVXMXM'
/** Outlasts reorbit so the pop can meet the ring. */
const LOGO_POP_MS = 720

function ChatResponseMark({ spinning }: { spinning: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const animRef = useRef<ReturnType<typeof lottie.loadAnimation> | null>(null)
  const spinningRef = useRef(spinning)
  const stopOnFrontRef = useRef(false)
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
    const settleFront = () => {
      stopOnFrontRef.current = false
      anim.goToAndStop(0, true)
    }
    const onReady = () => {
      setReady(true)
      if (!spinningRef.current) settleFront()
    }
    // Front face is frame 0 — finish the current turn, then land there.
    const onFrame = () => {
      if (!stopOnFrontRef.current) return
      if (anim.currentFrame < 1) settleFront()
    }
    anim.addEventListener('DOMLoaded', onReady)
    anim.addEventListener('enterFrame', onFrame)
    return () => {
      anim.removeEventListener('DOMLoaded', onReady)
      anim.removeEventListener('enterFrame', onFrame)
      anim.destroy()
      animRef.current = null
    }
  }, [])

  useEffect(() => {
    const anim = animRef.current
    if (!anim) return
    if (spinning) {
      stopOnFrontRef.current = false
      anim.play()
      return
    }
    if (anim.currentFrame < 1) {
      stopOnFrontRef.current = false
      anim.goToAndStop(0, true)
      return
    }
    stopOnFrontRef.current = true
  }, [spinning])

  return (
    <div className="chatResponseLogo">
      <div ref={ref} className="chatResponseLogoLottie" aria-hidden />
      {!ready && <img src="/assets/LogoMark.fallback.png" alt="" />}
    </div>
  )
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
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

function MissBlurb({ text }: { text: string }) {
  const at = text.indexOf(NO_CARD_LINK)
  if (at < 0) {
    return <p className="folio-empty-miss">{text}</p>
  }
  return (
    <p className="folio-empty-miss">
      {text.slice(0, at)}
      <a href={X_PROFILE} target="_blank" rel="noreferrer">
        {text.slice(at, at + NO_CARD_LINK.length)}
      </a>
      {text.slice(at + NO_CARD_LINK.length)}
    </p>
  )
}

function dockCapsuleRect() {
  return document.querySelector<HTMLElement>('.mx-dock .dockDynamicContainer')?.getBoundingClientRect() ?? null
}

const REPLY_CARD_GAP = 80

/** `bottom` (not `top`) so the blurb can grow up without re-anchoring each chunk. */
function placeReplyColumn(frame: HTMLElement) {
  const { width: vw, height: vh, top, left: vLeft } = folioViewport()
  const { cardTop } = folioFocusMetrics()
  const width = snapFolioGrid(Math.min(600, vw - 40))
  const left = snapFolioGrid((vw - width) / 2 + vLeft)
  // Use the visible band — innerHeight drifts from vv on iOS and can drop the
  // column over the carousel cards (descendants then steal clicks).
  const bottom = Math.max(0, top + vh - (cardTop - REPLY_CARD_GAP))
  frame.style.width = `${width}px`
  frame.style.left = `${left}px`
  frame.style.right = 'auto'
  frame.style.top = 'auto'
  frame.style.bottom = `${snapFolioGrid(bottom)}px`
  frame.style.transform = 'none'
}

function placeMissColumn(frame: HTMLElement) {
  const { width: vw, height: vh, top, left: vLeft } = folioViewport()
  const width = snapFolioGrid(Math.min(600, vw - 40))
  const left = snapFolioGrid((vw - width) / 2 + vLeft)
  frame.style.width = `${width}px`
  frame.style.left = `${left}px`
  frame.style.right = 'auto'
  frame.style.top = `${top + vh / 2}px`
  frame.style.bottom = 'auto'
  frame.style.transform = 'translateY(-50%)'
}

async function launchFromDock(bubble: HTMLElement, text: string, origin: DOMRect) {
  const ms = reducedMotion() ? 0 : 400
  const copy = bubble.querySelector<HTMLElement>('p')
  // nowrap measure — wrapped height left the line stranded too high in the pill.
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
  frame.classList.remove('is-answered', 'is-miss')
  frame.style.top = ''
  frame.style.left = ''
  frame.style.bottom = ''
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
  const [emptyMiss, setEmptyMiss] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMounted, setChatMounted] = useState(false)
  const [logoIn, setLogoIn] = useState(false)
  const [answers, setAnswers] = useState<HTMLElement[] | null>(null)
  const [dockLaunch, setDockLaunch] = useState(false)
  const fadeGen = useRef(0)
  const revealTimer = useRef(0)
  const closeTimer = useRef(0)
  const logoFromRef = useRef<DOMRect | null>(null)
  const browsing = !!answers
  const waiting = !browsing
  const loading = !answers && !!userMessage

  useLayoutEffect(() => {
    if (!waiting || !column.current) return
    const logo = column.current.querySelector<HTMLElement>('.chatResponseLogoContainer')
    if (!logo) return
    const rect = logo.getBoundingClientRect()
    if (rect.width > 2 && rect.height > 2) logoFromRef.current = rect
  })

  useLayoutEffect(() => {
    if (!chatMounted) return
    const grid = masonry.current
    if (!grid) return
    const frame = column.current

    if (!browsing) {
      logoFromRef.current = null
      if (frame) {
        frame.classList.remove('is-answered', 'is-miss')
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
      const mobile = window.matchMedia('(max-width: 768px)').matches
      if (mobile && !userMessage) {
        enterChatSessionMobile()
      } else if (!grid.classList.contains('is-orbit')) {
        beginFolioSession(grid)
      }
      if (userMessage) setOrbitLoading(true)
      return
    }

    if (!frame || !answers) return
    const from = logoFromRef.current
    logoFromRef.current = null
    frame.classList.add('is-answered')
    frame.classList.toggle('is-miss', emptyMiss)
    frame.style.transition = 'none'
    if (emptyMiss) placeMissColumn(frame)
    else placeReplyColumn(frame)

    const logo = frame.querySelector<HTMLElement>('.chatResponseLogoContainer')
    const mark = frame.querySelector<HTMLElement>('.chatResponseLogo')
    const landMs = reducedMotion() ? 0 : Math.min(ORBIT_TRAVEL_MS, 560)
    if (from && logo && mark && landMs > 0) {
      const to = logo.getBoundingClientRect()
      if (to.width > 2 && to.height > 2) {
        const dx = from.left - to.left
        const dy = from.top - to.top
        const sx = from.width / to.width
        const sy = from.height / to.height
        const ease = 'cubic-bezier(0.22, 1, 0.36, 1)'
        // Fill the box during scale so 200→60 reads true.
        mark.style.width = '100%'
        mark.style.height = '100%'
        logo.style.transformOrigin = 'top left'
        logo.style.transition = 'none'
        logo.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
        void logo.offsetWidth
        logo.style.transition = `transform ${landMs}ms ${ease}`
        logo.style.transform = 'none'
        window.setTimeout(() => {
          logo.style.transition = ''
          logo.style.transform = ''
          logo.style.transformOrigin = ''
          mark.style.width = ''
          mark.style.height = ''
        }, landMs + 40)
      }
    }

    const id = turnId.current
    const blurb = emptyMiss ? NO_CARD_MSG : (turn.current?.assistantMessage ?? '')
    revealSessionCards(grid, answers, {
      onCull: () => {
        void streamBlurb(blurb, setAssistantMessage, () => turnId.current === id)
      },
    })
  }, [chatMounted, userMessage, answers, emptyMiss, browsing])

  // Resize / visualViewport — blurb growth rides CSS `bottom`.
  useLayoutEffect(() => {
    if (!chatMounted || !browsing || !column.current) return
    const frame = column.current
    if (!frame.classList.contains('is-answered')) return
    const onResize = (layoutChanged: boolean) => {
      if (!layoutChanged) return
      if (emptyMiss) placeMissColumn(frame)
      else placeReplyColumn(frame)
    }
    onResize(true)
    return bindFolioVisualViewport(onResize)
  }, [chatMounted, browsing, emptyMiss])

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
    setEmptyMiss(false)
    setDockLaunch(false)
    setLogoIn(false)
    setOrbitLoading(false)
    exitChatSession()
  }

  function mountChatShell() {
    setChatMounted(true)
    setLogoIn(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setLogoIn(true))
    })
  }

  function openChat() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = 0
    }
    setChatOpen(true)
    mountChatShell()
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
    // Drop the software keyboard before loading/results reflow.
    document.querySelector<HTMLInputElement>('.dockComposerField')?.blur()
    const id = ++turnId.current
    if (!chatSessionOpen()) {
      const restoring = !!document.querySelector('.CardStackLabelContainer.expanded')
      exitChatSession()
      if (restoring) await new Promise((resolve) => window.setTimeout(resolve, 420))
      if (turnId.current !== id) return
    }
    if (revealTimer.current) window.clearTimeout(revealTimer.current)
    revealTimer.current = 0

    // Before draft clear / column motion — peel origin has to match the capsule now.
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
      // Skip the column-exit wait on follow-ups — it read as input lag.
      if (fromResult && frame) {
        frame.classList.remove('is-answered', 'is-miss')
        frame.style.transition = 'none'
        frame.style.transform = ''
        frame.style.opacity = '1'
        frame.style.top = ''
        frame.style.left = ''
        frame.style.bottom = ''
        frame.style.width = ''
      }

      const cards = fromResult && grid ? reorbitSession(grid) : Promise.resolve()

      skipBegin.current = true
      setDockLaunch(true)
      setAnswers(null)
      setUserMessage(value)
      setAssistantMessage(null)
      setFailure(null)
      setEmptyMiss(false)
      // Empty orbit may already be mid-spin — hold clock has to restart for this turn.
      if (!fromResult) armOrbitHold()
      setOrbitLoading(true)

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
        if (!chosen.length) {
          setEmptyMiss(true)
          setAnswers([])
          return
        }
        setEmptyMiss(false)
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
                loading ? 'is-loading' : '',
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
                {waiting ? (
                  <p className="Title folio-empty-prompt" aria-hidden={loading}>
                    What can I help you find?
                  </p>
                ) : null}
                {browsing && emptyMiss && assistantMessage !== null ? (
                  <MissBlurb text={assistantMessage} />
                ) : browsing && assistantMessage !== null ? (
                  <p>{assistantMessage}</p>
                ) : null}
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
