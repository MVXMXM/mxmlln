'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    initIntroAnimation?: () => void
    skipIntroAnimation?: () => void
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
    const fallback = document.getElementById('introLoaderFallback')
    const anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/assets/WebIntro.json',
    })
    anim.addEventListener('DOMLoaded', () => {
      if (fallback) fallback.style.display = 'none'
      resolve()
    })
    anim.addEventListener('data_failed', () => reject(new Error('intro data_failed')))
  })
}

function mountOverlayScroll() {
  document.documentElement.classList.add('overlayScroll')
  return loadScript('/components/ScrollThumb.js').then(() => {
    window.mountScrollThumb?.()
  })
}

export function FolioScripts() {
  useEffect(() => {
    // portfolio.html sets this on <html>. The root layout owns that element here.
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
        // Main dropped GIF fallbacks — enter the folio directly if Lottie can’t run.
        window.skipIntroAnimation?.()
        document.querySelector('.folio-dock')?.classList.add('is-in')
      }
    }

    boot().catch(() => {
      window.skipIntroAnimation?.()
      document.querySelector('.folio-dock')?.classList.add('is-in')
    })

    return releaseScroll
  }, [])

  return null
}
