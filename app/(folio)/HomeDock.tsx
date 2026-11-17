'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Dock, type DockItem } from '@/app/components/Dock/Dock'
import {
  beginFolioSession,
  cardsForAnswer,
  folioSessionOpen,
  releaseFolioFocus,
  revealSessionCards,
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

export function HomeDock() {
  const turn = useRef<FolioTurn | null>(null)
  const turnId = useRef(0)
  const busy = useRef(false)
  const column = useRef<HTMLDivElement>(null)
  const masonry = useRef<HTMLDivElement>(null)
  const [userMessage, setUserMessage] = useState<string | null>(null)
  const [assistantMessage, setAssistantMessage] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [answers, setAnswers] = useState<HTMLElement[] | null>(null)

  useLayoutEffect(() => {
    if (!chatOpen || !userMessage) return
    const grid = masonry.current
    const frame = column.current
    if (!grid || !frame) return
    if (!assistantMessage) {
      frame.style.left = ''
      frame.style.width = ''
      frame.style.transform = ''
      beginFolioSession(grid)
      grid.style.paddingTop = `${Math.ceil(frame.getBoundingClientRect().bottom + 16)}px`
      return
    }
    const width = Math.min(420, window.innerWidth - 48)
    const left = Math.max(24, (window.innerWidth - width) / 2)
    frame.style.left = `${left}px`
    frame.style.width = `${width}px`
    frame.style.transform = 'none'
    if (!answers?.length) return
    revealSessionCards(grid, answers, frame.getBoundingClientRect().bottom + 28)
  }, [chatOpen, userMessage, assistantMessage, answers])

  useEffect(() => {
    const id = window.setTimeout(() => {
      document.querySelector('.folio-dock')?.classList.add('is-in')
    }, 4000)
    return () => window.clearTimeout(id)
  }, [])

  function clearTurn() {
    turnId.current += 1
    turn.current = null
    setAnswers(null)
    setUserMessage(null)
    setAssistantMessage(null)
    setFailure(null)
    releaseFolioFocus()
  }

  function selectItem(item: DockItem) {
    if (item === 'about') window.location.href = '/about.html'
    const open = item === 'chat'
    setChatOpen(open)
    if (!open) clearTurn()
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
    setAnswers(null)
    setUserMessage(value)
    setAssistantMessage(null)
    setFailure(null)
    try {
      const res = await fetch('/api/openai/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defineProblem: value }),
      })
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
      setAnswers(chosen)
      if (turn.current.assistantMessage) setAssistantMessage(turn.current.assistantMessage)
    } catch {
      if (turnId.current !== id) return
      setFailure(FAILURE)
    } finally {
      busy.current = false
    }
  }

  return (
    <>
      {chatOpen && userMessage ? (
        <div className="folio-focus-column is-session" ref={column}>
          <div className="folio-user-msg">
            <div className="chatQueryContainer">
              <div className="chatQuery">
                <p>{userMessage}</p>
              </div>
            </div>
          </div>
          {!failure ? (
            <div className="folio-assistant-msg is-reply" role="status">
              <div className="chatBlurb">
                <div className="chatResponseLogoContainer">
                  <img className="chatResponseLogo" src="/assets/LogoHover.gif" alt="" />
                </div>
                <p>{assistantMessage ?? 'Thinking...'}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {chatOpen && userMessage ? <div className="folio-masonry" ref={masonry} /> : null}
      {chatOpen && failure ? (
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
