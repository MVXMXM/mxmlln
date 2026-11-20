'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    initIntroAnimation?: () => void
    skipIntroAnimation?: () => void
    __folioBootStarted?: boolean
    mountScrollThumb?: () => void
    disposeScrollThumb?: () => void
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

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = false
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(src))
    document.body.appendChild(script)
  })
}

function loadIntroLottie() {
  return new Promise<void>((resolve, reject) => {
    const lottie = window.lottie
    const container = document.getElementById('introLoader')
    if (!lottie || !container) {
      reject(new Error('intro lottie unavailable'))
      return
    }
    const anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/assets/WebIntro.json',
    })
    anim.addEventListener('DOMLoaded', () => resolve())
    anim.addEventListener('data_failed', () => reject(new Error('intro data_failed')))
  })
}

function mountOverlayScroll() {
  document.documentElement.classList.add('overlayScroll')
  return loadScript('/components/ScrollThumb.js').then(() => {
    window.mountScrollThumb?.()
  })
}

function failOpen() {
  window.skipIntroAnimation?.()
  document.querySelector('.folio-dock')?.classList.add('is-in')
}

export function FolioScripts() {
  useEffect(() => {
    // overlayScroll belongs on <html>; the root layout owns that element here.
    mountOverlayScroll()

    const releaseScroll = () => {
      document.documentElement.classList.remove('overlayScroll')
      window.disposeScrollThumb?.()
    }

    if (window.__folioBootStarted) return releaseScroll
    window.__folioBootStarted = true

    async function boot() {
      await loadScript('https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js')
      await loadScript('/js/IntenseImages/intense.js')
      await loadScript('/components/FolioEngine.js')
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie_light.min.js')
        await loadIntroLottie()
        window.initIntroAnimation?.()
      } catch {
        failOpen()
      }
    }

    boot().catch(failOpen)

    return releaseScroll
  }, [])

  return null
}
